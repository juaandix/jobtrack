import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import { PageHeader } from "@/components/applications/page-header";
import {
  EmptyApplications,
  LoadingMessage,
} from "@/components/applications/page-states";
import { FormMessages } from "@/components/forms/form-messages";
import { KanbanBoard } from "@/components/kanban/kanban-board";
import { listApplications } from "@/lib/applications/repository";

export const metadata: Metadata = {
  title: "Tablero · JobTrack",
};

/*
 * Same data as the list (RLS scopes the query to the signed-in user, see the
 * list page), grouped by status on the client board.
 */
async function Board() {
  await connection();
  const result = await listApplications();
  if (!result.ok) return <FormMessages error={result.error.message} />;
  if (result.data.length === 0) return <EmptyApplications />;
  return <KanbanBoard applications={result.data} />;
}

export default function BoardPage() {
  return (
    <>
      <PageHeader title="Tablero" />
      <Suspense fallback={<LoadingMessage>Cargando tablero…</LoadingMessage>}>
        <Board />
      </Suspense>
    </>
  );
}
