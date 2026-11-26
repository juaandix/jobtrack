import { afterEach, describe, expect, it, vi } from "vitest";
import {
  formatIsoDate,
  isoWeekOf,
  isoWeekOfDay,
  isoWeeksBetween,
  mondayOf,
  parseIsoDate,
} from "./iso-week";

function day(value: string): number {
  const parsed = parseIsoDate(value);
  if (parsed === null) throw new Error(`invalid test date ${value}`);
  return parsed;
}

describe("parseIsoDate y formatIsoDate", () => {
  it("cuenta los días desde 1970-01-01 y vuelve a la misma fecha", () => {
    expect(parseIsoDate("1970-01-01")).toBe(0);
    expect(parseIsoDate("1970-01-02")).toBe(1);
    expect(parseIsoDate("1969-12-31")).toBe(-1);
    for (const value of ["2026-11-26", "2028-02-29", "2027-01-01"]) {
      expect(formatIsoDate(day(value))).toBe(value);
    }
  });

  it("rechaza fechas inexistentes o mal formadas", () => {
    for (const value of [
      "2027-02-29",
      "2026-13-01",
      "2026-04-31",
      "2026-1-5",
      "26-11-2026",
      "2026-11-26T00:00:00Z",
      "",
      "0050-01-01",
    ]) {
      expect(parseIsoDate(value)).toBeNull();
    }
  });
});

describe("isoWeekOf", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("el lunes y el domingo son los límites de la semana", () => {
    // 2026-11-23 is a Monday and 2026-11-29 a Sunday.
    const monday = isoWeekOf("2026-11-23");
    const sunday = isoWeekOf("2026-11-29");
    expect(monday).toEqual({
      year: 2026,
      week: 48,
      key: "2026-W48",
      start: "2026-11-23",
      end: "2026-11-29",
    });
    expect(sunday).toEqual(monday);
    expect(isoWeekOf("2026-11-22")?.key).toBe("2026-W47");
    expect(isoWeekOf("2026-11-30")?.key).toBe("2026-W49");
  });

  it("los últimos días de 2026 y el 1 de enero de 2027 son la semana 53 de 2026", () => {
    // 2026 starts on a Thursday, so it has 53 ISO weeks.
    for (const value of [
      "2026-12-28",
      "2026-12-31",
      "2027-01-01",
      "2027-01-03",
    ]) {
      expect(isoWeekOf(value)).toMatchObject({
        year: 2026,
        week: 53,
        key: "2026-W53",
        start: "2026-12-28",
        end: "2027-01-03",
      });
    }
    expect(isoWeekOf("2027-01-04")).toMatchObject({
      year: 2027,
      week: 1,
      key: "2027-W01",
    });
  });

  it("enero puede pertenecer a la semana 52 o 53 del año anterior", () => {
    expect(isoWeekOf("2021-01-03")?.key).toBe("2020-W53");
    expect(isoWeekOf("2022-01-02")?.key).toBe("2021-W52");
    expect(isoWeekOf("2023-01-01")?.key).toBe("2022-W52");
  });

  it("finales de diciembre puede ser la semana 1 del año siguiente", () => {
    expect(isoWeekOf("2024-12-30")?.key).toBe("2025-W01");
    expect(isoWeekOf("2025-12-29")?.key).toBe("2026-W01");
    expect(isoWeekOf("2026-01-01")?.key).toBe("2026-W01");
  });

  it("no depende de la zona horaria del proceso", () => {
    vi.stubEnv("TZ", "Pacific/Kiritimati");
    expect(isoWeekOf("2026-11-23")?.start).toBe("2026-11-23");
    vi.stubEnv("TZ", "America/Los_Angeles");
    expect(isoWeekOf("2026-11-29")?.end).toBe("2026-11-29");
  });

  it("devuelve null con una fecha no válida", () => {
    expect(isoWeekOf("2026-02-30")).toBeNull();
  });
});

describe("mondayOf e isoWeekOfDay", () => {
  it("lleva cualquier día a su lunes", () => {
    expect(formatIsoDate(mondayOf(day("2026-11-26")))).toBe("2026-11-23");
    expect(formatIsoDate(mondayOf(day("2026-11-23")))).toBe("2026-11-23");
    expect(formatIsoDate(mondayOf(day("1969-12-31")))).toBe("1969-12-29");
  });

  it("calcula la semana de días anteriores a 1970", () => {
    expect(isoWeekOfDay(day("1969-12-31")).key).toBe("1970-W01");
  });
});

describe("isoWeeksBetween", () => {
  it("incluye la semana de inicio y la de fin aunque sean días intermedios", () => {
    const weeks = isoWeeksBetween(day("2026-11-26"), day("2026-12-09"));
    expect(weeks.map((week) => week.key)).toEqual([
      "2026-W48",
      "2026-W49",
      "2026-W50",
    ]);
  });

  it("cruza el cambio de año sin saltarse la semana 53", () => {
    const weeks = isoWeeksBetween(day("2026-12-21"), day("2027-01-11"));
    expect(weeks.map((week) => week.key)).toEqual([
      "2026-W52",
      "2026-W53",
      "2027-W01",
      "2027-W02",
    ]);
  });

  it("un solo día da una sola semana y un rango invertido ninguna", () => {
    expect(isoWeeksBetween(day("2026-11-26"), day("2026-11-26"))).toHaveLength(
      1,
    );
    expect(isoWeeksBetween(day("2026-12-09"), day("2026-11-26"))).toEqual([]);
    // Same week, but `to` is still before `from`.
    expect(isoWeeksBetween(day("2026-11-26"), day("2026-11-24"))).toEqual([]);
  });
});
