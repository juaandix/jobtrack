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
