import Link from "next/link";
import { DeleteApplicationButton } from "./delete-application-button";
import { EmptyApplications } from "./page-states";
import { StatusBadge } from "./status-badge";
import { SECONDARY_BUTTON_CLASS } from "@/components/ui/classes";
import { PORTAL_LABELS, formatAppliedAt } from "@/lib/applications/labels";
import type { Application } from "@/lib/applications/repository";
import { editApplicationPath } from "@/lib/applications/routes";

function Actions({ application }: { application: Application }) {
  const { id, company, position } = application;
  return (
    <div className="flex flex-wrap gap-2">
      <Link
        href={editApplicationPath(id)}
        aria-label={`Editar la candidatura de ${position} en ${company}`}
        className={`${SECONDARY_BUTTON_CLASS} text-sm`}
      >
        Editar
      </Link>
      <DeleteApplicationButton id={id} company={company} position={position} />
    </div>
  );
}

function AppliedAt({ value }: { value: string }) {
  return <time dateTime={value}>{formatAppliedAt(value)}</time>;
}

/**
 * The user's applications: cards on small screens and a table from `md` up.
 * Only one of the two is displayed (the other is `display: none`, so it is
 * also hidden from assistive technologies).
 */
export function ApplicationList({
  applications,
}: {
  applications: readonly Application[];
}) {
  if (applications.length === 0) return <EmptyApplications />;

  return (
    <>
      <ul aria-label="Candidaturas" className="flex flex-col gap-3 md:hidden">
        {applications.map((application) => (
          <li
            key={application.id}
            className="flex min-w-0 flex-col gap-3 rounded-lg border border-zinc-300 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-950"
          >
            <div className="flex min-w-0 flex-col gap-1">
              <h2 className="font-semibold break-words text-zinc-900 dark:text-zinc-50">
                {application.position}
              </h2>
              <p className="break-words text-zinc-700 dark:text-zinc-300">
                {application.company}
              </p>
            </div>
            <dl className="grid grid-cols-[auto_1fr] items-center gap-x-3 gap-y-1 text-sm">
              <dt className="text-zinc-700 dark:text-zinc-300">Estado</dt>
              <dd>
                <StatusBadge status={application.status} />
              </dd>
              <dt className="text-zinc-700 dark:text-zinc-300">Portal</dt>
              <dd className="text-zinc-900 dark:text-zinc-100">
                {PORTAL_LABELS[application.portal]}
              </dd>
              <dt className="text-zinc-700 dark:text-zinc-300">Fecha</dt>
              <dd className="text-zinc-900 dark:text-zinc-100">
                <AppliedAt value={application.applied_at} />
              </dd>
            </dl>
            <Actions application={application} />
          </li>
        ))}
      </ul>
      <table className="hidden w-full border-collapse text-left text-sm md:table">
        <caption className="sr-only">Candidaturas</caption>
        <thead>
          <tr className="border-b border-zinc-300 text-zinc-700 dark:border-zinc-700 dark:text-zinc-300">
            <th scope="col" className="py-2 pr-4 font-medium">
              Empresa
            </th>
            <th scope="col" className="py-2 pr-4 font-medium">
              Puesto
            </th>
            <th scope="col" className="py-2 pr-4 font-medium">
              Estado
            </th>
            <th scope="col" className="py-2 pr-4 font-medium">
              Portal
            </th>
            <th scope="col" className="py-2 pr-4 font-medium">
              Fecha
            </th>
            <th scope="col" className="py-2 font-medium">
              <span className="sr-only">Acciones</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {applications.map((application) => (
            <tr
              key={application.id}
              className="border-b border-zinc-200 align-middle text-zinc-900 dark:border-zinc-800 dark:text-zinc-100"
            >
              <td className="py-3 pr-4 font-medium break-words">
                {application.company}
              </td>
              <td className="py-3 pr-4 break-words">{application.position}</td>
              <td className="py-3 pr-4">
                <StatusBadge status={application.status} />
              </td>
              <td className="py-3 pr-4">{PORTAL_LABELS[application.portal]}</td>
              <td className="py-3 pr-4 whitespace-nowrap">
                <AppliedAt value={application.applied_at} />
              </td>
              <td className="py-3">
                <Actions application={application} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}
