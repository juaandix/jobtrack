import { useId } from "react";
import { MetricsSummary } from "./metrics-summary";
import { PortalStatusTable, WeeklyTable } from "./metrics-tables";
import { PortalStatusChart } from "./portal-status-chart";
import { WeeklyChart } from "./weekly-chart";
import { formatCount } from "@/lib/metrics/format";
import type { Metrics } from "@/lib/metrics/metrics";

const SECTION_CLASS =
  "flex min-w-0 flex-col gap-3 rounded-lg border border-zinc-300 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-950";
const HEADING_CLASS = "text-lg font-semibold text-zinc-900 dark:text-zinc-50";

/**
 * The metrics page: KPI cards, then each chart followed by its data table.
 * Everything arrives already calculated by `buildMetrics` (ARQ-03); only the
 * Recharts charts are client components (ARQ-02).
 */
export function MetricsPanel({ metrics }: { metrics: Metrics }) {
  // Unique ids: with cacheComponents a visited page stays mounted (hidden).
  const summaryId = useId();
  const weeklyId = useId();
  const portalsId = useId();
  const { summary, weekly, portals, statusTotals } = metrics;
  const weeks = formatCount(weekly.length);

  return (
    <div className="flex min-w-0 flex-col gap-6">
      <section aria-labelledby={summaryId} className="flex flex-col gap-3">
        <h2 id={summaryId} className={HEADING_CLASS}>
          Resumen
        </h2>
        <MetricsSummary summary={summary} />
      </section>

      <section aria-labelledby={weeklyId} className={SECTION_CLASS}>
        <h2 id={weeklyId} className={HEADING_CLASS}>
          Candidaturas por semana
        </h2>
        <p className="text-sm text-zinc-700 dark:text-zinc-300">
          Últimas {weeks} semanas, de lunes a domingo, según la fecha de la
          candidatura.
        </p>
        <WeeklyChart weeks={weekly} />
        <WeeklyTable
          weeks={weekly}
          caption={`Datos del gráfico: candidaturas en cada una de las últimas ${weeks} semanas`}
        />
      </section>

      <section aria-labelledby={portalsId} className={SECTION_CLASS}>
        <h2 id={portalsId} className={HEADING_CLASS}>
          Estados por portal
        </h2>
        <p className="text-sm text-zinc-700 dark:text-zinc-300">
          Cuántas candidaturas de cada portal hay en cada estado.
        </p>
        <PortalStatusChart rows={portals} />
        <PortalStatusTable
          rows={portals}
          statusTotals={statusTotals}
          total={summary.total}
          caption="Datos del gráfico: candidaturas por portal y estado"
        />
      </section>
    </div>
  );
}
