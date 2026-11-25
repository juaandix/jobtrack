import Link from "next/link";
import { Suspense } from "react";
import { logout } from "@/lib/auth/actions";
import { DASHBOARD_PATH } from "@/lib/auth/routes";
import { requireSessionUser } from "@/lib/auth/session";

/**
 * Checks the session on the server (the second half of SEC-04, after the
 * proxy) before rendering the private header and the page.
 */
async function PrivateShell({ children }: { children: React.ReactNode }) {
  const user = await requireSessionUser();

  return (
    <>
      <header className="border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
        <nav
          aria-label="Principal"
          className="mx-auto flex w-full max-w-5xl flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-2"
        >
          <Link
            href={DASHBOARD_PATH}
            className="inline-flex min-h-11 items-center font-semibold text-zinc-900 hover:text-blue-800 focus-visible:rounded-sm focus-visible:ring-2 focus-visible:ring-blue-700 focus-visible:outline-none dark:text-zinc-50 dark:hover:text-blue-300"
          >
            Candidaturas
          </Link>
          <div className="flex min-w-0 items-center gap-3">
            {user.email ? (
              <span className="truncate text-sm text-zinc-700 dark:text-zinc-300">
                {user.email}
              </span>
            ) : null}
            <form action={logout}>
              <button
                type="submit"
                className="min-h-11 rounded-md border border-zinc-400 px-3 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-100 focus-visible:ring-2 focus-visible:ring-blue-700 focus-visible:ring-offset-2 focus-visible:outline-none dark:text-zinc-50 dark:hover:bg-zinc-800"
              >
                Cerrar sesión
              </button>
            </form>
          </div>
        </nav>
      </header>
      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-4 px-4 py-8">
        {children}
      </main>
    </>
  );
}

export default function DashboardLayout({
  children,
}: LayoutProps<"/dashboard">) {
  return (
    <Suspense
      fallback={
        <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">
          <p role="status" className="text-zinc-700 dark:text-zinc-300">
            Cargando…
          </p>
        </main>
      }
    >
      <PrivateShell>{children}</PrivateShell>
    </Suspense>
  );
}
