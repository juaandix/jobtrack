import { useDroppable } from "@dnd-kit/core";
import { KanbanCard } from "./kanban-card";
import { applicationsCount } from "@/lib/applications/filter";
import type { KanbanColumn as Column } from "@/lib/applications/kanban";
import { columnLabel } from "@/lib/applications/kanban-a11y";
import { STATUS_LABELS } from "@/lib/applications/labels";
import type { ApplicationStatus } from "@/lib/validation/application";

type KanbanColumnProps = {
  column: Column;
  isSaving: (id: string) => boolean;
  selectId: (id: string) => string;
  onStatusChange: (id: string, status: ApplicationStatus) => void;
};

/**
 * One status column, a drop target whose id is the status. The region is
 * named with the number of cards ("Entrevista, 2 candidaturas"); in the
 * heading the visible counter is hidden from assistive technologies and
 * replaced by its full text, so it is not read as a bare number.
 */
export function KanbanColumn({
  column,
  isSaving,
  selectId,
  onStatusChange,
}: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: column.status });
  const label = STATUS_LABELS[column.status];

  return (
    <section
      ref={setNodeRef}
      aria-label={columnLabel(column.status, column.count)}
      className={`flex w-72 shrink-0 flex-col gap-3 rounded-lg border bg-zinc-50 p-3 xl:w-auto xl:min-w-0 xl:flex-1 dark:bg-zinc-900 ${
        isOver
          ? "border-blue-700 ring-2 ring-blue-700"
          : "border-zinc-300 dark:border-zinc-700"
      }`}
    >
      <h2 className="flex items-center justify-between gap-2 font-semibold text-zinc-900 dark:text-zinc-50">
        <span>{label}</span>
        <span className="sr-only">{applicationsCount(column.count)}</span>
        <span
          aria-hidden="true"
          className="min-w-7 rounded-full border border-zinc-400 bg-white px-2 text-center text-sm font-medium text-zinc-800 dark:bg-zinc-950 dark:text-zinc-200"
        >
          {column.count}
        </span>
      </h2>
      {column.count === 0 ? (
        <p className="rounded-md border border-dashed border-zinc-400 px-3 py-6 text-center text-sm text-zinc-700 dark:text-zinc-300">
          Sin candidaturas
        </p>
      ) : (
        <ul
          aria-label={`Candidaturas en ${label}`}
          className="flex flex-col gap-3"
        >
          {column.applications.map((application) => (
            <KanbanCard
              key={application.id}
              application={application}
              saving={isSaving(application.id)}
              selectId={selectId(application.id)}
              onStatusChange={onStatusChange}
            />
          ))}
        </ul>
      )}
    </section>
  );
}
