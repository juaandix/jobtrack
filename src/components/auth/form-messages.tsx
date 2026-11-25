type FormMessagesProps = {
  error: string | null;
  notice?: string | null;
};

/** Form-level error (`role="alert"`) and informative notice (`role="status"`). */
export function FormMessages({ error, notice = null }: FormMessagesProps) {
  return (
    <>
      {error ? (
        <p
          role="alert"
          className="rounded-md border border-red-700 bg-red-50 px-3 py-2 text-sm text-red-800"
        >
          {error}
        </p>
      ) : null}
      {notice ? (
        <p
          role="status"
          className="rounded-md border border-green-700 bg-green-50 px-3 py-2 text-sm text-green-800"
        >
          {notice}
        </p>
      ) : null}
    </>
  );
}

/** Moves the focus to the first field (in form order) that has an error. */
export function focusFirstInvalidField(
  form: HTMLFormElement,
  fields: readonly string[],
  errors: Partial<Record<string, string>>,
): void {
  const first = fields.find((field) => errors[field] !== undefined);
  if (first === undefined) return;
  const element = form.elements.namedItem(first);
  if (element instanceof HTMLElement) {
    element.focus();
  }
}
