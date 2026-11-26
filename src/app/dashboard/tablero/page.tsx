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
import { KanbanBoard } from "@/components/kanban/kanban-board";
import { listApplications } from "@/lib/applications/repository";
import { NEW_APPLICATION_PATH } from "@/lib/applications/routes";

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
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          Tablero
        </h1>
        <Link href={NEW_APPLICATION_PATH} className={PRIMARY_LINK_CLASS}>
          Nueva candidatura
        </Link>
      </div>
      <Suspense fallback={<LoadingMessage>Cargando tablero…</LoadingMessage>}>
        <Board />
      </Suspense>
    </>
  );
}
