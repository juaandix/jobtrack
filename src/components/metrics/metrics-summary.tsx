import type { MetricsSummary as Summary } from "@/lib/metrics/metrics";
import { formatCount, formatPercent } from "@/lib/metrics/format";

type Kpi = { label: string; value: string; detail: string };

function kpis(summary: Summary): Kpi[] {
  const { total, responseRate, active, interviews, offers } = summary;
  return [
    {
      label: "Total de candidaturas",
      value: formatCount(total),
      detail: "Todas las que has registrado",
    },
    {
      label: "Tasa de respuesta",
      value: formatPercent(responseRate.percent),
      detail: `${formatCount(responseRate.responded)} de ${formatCount(responseRate.total)} han pasado de «Enviada»`,
    },
    {
      label: "Procesos activos",
      value: formatCount(active),
      detail: `En proceso o entrevista (${formatCount(interviews)} en entrevista)`,
    },
    {
      label: "Ofertas recibidas",
      value: formatCount(offers),
      detail: "Candidaturas en estado «Oferta»",
    },
  ];
}

/** KPI cards; the figures come already calculated (ARQ-03). */
export function MetricsSummary({ summary }: { summary: Summary }) {
  return (
    <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {kpis(summary).map(({ label, value, detail }) => (
        <div
          key={label}
          className="flex flex-col gap-1 rounded-lg border border-zinc-300 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-950"
        >
          <dt className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            {label}
          </dt>
          <dd className="text-3xl font-semibold text-zinc-900 dark:text-zinc-50">
            {value}
          </dd>
          <dd className="text-sm text-zinc-700 dark:text-zinc-300">{detail}</dd>
        </div>
      ))}
    </dl>
  );
}
