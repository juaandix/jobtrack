"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  AXIS_TICK,
  TOOLTIP_CONTENT_STYLE,
  TOOLTIP_ITEM_STYLE,
  WEEKLY_BAR_COLOR,
} from "./chart-theme";
import type { WeeklyPoint } from "@/lib/metrics/metrics";

function weekTooltipLabel(label: unknown): string {
  return `Semana del ${String(label)}`;
}

/**
 * Bar chart of applications per week. Hidden from assistive technologies:
 * the same data is in the table next to it (A11Y-08). A client component only
 * because Recharts measures the container in the browser.
 */
export function WeeklyChart({ weeks }: { weeks: readonly WeeklyPoint[] }) {
  return (
    <div
      aria-hidden="true"
      className="h-60 w-full text-zinc-700 dark:text-zinc-300"
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={[...weeks]}
          accessibilityLayer={false}
          margin={{ top: 8, right: 8, bottom: 0, left: -16 }}
        >
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="shortLabel" tick={AXIS_TICK} tickLine={false} />
          <YAxis allowDecimals={false} tick={AXIS_TICK} tickLine={false} />
          <Tooltip
            cursor={{ fillOpacity: 0.1 }}
            contentStyle={TOOLTIP_CONTENT_STYLE}
            itemStyle={TOOLTIP_ITEM_STYLE}
            labelFormatter={weekTooltipLabel}
          />
          <Bar
            dataKey="count"
            name="Candidaturas"
            fill={WEEKLY_BAR_COLOR}
            isAnimationActive={false}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
