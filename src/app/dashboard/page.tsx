import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { PRIMARY_LINK_CLASS } from "@/components/applications/application-list";
import { ApplicationResults } from "@/components/applications/application-results";
import { LoadingMessage } from "@/components/applications/page-states";
import { FormMessages } from "@/components/auth/form-messages";
import { parseApplicationFilters } from "@/lib/applications/filter";
import { listApplications } from "@/lib/applications/repository";
import { NEW_APPLICATION_PATH } from "@/lib/applications/routes";

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
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          Mis candidaturas
        </h1>
        <Link href={NEW_APPLICATION_PATH} className={PRIMARY_LINK_CLASS}>
          Nueva candidatura
        </Link>
      </div>
      <Suspense
        fallback={<LoadingMessage>Cargando candidaturas…</LoadingMessage>}
      >
        <Applications searchParams={searchParams} />
      </Suspense>
    </>
  );
}
