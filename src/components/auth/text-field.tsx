import { CONTROL_CLASS, LABEL_CLASS } from "@/components/ui/classes";

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
      <label htmlFor={id} className={LABEL_CLASS}>
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
        className={CONTROL_CLASS}
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
