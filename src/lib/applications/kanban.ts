import type { ApplicationResult } from "./errors";
import type { Application } from "./repository";
import {
  APPLICATION_STATUSES,
  type ApplicationStatus,
} from "@/lib/validation/application";

/*
 * Pure logic of the kanban board. The board is derived from the flat list of
 * applications: a status change only rewrites that row's `status` in place, so
 * the list keeps its order (the server order, `applied_at` desc) and grouping
 * it again places every card where the server will put it after revalidating.
 */

export type KanbanColumn = {
  status: ApplicationStatus;
  applications: Application[];
  count: number;
};

/** A pending status change of one application, enough to undo it. */
export type StatusChange = {
  id: string;
  from: ApplicationStatus;
  to: ApplicationStatus;
};

/**
 * One column per status, in the order of the SQL enum, empty ones included.
 * Each application lands in its status column keeping the input order. The
 * input is not mutated.
 */
export function groupByStatus(
  applications: readonly Application[],
): KanbanColumn[] {
  return APPLICATION_STATUSES.map((status) => {
    const items = applications.filter(
      (application) => application.status === status,
    );
    return { status, applications: items, count: items.length };
  });
}

/**
 * The change that moving `id` to `to` would make, or `null` if there is
 * nothing to do (unknown id, or it already has that status).
 */
export function planStatusChange(
  applications: readonly Application[],
  id: string,
  to: ApplicationStatus,
): StatusChange | null {
  const current = applications.find((application) => application.id === id);
  if (current === undefined || current.status === to) return null;
  return { id, from: current.status, to };
}

function withStatus(
  applications: readonly Application[],
  id: string,
  status: ApplicationStatus,
): Application[] {
  return applications.map((application) =>
    application.id === id ? { ...application, status } : application,
  );
}

/** Optimistic update: the list with the change applied (a new array). */
export function applyStatusChange(
  applications: readonly Application[],
  change: StatusChange,
): Application[] {
  return withStatus(applications, change.id, change.to);
}

/** Undoes `applyStatusChange`: the application gets its previous status back. */
export function revertStatusChange(
  applications: readonly Application[],
  change: StatusChange,
): Application[] {
  return withStatus(applications, change.id, change.from);
}

/**
 * Settles an optimistic change once the Server Action answers: on success the
 * row is replaced by the one the server returned; on failure the change is
 * reverted.
 */
export function settleStatusChange(
  applications: readonly Application[],
  change: StatusChange,
  result: ApplicationResult<Application>,
): Application[] {
  if (!result.ok) return revertStatusChange(applications, change);
  const updated = result.data;
  return applications.map((application) =>
    application.id === change.id ? updated : application,
  );
}
