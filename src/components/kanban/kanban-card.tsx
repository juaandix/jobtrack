import { useDraggable } from "@dnd-kit/core";
import Link from "next/link";
import { StatusSelect } from "./status-select";
import { StatusBadge } from "@/components/applications/status-badge";
import {
  FOCUS_RING_CLASS,
  SECONDARY_BUTTON_CLASS,
} from "@/components/ui/classes";
import { applicationName } from "@/lib/applications/kanban-a11y";
import type { Application } from "@/lib/applications/repository";
import { editApplicationPath } from "@/lib/applications/routes";
import type { ApplicationStatus } from "@/lib/validation/application";

const CARD_CLASS =
  "flex min-w-0 flex-col gap-3 rounded-lg border border-zinc-300 bg-white p-3 dark:border-zinc-700 dark:bg-zinc-950";

function CardSummary({ application }: { application: Application }) {
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <h3 className="font-semibold break-words text-zinc-900 dark:text-zinc-50">
        {application.company}
      </h3>
      <p className="text-sm break-words text-zinc-700 dark:text-zinc-300">
        {application.position}
      </p>
    </div>
  );
}

function GripIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 20 20"
      className="size-5"
      fill="currentColor"
    >
      <circle cx="7" cy="5" r="1.5" />
      <circle cx="13" cy="5" r="1.5" />
      <circle cx="7" cy="10" r="1.5" />
      <circle cx="13" cy="10" r="1.5" />
      <circle cx="7" cy="15" r="1.5" />
      <circle cx="13" cy="15" r="1.5" />
    </svg>
  );
}

type KanbanCardProps = {
  application: Application;
  saving: boolean;
  selectId: string;
  onStatusChange: (id: string, status: ApplicationStatus) => void;
};

/**
 * A draggable application card. It is dragged from its handle (mouse, touch
 * or keyboard) so that the selector and the edit link keep their own keys;
 * the selector changes the status without dragging (A11Y-04).
 */
export function KanbanCard({
  application,
  saving,
  selectId,
  onStatusChange,
}: KanbanCardProps) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, isDragging } =
    useDraggable({
      id: application.id,
      disabled: saving,
      attributes: { roleDescription: "arrastrable" },
    });
  const name = applicationName(application);

  return (
    <li
      ref={setNodeRef}
      aria-busy={saving}
      className={`${CARD_CLASS} ${isDragging ? "opacity-50" : ""}`}
    >
      <div className="flex items-start justify-between gap-2">
        <CardSummary application={application} />
        <button
          ref={setActivatorNodeRef}
          type="button"
          {...attributes}
          {...listeners}
          aria-label={`Mover la candidatura de ${name}`}
          className={`inline-flex min-h-11 min-w-11 shrink-0 cursor-grab touch-manipulation items-center justify-center rounded-md border border-zinc-400 text-zinc-800 hover:bg-zinc-100 aria-disabled:cursor-not-allowed aria-disabled:opacity-60 dark:text-zinc-200 dark:hover:bg-zinc-800 ${FOCUS_RING_CLASS}`}
        >
          <GripIcon />
        </button>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <StatusBadge status={application.status} />
        {saving ? (
          <span className="text-sm text-zinc-700 dark:text-zinc-300">
            Guardando…
          </span>
        ) : null}
      </div>
      <StatusSelect
        id={selectId}
        name={name}
        value={application.status}
        saving={saving}
        onChange={(status) => onStatusChange(application.id, status)}
      />
      <Link
        href={editApplicationPath(application.id)}
        aria-label={`Editar la candidatura de ${name}`}
        className={`${SECONDARY_BUTTON_CLASS} text-sm`}
      >
        Editar
      </Link>
    </li>
  );
}

/** What follows the pointer while dragging: the card without its controls. */
export function KanbanCardPreview({
  application,
}: {
  application: Application;
}) {
  return (
    <div className={`${CARD_CLASS} cursor-grabbing shadow-lg`}>
      <CardSummary application={application} />
      <div>
        <StatusBadge status={application.status} />
      </div>
    </div>
  );
}
