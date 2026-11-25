import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApplicationFilterBar } from "./application-filter-bar";
import { NO_FILTERS } from "@/lib/applications/filter";

const push = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
}));

beforeEach(() => {
  push.mockReset();
});

function fields() {
  return {
    query: screen.getByLabelText("Buscar por empresa"),
    status: screen.getByLabelText("Filtrar por estado"),
    portal: screen.getByLabelText("Filtrar por portal"),
  };
}

describe("ApplicationFilterBar", () => {
  it("es un formulario GET de búsqueda que funciona sin JavaScript", () => {
    render(<ApplicationFilterBar filters={NO_FILTERS} />);

    const form = screen.getByRole("search", { name: "Filtrar candidaturas" });
    expect(form).toHaveAttribute("method", "get");
    expect(form).toHaveAttribute("action", "/dashboard");
    const { query, status, portal } = fields();
    expect(query).toHaveAttribute("name", "q");
    expect(status).toHaveAttribute("name", "status");
    expect(portal).toHaveAttribute("name", "portal");
  });

  it("sin filtros parte de 'Todos', búsqueda vacía y sin botón de limpiar", () => {
    render(<ApplicationFilterBar filters={NO_FILTERS} />);

    const { query, status, portal } = fields();
    expect(query).toHaveValue("");
    expect(status).toHaveDisplayValue("Todos");
    expect(portal).toHaveDisplayValue("Todos");
    expect(
      screen.getByRole("option", { name: "Rechazada por mí" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("option", { name: "Web de la empresa" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: "Limpiar filtros" }),
    ).not.toBeInTheDocument();
  });

  it("muestra los filtros de la URL y un enlace para limpiarlos", () => {
    render(
      <ApplicationFilterBar
        filters={{ status: "oferta", portal: "indeed", query: "Acme" }}
      />,
    );

    const { query, status, portal } = fields();
    expect(query).toHaveValue("Acme");
    expect(status).toHaveDisplayValue("Oferta");
    expect(portal).toHaveDisplayValue("Indeed");
    expect(
      screen.getByRole("link", { name: "Limpiar filtros" }),
    ).toHaveAttribute("href", "/dashboard");
  });

  it("al filtrar navega a una URL con solo los criterios activos", async () => {
    const user = userEvent.setup();
    render(<ApplicationFilterBar filters={NO_FILTERS} />);

    const { query, status } = fields();
    await user.type(query, "  Telefónica ");
    await user.selectOptions(status, "Entrevista");
    await user.click(screen.getByRole("button", { name: "Filtrar" }));

    expect(push).toHaveBeenCalledWith(
      "/dashboard?status=entrevista&q=Telef%C3%B3nica",
    );
  });

  it("enviar con Intro desde la búsqueda también filtra", async () => {
    const user = userEvent.setup();
    render(<ApplicationFilterBar filters={NO_FILTERS} />);

    await user.selectOptions(fields().portal, "LinkedIn");
    await user.type(fields().query, "acme{Enter}");

    expect(push).toHaveBeenCalledWith("/dashboard?portal=linkedin&q=acme");
  });

  it("volver a 'Todos' y vaciar la búsqueda navega a la lista sin parámetros", async () => {
    const user = userEvent.setup();
    render(
      <ApplicationFilterBar
        filters={{ status: "oferta", portal: null, query: "Acme" }}
      />,
    );

    const { query, status } = fields();
    await user.clear(query);
    await user.type(query, "   ");
    await user.selectOptions(status, "Todos");
    await user.click(screen.getByRole("button", { name: "Filtrar" }));

    expect(push).toHaveBeenCalledWith("/dashboard");
  });

  it("si la URL cambia, los campos la siguen sin perder el foco", async () => {
    const user = userEvent.setup();
    const { rerender } = render(
      <ApplicationFilterBar
        filters={{ status: "oferta", portal: "otro", query: "Acme" }}
      />,
    );
    await user.click(fields().query);

    rerender(<ApplicationFilterBar filters={NO_FILTERS} />);

    const { query, status, portal } = fields();
    expect(query).toHaveValue("");
    expect(status).toHaveDisplayValue("Todos");
    expect(portal).toHaveDisplayValue("Todos");
    expect(query).toHaveFocus();
  });
});
