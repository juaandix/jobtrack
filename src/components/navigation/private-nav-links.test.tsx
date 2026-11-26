import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { PrivateNavLinks } from "./private-nav-links";

const pathname = vi.hoisted(() => ({ current: "/dashboard" }));

vi.mock("next/navigation", () => ({
  usePathname: () => pathname.current,
}));

describe("PrivateNavLinks", () => {
  it("enlaza la lista, el tablero y las métricas y marca la lista como actual", () => {
    pathname.current = "/dashboard";
    render(<PrivateNavLinks />);

    const list = screen.getByRole("link", { name: "Lista" });
    const board = screen.getByRole("link", { name: "Tablero" });
    expect(list).toHaveAttribute("href", "/dashboard");
    expect(list).toHaveAttribute("aria-current", "page");
    expect(board).toHaveAttribute("href", "/dashboard/tablero");
    expect(board).not.toHaveAttribute("aria-current");
    const metrics = screen.getByRole("link", { name: "Métricas" });
    expect(metrics).toHaveAttribute("href", "/dashboard/metricas");
    expect(metrics).not.toHaveAttribute("aria-current");
  });

  it("en las métricas marca las métricas como actuales", () => {
    pathname.current = "/dashboard/metricas";
    render(<PrivateNavLinks />);

    expect(screen.getByRole("link", { name: "Métricas" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(screen.getAllByRole("link", { current: "page" })).toHaveLength(1);
  });

  it("en el tablero marca el tablero como actual", () => {
    pathname.current = "/dashboard/tablero";
    render(<PrivateNavLinks />);

    expect(screen.getByRole("link", { name: "Tablero" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(screen.getByRole("link", { name: "Lista" })).not.toHaveAttribute(
      "aria-current",
    );
  });

  it("en otras páginas privadas no marca ninguna", () => {
    pathname.current = "/dashboard/candidaturas/nueva";
    render(<PrivateNavLinks />);

    expect(screen.queryByRole("link", { current: "page" })).toBeNull();
  });
});
