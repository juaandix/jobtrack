import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import {
  EmptyApplications,
  PRIMARY_LINK_CLASS,
} from "@/components/applications/application-list";
import { LoadingMessage } from "@/components/applications/page-states";
import { FormMessages } from "@/components/auth/form-messages";
import { MetricsPanel } from "@/components/metrics/metrics-panel";
import { todayIsoDate } from "@/lib/applications/labels";
import { listApplications } from "@/lib/applications/repository";
import { NEW_APPLICATION_PATH } from "@/lib/applications/routes";
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
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          Métricas
        </h1>
        <Link href={NEW_APPLICATION_PATH} className={PRIMARY_LINK_CLASS}>
          Nueva candidatura
        </Link>
      </div>
      <Suspense fallback={<LoadingMessage>Cargando métricas…</LoadingMessage>}>
        <Metrics />
      </Suspense>
    </>
  );
}
