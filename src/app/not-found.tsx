import type { Metadata } from "next";
import Link from "next/link";
import {
  PAGE_TITLE_CLASS,
  PRIMARY_BUTTON_CLASS,
} from "@/components/ui/classes";

export const metadata: Metadata = {
  title: "Página no encontrada · JobTrack",
};

/** Any URL that does not exist. The root layout has no `<main>`. */
export default function NotFound() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-4 px-4 py-16 sm:px-8">
      <h1 className={PAGE_TITLE_CLASS}>Página no encontrada</h1>
      <p className="text-zinc-700 dark:text-zinc-300">
        La dirección no existe o ha cambiado. Comprueba que está bien escrita.
      </p>
      <Link href="/" className={`${PRIMARY_BUTTON_CLASS} self-start`}>
        Ir al inicio
      </Link>
    </main>
  );
}
