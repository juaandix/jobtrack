"use client";

import { createContext, use, useEffect, useRef, useState } from "react";

type AnnounceDeletion = (message: string) => void;

const DeletionAnnouncerContext = createContext<AnnounceDeletion | null>(null);

type Announcement = { id: number; message: string };

/**
 * Wraps the list page. A deleted application disappears together with its
 * "Borrar" button, so the feedback is given from here, which stays mounted:
 * the message goes to a polite live region and the focus to the page `<h1>`
 * (it needs `tabIndex={-1}`), a stable place to continue from.
 */
export function DeletionAnnouncer({ children }: { children: React.ReactNode }) {
  const [announcement, setAnnouncement] = useState<Announcement | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (announcement === null) return;
    containerRef.current?.querySelector("h1")?.focus();
  }, [announcement]);

  function announce(message: string): void {
    setAnnouncement((previous) => ({
      id: (previous?.id ?? 0) + 1,
      message,
    }));
  }

  return (
    <DeletionAnnouncerContext value={announce}>
      <div ref={containerRef} className="contents">
        {children}
      </div>
      <p aria-live="polite" aria-atomic="true" className="sr-only">
        {/* A new node per deletion, so a repeated text is announced again. */}
        {announcement ? (
          <span key={announcement.id}>{announcement.message}</span>
        ) : null}
      </p>
    </DeletionAnnouncerContext>
  );
}

/** The announcer of the page, or `null` outside a `DeletionAnnouncer`. */
export function useAnnounceDeletion(): AnnounceDeletion | null {
  return use(DeletionAnnouncerContext);
}
