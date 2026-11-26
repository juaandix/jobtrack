"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  AXIS_TICK,
  STATUS_COLORS,
  TOOLTIP_CONTENT_STYLE,
  TOOLTIP_ITEM_STYLE,
} from "./chart-theme";
import { PORTAL_LABELS, STATUS_LABELS } from "@/lib/applications/labels";
import type { PortalStatusRow } from "@/lib/metrics/metrics";
import { APPLICATION_STATUSES } from "@/lib/validation/application";

function portalLabel(row: PortalStatusRow): string {
  return PORTAL_LABELS[row.portal];
}

function legendText(value: string) {
  return <span className="text-zinc-900 dark:text-zinc-100">{value}</span>;
}

/**
 * Stacked bars of statuses per portal, one colour per status with its name
 * in the legend. Hidden from assistive technologies: the same data is in the
 * table next to it (A11Y-08).
 */
export function PortalStatusChart({
  rows,
}: {
  rows: readonly PortalStatusRow[];
}) {
  return (
    <div
      aria-hidden="true"
      className="h-96 w-full text-zinc-700 dark:text-zinc-300"
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={[...rows]}
          layout="vertical"
          accessibilityLayer={false}
          margin={{ top: 8, right: 8, bottom: 0, left: 0 }}
        >
          <CartesianGrid strokeDasharray="3 3" horizontal={false} />
          <XAxis
            type="number"
            allowDecimals={false}
            tick={AXIS_TICK}
            tickLine={false}
          />
          <YAxis
            type="category"
            dataKey={portalLabel}
            width={112}
            tick={AXIS_TICK}
            tickLine={false}
          />
          <Tooltip
            cursor={{ fillOpacity: 0.1 }}
            contentStyle={TOOLTIP_CONTENT_STYLE}
            itemStyle={TOOLTIP_ITEM_STYLE}
          />
          <Legend formatter={legendText} itemSorter={null} />
          {APPLICATION_STATUSES.map((status) => (
            <Bar
              key={status}
              dataKey={(row: PortalStatusRow) => row.counts[status]}
              name={STATUS_LABELS[status]}
              stackId="statuses"
              fill={STATUS_COLORS[status]}
              isAnimationActive={false}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
