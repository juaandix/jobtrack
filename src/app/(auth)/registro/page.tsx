import type { Metadata } from "next";
import { Suspense } from "react";
import { SignupForm } from "@/components/auth/signup-form";
import { PAGE_TITLE_CLASS } from "@/components/ui/classes";
import { nextFromSearchParams } from "@/lib/auth/routes";

export const metadata: Metadata = {
  title: "Crear cuenta · JobTrack",
};

async function SignupFormWithNext({
  searchParams,
}: Pick<PageProps<"/registro">, "searchParams">) {
  return <SignupForm next={nextFromSearchParams(await searchParams)} />;
}

export default function SignupPage({ searchParams }: PageProps<"/registro">) {
  return (
    <>
      <h1 className={PAGE_TITLE_CLASS}>Crear cuenta</h1>
      <Suspense
        fallback={
          <p className="text-zinc-700 dark:text-zinc-300">
            Cargando formulario…
          </p>
        }
      >
        <SignupFormWithNext searchParams={searchParams} />
      </Suspense>
    </>
  );
}
