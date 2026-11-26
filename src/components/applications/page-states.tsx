import Link from "next/link";
import { PRIMARY_BUTTON_CLASS } from "@/components/ui/classes";
import { NEW_APPLICATION_PATH } from "@/lib/applications/routes";

/** Loading message announced politely to assistive technologies. */
export function LoadingMessage({ children }: { children: React.ReactNode }) {
  return (
    <p role="status" className="text-zinc-700 dark:text-zinc-300">
      {children}
    </p>
  );
}

/** Empty state with a call to create the first application. */
export function EmptyApplications() {
  return (
    <div className="flex flex-col items-start gap-4 rounded-lg border border-dashed border-zinc-400 p-6">
      <p className="text-zinc-700 dark:text-zinc-300">
        Todavía no tienes candidaturas. Añade la primera para empezar a
        seguirla.
      </p>
      <Link href={NEW_APPLICATION_PATH} className={PRIMARY_BUTTON_CLASS}>
        Añadir la primera candidatura
      </Link>
    </div>
  );
}
