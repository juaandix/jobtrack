export const LABEL_CLASS =
  "text-sm font-medium text-zinc-900 dark:text-zinc-100";
export const CONTROL_CLASS =
  "min-h-11 w-full min-w-0 rounded-md border border-zinc-400 bg-white px-3 py-2 text-base text-zinc-900 focus-visible:border-blue-700 focus-visible:ring-2 focus-visible:ring-blue-700 focus-visible:ring-offset-1 focus-visible:outline-none aria-invalid:border-red-700";

type BaseFieldProps = {
  id: string;
  name: string;
  label: string;
  defaultValue?: string;
  error?: string;
  hint?: string;
  required?: boolean;
};

function describedBy(id: string, hint?: string, error?: string) {
  const ids = [hint ? `${id}-hint` : null, error ? `${id}-error` : null];
  return (
    ids.filter((value): value is string => value !== null).join(" ") ||
    undefined
  );
}

function FieldFrame({
  id,
  label,
  required,
  hint,
  error,
  children,
}: Pick<BaseFieldProps, "id" | "label" | "required" | "hint" | "error"> & {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <label htmlFor={id} className={LABEL_CLASS}>
        {label}
        {required ? null : (
          <span className="font-normal text-zinc-700 dark:text-zinc-300">
            {" "}
            (opcional)
          </span>
        )}
      </label>
      {children}
      {hint ? (
        <p
          id={`${id}-hint`}
          className="text-sm text-zinc-700 dark:text-zinc-300"
        >
          {hint}
        </p>
      ) : null}
      {error ? (
        <p
          id={`${id}-error`}
          className="text-sm text-red-700 dark:text-red-400"
        >
          {error}
        </p>
      ) : null}
    </div>
  );
}

type InputFieldProps = BaseFieldProps & {
  type: "text" | "url" | "date";
  inputMode?: "text" | "url" | "numeric";
  autoComplete?: "off" | "organization" | "organization-title" | "url";
};

/**
 * Labelled input with an optional hint and its error below it. Hint and error
 * are linked with `aria-describedby`; an error sets `aria-invalid` (A11Y-03).
 */
export function InputField({
  id,
  name,
  label,
  type,
  inputMode,
  autoComplete,
  defaultValue,
  error,
  hint,
  required = false,
}: InputFieldProps) {
  return (
    <FieldFrame
      id={id}
      label={label}
      required={required}
      hint={hint}
      error={error}
    >
      <input
        id={id}
        name={name}
        type={type}
        inputMode={inputMode}
        autoComplete={autoComplete}
        defaultValue={defaultValue}
        required={required}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(id, hint, error)}
        className={CONTROL_CLASS}
      />
    </FieldFrame>
  );
}

type SelectFieldProps = BaseFieldProps & {
  options: readonly { value: string; label: string }[];
};

export function SelectField({
  id,
  name,
  label,
  options,
  defaultValue,
  error,
  hint,
  required = false,
}: SelectFieldProps) {
  return (
    <FieldFrame
      id={id}
      label={label}
      required={required}
      hint={hint}
      error={error}
    >
      <select
        id={id}
        name={name}
        defaultValue={defaultValue}
        required={required}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(id, hint, error)}
        className={CONTROL_CLASS}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </FieldFrame>
  );
}

export function TextAreaField({
  id,
  name,
  label,
  defaultValue,
  error,
  hint,
  required = false,
}: BaseFieldProps) {
  return (
    <FieldFrame
      id={id}
      label={label}
      required={required}
      hint={hint}
      error={error}
    >
      <textarea
        id={id}
        name={name}
        rows={4}
        defaultValue={defaultValue}
        required={required}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(id, hint, error)}
        className={CONTROL_CLASS}
      />
    </FieldFrame>
  );
}
