import { STATUS_LABELS } from "@/lib/applications/labels";
import {
  APPLICATION_STATUSES,
  applicationStatusSchema,
  type ApplicationStatus,
} from "@/lib/validation/application";

type StatusSelectProps = {
  id: string;
  /** Names the application in the label, e.g. "Frontend en Acme". */
  name: string;
  value: ApplicationStatus;
  /** While saving, changes are ignored (the control keeps the focus). */
  saving: boolean;
  onChange: (status: ApplicationStatus) => void;
};

/**
 * Native status selector of a kanban card: the alternative to dragging. Its
 * accessible name is "Cambiar estado de <puesto> en <empresa>".
 */
export function StatusSelect({
  id,
  name,
  value,
  saving,
  onChange,
}: StatusSelectProps) {
  return (
    <div className="flex flex-col gap-1">
      <label
        htmlFor={id}
        className="text-sm font-medium text-zinc-800 dark:text-zinc-200"
      >
        Cambiar estado<span className="sr-only"> de {name}</span>
      </label>
      <select
        id={id}
        value={value}
        aria-disabled={saving}
        onChange={(event) => {
          const parsed = applicationStatusSchema.safeParse(event.target.value);
          if (!saving && parsed.success) onChange(parsed.data);
        }}
        className="min-h-11 w-full rounded-md border border-zinc-400 bg-white px-3 py-2 text-zinc-900 focus-visible:ring-2 focus-visible:ring-blue-700 focus-visible:ring-offset-2 focus-visible:outline-none aria-disabled:opacity-60 dark:bg-zinc-950 dark:text-zinc-50"
      >
        {APPLICATION_STATUSES.map((status) => (
          <option key={status} value={status}>
            {STATUS_LABELS[status]}
          </option>
        ))}
      </select>
    </div>
  );
}
