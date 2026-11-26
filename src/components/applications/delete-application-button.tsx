"use client";

import { useActionState, useId, useRef } from "react";
import { useAnnounceDeletion } from "./deletion-announcer";
import {
  DANGER_BUTTON_CLASS,
  DANGER_OUTLINE_BUTTON_CLASS,
  ERROR_MESSAGE_CLASS,
  SECONDARY_BUTTON_CLASS,
} from "@/components/ui/classes";
import { deleteApplicationAction } from "@/lib/applications/actions";
import { applicationDeletedMessage } from "@/lib/applications/announcements";
import type { DeleteApplicationState } from "@/lib/applications/form-state";

type DeleteApplicationButtonProps = {
  id: string;
  company: string;
  position: string;
};

/**
 * "Borrar" button that asks for confirmation in a native modal `<dialog>`:
 * the browser traps the focus inside and closes it with Escape. The focus
 * starts on "Cancelar" (the safe choice) and goes back to the trigger when
 * the dialog is dismissed. After a deletion the row disappears, so the
 * page's `DeletionAnnouncer` announces it and takes the focus instead.
 */
export function DeleteApplicationButton({
  id,
  company,
  position,
}: DeleteApplicationButtonProps) {
  const announceDeletion = useAnnounceDeletion();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const deletedRef = useRef(false);
  const titleId = useId();
  const descriptionId = useId();

  async function deleteAndAnnounce(
    previous: DeleteApplicationState,
    formData: FormData,
  ): Promise<DeleteApplicationState> {
    const result = await deleteApplicationAction(previous, formData);
    if (result?.ok) {
      // Closed before announcing: the focus cannot leave an open modal.
      deletedRef.current = true;
      dialogRef.current?.close();
      announceDeletion?.(applicationDeletedMessage({ company, position }));
    }
    return result;
  }

  const [state, formAction, pending] = useActionState(deleteAndAnnounce, null);

  function open(): void {
    dialogRef.current?.showModal();
    cancelRef.current?.focus();
  }

  function close(): void {
    dialogRef.current?.close();
  }

  function handleClose(): void {
    if (!deletedRef.current) triggerRef.current?.focus();
  }

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={open}
        aria-label={`Borrar la candidatura de ${position} en ${company}`}
        className={`${DANGER_OUTLINE_BUTTON_CLASS} text-sm`}
      >
        Borrar
      </button>
      <dialog
        ref={dialogRef}
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        onClose={handleClose}
        className="m-auto w-[calc(100%-2rem)] max-w-md rounded-lg bg-white p-6 text-zinc-900 shadow-xl backdrop:bg-zinc-950/50 dark:bg-zinc-900 dark:text-zinc-50"
      >
        <h2 id={titleId} className="text-lg font-semibold">
          ¿Borrar la candidatura?
        </h2>
        <p
          id={descriptionId}
          className="mt-2 text-sm text-zinc-700 dark:text-zinc-300"
        >
          Se borrará la candidatura de {position} en {company}. Esta acción no
          se puede deshacer.
        </p>
        {state?.ok === false ? (
          <p role="alert" className={`mt-4 ${ERROR_MESSAGE_CLASS}`}>
            {state.message}
          </p>
        ) : null}
        <form
          action={formAction}
          className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end"
        >
          <input type="hidden" name="id" value={id} />
          <button
            type="button"
            ref={cancelRef}
            onClick={close}
            className={`${SECONDARY_BUTTON_CLASS} text-sm`}
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={pending}
            className={`${DANGER_BUTTON_CLASS} text-sm`}
          >
            {pending ? "Borrando…" : "Sí, borrar"}
          </button>
        </form>
      </dialog>
    </>
  );
}
