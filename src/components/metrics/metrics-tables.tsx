import { applicationsCount } from "@/lib/applications/filter";
import { PORTAL_LABELS, STATUS_LABELS } from "@/lib/applications/labels";
import { formatCount } from "@/lib/metrics/format";
import {
  nonZeroStatuses,
  type PortalStatusRow,
  type StatusCounts,
  type WeeklyPoint,
} from "@/lib/metrics/metrics";
import { APPLICATION_STATUSES } from "@/lib/validation/application";

/*
 * Text alternatives of the charts (A11Y-08): the same data as accessible
 * tables, with a caption and row/column headers. They stay visible, so they
 * also help anyone who cannot tell the chart colours apart.
 */

const CAPTION_CLASS =
  "mb-2 text-left text-sm font-medium text-zinc-700 dark:text-zinc-300";
const CELL_CLASS = "border-b border-zinc-200 px-2 py-1.5 dark:border-zinc-800";
const HEADER_CLASS = `${CELL_CLASS} text-left font-medium text-zinc-900 dark:text-zinc-50`;
const NUMBER_CLASS = `${CELL_CLASS} text-right tabular-nums text-zinc-900 dark:text-zinc-100`;

/** Wide tables scroll inside their box, never the page (UI-02). */
function TableBox({
  className = "",
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={`w-full overflow-x-auto ${className}`}>{children}</div>
  );
}

/** One card of the small-screen view: a title and its non-zero statuses. */
function StatusCard({
  title,
  total,
  counts,
}: {
  title: string;
  total: number;
  counts: StatusCounts;
}) {
  const statuses = nonZeroStatuses(counts);
  return (
    <li className="flex flex-col gap-2 rounded-md border border-zinc-300 p-3 dark:border-zinc-700">
      <h3 className="flex flex-wrap justify-between gap-x-3 font-medium text-zinc-900 dark:text-zinc-50">
        <span>{title}</span>
        <span className="text-zinc-700 dark:text-zinc-300">
          {applicationsCount(total)}
        </span>
      </h3>
      {statuses.length === 0 ? null : (
        <dl className="grid grid-cols-[1fr_auto] gap-x-3 gap-y-1 text-sm">
          {statuses.map(({ status, count }) => (
            <div key={status} className="contents">
              <dt className="text-zinc-700 dark:text-zinc-300">
                {STATUS_LABELS[status]}
              </dt>
              <dd className="text-right text-zinc-900 tabular-nums dark:text-zinc-100">
                {formatCount(count)}
              </dd>
            </div>
          ))}
        </dl>
      )}
    </li>
  );
}

export function WeeklyTable({
  weeks,
  caption,
}: {
  weeks: readonly WeeklyPoint[];
  caption: string;
}) {
  return (
    <TableBox>
      <table className="w-full border-collapse text-sm">
        <caption className={CAPTION_CLASS}>{caption}</caption>
        <thead>
          <tr>
            <th scope="col" className={HEADER_CLASS}>
              Semana
            </th>
            <th scope="col" className={`${HEADER_CLASS} text-right`}>
              Candidaturas
            </th>
          </tr>
        </thead>
        <tbody>
          {weeks.map((week) => (
            <tr key={week.key}>
              <th
                scope="row"
                className={`${CELL_CLASS} text-left font-normal text-zinc-900 dark:text-zinc-100`}
              >
                {week.label}
              </th>
              <td className={NUMBER_CLASS}>{formatCount(week.count)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </TableBox>
  );
}

export function PortalStatusTable({
  rows,
  statusTotals,
  total,
  caption,
}: {
  rows: readonly PortalStatusRow[];
  statusTotals: StatusCounts;
  total: number;
  caption: string;
}) {
  return (
    <>
      {/*
       * Below `sm` the eight columns do not fit: the same data as one card
       * per portal (statuses at 0 are left out) plus the totals. Only one of
       * the two views is displayed; the other is `display: none`, so it is
       * also hidden from assistive technologies.
       */}
      <ul aria-label={caption} className="flex flex-col gap-3 sm:hidden">
        {rows.map((row) => (
          <StatusCard
            key={row.portal}
            title={PORTAL_LABELS[row.portal]}
            total={row.total}
            counts={row.counts}
          />
        ))}
        <StatusCard title="Total" total={total} counts={statusTotals} />
      </ul>
      <TableBox className="hidden sm:block">
        <table className="w-full border-collapse text-sm">
          <caption className={CAPTION_CLASS}>{caption}</caption>
          <thead>
            <tr>
              <th scope="col" className={HEADER_CLASS}>
                Portal
              </th>
              {APPLICATION_STATUSES.map((status) => (
                <th
                  key={status}
                  scope="col"
                  className={`${HEADER_CLASS} text-right`}
                >
                  {STATUS_LABELS[status]}
                </th>
              ))}
              <th scope="col" className={`${HEADER_CLASS} text-right`}>
                Total
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.portal}>
                <th
                  scope="row"
                  className={`${CELL_CLASS} text-left font-normal text-zinc-900 dark:text-zinc-100`}
                >
                  {PORTAL_LABELS[row.portal]}
                </th>
                {APPLICATION_STATUSES.map((status) => (
                  <td key={status} className={NUMBER_CLASS}>
                    {formatCount(row.counts[status])}
                  </td>
                ))}
                <td className={`${NUMBER_CLASS} font-semibold`}>
                  {formatCount(row.total)}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <th scope="row" className={HEADER_CLASS}>
                Total
              </th>
              {APPLICATION_STATUSES.map((status) => (
                <td key={status} className={`${NUMBER_CLASS} font-semibold`}>
                  {formatCount(statusTotals[status])}
                </td>
              ))}
              <td className={`${NUMBER_CLASS} font-semibold`}>
                {formatCount(total)}
              </td>
            </tr>
          </tfoot>
        </table>
      </TableBox>
    </>
  );
}
