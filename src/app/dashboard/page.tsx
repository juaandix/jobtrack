import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Mis candidaturas · JobTrack",
};

export default function DashboardPage() {
  return (
    <>
      <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
        Mis candidaturas
      </h1>
      <p className="text-zinc-700 dark:text-zinc-300">
        Todavía no tienes candidaturas. Pronto podrás añadir la primera desde
        aquí.
      </p>
    </>
  );
}
