/** Loading message announced politely to assistive technologies. */
export function LoadingMessage({ children }: { children: React.ReactNode }) {
  return (
    <p role="status" className="text-zinc-700 dark:text-zinc-300">
      {children}
    </p>
  );
}
