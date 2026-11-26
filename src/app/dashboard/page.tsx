import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import { ApplicationResults } from "@/components/applications/application-results";
import { DeletionAnnouncer } from "@/components/applications/deletion-announcer";
import { PageHeader } from "@/components/applications/page-header";
import { LoadingMessage } from "@/components/applications/page-states";
import { FormMessages } from "@/components/forms/form-messages";
import { parseApplicationFilters } from "@/lib/applications/filter";
import { listApplications } from "@/lib/applications/repository";

export const metadata: Metadata = {
  title: "Mis candidaturas · JobTrack",
};

/*
 * The layout checks the session in parallel with this page, so the query
 * relies on RLS: without a session it returns an error, never other users'
 * rows (see docs/REGISTRO.md, task 2.3). `connection()` keeps the query (and
 * the session expiry check inside the Supabase client) at request time.
 * The filters come from the URL and are applied in memory (task 5.1).
 */
async function Applications({
  searchParams,
}: Pick<PageProps<"/dashboard">, "searchParams">) {
  await connection();
  const filters = parseApplicationFilters(await searchParams);
  const result = await listApplications();
  if (!result.ok) return <FormMessages error={result.error.message} />;
  return <ApplicationResults applications={result.data} filters={filters} />;
}

export default function DashboardPage({
  searchParams,
}: PageProps<"/dashboard">) {
  return (
    <DeletionAnnouncer>
      <PageHeader title="Mis candidaturas" />
      <Suspense
        fallback={<LoadingMessage>Cargando candidaturas…</LoadingMessage>}
      >
        <Applications searchParams={searchParams} />
      </Suspense>
    </DeletionAnnouncer>
  );
}
