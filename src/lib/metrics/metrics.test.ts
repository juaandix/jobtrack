import { describe, expect, it } from "vitest";
import {
  METRICS_WEEKS,
  buildMetrics,
  countByIsoWeek,
  countByStatus,
  isResponded,
  lastWeeksRange,
  nonZeroStatuses,
  responseRate,
  statusByPortal,
  summarize,
  type MetricsApplication,
} from "./metrics";
import {
  APPLICATION_PORTALS,
  APPLICATION_STATUSES,
  type ApplicationPortal,
  type ApplicationStatus,
} from "@/lib/validation/application";

function app(
  applied_at: string,
  status: ApplicationStatus = "enviada",
  portal: ApplicationPortal = "linkedin",
): MetricsApplication {
  return { applied_at, status, portal };
}

const ZERO_COUNTS = {
  enviada: 0,
  en_proceso: 0,
  entrevista: 0,
  oferta: 0,
  descartada: 0,
  rechazada_por_mi: 0,
};

describe("isResponded", () => {
  it("solo 'enviada' cuenta como sin respuesta", () => {
    for (const status of APPLICATION_STATUSES) {
      expect(isResponded(status)).toBe(status !== "enviada");
    }
  });
});

describe("lastWeeksRange", () => {
  it("va desde el mismo día de hace N-1 semanas hasta hoy", () => {
    expect(lastWeeksRange("2026-11-26", 12)).toEqual({
      from: "2026-09-10",
      to: "2026-11-26",
    });
    expect(lastWeeksRange("2026-11-26", 1)).toEqual({
      from: "2026-11-26",
      to: "2026-11-26",
    });
  });

  it("menos de una semana cuenta como una y redondea hacia abajo", () => {
    expect(lastWeeksRange("2026-11-26", 0)).toEqual({
      from: "2026-11-26",
      to: "2026-11-26",
    });
    expect(lastWeeksRange("2026-11-26", 2.9)).toEqual({
      from: "2026-11-19",
      to: "2026-11-26",
    });
  });

  it("devuelve null si hoy no es una fecha válida", () => {
    expect(lastWeeksRange("hoy", 12)).toBeNull();
  });
});

describe("countByIsoWeek", () => {
  it("sin candidaturas ni rango no hay semanas", () => {
    expect(countByIsoWeek([])).toEqual([]);
  });

  it("con una candidatura da su semana con 1", () => {
    expect(countByIsoWeek([app("2026-11-26")])).toEqual([
      {
        year: 2026,
        week: 48,
        key: "2026-W48",
        start: "2026-11-23",
        end: "2026-11-29",
        count: 1,
      },
    ]);
  });

  it("rellena a 0 las semanas vacías entre la primera y la última", () => {
    const weeks = countByIsoWeek([
      app("2026-11-26"),
      app("2026-11-02"),
      app("2026-11-08"),
    ]);
    expect(weeks.map(({ key, count }) => [key, count])).toEqual([
      ["2026-W45", 2],
      ["2026-W46", 0],
      ["2026-W47", 0],
      ["2026-W48", 1],
    ]);
  });

  it("el lunes y el domingo cuentan en la misma semana", () => {
    const weeks = countByIsoWeek([
      app("2026-11-23"),
      app("2026-11-29"),
      app("2026-11-30"),
    ]);
    expect(weeks.map(({ key, count }) => [key, count])).toEqual([
      ["2026-W48", 2],
      ["2026-W49", 1],
    ]);
  });

  it("agrupa en la semana 53 de 2026 los días de 2026 y de enero de 2027", () => {
    const weeks = countByIsoWeek([
      app("2026-12-31"),
      app("2027-01-01"),
      app("2027-01-04"),
    ]);
    expect(weeks.map(({ key, count }) => [key, count])).toEqual([
      ["2026-W53", 2],
      ["2027-W01", 1],
    ]);
  });

  it("con rango, incluye todas sus semanas a 0 e ignora lo que queda fuera", () => {
    const weeks = countByIsoWeek(
      [app("2026-11-24"), app("2026-08-01"), app("2026-12-01")],
      { from: "2026-11-12", to: "2026-11-26" },
    );
    expect(weeks.map(({ key, count }) => [key, count])).toEqual([
      ["2026-W46", 0],
      ["2026-W47", 0],
      ["2026-W48", 1],
    ]);
  });

  it("con rango y sin candidaturas da todas las semanas a 0", () => {
    const weeks = countByIsoWeek([], { from: "2026-11-16", to: "2026-11-26" });
    expect(weeks.map(({ count }) => count)).toEqual([0, 0]);
  });

  it("un rango con fechas no válidas no da semanas", () => {
    expect(
      countByIsoWeek([app("2026-11-26")], { from: "x", to: "2026-11-26" }),
    ).toEqual([]);
    expect(
      countByIsoWeek([app("2026-11-26")], { from: "2026-11-26", to: "x" }),
    ).toEqual([]);
  });

  it("descarta las fechas no válidas", () => {
    expect(countByIsoWeek([app("2026-02-30")])).toEqual([]);
    expect(
      countByIsoWeek([app("no es fecha"), app("2026-11-26")]).map(
        ({ count }) => count,
      ),
    ).toEqual([1]);
  });

  it("no modifica la entrada", () => {
    const input = [app("2026-11-26"), app("2026-11-02")];
    const copy = structuredClone(input);
    countByIsoWeek(input);
    expect(input).toEqual(copy);
  });
});

