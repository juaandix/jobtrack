"use client";

import { usePathname } from "next/navigation";
import { usesWideLayout } from "@/lib/applications/routes";

/**
 * Centred content box of the private pages: `max-w-5xl`, or wider on the
 * pages that need it (the board). A client component only because it needs
 * the pathname; the layout above it does not re-render on navigation.
 */
export function ContentWidth({
  className,
  children,
}: {
  className: string;
  children: React.ReactNode;
}) {
  const width = usesWideLayout(usePathname())
    ? "max-w-screen-2xl"
    : "max-w-5xl";
  return (
    <div className={`mx-auto w-full ${width} px-4 ${className}`}>
      {children}
    </div>
  );
}
