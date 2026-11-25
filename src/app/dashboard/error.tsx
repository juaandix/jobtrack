"use client";

import Link from "next/link";
import { useEffect } from "react";
import { APPLICATIONS_PATH } from "@/lib/applications/routes";

type DashboardErrorProps = {
  error: unknown;
  retry: () => void;
};

/** Unexpected errors of the private pages (error boundaries are client-side). */
export default function DashboardError({ error, retry }: DashboardErrorProps) {
  useEffect(() => {
    // Only the digest (in production the message is a generic one anyway).
    const digest =
      error instanceof Error && "digest" in error ? error.digest : undefined;
    console.error("[dashboard] render failed", digest ?? "unknown");
  }, [error]);

  return (
    <>
      <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
        Algo ha fallado
      </h1>
      <p
        role="alert"
        className="rounded-md border border-red-700 bg-red-50 px-3 py-2 text-sm text-red-800"
      >
        No se ha podido cargar esta página. Inténtalo de nuevo en unos segundos.
      </p>
      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={retry}
          className="min-h-11 rounded-md bg-blue-700 px-4 py-2 font-medium text-white hover:bg-blue-800 focus-visible:ring-2 focus-visible:ring-blue-700 focus-visible:ring-offset-2 focus-visible:outline-none"
        >
          Reintentar
        </button>
        <Link
          href={APPLICATIONS_PATH}
          className="inline-flex min-h-11 items-center rounded-md border border-zinc-400 px-4 py-2 font-medium text-zinc-900 hover:bg-zinc-100 focus-visible:ring-2 focus-visible:ring-blue-700 focus-visible:ring-offset-2 focus-visible:outline-none dark:text-zinc-50 dark:hover:bg-zinc-800"
        >
          Volver a mis candidaturas
        </Link>
      </div>
    </>
  );
}
