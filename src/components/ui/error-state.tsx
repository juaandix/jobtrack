"use client";

import Link from "next/link";
import { useEffect } from "react";
import {
  ERROR_MESSAGE_CLASS,
  PAGE_TITLE_CLASS,
  PRIMARY_BUTTON_CLASS,
  SECONDARY_BUTTON_CLASS,
} from "./classes";

type ErrorStateProps = {
  /** Prefix of the log line, e.g. "dashboard". */
  scope: string;
  error: unknown;
  retry: () => void;
  backHref: string;
  backLabel: string;
};

/**
 * Content of an error boundary (`error.tsx`): what happened, a retry button
 * and a way back. Only the digest is logged (in production the message is a
 * generic one anyway).
 */
export function ErrorState({
  scope,
  error,
  retry,
  backHref,
  backLabel,
}: ErrorStateProps) {
  useEffect(() => {
    const digest =
      error instanceof Error && "digest" in error ? error.digest : undefined;
    console.error(`[${scope}] render failed`, digest ?? "unknown");
  }, [error, scope]);

  return (
    <>
      <h1 className={PAGE_TITLE_CLASS}>Algo ha fallado</h1>
      <p role="alert" className={ERROR_MESSAGE_CLASS}>
        No se ha podido cargar esta página. Inténtalo de nuevo en unos segundos.
      </p>
      <div className="flex flex-wrap gap-3">
        <button type="button" onClick={retry} className={PRIMARY_BUTTON_CLASS}>
          Reintentar
        </button>
        <Link href={backHref} className={SECONDARY_BUTTON_CLASS}>
          {backLabel}
        </Link>
      </div>
    </>
  );
}
