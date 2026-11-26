import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { MetricsPanel } from "./metrics-panel";
import { buildMetrics, type MetricsApplication } from "@/lib/metrics/metrics";

const applications: MetricsApplication[] = [
  { applied_at: "2026-11-23", status: "enviada", portal: "linkedin" },
  { applied_at: "2026-11-24", status: "enviada", portal: "linkedin" },
  { applied_at: "2026-11-25", status: "enviada", portal: "infojobs" },
  { applied_at: "2026-11-10", status: "entrevista", portal: "linkedin" },
  { applied_at: "2026-11-11", status: "oferta", portal: "referido" },
];

function renderPanel(items: MetricsApplication[] = applications) {
  return render(
    <MetricsPanel metrics={buildMetrics(items, "2026-11-26", 3)} />,
  );
}

/** The value (`<dd>`) right after a KPI term (`<dt>`). */
function kpiValue(label: string): string | null {
  const dt = screen.getByText(label, { selector: "dt" });
  return dt.nextElementSibling?.textContent ?? null;
}

describe("MetricsPanel", () => {
  it("muestra los KPI con formato español", () => {
    renderPanel();

    expect(
      screen.getByRole("heading", { level: 2, name: "Resumen" }),
    ).toBeInTheDocument();
    expect(kpiValue("Total de candidaturas")).toBe("5");
    expect(kpiValue("Tasa de respuesta")).toBe("40 %");
    expect(screen.getByText("2 de 5 han pasado de «Enviada»")).toBeVisible();
    expect(kpiValue("Procesos activos")).toBe("1");
    expect(kpiValue("Ofertas recibidas")).toBe("1");
  });

  it("la tabla semanal tiene título y todas las semanas, también las vacías", () => {
    renderPanel();

    const table = screen.getByRole("table", {
      name: "Datos del gráfico: candidaturas en cada una de las últimas 3 semanas",
    });
    expect(
      within(table)
        .getAllByRole("columnheader")
        .map((th) => th.textContent),
    ).toEqual(["Semana", "Candidaturas"]);
    const rows = within(table).getAllByRole("row").slice(1);
    expect(rows).toHaveLength(3);
    const counts = rows.map((row) => within(row).getByRole("cell").textContent);
    expect(counts).toEqual(["2", "0", "3"]);
    expect(
      within(table).getByRole("rowheader", { name: /^Semana 48 de 2026/ }),
    ).toBeInTheDocument();
  });

  it("la tabla por portal cruza portal y estado con totales", () => {
    renderPanel();

    const table = screen.getByRole("table", {
      name: "Datos del gráfico: candidaturas por portal y estado",
    });
    expect(
      within(table)
        .getAllByRole("columnheader")
        .map((th) => th.textContent),
    ).toEqual([
      "Portal",
      "Enviada",
      "En proceso",
      "Entrevista",
      "Oferta",
      "Descartada",
      "Rechazada por mí",
      "Total",
    ]);

    const linkedin = within(table).getByRole("row", { name: /^LinkedIn/ });
    expect(
      within(linkedin)
        .getAllByRole("cell")
        .map((cell) => cell.textContent),
    ).toEqual(["2", "0", "1", "0", "0", "0", "3"]);

    // Portals without applications are listed at 0.
    const indeed = within(table).getByRole("row", { name: /^Indeed/ });
    expect(
      within(indeed)
        .getAllByRole("cell")
        .map((cell) => cell.textContent),
    ).toEqual(["0", "0", "0", "0", "0", "0", "0"]);

    const totals = within(table).getByRole("row", { name: /^Total/ });
    expect(
      within(totals)
        .getAllByRole("cell")
        .map((cell) => cell.textContent),
    ).toEqual(["3", "0", "1", "1", "0", "0", "5"]);
  });

  it("en pantallas pequeñas la misma tabla por portal se muestra como tarjetas", () => {
    renderPanel();

    const name = "Datos del gráfico: candidaturas por portal y estado";
    const cards = screen.getByRole("list", { name });
    // Only one of the two views is displayed at each width.
    expect(cards).toHaveClass("sm:hidden");
    expect(screen.getByRole("table", { name }).parentElement).toHaveClass(
      "hidden",
      "sm:block",
    );

    const items = within(cards).getAllByRole("listitem");
    // One card per portal plus the totals.
    expect(items).toHaveLength(8);

    const linkedin = within(cards).getByRole("heading", { name: /^LinkedIn/ });
    expect(linkedin).toHaveTextContent("LinkedIn3 candidaturas");
    const linkedinCard = linkedin.closest("li");
    if (linkedinCard === null) throw new Error("sin tarjeta de LinkedIn");
    // Statuses at 0 are left out of the card.
    expect(
      within(linkedinCard)
        .getAllByRole("term")
        .map((term) => term.textContent),
    ).toEqual(["Enviada", "Entrevista"]);
    expect(
      within(linkedinCard)
        .getAllByRole("definition")
        .map((value) => value.textContent),
    ).toEqual(["2", "1"]);

    const indeed = within(cards).getByRole("heading", { name: /^Indeed/ });
    expect(indeed).toHaveTextContent("Indeed0 candidaturas");
    expect(
      within(indeed.closest("li") ?? cards).queryAllByRole("term"),
    ).toEqual([]);

    const total = within(cards).getByRole("heading", { name: /^Total/ });
    expect(total).toHaveTextContent("Total5 candidaturas");
  });

  it("cada gráfico tiene su sección con título y su tabla alternativa", () => {
    renderPanel();

    for (const name of ["Candidaturas por semana", "Estados por portal"]) {
      const section = screen.getByRole("region", { name });
      expect(within(section).getByRole("table")).toBeInTheDocument();
      expect(section.querySelector('[aria-hidden="true"]')).not.toBeNull();
    }
  });

  it("con una sola candidatura enviada la tasa es 0 %", () => {
    renderPanel([
      { applied_at: "2026-11-26", status: "enviada", portal: "otro" },
    ]);

    expect(kpiValue("Tasa de respuesta")).toBe("0 %");
    expect(screen.getByText("0 de 1 han pasado de «Enviada»")).toBeVisible();
  });
});
