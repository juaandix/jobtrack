import Link from "next/link";
import { PAGE_TITLE_CLASS, TEXT_LINK_CLASS } from "@/components/ui/classes";
import { APPLICATIONS_PATH } from "@/lib/applications/routes";

export default function DashboardNotFound() {
  return (
    <>
      <h1 className={PAGE_TITLE_CLASS}>Candidatura no encontrada</h1>
      <p className="text-zinc-700 dark:text-zinc-300">
        No existe o no tienes acceso a ella.
      </p>
      <Link
        href={APPLICATIONS_PATH}
        className={`${TEXT_LINK_CLASS} inline-flex min-h-11 items-center self-start`}
      >
        Volver a mis candidaturas
      </Link>
    </>
  );
}
