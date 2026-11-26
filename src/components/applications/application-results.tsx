import Link from "next/link";
import { ApplicationFilterBar } from "./application-filter-bar";
import { ApplicationList } from "./application-list";
import { EmptyApplications } from "./page-states";
import { PRIMARY_BUTTON_CLASS } from "@/components/ui/classes";
import {
  filterApplications,
  hasActiveFilters,
  resultsSummary,
  type ApplicationFilters,
} from "@/lib/applications/filter";
import type { Application } from "@/lib/applications/repository";
import { APPLICATIONS_PATH } from "@/lib/applications/routes";

function NoResults() {
  return (
    <div className="flex flex-col items-start gap-4 rounded-lg border border-dashed border-zinc-400 p-6">
      <p className="text-zinc-700 dark:text-zinc-300">
        Ninguna candidatura coincide con estos filtros.
      </p>
      <Link href={APPLICATIONS_PATH} className={PRIMARY_BUTTON_CLASS}>
        Ver todas las candidaturas
      </Link>
    </div>
  );
}

/**
 * The user's applications with the filter bar. Without applications only the
 * empty state is shown; with filters that match nothing, a "no results"
 * message with a way back to the full list. The number of results is
 * announced in a `role="status"` region.
 */
export function ApplicationResults({
  applications,
  filters,
}: {
  applications: readonly Application[];
  filters: ApplicationFilters;
}) {
  if (applications.length === 0) return <EmptyApplications />;

  const shown = filterApplications(applications, filters);
  return (
    <>
      <ApplicationFilterBar filters={filters} />
      <p role="status" className="text-sm text-zinc-700 dark:text-zinc-300">
        {resultsSummary(
          shown.length,
          applications.length,
          hasActiveFilters(filters),
        )}
      </p>
      {shown.length === 0 ? (
        <NoResults />
      ) : (
        <ApplicationList applications={shown} />
      )}
    </>
  );
}
