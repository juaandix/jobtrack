"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useTransition } from "react";
import {
  CONTROL_CLASS,
  LABEL_CLASS,
  PRIMARY_BUTTON_CLASS,
  SECONDARY_BUTTON_CLASS,
} from "@/components/ui/classes";
import {
  FILTER_PARAMS,
  applicationFiltersHref,
  filtersFromFormData,
  hasActiveFilters,
  type ApplicationFilters,
} from "@/lib/applications/filter";
import { PORTAL_LABELS, STATUS_LABELS } from "@/lib/applications/labels";
import { APPLICATIONS_PATH } from "@/lib/applications/routes";
import {
  APPLICATION_PORTALS,
  APPLICATION_STATUSES,
} from "@/lib/validation/application";

/**
 * Filters of the list. It is a plain GET form, so it works without
 * JavaScript; with it, the submit navigates on the client to a URL with only
 * the active criteria. The fields follow `filters` (the URL) when it changes
 * without a remount (e.g. "Limpiar filtros" or the back button), so the focus
 * stays where it was.
 */
export function ApplicationFilterBar({
  filters,
}: {
  filters: ApplicationFilters;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const id = useId();
  const formRef = useRef<HTMLFormElement>(null);
  const { status, portal, query } = filters;

  useEffect(() => {
    const form = formRef.current;
    if (form === null) return;
    const values = {
      [FILTER_PARAMS.query]: query,
      [FILTER_PARAMS.status]: status ?? "",
      [FILTER_PARAMS.portal]: portal ?? "",
    };
    for (const [name, value] of Object.entries(values)) {
      const field = form.elements.namedItem(name);
      if (
        field instanceof HTMLInputElement ||
        field instanceof HTMLSelectElement
      ) {
        field.value = value;
      }
    }
  }, [status, portal, query]);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const href = applicationFiltersHref(
      filtersFromFormData(new FormData(event.currentTarget)),
    );
    startTransition(() => {
      router.push(href);
    });
  }

  return (
    <form
      ref={formRef}
      role="search"
      aria-label="Filtrar candidaturas"
      method="get"
      action={APPLICATIONS_PATH}
      onSubmit={handleSubmit}
      className="grid min-w-0 gap-3 rounded-lg border border-zinc-300 bg-white p-4 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_auto] lg:items-end dark:border-zinc-700 dark:bg-zinc-950"
    >
      <div className="flex min-w-0 flex-col gap-1 sm:col-span-2 lg:col-span-1">
        <label htmlFor={`${id}-q`} className={LABEL_CLASS}>
          Buscar por empresa
        </label>
        <input
          id={`${id}-q`}
          name={FILTER_PARAMS.query}
          type="search"
          autoComplete="off"
          defaultValue={filters.query}
          className={CONTROL_CLASS}
        />
      </div>
      <div className="flex min-w-0 flex-col gap-1">
        <label htmlFor={`${id}-status`} className={LABEL_CLASS}>
          Filtrar por estado
        </label>
        <select
          id={`${id}-status`}
          name={FILTER_PARAMS.status}
          defaultValue={filters.status ?? ""}
          className={CONTROL_CLASS}
        >
          <option value="">Todos</option>
          {APPLICATION_STATUSES.map((status) => (
            <option key={status} value={status}>
              {STATUS_LABELS[status]}
            </option>
          ))}
        </select>
      </div>
      <div className="flex min-w-0 flex-col gap-1">
        <label htmlFor={`${id}-portal`} className={LABEL_CLASS}>
          Filtrar por portal
        </label>
        <select
          id={`${id}-portal`}
          name={FILTER_PARAMS.portal}
          defaultValue={filters.portal ?? ""}
          className={CONTROL_CLASS}
        >
          <option value="">Todos</option>
          {APPLICATION_PORTALS.map((portal) => (
            <option key={portal} value={portal}>
              {PORTAL_LABELS[portal]}
            </option>
          ))}
        </select>
      </div>
      <div className="flex flex-wrap gap-2 sm:col-span-2 lg:col-span-1">
        <button type="submit" className={PRIMARY_BUTTON_CLASS}>
          {pending ? "Filtrando…" : "Filtrar"}
        </button>
        {hasActiveFilters(filters) ? (
          <Link href={APPLICATIONS_PATH} className={SECONDARY_BUTTON_CLASS}>
            Limpiar filtros
          </Link>
        ) : null}
      </div>
    </form>
  );
}
