import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ContentWidth } from "./content-width";

const pathname = vi.hoisted(() => ({ current: "/dashboard" }));

vi.mock("next/navigation", () => ({
  usePathname: () => pathname.current,
}));

function renderBox(): HTMLElement {
  render(
    <ContentWidth className="py-8">
      <p>Contenido</p>
    </ContentWidth>,
  );
  const box = screen.getByText("Contenido").parentElement;
  if (box === null) throw new Error("sin contenedor");
  return box;
}

describe("ContentWidth", () => {
  it("en la lista usa el ancho por defecto", () => {
    pathname.current = "/dashboard";
    const box = renderBox();

    expect(box).toHaveClass("max-w-5xl", "py-8");
    expect(box).not.toHaveClass("max-w-screen-2xl");
  });

  it("en el tablero usa el ancho amplio para las seis columnas", () => {
    pathname.current = "/dashboard/tablero";
    const box = renderBox();

    expect(box).toHaveClass("max-w-screen-2xl");
    expect(box).not.toHaveClass("max-w-5xl");
  });
});
