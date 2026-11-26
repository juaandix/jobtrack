"use client";

import { ErrorState } from "@/components/ui/error-state";

type RootErrorProps = {
  error: unknown;
  retry: () => void;
};

/**
 * Unexpected errors outside the private pages (home, login, signup) and in
 * the private layout itself. The root layout has no `<main>`, so it is here.
 */
export default function RootError({ error, retry }: RootErrorProps) {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-4 px-4 py-16 sm:px-8">
      <ErrorState
        scope="app"
        error={error}
        retry={retry}
        backHref="/"
        backLabel="Volver al inicio"
      />
    </main>
  );
}
