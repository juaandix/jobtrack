"use client";

import { useActionState, useEffect, useId, useRef } from "react";
import { deleteApplicationAction } from "@/lib/applications/actions";
import type { DeleteApplicationState } from "@/lib/applications/form-state";

type DeleteApplicationButtonProps = {
  id: string;
  company: string;
  position: string;
};

const BUTTON_BASE =
  "min-h-11 rounded-md px-4 py-2 text-sm font-medium focus-visible:ring-2 focus-visible:ring-blue-700 focus-visible:ring-offset-2 focus-visible:outline-none";

/**
 * "Borrar" button that asks for confirmation in a native modal `<dialog>`:
 * the browser traps the focus inside and closes it with Escape. The focus
 * starts on "Cancelar" (the safe choice) and goes back to the trigger when
 * the dialog closes.
 */
export function DeleteApplicationButton({
  id,
  company,
  position,
}: DeleteApplicationButtonProps) {
  const [state, formAction, pending] = useActionState<
    DeleteApplicationState,
    FormData
  >(deleteApplicationAction, null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  const descriptionId = useId();
  const deleted = state?.ok === true;

  useEffect(() => {
    if (deleted) {
      dialogRef.current?.close();
    }
  }, [deleted]);

  function open(): void {
    dialogRef.current?.showModal();
    cancelRef.current?.focus();
  }

  function close(): void {
    dialogRef.current?.close();
  }

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={open}
        aria-label={`Borrar la candidatura de ${position} en ${company}`}
        className={`${BUTTON_BASE} border border-red-700 text-red-800 hover:bg-red-50 dark:text-red-300 dark:hover:bg-red-950`}
      >
        Borrar
      </button>
      <dialog
        ref={dialogRef}
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        onClose={() => triggerRef.current?.focus()}
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
          <p
            role="alert"
            className="mt-4 rounded-md border border-red-700 bg-red-50 px-3 py-2 text-sm text-red-800"
          >
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
            className={`${BUTTON_BASE} border border-zinc-400 text-zinc-900 hover:bg-zinc-100 dark:text-zinc-50 dark:hover:bg-zinc-800`}
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={pending}
            className={`${BUTTON_BASE} bg-red-700 text-white hover:bg-red-800 disabled:cursor-not-allowed disabled:bg-zinc-500`}
          >
            {pending ? "Borrando…" : "Sí, borrar"}
          </button>
        </form>
      </dialog>
    </>
  );
}
