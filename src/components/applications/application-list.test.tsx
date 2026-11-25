import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ApplicationList } from "./application-list";
import type { Application } from "@/lib/applications/repository";

vi.mock("@/lib/applications/actions", () => ({
  deleteApplicationAction: vi.fn(),
}));

const BASE: Application = {
  id: "3f2b8c1e-5a4d-4e6f-9b7a-1c2d3e4f5a6b",
  user_id: "9a8b7c6d-5e4f-4a3b-8c2d-1e0f9a8b7c6d",
  company: "Acme",
  position: "Frontend",
  offer_url: null,
  portal: "web_empresa",
  applied_at: "2026-11-25",
  salary_min: null,
  salary_max: null,
  status: "en_proceso",
  notes: null,
  created_at: "2026-11-25T10:00:00Z",
  updated_at: "2026-11-25T10:00:00Z",
};

const OTHER: Application = {
  ...BASE,
  id: "1b2c3d4e-5f6a-4b7c-8d9e-0f1a2b3c4d5e",
  company: "Globex",
  position: "Backend",
  portal: "linkedin",
  status: "rechazada_por_mi",
  applied_at: "2026-01-02",
};

describe("ApplicationList", () => {
  it("sin candidaturas muestra el estado vacío con un enlace para crear", () => {
    render(<ApplicationList applications={[]} />);

    expect(screen.getByText(/Todavía no tienes candidaturas/)).toBeVisible();
    expect(
      screen.getByRole("link", { name: "Añadir la primera candidatura" }),
    ).toHaveAttribute("href", "/dashboard/candidaturas/nueva");
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });

  it("en tarjetas muestra empresa, puesto, estado en texto, portal y fecha", () => {
    render(<ApplicationList applications={[BASE, OTHER]} />);

    const cards = within(
      screen.getByRole("list", { name: "Candidaturas" }),
    ).getAllByRole("listitem");
    expect(cards).toHaveLength(2);
    const [first] = cards;
    expect(
      within(first!).getByRole("heading", { name: "Frontend" }),
    ).toBeInTheDocument();
    expect(within(first!).getByText("Acme")).toBeInTheDocument();
    expect(within(first!).getByText("En proceso")).toBeInTheDocument();
    expect(within(first!).getByText("Web de la empresa")).toBeInTheDocument();
    expect(within(first!).getByText(/^25 nov\.? 2026$/)).toHaveAttribute(
      "datetime",
      "2026-11-25",
    );
  });

  it("en la tabla muestra una fila por candidatura con sus columnas", () => {
    render(<ApplicationList applications={[BASE, OTHER]} />);

    const table = screen.getByRole("table", { name: "Candidaturas" });
    const headers = within(table)
      .getAllByRole("columnheader")
      .map((header) => header.textContent);
    expect(headers).toEqual([
      "Empresa",
      "Puesto",
      "Estado",
      "Portal",
      "Fecha",
      "Acciones",
    ]);
    const rows = within(table).getAllByRole("row").slice(1);
    expect(rows).toHaveLength(2);
    const cells = within(rows[1]!).getAllByRole("cell");
    expect(cells.slice(0, 4).map((cell) => cell.textContent)).toEqual([
      "Globex",
      "Backend",
      "Rechazada por mí",
      "LinkedIn",
    ]);
  });

  it("cada candidatura enlaza a su edición y tiene botón de borrar con nombre claro", () => {
    render(<ApplicationList applications={[OTHER]} />);

    const editLinks = screen.getAllByRole("link", {
      name: "Editar la candidatura de Backend en Globex",
    });
    for (const link of editLinks) {
      expect(link).toHaveAttribute(
        "href",
        `/dashboard/candidaturas/${OTHER.id}/editar`,
      );
    }
    expect(
      screen.getAllByRole("button", {
        name: "Borrar la candidatura de Backend en Globex",
      }).length,
    ).toBeGreaterThan(0);
  });
});
