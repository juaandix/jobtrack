import { APPLICATIONS_PATH } from "./routes";
import type { Application } from "./repository";
import {
  applicationPortalSchema,
  applicationStatusSchema,
  type ApplicationPortal,
  type ApplicationStatus,
} from "@/lib/validation/application";

/*
 * Filters of the applications list. They live in the URL (`?status=…&portal=…
 * &q=…`) so they survive a reload and can be shared; the list is filtered in
 * memory over what `listApplications` returns (RLS already limits the rows).
 */

/** Names of the URL parameters. */
export const FILTER_PARAMS = {
  status: "status",
  portal: "portal",
  query: "q",
} as const;

export type ApplicationFilters = {
  status: ApplicationStatus | null;
  portal: ApplicationPortal | null;
  /** Trimmed text searched in `company`; empty means no text filter. */
  query: string;
};

export const NO_FILTERS: ApplicationFilters = {
  status: null,
  portal: null,
  query: "",
};

/** Shape of Next's `searchParams` (and of the values read from a form). */
export type FilterSearchParams = Readonly<
  Record<string, string | readonly string[] | undefined>
>;

type FilterableApplication = Pick<Application, "company" | "status" | "portal">;

/**
 * Lower case without diacritics ("Telefónica" → "telefonica", "ÑANDÚ" →
 * "nandu"): NFD splits each accented letter into the base letter plus its
 * combining marks, which are then removed.
 */
export function normalizeText(value: string): string {
  return value.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
}

/**
 * Applications that match every active criterion (AND). Empty criteria do not
 * filter. The input order is kept.
 */
export function filterApplications<T extends FilterableApplication>(
  applications: readonly T[],
  filters: ApplicationFilters,
): T[] {
  const query = normalizeText(filters.query.trim());
  return applications.filter(
    (application) =>
      (filters.status === null || application.status === filters.status) &&
      (filters.portal === null || application.portal === filters.portal) &&
      (query === "" || normalizeText(application.company).includes(query)),
  );
}

/**
 * First value of a parameter. A repeated parameter (`?status=a&status=b`)
 * uses only its first occurrence, as a native GET form would.
 */
function firstValue(value: string | readonly string[] | undefined): string {
  if (value === undefined) return "";
  if (typeof value === "string") return value;
  return value[0] ?? "";
}

/**
 * Criteria from the URL. Unknown or invalid enum values are ignored (no
 * filter) instead of breaking the page; the text is trimmed.
 */
export function parseApplicationFilters(
  params: FilterSearchParams,
): ApplicationFilters {
  const status = applicationStatusSchema.safeParse(
    firstValue(params[FILTER_PARAMS.status]),
  );
  const portal = applicationPortalSchema.safeParse(
    firstValue(params[FILTER_PARAMS.portal]),
  );
  return {
    status: status.success ? status.data : null,
    portal: portal.success ? portal.data : null,
    query: firstValue(params[FILTER_PARAMS.query]).trim(),
  };
}

/** Same as `parseApplicationFilters`, reading the filter form's fields. */
export function filtersFromFormData(formData: FormData): ApplicationFilters {
  const params: Record<string, string> = {};
  for (const name of Object.values(FILTER_PARAMS)) {
    const value = formData.get(name);
    if (typeof value === "string") params[name] = value;
  }
  return parseApplicationFilters(params);
}

export function hasActiveFilters(filters: ApplicationFilters): boolean {
  return (
    filters.status !== null ||
    filters.portal !== null ||
    filters.query.trim() !== ""
  );
}

/**
 * List URL with only the active criteria (no empty parameters), e.g.
 * `/dashboard?status=oferta&q=acme`; without criteria, `/dashboard`.
 */
export function applicationFiltersHref(filters: ApplicationFilters): string {
  const params = new URLSearchParams();
  if (filters.status !== null) params.set(FILTER_PARAMS.status, filters.status);
  if (filters.portal !== null) params.set(FILTER_PARAMS.portal, filters.portal);
  const query = filters.query.trim();
  if (query !== "") params.set(FILTER_PARAMS.query, query);
  const search = params.toString();
  return search === "" ? APPLICATIONS_PATH : `${APPLICATIONS_PATH}?${search}`;
}

/** "1 candidatura", "3 candidaturas". */
export function applicationsCount(count: number): string {
  return `${count} ${count === 1 ? "candidatura" : "candidaturas"}`;
}

/**
 * Text announced with the results: "3 candidaturas" without filters and
 * "1 de 3 candidaturas" with them.
 */
export function resultsSummary(
  shown: number,
  total: number,
  filtered: boolean,
): string {
  return filtered
    ? `${shown} de ${applicationsCount(total)}`
    : applicationsCount(total);
}
