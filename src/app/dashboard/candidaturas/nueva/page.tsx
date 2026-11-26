import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import { ApplicationForm } from "@/components/applications/application-form";
import { LoadingMessage } from "@/components/applications/page-states";
import { PAGE_TITLE_CLASS } from "@/components/ui/classes";
import { createApplicationAction } from "@/lib/applications/actions";
import { newApplicationValues } from "@/lib/applications/form-state";
import { todayIsoDate } from "@/lib/applications/labels";

export const metadata: Metadata = {
  title: "Nueva candidatura · JobTrack",
};

/** "Today" depends on the request time, so it is computed per request. */
async function NewApplicationForm() {
  await connection();
  return (
    <ApplicationForm
      mode="create"
      action={createApplicationAction}
      initialValues={newApplicationValues(todayIsoDate(new Date()))}
      submitLabel="Guardar candidatura"
      pendingLabel="Guardando…"
    />
  );
}

export default function NewApplicationPage() {
  return (
    <>
      <h1 className={PAGE_TITLE_CLASS}>Nueva candidatura</h1>
      <Suspense
        fallback={<LoadingMessage>Cargando formulario…</LoadingMessage>}
      >
        <NewApplicationForm />
      </Suspense>
    </>
  );
}
