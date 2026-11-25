import Link from "next/link";

export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 px-4 py-10 sm:py-16">
      <Link
        href="/"
        className="self-start text-lg font-semibold text-zinc-900 focus-visible:rounded-sm focus-visible:ring-2 focus-visible:ring-blue-700 focus-visible:outline-none dark:text-zinc-50"
      >
        JobTrack
      </Link>
      {children}
    </main>
  );
}
