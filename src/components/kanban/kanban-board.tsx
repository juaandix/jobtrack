"use client";

import {
  DndContext,
  DragOverlay,
  KeyboardCode,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  pointerWithin,
  rectIntersection,
  useSensor,
  useSensors,
  type CollisionDetection,
  type DragEndEvent,
  type DragStartEvent,
  type KeyboardCoordinateGetter,
  type UniqueIdentifier,
} from "@dnd-kit/core";
import { useId, useLayoutEffect, useMemo, useRef, useState } from "react";
import { KanbanCardPreview } from "./kanban-card";
import { KanbanColumn } from "./kanban-column";
import { ERROR_MESSAGE_CLASS } from "@/components/ui/classes";
import { updateStatusAction } from "@/lib/applications/actions";
import {
  APPLICATION_ERROR_MESSAGES,
  type ApplicationResult,
} from "@/lib/applications/errors";
import {
  applyStatusChange,
  groupByStatus,
  planStatusChange,
  settleStatusChange,
  type StatusChange,
} from "@/lib/applications/kanban";
import {
  DRAG_INSTRUCTIONS,
  adjacentColumnPosition,
  applicationName,
  dragAnnouncements,
  statusChangeFailedMessage,
  statusChangedMessage,
  statusFromDropId,
} from "@/lib/applications/kanban-a11y";
import type { Application } from "@/lib/applications/repository";
import type { ApplicationStatus } from "@/lib/validation/application";

/** Arrow keys move a dragged card one column left or right. */
const columnKeyboardCoordinates: KeyboardCoordinateGetter = (
  event,
  { context, currentCoordinates },
) => {
  const direction =
    event.code === KeyboardCode.Right
      ? 1
      : event.code === KeyboardCode.Left
        ? -1
        : null;
  const card = context.collisionRect;
  if (direction === null || card === null) return undefined;
  event.preventDefault();
  const columns = [...context.droppableRects.values()];
  return (
    adjacentColumnPosition(
      currentCoordinates,
      card.width,
      columns,
      direction,
    ) ?? undefined
  );
};

/** The pointer decides when there is one; with the keyboard, the overlap. */
const detectColumn: CollisionDetection = (args) => {
  const underPointer = pointerWithin(args);
  return underPointer.length > 0 ? underPointer : rectIntersection(args);
};

async function saveStatus(
  change: StatusChange,
): Promise<ApplicationResult<Application>> {
  try {
    return await updateStatusAction(change.id, change.to);
  } catch {
    // Network failures reject the Server Action call: undo like any error.
    return {
      ok: false,
      error: {
        kind: "unknown",
        message: APPLICATION_ERROR_MESSAGES.unknown.update,
        fieldErrors: {},
      },
    };
  }
}

/**
 * Kanban board of the user's applications. A status change (dragging a card
 * to another column or choosing it in the card's selector) is applied at
 * once, saved with `updateStatusAction` and undone with an alert if saving
 * fails. Each card shows that it is saving without blocking the others.
 */
export function KanbanBoard({
  applications,
}: {
  applications: readonly Application[];
}) {
  const [items, setItems] = useState<readonly Application[]>(applications);
  const [pending, setPending] = useState<readonly StatusChange[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState("");
  const [dragged, setDragged] = useState<Application | null>(null);
  const [synced, setSynced] = useState(applications);
  const focusAfterMove = useRef<string | null>(null);
  const boardId = useId();

  // New data from the server (revalidation, navigation): it wins, keeping
  // the changes that are still being saved on top.
  if (synced !== applications) {
    setSynced(applications);
    setItems(pending.reduce(applyStatusChange, applications));
  }

  const selectId = (id: string): string => `${boardId}-status-${id}`;

  useLayoutEffect(() => {
    // A card that changes column is mounted again: give its selector the
    // focus back when the change came from it.
    const id = focusAfterMove.current;
    if (id === null) return;
    focusAfterMove.current = null;
    document.getElementById(`${boardId}-status-${id}`)?.focus();
  }, [items, boardId]);

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 5 } }),
    // A short press keeps vertical and horizontal scrolling usable on touch.
    useSensor(TouchSensor, {
      activationConstraint: { delay: 250, tolerance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: columnKeyboardCoordinates,
    }),
  );

  const columns = useMemo(() => groupByStatus(items), [items]);

  function nameOf(id: UniqueIdentifier): string {
    const application = items.find((item) => item.id === id);
    return application === undefined ? "" : applicationName(application);
  }

  async function changeStatus(
    id: string,
    to: ApplicationStatus,
    fromSelector: boolean,
  ): Promise<void> {
    if (pending.some((change) => change.id === id)) return;
    const change = planStatusChange(items, id, to);
    if (change === null) return;

    const name = nameOf(id);
    if (fromSelector) focusAfterMove.current = id;
    setError(null);
    setNotice("");
    setItems((current) => applyStatusChange(current, change));
    setPending((current) => [...current, change]);

    const result = await saveStatus(change);

    setItems((current) => settleStatusChange(current, change, result));
    setPending((current) => current.filter((item) => item !== change));
    if (result.ok) {
      setNotice(statusChangedMessage(name, change.to));
    } else {
      if (fromSelector) focusAfterMove.current = id;
      setError(
        statusChangeFailedMessage(name, change.from, result.error.message),
      );
    }
  }

  function handleDragStart({ active }: DragStartEvent): void {
    setDragged(items.find((item) => item.id === active.id) ?? null);
  }

  function handleDragEnd({ active, over }: DragEndEvent): void {
    setDragged(null);
    const status = statusFromDropId(over?.id);
    if (status === null) return;
    void changeStatus(String(active.id), status, false);
  }

  return (
    <>
      {error ? (
        <p role="alert" className={ERROR_MESSAGE_CLASS}>
          {error}
        </p>
      ) : null}
      <p role="status" className="sr-only">
        {notice}
      </p>
      <DndContext
        id={boardId}
        sensors={sensors}
        collisionDetection={detectColumn}
        accessibility={{
          announcements: dragAnnouncements(nameOf),
          screenReaderInstructions: DRAG_INSTRUCTIONS,
        }}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={() => setDragged(null)}
      >
        <div className="relative w-full min-w-0 overflow-x-auto overscroll-x-contain pb-3">
          <div className="flex w-max gap-3 xl:w-full">
            {columns.map((column) => (
              <KanbanColumn
                key={column.status}
                column={column}
                isSaving={(id) => pending.some((change) => change.id === id)}
                selectId={selectId}
                onStatusChange={(id, status) =>
                  void changeStatus(id, status, true)
                }
              />
            ))}
          </div>
        </div>
        <DragOverlay>
          {dragged ? <KanbanCardPreview application={dragged} /> : null}
        </DragOverlay>
      </DndContext>
    </>
  );
}
