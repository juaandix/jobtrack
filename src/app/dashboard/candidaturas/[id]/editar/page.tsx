import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { ApplicationForm } from "@/components/applications/application-form";
import { FormMessages } from "@/components/auth/form-messages";
import { updateApplicationAction } from "@/lib/applications/actions";
import { applicationFormValues } from "@/lib/applications/form-state";
import { getApplication } from "@/lib/applications/repository";

export const metadata: Metadata = {
  title: "Editar candidatura · JobTrack",
};

/*
 * Reads the application with the user's session: RLS hides other users'
 * rows, so a missing or foreign id both end in `notFound()`. The sibling
 * `loading.tsx` shows the loading state while it resolves; `connection()`
 * keeps the query at request time.
 */
export default async function EditApplicationPage({
  params,
}: PageProps<"/dashboard/candidaturas/[id]/editar">) {
  const { id } = await params;
  await connection();
  const result = await getApplication(id);
  if (!result.ok && result.error.kind === "not_found") notFound();

  return (
    <>
      <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
        Editar candidatura
      </h1>
      {result.ok ? (
        <ApplicationForm
          action={updateApplicationAction.bind(null, result.data.id)}
          initialValues={applicationFormValues(result.data)}
          submitLabel="Guardar cambios"
          pendingLabel="Guardando…"
        />
      ) : (
        <FormMessages error={result.error.message} />
      )}
    </>
  );
}
