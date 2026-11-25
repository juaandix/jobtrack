import Link from "next/link";
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
        <Link
          href={LOGIN_PATH}
          className="inline-flex min-h-11 items-center justify-center rounded-md bg-blue-700 px-4 py-2 font-medium text-white hover:bg-blue-800 focus-visible:ring-2 focus-visible:ring-blue-700 focus-visible:ring-offset-2 focus-visible:outline-none"
        >
          Iniciar sesión
        </Link>
        <Link
          href={SIGNUP_PATH}
          className="inline-flex min-h-11 items-center justify-center rounded-md border border-zinc-400 px-4 py-2 font-medium text-zinc-900 hover:bg-zinc-100 focus-visible:ring-2 focus-visible:ring-blue-700 focus-visible:ring-offset-2 focus-visible:outline-none dark:text-zinc-50 dark:hover:bg-zinc-800"
        >
          Crear cuenta
        </Link>
      </div>
    </main>
  );
}
