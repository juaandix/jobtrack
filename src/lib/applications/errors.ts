import { z } from "zod";
import {
  APPLICATION_FIELDS,
  APPLICATION_LIMITS,
  APPLICATION_MESSAGES,
} from "@/lib/validation/application";
import { fieldErrors, type FieldErrors } from "@/lib/validation/errors";

export type ApplicationField = (typeof APPLICATION_FIELDS)[number];

/**
 * - `validation`: the input (or a database constraint) rejected some field.
 * - `not_found`: the row does not exist or belongs to someone else (RLS hides
 *   it, so both cases look the same and must not be told apart).
 * - `unauthorized`: no valid session, the database refused the operation.
 * - `unknown`: every other database or network error.
 */
export type ApplicationErrorKind =
  "validation" | "not_found" | "unauthorized" | "unknown";

export type ApplicationError = {
  kind: ApplicationErrorKind;
  /** Spanish message, safe to show: never includes database details. */
  message: string;
  /** Per-field messages; empty unless `kind` is `validation`. */
  fieldErrors: FieldErrors<ApplicationField>;
};

export type ApplicationResult<T> =
  { ok: true; data: T } | { ok: false; error: ApplicationError };

export type ApplicationOperation =
  "list" | "get" | "create" | "update" | "delete";

export const APPLICATION_ERROR_MESSAGES = {
  notFound: "No se ha encontrado la candidatura",
  unauthorized:
    "No tienes permiso para hacer esto. Inicia sesión de nuevo e inténtalo otra vez.",
  invalidData: APPLICATION_MESSAGES.invalidForm,
  companyInvalid: `La empresa debe tener entre 1 y ${APPLICATION_LIMITS.companyMaxLength} caracteres`,
  positionInvalid: `El puesto debe tener entre 1 y ${APPLICATION_LIMITS.positionMaxLength} caracteres`,
  salaryOutOfRange: `El salario debe estar entre ${APPLICATION_LIMITS.salaryMin} y ${APPLICATION_LIMITS.salaryMax.toLocaleString("es-ES")} €`,
  unknown: {
    list: "No se han podido cargar las candidaturas. Inténtalo de nuevo.",
    get: "No se ha podido cargar la candidatura. Inténtalo de nuevo.",
    create: "No se ha podido guardar la candidatura. Inténtalo de nuevo.",
    update: "No se han podido guardar los cambios. Inténtalo de nuevo.",
    delete: "No se ha podido borrar la candidatura. Inténtalo de nuevo.",
  },
} as const;

/** CHECK constraints of `public.applications` and the field each one guards. */
const CONSTRAINT_FIELDS: ReadonlyMap<
  string,
  { field: ApplicationField; message: string }
> = new Map([
  [
    "applications_company_length",
    { field: "company", message: APPLICATION_ERROR_MESSAGES.companyInvalid },
  ],
  [
    "applications_position_length",
    { field: "position", message: APPLICATION_ERROR_MESSAGES.positionInvalid },
  ],
  [
    "applications_offer_url_length",
    { field: "offer_url", message: APPLICATION_MESSAGES.offerUrlTooLong },
  ],
  [
    "applications_offer_url_format",
    { field: "offer_url", message: APPLICATION_MESSAGES.offerUrlInvalid },
  ],
  [
    "applications_salary_min_range",
    {
      field: "salary_min",
      message: APPLICATION_ERROR_MESSAGES.salaryOutOfRange,
    },
  ],
  [
    "applications_salary_max_range",
    {
      field: "salary_max",
      message: APPLICATION_ERROR_MESSAGES.salaryOutOfRange,
    },
  ],
  [
    "applications_salary_order",
    { field: "salary_max", message: APPLICATION_MESSAGES.salaryOrder },
  ],
  [
    "applications_notes_length",
    { field: "notes", message: APPLICATION_MESSAGES.notesTooLong },
  ],
]);

/** Postgres SQLSTATE codes (and PostgREST codes) handled explicitly. */
const PG_CHECK_VIOLATION = "23514";
const PG_NOT_NULL_VIOLATION = "23502";
const PG_INVALID_TEXT_REPRESENTATION = "22P02";
const PG_INSUFFICIENT_PRIVILEGE = "42501";
const PGRST_NO_ROWS = "PGRST116";

const databaseError = z.object({
  code: z.string().optional(),
  message: z.string().optional(),
});

function failure(
  kind: ApplicationErrorKind,
  message: string,
  errors: FieldErrors<ApplicationField> = {},
): ApplicationError {
  return { kind, message, fieldErrors: errors };
}

export function notFoundError(): ApplicationError {
  return failure("not_found", APPLICATION_ERROR_MESSAGES.notFound);
}

/**
 * Maps a failed `safeParse` of the application schemas to a validation error:
 * per-field messages plus a form-level message (the first issue without a
 * field, such as "no changes", or a generic one).
 */
export function validationError(error: z.ZodError): ApplicationError {
  const formIssue = error.issues.find((issue) => issue.path.length === 0);
  return failure(
    "validation",
    formIssue?.message ?? APPLICATION_ERROR_MESSAGES.invalidData,
    fieldErrors(error, APPLICATION_FIELDS),
  );
}

/** Name of the CHECK constraint quoted in a Postgres error message. */
function violatedConstraint(message: string | undefined): string | null {
  const match = /check constraint "([^"]+)"/.exec(message ?? "");
  return match?.[1] ?? null;
}

/** SQLSTATE (or PostgREST) code of a Supabase error, if it has one. */
export function databaseErrorCode(error: unknown): string | null {
  const parsed = databaseError.safeParse(error);
  return parsed.success ? (parsed.data.code ?? null) : null;
}

/**
 * Translates a Supabase/PostgREST error into a Spanish message that is safe to
 * show. CHECK violations become an error on the field they guard; anything
 * unexpected becomes a generic message for the operation, so table names,
 * constraint names or SQL never reach the user.
 */
export function applicationDatabaseError(
  error: unknown,
  operation: ApplicationOperation,
): ApplicationError {
  const parsed = databaseError.safeParse(error);
  const code = parsed.success ? parsed.data.code : undefined;

  if (code === PG_CHECK_VIOLATION) {
    const constraint = violatedConstraint(
      parsed.success ? parsed.data.message : undefined,
    );
    const target =
      constraint === null ? undefined : CONSTRAINT_FIELDS.get(constraint);
    return target === undefined
      ? failure("validation", APPLICATION_ERROR_MESSAGES.invalidData)
      : failure("validation", APPLICATION_ERROR_MESSAGES.invalidData, {
          [target.field]: target.message,
        });
  }
  if (
    code === PG_NOT_NULL_VIOLATION ||
    code === PG_INVALID_TEXT_REPRESENTATION
  ) {
    return failure("validation", APPLICATION_ERROR_MESSAGES.invalidData);
  }
  if (code === PG_INSUFFICIENT_PRIVILEGE) {
    return failure("unauthorized", APPLICATION_ERROR_MESSAGES.unauthorized);
  }
  if (code === PGRST_NO_ROWS && operation !== "list") {
    return notFoundError();
  }
  return failure("unknown", APPLICATION_ERROR_MESSAGES.unknown[operation]);
}
