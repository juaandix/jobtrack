import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ChartTooltip } from "./chart-tooltip";

describe("ChartTooltip", () => {
  it("sin estar activo no pinta nada", () => {
    const { container } = render(
      <ChartTooltip
        active={false}
        label="LinkedIn"
        payload={[{ name: "Enviada", value: 2 }]}
      />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("activo pero sin datos no pinta nada", () => {
    const { container } = render(<ChartTooltip active label="LinkedIn" />);
    expect(container).toBeEmptyDOMElement();
  });

  it("muestra la categoría y cada serie con su valor formateado", () => {
    render(
      <ChartTooltip
        active
        label="LinkedIn"
        payload={[
          { name: "Enviada", value: 1200 },
          { name: "Entrevista", value: 0 },
        ]}
      />,
    );

    expect(screen.getByText("LinkedIn")).toBeInTheDocument();
    const items = screen.getAllByRole("listitem");
    expect(items.map((item) => item.textContent)).toEqual([
      "Enviada: 1200",
      "Entrevista: 0",
    ]);
  });

  it("aplica el formato de la etiqueta y tolera valores que no son números", () => {
    render(
      <ChartTooltip
        active
        label="24 nov"
        payload={[{ name: "Candidaturas", value: "3" }, {}]}
        formatLabel={(label) => `Semana del ${label}`}
      />,
    );

    expect(screen.getByText("Semana del 24 nov")).toBeInTheDocument();
    expect(
      screen.getAllByRole("listitem").map((item) => item.textContent),
    ).toEqual(["Candidaturas: 3", ": "]);
  });

  it("sigue el tema: caja clara y variante oscura con texto de alto contraste", () => {
    render(
      <ChartTooltip
        active
        label="Indeed"
        payload={[{ name: "Oferta", value: 1 }]}
      />,
    );

    const box = screen.getByText("Indeed").parentElement;
    expect(box).toHaveClass(
      "bg-white",
      "text-zinc-900",
      "dark:bg-zinc-900",
      "dark:text-zinc-50",
    );
  });
});
