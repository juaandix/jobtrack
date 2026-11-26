import type { ApplicationStatus } from "@/lib/validation/application";

/*
 * Colours of the charts. Every series also has a text label (legend, axis and
 * the data table), so colour is never the only way to tell them apart
 * (A11Y-07). The same colours are used in light and dark mode, so each one
 * must reach at least 3:1 (the WCAG minimum for graphical objects) against
 * both chart backgrounds: CHART_BACKGROUNDS below. chart-theme.test.ts
 * computes the WCAG contrast ratio of every series against both.
 *
 * Contrast (white / #09090b):
 *   blue-600   #2563eb  5.17 / 3.85
 *   zinc-500   #71717a  4.83 / 4.12
 *   violet-500 #8b5cf6  4.23 / 4.70
 *   green-700  #15803d  5.02 / 3.97
 *   red-600    #dc2626  4.83 / 4.12
 *   amber-700  #b45309  5.02 / 3.96
 */

/** Backgrounds the charts are drawn on: white and `dark:bg-zinc-950`. */
export const CHART_BACKGROUNDS = {
  light: "#ffffff",
  dark: "#09090b",
} as const;

/** Minimum contrast ratio for graphical objects (WCAG 1.4.11). */
export const MIN_GRAPHIC_CONTRAST = 3;

export const WEEKLY_BAR_COLOR = "#2563eb"; // blue-600

export const STATUS_COLORS: Readonly<Record<ApplicationStatus, string>> = {
  enviada: "#71717a", // zinc-500
  en_proceso: "#2563eb", // blue-600
  entrevista: "#8b5cf6", // violet-500
  oferta: "#15803d", // green-700
  descartada: "#dc2626", // red-600
  rechazada_por_mi: "#b45309", // amber-700
};

/** Axis ticks inherit the text colour of the wrapper (light and dark mode). */
export const AXIS_TICK = { fill: "currentColor", fontSize: 12 } as const;

/** Tooltip on a white box with dark text, whatever the series colour. */
export const TOOLTIP_CONTENT_STYLE = {
  backgroundColor: "#ffffff",
  border: "1px solid #a1a1aa",
  borderRadius: 6,
  color: "#18181b",
} as const;

export const TOOLTIP_ITEM_STYLE = { color: "#18181b" } as const;
