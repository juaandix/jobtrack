import { describe, expect, it } from "vitest";
import {
  APP_TIME_ZONE,
  PORTAL_LABELS,
  STATUS_LABELS,
  formatAppliedAt,
  todayIsoDate,
} from "./labels";
import {
  APPLICATION_PORTALS,
  APPLICATION_STATUSES,
} from "@/lib/validation/application";

describe("STATUS_LABELS y PORTAL_LABELS", () => {
  it("tienen una etiqueta no vacía para cada valor del enum, y solo esos", () => {
    expect(Object.keys(STATUS_LABELS).sort()).toEqual(
      [...APPLICATION_STATUSES].sort(),
    );
    expect(Object.keys(PORTAL_LABELS).sort()).toEqual(
      [...APPLICATION_PORTALS].sort(),
    );
    for (const label of [
      ...Object.values(STATUS_LABELS),
      ...Object.values(PORTAL_LABELS),
    ]) {
      expect(label.trim()).not.toBe("");
    }
  });

  it("no repite etiquetas", () => {
    const statuses = Object.values(STATUS_LABELS);
    const portals = Object.values(PORTAL_LABELS);
    expect(new Set(statuses).size).toBe(statuses.length);
    expect(new Set(portals).size).toBe(portals.length);
  });

  it("traduce los valores con guion bajo a texto legible", () => {
    expect(STATUS_LABELS.en_proceso).toBe("En proceso");
    expect(STATUS_LABELS.rechazada_por_mi).toBe("Rechazada por mí");
    expect(PORTAL_LABELS.web_empresa).toBe("Web de la empresa");
  });
});

describe("formatAppliedAt", () => {
  it("formatea una fecha ISO en español", () => {
    expect(formatAppliedAt("2026-11-25")).toMatch(/^25 nov\.? 2026$/);
  });

  it("no desplaza el día en los límites de año", () => {
    expect(formatAppliedAt("2026-01-01")).toMatch(/^1 ene\.? 2026$/);
    expect(formatAppliedAt("2025-12-31")).toMatch(/^31 dic\.? 2025$/);
  });

  it("acepta el 29 de febrero de un año bisiesto", () => {
    expect(formatAppliedAt("2028-02-29")).toMatch(/^29 feb\.? 2028$/);
  });

  it("devuelve tal cual las fechas inexistentes o mal formadas", () => {
    expect(formatAppliedAt("2027-02-29")).toBe("2027-02-29");
    expect(formatAppliedAt("2026-13-01")).toBe("2026-13-01");
    expect(formatAppliedAt("25/11/2026")).toBe("25/11/2026");
    expect(formatAppliedAt("")).toBe("");
  });
});

describe("todayIsoDate", () => {
  it("usa la zona horaria de España por defecto", () => {
    expect(APP_TIME_ZONE).toBe("Europe/Madrid");
    // 23:30 UTC on 31 Dec is already 1 Jan in Madrid (UTC+1).
    expect(todayIsoDate(new Date("2026-12-31T23:30:00Z"))).toBe("2027-01-01");
  });

  it("devuelve el día de la zona horaria indicada", () => {
    const instant = new Date("2026-11-25T23:30:00Z");
    expect(todayIsoDate(instant, "UTC")).toBe("2026-11-25");
    expect(todayIsoDate(instant, "Europe/Madrid")).toBe("2026-11-26");
    expect(todayIsoDate(instant, "America/New_York")).toBe("2026-11-25");
  });

  it("rellena con ceros el mes y el día", () => {
    expect(todayIsoDate(new Date("2026-03-05T12:00:00Z"), "UTC")).toBe(
      "2026-03-05",
    );
  });
});
