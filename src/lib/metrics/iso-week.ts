/*
 * ISO 8601 weeks (Monday to Sunday; week 1 is the one with the year's first
 * Thursday) over calendar dates. Dates are Postgres `date` values
 * (`YYYY-MM-DD`) and are handled as day numbers counted in UTC, so no local
 * time zone or daylight saving change can move a date to another day.
 */

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;
export const MS_PER_DAY = 86_400_000;

export type IsoWeek = {
  /** ISO week-numbering year (may differ from the calendar year). */
  year: number;
  /** 1 to 53. */
  week: number;
  /** Sortable key, e.g. `2026-W05`. */
  key: string;
  /** Monday of the week, `YYYY-MM-DD`. */
  start: string;
  /** Sunday of the week, `YYYY-MM-DD`. */
  end: string;
};

/**
 * Days since 1970-01-01 of an ISO `YYYY-MM-DD` date, or `null` if the text is
 * not a real calendar date (e.g. `2027-02-29`). Years before 100 are not
 * supported (`Date.UTC` maps them to 19xx) and also give `null`.
 */
export function parseIsoDate(value: string): number | null {
  const match = ISO_DATE.exec(value);
  if (match === null) return null;
  const year = Number(match[1]);
  const month = Number(match[2]) - 1;
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month, day));
  const isSameDay =
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month &&
    date.getUTCDate() === day;
  return isSameDay ? Math.round(date.getTime() / MS_PER_DAY) : null;
}

/** `YYYY-MM-DD` of a day number (the inverse of `parseIsoDate`). */
export function formatIsoDate(dayNumber: number): string {
  return new Date(dayNumber * MS_PER_DAY).toISOString().slice(0, 10);
}

/** 0 for Monday … 6 for Sunday. */
function weekdayIndex(dayNumber: number): number {
  // 1970-01-01 was a Thursday (index 3).
  return (((dayNumber + 3) % 7) + 7) % 7;
}

/** Day number of the Monday of the ISO week that contains `dayNumber`. */
export function mondayOf(dayNumber: number): number {
  return dayNumber - weekdayIndex(dayNumber);
}

/** ISO week of a day number. */
export function isoWeekOfDay(dayNumber: number): IsoWeek {
  const monday = mondayOf(dayNumber);
  // The Thursday of the week decides the ISO year.
  const thursday = new Date((monday + 3) * MS_PER_DAY);
  const year = thursday.getUTCFullYear();
  const firstOfYear = Date.UTC(year, 0, 1) / MS_PER_DAY;
  const week = Math.floor((monday + 3 - firstOfYear) / 7) + 1;
  return {
    year,
    week,
    key: `${year}-W${String(week).padStart(2, "0")}`,
    start: formatIsoDate(monday),
    end: formatIsoDate(monday + 6),
  };
}

/** ISO week of a `YYYY-MM-DD` date, or `null` if it is not a valid date. */
export function isoWeekOf(value: string): IsoWeek | null {
  const day = parseIsoDate(value);
  return day === null ? null : isoWeekOfDay(day);
}

/**
 * Every ISO week from the one containing `from` to the one containing `to`,
 * both included, in order. Empty if `to` is before `from`.
 */
export function isoWeeksBetween(from: number, to: number): IsoWeek[] {
  const weeks: IsoWeek[] = [];
  if (to < from) return weeks;
  for (let monday = mondayOf(from); monday <= to; monday += 7) {
    weeks.push(isoWeekOfDay(monday));
  }
  return weeks;
}
