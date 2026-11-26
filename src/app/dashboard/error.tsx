"use client";

import { ErrorState } from "@/components/ui/error-state";
import { APPLICATIONS_PATH } from "@/lib/applications/routes";

type DashboardErrorProps = {
  error: unknown;
  retry: () => void;
};

/** Unexpected errors of the private pages (error boundaries are client-side). */
export default function DashboardError({ error, retry }: DashboardErrorProps) {
  return (
    <ErrorState
      scope="dashboard"
      error={error}
      retry={retry}
      backHref={APPLICATIONS_PATH}
      backLabel="Volver a mis candidaturas"
    />
  );
}
