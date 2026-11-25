import { STATUS_LABELS } from "@/lib/applications/labels";
import type { ApplicationStatus } from "@/lib/validation/application";

/** Colour is only a visual aid: the status is always written (A11Y-07). */
const STATUS_CLASSES: Readonly<Record<ApplicationStatus, string>> = {
  enviada: "border-zinc-400 bg-zinc-100 text-zinc-800",
  en_proceso: "border-blue-300 bg-blue-50 text-blue-800",
  entrevista: "border-violet-300 bg-violet-50 text-violet-800",
  oferta: "border-green-300 bg-green-50 text-green-800",
  descartada: "border-red-300 bg-red-50 text-red-800",
  rechazada_por_mi: "border-amber-300 bg-amber-50 text-amber-900",
};

export function StatusBadge({ status }: { status: ApplicationStatus }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-sm font-medium whitespace-nowrap ${STATUS_CLASSES[status]}`}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}
