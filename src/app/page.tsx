import Link from "next/link";
import {
  PRIMARY_BUTTON_CLASS,
  SECONDARY_BUTTON_CLASS,
} from "@/components/ui/classes";
import { LOGIN_PATH, SIGNUP_PATH } from "@/lib/auth/routes";

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center gap-4 px-4 py-16 sm:px-8">
      <h1 className="text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
        JobTrack
      </h1>
      <p className="text-lg text-zinc-700 dark:text-zinc-300">
        Organiza tus candidaturas de empleo y sigue su estado en un solo lugar.
      </p>
      <div className="flex flex-col gap-3 sm:flex-row">
        <Link href={LOGIN_PATH} className={PRIMARY_BUTTON_CLASS}>
          Iniciar sesión
        </Link>
        <Link href={SIGNUP_PATH} className={SECONDARY_BUTTON_CLASS}>
          Crear cuenta
        </Link>
      </div>
    </main>
  );
}