describe("countByStatus", () => {
  it("devuelve todos los estados a 0 sin datos", () => {
    expect(countByStatus([])).toEqual(ZERO_COUNTS);
  });

  it("cuenta cada estado", () => {
    expect(
      countByStatus([
        app("2026-11-01", "oferta"),
        app("2026-11-02", "oferta"),
        app("2026-11-03", "descartada"),
      ]),
    ).toEqual({ ...ZERO_COUNTS, oferta: 2, descartada: 1 });
  });
});

describe("responseRate", () => {
  it("sin datos es 0 %, no NaN", () => {
    const rate = responseRate([]);
    expect(rate).toEqual({ responded: 0, total: 0, percent: 0 });
    expect(Number.isNaN(rate.percent)).toBe(false);
  });

  it("con una sola candidatura enviada es 0 % y respondida 100 %", () => {
    expect(responseRate([app("2026-11-26")]).percent).toBe(0);
    expect(responseRate([app("2026-11-26", "entrevista")]).percent).toBe(100);
  });

  it("cuenta como respondidas las descartadas y las rechazadas por mí", () => {
    expect(
      responseRate([
        app("2026-11-01", "enviada"),
        app("2026-11-02", "enviada"),
        app("2026-11-03", "enviada"),
        app("2026-11-04", "descartada"),
        app("2026-11-05", "rechazada_por_mi"),
      ]),
    ).toEqual({ responded: 2, total: 5, percent: 40 });
  });

  it("redondea el porcentaje (1 de 8 → 13 %)", () => {
    const applications = [
      app("2026-11-01", "oferta"),
      ...Array.from({ length: 7 }, () => app("2026-11-02")),
    ];
    expect(responseRate(applications).percent).toBe(13);
  });
});

describe("statusByPortal", () => {
  it("devuelve todos los portales del enum, en orden, a 0 sin datos", () => {
    const rows = statusByPortal([]);
    expect(rows.map((row) => row.portal)).toEqual([...APPLICATION_PORTALS]);
    for (const row of rows) {
      expect(row.total).toBe(0);
      expect(row.counts).toEqual(ZERO_COUNTS);
    }
  });

  it("cruza portal y estado y deja a 0 lo que falta", () => {
    const rows = statusByPortal([
      app("2026-11-01", "enviada", "linkedin"),
      app("2026-11-02", "entrevista", "linkedin"),
      app("2026-11-03", "entrevista", "infojobs"),
    ]);
    const byPortal = new Map(rows.map((row) => [row.portal, row]));
    expect(byPortal.get("linkedin")).toEqual({
      portal: "linkedin",
      total: 2,
      counts: { ...ZERO_COUNTS, enviada: 1, entrevista: 1 },
    });
    expect(byPortal.get("infojobs")?.counts).toEqual({
      ...ZERO_COUNTS,
      entrevista: 1,
    });
    expect(byPortal.get("referido")).toEqual({
      portal: "referido",
      total: 0,
      counts: ZERO_COUNTS,
    });
  });
});

