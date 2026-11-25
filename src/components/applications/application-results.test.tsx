import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ApplicationResults } from "./application-results";
import { NO_FILTERS } from "@/lib/applications/filter";
import type { Application } from "@/lib/applications/repository";

vi.mock("@/lib/applications/actions", () => ({
  deleteApplicationAction: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

const TELEFONICA: Application = {
  id: "3f2b8c1e-5a4d-4e6f-9b7a-1c2d3e4f5a6b",
  user_id: "9a8b7c6d-5e4f-4a3b-8c2d-1e0f9a8b7c6d",
  company: "Telefónica",
  position: "Frontend",
  offer_url: null,
  portal: "linkedin",
  applied_at: "2026-11-25",
  salary_min: null,
  salary_max: null,
  status: "entrevista",
  notes: null,
  created_at: "2026-11-25T10:00:00Z",
  updated_at: "2026-11-25T10:00:00Z",
};

const GLOBEX: Application = {
  ...TELEFONICA,
  id: "1b2c3d4e-5f6a-4b7c-8d9e-0f1a2b3c4d5e",
  company: "Globex",
  position: "Backend",
  status: "enviada",
};

function cardPositions(): string[] {
  return within(screen.getByRole("list", { name: "Candidaturas" }))
    .getAllByRole("heading")
    .map((heading) => heading.textContent ?? "");
}

describe("ApplicationResults", () => {
  it("sin candidaturas muestra el estado vacío y no la barra de filtros", () => {
    render(<ApplicationResults applications={[]} filters={NO_FILTERS} />);

    expect(screen.getByText(/Todavía no tienes candidaturas/)).toBeVisible();
    expect(screen.queryByRole("search")).not.toBeInTheDocument();
  });

  it("sin filtros muestra todas y anuncia el total", () => {
    render(
      <ApplicationResults
        applications={[TELEFONICA, GLOBEX]}
        filters={NO_FILTERS}
      />,
    );

    expect(
      screen.getByRole("search", { name: "Filtrar candidaturas" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("2 candidaturas");
    expect(cardPositions()).toEqual(["Frontend", "Backend"]);
  });

  it("con filtros muestra solo las que coinciden y cuántas de cuántas", () => {
    render(
      <ApplicationResults
        applications={[TELEFONICA, GLOBEX]}
        filters={{ status: null, portal: null, query: "telefonica" }}
      />,
    );

    expect(screen.getByRole("status")).toHaveTextContent("1 de 2 candidaturas");
    expect(cardPositions()).toEqual(["Frontend"]);
  });

  it("sin resultados lo distingue del estado vacío y ofrece ver todas", () => {
    render(
      <ApplicationResults
        applications={[TELEFONICA, GLOBEX]}
        filters={{ status: "oferta", portal: null, query: "" }}
      />,
    );

    expect(screen.getByRole("status")).toHaveTextContent("0 de 2 candidaturas");
    expect(
      screen.getByText("Ninguna candidatura coincide con estos filtros."),
    ).toBeVisible();
    expect(
      screen.queryByText(/Todavía no tienes candidaturas/),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Ver todas las candidaturas" }),
    ).toHaveAttribute("href", "/dashboard");
    expect(
      screen.queryByRole("list", { name: "Candidaturas" }),
    ).not.toBeInTheDocument();
  });
});
