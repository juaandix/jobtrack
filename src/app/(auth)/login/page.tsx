import type { Metadata } from "next";
import { Suspense } from "react";
import { LoginForm } from "@/components/auth/login-form";
import { PAGE_TITLE_CLASS } from "@/components/ui/classes";
import { nextFromSearchParams } from "@/lib/auth/routes";

export const metadata: Metadata = {
  title: "Iniciar sesión · JobTrack",
};

async function LoginFormWithNext({
  searchParams,
}: Pick<PageProps<"/login">, "searchParams">) {
  return <LoginForm next={nextFromSearchParams(await searchParams)} />;
}

export default function LoginPage({ searchParams }: PageProps<"/login">) {
  return (
    <>
      <h1 className={PAGE_TITLE_CLASS}>Iniciar sesión</h1>
      <Suspense
        fallback={
          <p className="text-zinc-700 dark:text-zinc-300">
            Cargando formulario…
          </p>
        }
      >
        <LoginFormWithNext searchParams={searchParams} />
      </Suspense>
    </>
  );
}
