import { Suspense } from "react";
import { ContentWidth } from "@/components/navigation/content-width";
import { PrivateNavLinks } from "@/components/navigation/private-nav-links";
import { SECONDARY_BUTTON_CLASS } from "@/components/ui/classes";
import { logout } from "@/lib/auth/actions";
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
        <nav aria-label="Principal">
          <ContentWidth className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 py-2">
            <PrivateNavLinks />
            <div className="flex min-w-0 items-center gap-3">
              {user.email ? (
                <span className="truncate text-sm text-zinc-700 dark:text-zinc-300">
                  {user.email}
                </span>
              ) : null}
              <form action={logout} className="shrink-0">
                <button
                  type="submit"
                  className={`${SECONDARY_BUTTON_CLASS} text-sm whitespace-nowrap`}
                >
                  Cerrar sesión
                </button>
              </form>
            </div>
          </ContentWidth>
        </nav>
      </header>
      <main className="flex flex-1 flex-col">
        <ContentWidth className="flex flex-1 flex-col gap-4 py-8">
          {children}
        </ContentWidth>
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
