import { formatCount } from "@/lib/metrics/format";

type TooltipEntry = { name?: unknown; value?: unknown };

export type ChartTooltipProps = {
  active?: boolean;
  label?: unknown;
  payload?: readonly TooltipEntry[];
  /** Text of the heading from the hovered category (e.g. the week). */
  formatLabel?: (label: string) => string;
};

function entryValue(value: unknown): string {
  return typeof value === "number" ? formatCount(value) : String(value ?? "");
}

/**
 * Tooltip content of the charts, styled with Tailwind so it follows the
 * light/dark theme like the rest of the page (A11Y-07). The charts are
 * `aria-hidden`, so this is a visual aid only: the tables carry the data.
 */
export function ChartTooltip({
  active = false,
  label,
  payload = [],
  formatLabel = (text) => text,
}: ChartTooltipProps) {
  if (!active || payload.length === 0) return null;
  return (
    <div className="rounded-md border border-zinc-400 bg-white px-3 py-2 text-sm text-zinc-900 shadow-md dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-50">
      <p className="font-medium">{formatLabel(String(label ?? ""))}</p>
      <ul className="mt-1 flex flex-col gap-0.5">
        {payload.map((entry, index) => (
          <li key={`${String(entry.name)}-${index}`}>
            {String(entry.name ?? "")}: {entryValue(entry.value)}
          </li>
        ))}
      </ul>
    </div>
  );
}
