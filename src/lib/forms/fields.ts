/*
 * Reading HTML form fields as plain strings, shared by every form (auth and
 * applications) on the client and in the Server Actions.
 */

/** Text value of a form field, or `null` if it is missing or a file. */
export function readStringField(
  formData: FormData,
  name: string,
): string | null {
  const value = formData.get(name);
  return typeof value === "string" ? value : null;
}

/**
 * Reads the given fields of a form as strings, ready for `safeParse`. Missing
 * fields (or files) become `undefined`, so the schema reports them as required.
 */
export function readFormFields<K extends string>(
  formData: FormData,
  fields: readonly K[],
): Partial<Record<K, string>> {
  const result: Partial<Record<K, string>> = {};
  for (const field of fields) {
    const value = readStringField(formData, field);
    if (value !== null) {
      result[field] = value;
    }
  }
  return result;
}
