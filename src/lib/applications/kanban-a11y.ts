import type {
  Announcements,
  ScreenReaderInstructions,
  UniqueIdentifier,
} from "@dnd-kit/core";
import { applicationsCount } from "./filter";
import { STATUS_LABELS } from "./labels";
import type { Application } from "./repository";
import {
  applicationStatusSchema,
  type ApplicationStatus,
} from "@/lib/validation/application";

/*
 * Pure helpers of the kanban board interface: Spanish texts for assistive
 * technologies and the keyboard movement between columns. The drop targets
 * of the board are the columns and their id is the status they stand for.
 */

/** "Frontend en Acme": how an application is named in labels and messages. */
export function applicationName(
  application: Pick<Application, "company" | "position">,
): string {
  return `${application.position} en ${application.company}`;
}

/** Name of a column region: "Entrevista, 2 candidaturas". */
export function columnLabel(status: ApplicationStatus, count: number): string {
  return `${STATUS_LABELS[status]}, ${applicationsCount(count)}`;
}

/** The status a drop target stands for, or `null` if it is not a column. */
export function statusFromDropId(
  id: UniqueIdentifier | null | undefined,
): ApplicationStatus | null {
  const parsed = applicationStatusSchema.safeParse(id);
  return parsed.success ? parsed.data : null;
}

export const DRAG_INSTRUCTIONS: ScreenReaderInstructions = {
  draggable:
    "Para mover la candidatura a otra columna, pulsa Espacio o Intro. Usa las flechas izquierda y derecha para cambiar de columna y pulsa Espacio o Intro para soltarla, o Escape para cancelar.",
};

function columnName(id: UniqueIdentifier | null | undefined): string | null {
  const status = statusFromDropId(id);
  return status === null ? null : STATUS_LABELS[status];
}

/**
 * Spanish announcements of the drag and drop. `nameOf` names the dragged
 * application from its id (the draggable id is the application id).
 */
export function dragAnnouncements(
  nameOf: (id: UniqueIdentifier) => string,
): Announcements {
  return {
    onDragStart({ active }) {
      return `Has cogido la candidatura de ${nameOf(active.id)}.`;
    },
    onDragOver({ active, over }) {
      const column = columnName(over?.id);
      return column === null
        ? `La candidatura de ${nameOf(active.id)} no está sobre ninguna columna.`
        : `La candidatura de ${nameOf(active.id)} está sobre la columna ${column}.`;
    },
    onDragEnd({ active, over }) {
      const column = columnName(over?.id);
      return column === null
        ? `Has soltado la candidatura de ${nameOf(active.id)} fuera de las columnas. No cambia de estado.`
        : `Has soltado la candidatura de ${nameOf(active.id)} en la columna ${column}.`;
    },
    onDragCancel({ active }) {
      return `Movimiento cancelado. La candidatura de ${nameOf(active.id)} no cambia de estado.`;
    },
  };
}

/** Announced once the server confirms a status change. */
export function statusChangedMessage(
  name: string,
  status: ApplicationStatus,
): string {
  return `La candidatura de ${name} está ahora en ${STATUS_LABELS[status]}.`;
}

/** Shown (with `role="alert"`) when a status change fails and is reverted. */
export function statusChangeFailedMessage(
  name: string,
  status: ApplicationStatus,
  reason: string,
): string {
  return `No se ha podido mover la candidatura de ${name}; sigue en ${STATUS_LABELS[status]}. ${reason}`;
}

export type Point = { x: number; y: number };
export type ColumnBox = { left: number; width: number };

/**
 * Keyboard movement of a dragged card: the top-left point that centres a card
 * of `cardWidth` on the column next to the one under its centre (`-1` left,
 * `1` right), at the same height. `null` if there is no column that way.
 * Columns are placed side by side, so only their horizontal box matters; a
 * centre outside every column counts as being on the nearest one.
 */
export function adjacentColumnPosition(
  current: Point,
  cardWidth: number,
  columns: readonly ColumnBox[],
  direction: -1 | 1,
): Point | null {
  const sorted = [...columns].sort((a, b) => a.left - b.left);
  const centre = current.x + cardWidth / 2;
  const distance = (column: ColumnBox): number =>
    Math.max(column.left - centre, centre - (column.left + column.width), 0);

  let index = -1;
  sorted.forEach((column, position) => {
    const best = sorted[index];
    if (best === undefined || distance(column) < distance(best)) {
      index = position;
    }
  });

  const target = sorted[index + direction];
  if (index === -1 || target === undefined) return null;
  return {
    x: target.left + (target.width - cardWidth) / 2,
    y: current.y,
  };
}
