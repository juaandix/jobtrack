import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import { PageHeader } from "@/components/applications/page-header";
import {
  EmptyApplications,
  LoadingMessage,
} from "@/components/applications/page-states";
import { FormMessages } from "@/components/forms/form-messages";
import { MetricsPanel } from "@/components/metrics/metrics-panel";
import { todayIsoDate } from "@/lib/applications/labels";
import { listApplications } from "@/lib/applications/repository";
import { buildMetrics } from "@/lib/metrics/metrics";

export const metadata: Metadata = {
  title: "Métricas · JobTrack",
};

/*
 * Same data as the list (RLS scopes the query to the signed-in user). The
 * metrics are calculated here, on the server, with the pure functions of
 * `src/lib/metrics`; "today" is the day in Spain (APP_TIME_ZONE).
 */
async function Metrics() {
  await connection();
  const result = await listApplications();
  if (!result.ok) return <FormMessages error={result.error.message} />;
  if (result.data.length === 0) return <EmptyApplications />;
  const metrics = buildMetrics(result.data, todayIsoDate(new Date()));
  return <MetricsPanel metrics={metrics} />;
}

export default function MetricsPage() {
  return (
    <>
      <PageHeader title="Métricas" />
      <Suspense fallback={<LoadingMessage>Cargando métricas…</LoadingMessage>}>
        <Metrics />
      </Suspense>
    </>
  );
}
