import { PORTAL_LABELS, STATUS_LABELS } from "@/lib/applications/labels";
import { formatCount } from "@/lib/metrics/format";
import type {
  PortalStatusRow,
  StatusCounts,
  WeeklyPoint,
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
function TableBox({ children }: { children: React.ReactNode }) {
  return <div className="w-full overflow-x-auto">{children}</div>;
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
    <TableBox>
      <table className="w-full border-collapse text-xs sm:text-sm">
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
  );
}
