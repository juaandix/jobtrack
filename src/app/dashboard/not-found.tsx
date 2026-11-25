import Link from "next/link";
import { APPLICATIONS_PATH } from "@/lib/applications/routes";

export default function DashboardNotFound() {
  return (
    <>
      <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
        Candidatura no encontrada
      </h1>
      <p className="text-zinc-700 dark:text-zinc-300">
        No existe o no tienes acceso a ella.
      </p>
      <Link
        href={APPLICATIONS_PATH}
        className="inline-flex min-h-11 items-center self-start font-medium text-blue-700 underline underline-offset-2 hover:text-blue-800 focus-visible:rounded-sm focus-visible:ring-2 focus-visible:ring-blue-700 focus-visible:outline-none dark:text-blue-400 dark:hover:text-blue-300"
      >
        Volver a mis candidaturas
      </Link>
    </>
  );
}
