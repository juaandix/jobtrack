import type {
  ApplicationPortal,
  ApplicationStatus,
} from "@/lib/validation/application";

/**
 * Spanish labels for every status and portal. `Record` over the enum types
 * makes the compiler require a label for each value of the SQL enums.
 */
export const STATUS_LABELS: Readonly<Record<ApplicationStatus, string>> = {
  enviada: "Enviada",
  en_proceso: "En proceso",
  entrevista: "Entrevista",
  oferta: "Oferta",
  descartada: "Descartada",
  rechazada_por_mi: "Rechazada por mí",
};

export const PORTAL_LABELS: Readonly<Record<ApplicationPortal, string>> = {
  linkedin: "LinkedIn",
  infojobs: "InfoJobs",
  tecnoempleo: "Tecnoempleo",
  indeed: "Indeed",
  web_empresa: "Web de la empresa",
  referido: "Referido",
  otro: "Otro",
};

/** Time zone used to decide which day "today" is (the app is for Spain). */
export const APP_TIME_ZONE = "Europe/Madrid";

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

const dateFormatter = new Intl.DateTimeFormat("es-ES", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

/**
 * Formats an ISO `YYYY-MM-DD` date (a Postgres `date`) for the interface, e.g.
 * "25 nov 2026". The date is read as UTC so the day never shifts with the
 * server's time zone. Anything that is not a valid ISO date is returned as is.
 */
export function formatAppliedAt(value: string): string {
  const match = ISO_DATE.exec(value);
  if (match === null) return value;
  const [, year, month, day] = match;
  const date = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
  const isSameDay =
    date.getUTCFullYear() === Number(year) &&
    date.getUTCMonth() === Number(month) - 1 &&
    date.getUTCDate() === Number(day);
  return isSameDay ? dateFormatter.format(date) : value;
}

/** `YYYY-MM-DD` of `now` in the given time zone (for `<input type="date">`). */
export function todayIsoDate(
  now: Date,
  timeZone: string = APP_TIME_ZONE,
): string {
  // `en-CA` formats dates as YYYY-MM-DD.
  return new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone,
  }).format(now);
}
