import type { z } from "zod";

/** First error message for each field, keyed by field name. */
export type FieldErrors<K extends string> = Partial<Record<K, string>>;

/**
 * Maps a `ZodError` to the first message of each known top-level field, ready
 * to be shown next to its input. `fields` lists the form fields (for an object
 * schema, `schema.keyof().options`). Issues without a field or for unknown
 * fields (e.g. the whole input is not an object) are ignored: the caller
 * decides how to report those.
 */
export function fieldErrors<K extends string>(
  error: z.ZodError,
  fields: readonly K[],
): FieldErrors<K> {
  const result: FieldErrors<K> = {};
  for (const issue of error.issues) {
    const field = fields.find((name) => name === issue.path[0]);
    if (field !== undefined && result[field] === undefined) {
      result[field] = issue.message;
    }
  }
  return result;
}
