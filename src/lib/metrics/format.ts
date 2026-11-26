import { formatAppliedAt } from "@/lib/applications/labels";
import { MS_PER_DAY, parseIsoDate, type IsoWeek } from "./iso-week";

/*
 * Number and date formatting of the metrics, in Spanish. Percentages are
 * integers rounded half up (12.5 → 13) everywhere, so the KPI, the chart and
 * the table always show the same figure.
 */

const countFormatter = new Intl.NumberFormat("es-ES", {
  maximumFractionDigits: 0,
});

const shortDateFormatter = new Intl.DateTimeFormat("es-ES", {
  day: "numeric",
  month: "short",
  timeZone: "UTC",
});

/**
 * `part` as an integer percentage of `total`. A total of 0 (or a negative or
 * non-finite input) gives 0, never `NaN` or `Infinity`.
 */
export function percentOf(part: number, total: number): number {
  if (!Number.isFinite(part) || !Number.isFinite(total) || total <= 0) {
    return 0;
  }
  return Math.round((part * 100) / total);
}

/** e.g. 1234 → "1234", 12345 → "12.345" (Spanish grouping). */
export function formatCount(value: number): string {
  return countFormatter.format(value);
}

/** e.g. 40 → "40 %" (with a non-breaking space, as Spanish writes it). */
export function formatPercent(percent: number): string {
  return `${countFormatter.format(percent)} %`;
}

/** Day and month of an ISO date for chart axes, e.g. "23 nov". */
export function formatShortDate(value: string): string {
  const day = parseIsoDate(value);
  if (day === null) return value;
  return shortDateFormatter.format(new Date(day * MS_PER_DAY));
}

/** Full label of a week, e.g. "Semana 48 de 2026 (23 nov 2026 – 29 nov 2026)". */
export function formatWeekLabel(week: IsoWeek): string {
  return `Semana ${week.week} de ${week.year} (${formatAppliedAt(week.start)} – ${formatAppliedAt(week.end)})`;
}
