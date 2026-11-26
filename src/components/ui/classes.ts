/*
 * Tailwind classes shared by the buttons, links and messages of every view, so
 * they look and behave the same everywhere: visible focus (A11Y-05), 44 px
 * targets (UI-04) and text with at least 4.5:1 contrast in light and dark
 * mode (A11Y-07).
 */

export const FOCUS_RING_CLASS =
  "focus-visible:ring-2 focus-visible:ring-blue-700 focus-visible:ring-offset-2 focus-visible:outline-none";

const BUTTON_BASE_CLASS = `inline-flex min-h-11 items-center justify-center rounded-md px-4 py-2 font-medium ${FOCUS_RING_CLASS}`;

/** Main action: a filled blue button (or a link that looks like one). */
export const PRIMARY_BUTTON_CLASS = `${BUTTON_BASE_CLASS} bg-blue-700 text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:bg-zinc-500`;

/** Secondary action ("Cancelar", "Editar", "Limpiar filtros"…). */
export const SECONDARY_BUTTON_CLASS = `${BUTTON_BASE_CLASS} border border-zinc-400 text-zinc-900 hover:bg-zinc-100 dark:text-zinc-50 dark:hover:bg-zinc-800`;

/** Destructive action that opens a confirmation ("Borrar"). */
export const DANGER_OUTLINE_BUTTON_CLASS = `${BUTTON_BASE_CLASS} border border-red-700 text-red-800 hover:bg-red-50 dark:text-red-300 dark:hover:bg-red-950`;

/** Confirms a destructive action ("Sí, borrar"). */
export const DANGER_BUTTON_CLASS = `${BUTTON_BASE_CLASS} bg-red-700 text-white hover:bg-red-800 disabled:cursor-not-allowed disabled:bg-zinc-500`;

/** Underlined link inside a text. */
export const TEXT_LINK_CLASS =
  "font-medium text-blue-700 underline underline-offset-2 hover:text-blue-800 focus-visible:rounded-sm focus-visible:ring-2 focus-visible:ring-blue-700 focus-visible:outline-none dark:text-blue-400 dark:hover:text-blue-300";

/** The `<h1>` of every page. */
export const PAGE_TITLE_CLASS =
  "text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50";

/** Error message box (used with `role="alert"`). */
export const ERROR_MESSAGE_CLASS =
  "rounded-md border border-red-700 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-400 dark:bg-red-950 dark:text-red-200";

/** Informative message box (used with `role="status"`). */
export const NOTICE_MESSAGE_CLASS =
  "rounded-md border border-green-700 bg-green-50 px-3 py-2 text-sm text-green-800 dark:border-green-400 dark:bg-green-950 dark:text-green-200";

/** Label and text control (input, select, textarea) of a form field. */
export const LABEL_CLASS =
  "text-sm font-medium text-zinc-900 dark:text-zinc-100";
export const CONTROL_CLASS =
  "min-h-11 w-full min-w-0 rounded-md border border-zinc-400 bg-white px-3 py-2 text-base text-zinc-900 focus-visible:border-blue-700 focus-visible:ring-2 focus-visible:ring-blue-700 focus-visible:ring-offset-1 focus-visible:outline-none aria-invalid:border-red-700";
