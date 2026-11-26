import { formatShortDate, formatWeekLabel, percentOf } from "./format";
import {
  formatIsoDate,
  isoWeekOfDay,
  isoWeeksBetween,
  parseIsoDate,
  type IsoWeek,
} from "./iso-week";
import type { Application } from "@/lib/applications/repository";
import {
  APPLICATION_PORTALS,
  APPLICATION_STATUSES,
  type ApplicationPortal,
  type ApplicationStatus,
} from "@/lib/validation/application";

/*
 * Pure metrics of the user's applications. Every function only reads the
 * fields it needs, never mutates its input and returns all the statuses and
 * portals of the SQL enums (at 0 when there is none), in enum order.
 */

export type MetricsApplication = Pick<
  Application,
  "status" | "portal" | "applied_at"
>;

export type StatusCounts = Record<ApplicationStatus, number>;

export type WeeklyCount = IsoWeek & { count: number };

/** A week ready to display: its count and its labels. */
export type WeeklyPoint = WeeklyCount & {
  /** Short label for the chart axis, e.g. "23 nov" (the Monday). */
  shortLabel: string;
  /** Full label for the table, e.g. "Semana 48 de 2026 (…)". */
  label: string;
};

export type DateRange = { from: string; to: string };

export type ResponseRate = {
  responded: number;
  total: number;
  /** Integer percentage, 0 when there are no applications. */
  percent: number;
};

export type PortalStatusRow = {
  portal: ApplicationPortal;
  total: number;
  counts: StatusCounts;
};

export type MetricsSummary = {
  total: number;
  responseRate: ResponseRate;
  /** Still open processes: "en proceso" plus "entrevista". */
  active: number;
  interviews: number;
  offers: number;
};

export type Metrics = {
  summary: MetricsSummary;
  /** Weeks of the range given to `buildMetrics`, empty ones at 0. */
  weekly: WeeklyPoint[];
  portals: PortalStatusRow[];
  statusTotals: StatusCounts;
};

/** Number of weeks shown by the metrics page. */
export const METRICS_WEEKS = 12;

/** An application counts as answered once it has left "enviada". */
export function isResponded(status: ApplicationStatus): boolean {
  return status !== "enviada";
}

function emptyStatusCounts(): StatusCounts {
  return {
    enviada: 0,
    en_proceso: 0,
    entrevista: 0,
    oferta: 0,
    descartada: 0,
    rechazada_por_mi: 0,
  };
}

/**
 * The `weeks` ISO weeks that end with the week of `today` (a `YYYY-MM-DD`
 * date), as a date range. `weeks` below 1 counts as 1. `null` if `today` is
 * not a valid date.
 */
export function lastWeeksRange(today: string, weeks: number): DateRange | null {
  const day = parseIsoDate(today);
  if (day === null) return null;
  const count = Math.max(1, Math.floor(weeks));
  return { from: formatIsoDate(day - (count - 1) * 7), to: today };
}

/**
 * Applications per ISO week (Monday to Sunday) by `applied_at`. Weeks without
 * applications are included at 0. With a `range`, the weeks are those from the
 * week of `range.from` to the week of `range.to` and applications outside them
 * are ignored; without it, from the first to the last application. Invalid
 * dates are skipped.
 */
export function countByIsoWeek(
  applications: readonly MetricsApplication[],
  range?: DateRange,
): WeeklyCount[] {
  const counts = new Map<string, number>();
  let first: number | null = null;
  let last: number | null = null;
  for (const application of applications) {
    const day = parseIsoDate(application.applied_at);
    if (day === null) continue;
    first = first === null ? day : Math.min(first, day);
    last = last === null ? day : Math.max(last, day);
    const { key } = isoWeekOfDay(day);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  let weeks: IsoWeek[];
  if (range === undefined) {
    if (first === null || last === null) return [];
    weeks = isoWeeksBetween(first, last);
  } else {
    const from = parseIsoDate(range.from);
    const to = parseIsoDate(range.to);
    if (from === null || to === null) return [];
    weeks = isoWeeksBetween(from, to);
  }
  return weeks.map((week) => ({ ...week, count: counts.get(week.key) ?? 0 }));
}

/** Applications per status. */
export function countByStatus(
  applications: readonly MetricsApplication[],
): StatusCounts {
  const counts = emptyStatusCounts();
  for (const { status } of applications) {
    counts[status] += 1;
  }
  return counts;
}

/** Answered applications (status other than "enviada") over the total. */
export function responseRate(
  applications: readonly MetricsApplication[],
): ResponseRate {
  const total = applications.length;
  const responded = applications.filter(({ status }) =>
    isResponded(status),
  ).length;
  return { responded, total, percent: percentOf(responded, total) };
}

/** One row per portal with the applications of each status. */
export function statusByPortal(
  applications: readonly MetricsApplication[],
): PortalStatusRow[] {
  return APPLICATION_PORTALS.map((portal) => {
    const counts = countByStatus(
      applications.filter((application) => application.portal === portal),
    );
    const total = APPLICATION_STATUSES.reduce(
      (sum, status) => sum + counts[status],
      0,
    );
    return { portal, total, counts };
  });
}

/** The KPI cards. */
export function summarize(
  applications: readonly MetricsApplication[],
): MetricsSummary {
  const counts = countByStatus(applications);
  return {
    total: applications.length,
    responseRate: responseRate(applications),
    active: counts.en_proceso + counts.entrevista,
    interviews: counts.entrevista,
    offers: counts.oferta,
  };
}

/**
 * Everything the metrics page shows. The weekly series covers the last
 * `weeks` ISO weeks up to `today`; if `today` is not a valid date it falls
 * back to the weeks between the first and the last application.
 */
export function buildMetrics(
  applications: readonly MetricsApplication[],
  today: string,
  weeks: number = METRICS_WEEKS,
): Metrics {
  const range = lastWeeksRange(today, weeks) ?? undefined;
  return {
    summary: summarize(applications),
    weekly: countByIsoWeek(applications, range).map((week) => ({
      ...week,
      shortLabel: formatShortDate(week.start),
      label: formatWeekLabel(week),
    })),
    portals: statusByPortal(applications),
    statusTotals: countByStatus(applications),
  };
}

/**
 * The statuses with at least one application, in the order of the SQL enum,
 * with their count: the compact view of a portal on small screens.
 */
export function nonZeroStatuses(
  counts: StatusCounts,
): { status: ApplicationStatus; count: number }[] {
  return APPLICATION_STATUSES.filter((status) => counts[status] > 0).map(
    (status) => ({ status, count: counts[status] }),
  );
}
