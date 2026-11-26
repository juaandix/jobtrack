import { describe, expect, it } from "vitest";
import {
  formatCount,
  formatPercent,
  formatShortDate,
  formatWeekLabel,
  percentOf,
} from "./format";
import { isoWeekOf } from "./iso-week";

describe("percentOf", () => {
  it("devuelve 0 sin datos, nunca NaN ni Infinity", () => {
    expect(percentOf(0, 0)).toBe(0);
    expect(percentOf(3, 0)).toBe(0);
    expect(percentOf(1, -2)).toBe(0);
    expect(percentOf(Number.NaN, 4)).toBe(0);
    expect(percentOf(1, Number.POSITIVE_INFINITY)).toBe(0);
  });

  it("redondea a entero con el medio hacia arriba", () => {
    expect(percentOf(1, 8)).toBe(13); // 12.5
    expect(percentOf(3, 8)).toBe(38); // 37.5
    expect(percentOf(1, 3)).toBe(33);
    expect(percentOf(2, 3)).toBe(67);
    expect(percentOf(2, 5)).toBe(40);
  });

  it("da 0 y 100 en los extremos", () => {
    expect(percentOf(0, 7)).toBe(0);
    expect(percentOf(7, 7)).toBe(100);
  });
});

describe("formatCount y formatPercent", () => {
  it("formatea en español", () => {
    expect(formatCount(0)).toBe("0");
    expect(formatCount(12345)).toBe("12.345");
    expect(formatPercent(40)).toBe("40 %");
    expect(formatPercent(0)).toBe("0 %");
    expect(formatPercent(100)).toBe("100 %");
  });
});

describe("formatShortDate", () => {
  it("muestra día y mes sin desfase de zona horaria", () => {
    expect(formatShortDate("2026-11-23")).toMatch(/^23 nov\.?$/);
    expect(formatShortDate("2027-01-01")).toMatch(/^1 ene\.?$/);
    expect(formatShortDate("2026-12-31")).toMatch(/^31 dic\.?$/);
  });

  it("devuelve tal cual lo que no es una fecha válida", () => {
    expect(formatShortDate("2026-02-30")).toBe("2026-02-30");
    expect(formatShortDate("ayer")).toBe("ayer");
  });
});

describe("formatWeekLabel", () => {
  it("incluye número, año ISO y lunes y domingo", () => {
    const week = isoWeekOf("2027-01-01");
    expect(week).not.toBeNull();
    expect(formatWeekLabel(week!)).toMatch(
      /^Semana 53 de 2026 \(28 dic\.? 2026 – 3 ene\.? 2027\)$/,
    );
  });
});
