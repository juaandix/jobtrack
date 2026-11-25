type TextFieldProps = {
  id: string;
  name: string;
  label: string;
  type: "email" | "password";
  autoComplete: "email" | "current-password" | "new-password";
  defaultValue?: string;
  error?: string;
  hint?: string;
};

/**
 * Labelled input with its error below it. The error is linked with
 * `aria-describedby` and marks the input with `aria-invalid` (A11Y-03).
 */
export function TextField({
  id,
  name,
  label,
  type,
  autoComplete,
  defaultValue,
  error,
  hint,
}: TextFieldProps) {
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  const describedBy =
    [hint ? hintId : null, error ? errorId : null]
      .filter((value): value is string => value !== null)
      .join(" ") || undefined;

  return (
    <div className="flex flex-col gap-1">
      <label
        htmlFor={id}
        className="text-sm font-medium text-zinc-900 dark:text-zinc-100"
      >
        {label}
      </label>
      <input
        id={id}
        name={name}
        type={type}
        autoComplete={autoComplete}
        defaultValue={defaultValue}
        required
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        className="min-h-11 rounded-md border border-zinc-400 bg-white px-3 py-2 text-base text-zinc-900 focus-visible:border-blue-700 focus-visible:ring-2 focus-visible:ring-blue-700 focus-visible:ring-offset-1 focus-visible:outline-none aria-invalid:border-red-700"
      />
      {hint ? (
        <p id={hintId} className="text-sm text-zinc-700 dark:text-zinc-300">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} className="text-sm text-red-700 dark:text-red-400">
          {error}
        </p>
      ) : null}
    </div>
  );
}