describe("summarize", () => {
  it("sin datos todo es 0", () => {
    expect(summarize([])).toEqual({
      total: 0,
      responseRate: { responded: 0, total: 0, percent: 0 },
      active: 0,
      interviews: 0,
      offers: 0,
    });
  });

  it("los procesos activos son 'en proceso' más 'entrevista'", () => {
    expect(
      summarize([
        app("2026-11-01", "en_proceso"),
        app("2026-11-02", "entrevista"),
        app("2026-11-03", "entrevista"),
        app("2026-11-04", "oferta"),
        app("2026-11-05", "enviada"),
      ]),
    ).toEqual({
      total: 5,
      responseRate: { responded: 4, total: 5, percent: 80 },
      active: 3,
      interviews: 2,
      offers: 1,
    });
  });
});

describe("buildMetrics", () => {
  it("serie de las últimas 12 semanas hasta hoy, con etiquetas", () => {
    const metrics = buildMetrics(
      [app("2026-11-26", "entrevista", "infojobs"), app("2026-09-01")],
      "2026-11-26",
    );
    expect(metrics.weekly).toHaveLength(METRICS_WEEKS);
    expect(metrics.weekly[0]?.key).toBe("2026-W37");
    const last = metrics.weekly.at(-1);
    expect(last).toMatchObject({ key: "2026-W48", count: 1 });
    expect(last?.shortLabel).toMatch(/^23 nov\.?$/);
    expect(last?.label).toMatch(
      /^Semana 48 de 2026 \(23 nov\.? 2026 – 29 nov\.? 2026\)$/,
    );
    // The September application is outside the series but in the totals.
    expect(metrics.weekly.reduce((sum, week) => sum + week.count, 0)).toBe(1);
    expect(metrics.summary.total).toBe(2);
    expect(metrics.statusTotals).toEqual({
      ...ZERO_COUNTS,
      enviada: 1,
      entrevista: 1,
    });
    expect(metrics.portals).toHaveLength(APPLICATION_PORTALS.length);
  });

  it("sin datos da la serie a 0 y todos los totales a 0", () => {
    const metrics = buildMetrics([], "2027-01-10", 3);
    expect(metrics.weekly.map(({ key, count }) => [key, count])).toEqual([
      ["2026-W52", 0],
      ["2026-W53", 0],
      ["2027-W01", 0],
    ]);
    expect(metrics.summary.responseRate.percent).toBe(0);
    expect(metrics.statusTotals).toEqual(ZERO_COUNTS);
  });

  it("si hoy no es válido usa las semanas entre la primera y la última", () => {
    const metrics = buildMetrics(
      [app("2026-11-02"), app("2026-11-16")],
      "no es fecha",
    );
    expect(metrics.weekly.map(({ count }) => count)).toEqual([1, 0, 1]);
  });
});

describe("nonZeroStatuses", () => {
  const zero = countByStatus([]);

  it("sin candidaturas devuelve una lista vacía", () => {
    expect(nonZeroStatuses(zero)).toEqual([]);
  });

  it("solo incluye los estados con candidaturas, en el orden del enum", () => {
    expect(
      nonZeroStatuses({ ...zero, rechazada_por_mi: 1, enviada: 3, oferta: 2 }),
    ).toEqual([
      { status: "enviada", count: 3 },
      { status: "oferta", count: 2 },
      { status: "rechazada_por_mi", count: 1 },
    ]);
  });

  it("con todos los estados ocupados los devuelve todos", () => {
    const all = countByStatus(
      APPLICATION_STATUSES.map((status) => ({
        status,
        portal: "otro",
        applied_at: "2026-11-26",
      })),
    );
    expect(nonZeroStatuses(all).map(({ status }) => status)).toEqual([
      ...APPLICATION_STATUSES,
    ]);
  });
});
