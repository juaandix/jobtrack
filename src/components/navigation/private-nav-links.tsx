"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  APPLICATIONS_PATH,
  BOARD_PATH,
  METRICS_PATH,
} from "@/lib/applications/routes";

const LINKS = [
  { href: APPLICATIONS_PATH, label: "Lista" },
  { href: BOARD_PATH, label: "Tablero" },
  { href: METRICS_PATH, label: "Métricas" },
] as const;

/**
 * The views of the applications. A client component only to mark the
 * current one with `aria-current="page"` (it needs the pathname).
 */
export function PrivateNavLinks() {
  const pathname = usePathname();

  return (
    <ul className="flex items-center gap-1">
      {LINKS.map(({ href, label }) => {
        const current = pathname === href;
        return (
          <li key={href}>
            <Link
              href={href}
              aria-current={current ? "page" : undefined}
              className={`inline-flex min-h-11 items-center rounded-md px-3 font-medium hover:bg-zinc-100 focus-visible:ring-2 focus-visible:ring-blue-700 focus-visible:outline-none dark:hover:bg-zinc-800 ${
                current
                  ? "text-blue-800 underline underline-offset-4 dark:text-blue-300"
                  : "text-zinc-900 dark:text-zinc-50"
              }`}
            >
              {label}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
