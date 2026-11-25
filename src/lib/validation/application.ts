import { z } from "zod";
import { Constants } from "@/lib/database.types";

/**
 * Enum values come from the generated `database.types.ts`, which mirrors the
 * SQL enums, so they are defined only once (VAL-03).
 */
export const APPLICATION_STATUSES = Constants.public.Enums.application_status;
export const APPLICATION_PORTALS = Constants.public.Enums.application_portal;

/** Same limits as the CHECK constraints of `public.applications`. */
export const APPLICATION_LIMITS = {
  companyMaxLength: 200,
  positionMaxLength: 200,
  offerUrlMaxLength: 2048,
  notesMaxLength: 5000,
  salaryMin: 0,
  salaryMax: 10_000_000,
} as const;

export const APPLICATION_MESSAGES = {
  companyRequired: "Introduce la empresa",
  companyTooLong: `La empresa no puede superar los ${APPLICATION_LIMITS.companyMaxLength} caracteres`,
  positionRequired: "Introduce el puesto",
  positionTooLong: `El puesto no puede superar los ${APPLICATION_LIMITS.positionMaxLength} caracteres`,
  offerUrlInvalid:
    "El enlace debe empezar por http:// o https:// y no contener espacios",
  offerUrlTooLong: `El enlace no puede superar los ${APPLICATION_LIMITS.offerUrlMaxLength} caracteres`,
  portalInvalid: "Elige un portal de la lista",
  statusInvalid: "Elige un estado de la lista",
  appliedAtRequired: "Introduce la fecha de la candidatura",
  appliedAtInvalid: "La fecha no es válida",
  salaryInvalid: "El salario debe ser un número entero de euros, sin decimales",
  salaryTooLow: "El salario no puede ser negativo",
  salaryTooHigh: `El salario no puede superar los ${APPLICATION_LIMITS.salaryMax.toLocaleString("es-ES")} €`,
  salaryOrder: "El salario máximo no puede ser menor que el mínimo",
  notesTooLong: `Las notas no pueden superar los ${APPLICATION_LIMITS.notesMaxLength} caracteres`,
  noChanges: "No hay cambios que guardar",
  invalidForm: "Los datos del formulario no son válidos",
} as const;

/**
 * Number of characters as Postgres `char_length` counts them (code points),
 * not UTF-16 units like `String.length`.
 */
function charLength(value: string): number {
  return Array.from(value).length;
}

/*
 * Field checks avoid `abort` and `.pipe()`: an aborted field would also skip the
 * object-level salary order check, which must be reported alongside the rest.
 */

function requiredText(
  maxLength: number,
  messages: { required: string; tooLong: string },
) {
  return z
    .string({ error: messages.required })
    .trim()
    .min(1, { error: messages.required })
    .refine((value) => charLength(value) <= maxLength, {
      error: messages.tooLong,
    });
}

function blankToNull(value: string | null | undefined): string | null {
  return value === undefined || value === "" ? null : value;
}

/** Optional text: missing, `null` or blank becomes `null` (column cleared). */
function optionalText(maxLength: number, tooLong: string) {
  return z
    .string({ error: APPLICATION_MESSAGES.invalidForm })
    .trim()
    .refine((value) => charLength(value) <= maxLength, { error: tooLong })
    .nullish()
    .transform(blankToNull);
}

/** Same pattern as the `applications_offer_url_format` CHECK (case-sensitive). */
const OFFER_URL_PATTERN = /^https?:\/\/\S+$/;

const offerUrlSchema = z
  .string({ error: APPLICATION_MESSAGES.offerUrlInvalid })
  .trim()
  .refine(
    (value) => charLength(value) <= APPLICATION_LIMITS.offerUrlMaxLength,
    { error: APPLICATION_MESSAGES.offerUrlTooLong },
  )
  .refine(
    (value) =>
      value === "" ||
      charLength(value) > APPLICATION_LIMITS.offerUrlMaxLength ||
      OFFER_URL_PATTERN.test(value),
    { error: APPLICATION_MESSAGES.offerUrlInvalid },
  )
  .nullish()
  .transform(blankToNull);

/**
 * Form inputs send salaries as text. Blank means "no salary"; only plain
 * integers (optionally negative, so the range message applies) are converted,
 * so "30.000" or "30k" are rejected instead of being misread.
 */
function toSalaryValue(value: unknown): unknown {
  if (typeof value !== "string") return value;
  const trimmed = value.trim();
  if (trimmed === "") return null;
  return /^-?\d+$/.test(trimmed) ? Number(trimmed) : value;
}

const salarySchema = z.preprocess(
  toSalaryValue,
  z
    .number({ error: APPLICATION_MESSAGES.salaryInvalid })
    .int({ error: APPLICATION_MESSAGES.salaryInvalid })
    .min(APPLICATION_LIMITS.salaryMin, {
      error: APPLICATION_MESSAGES.salaryTooLow,
    })
    .max(APPLICATION_LIMITS.salaryMax, {
      error: APPLICATION_MESSAGES.salaryTooHigh,
    })
    .nullish()
    .transform((value) => value ?? null),
);

const isoDate = z.iso.date();

/** ISO `YYYY-MM-DD`; year 0000 does not exist in Postgres `date`. */
const appliedAtSchema = z
  .string({ error: APPLICATION_MESSAGES.appliedAtRequired })
  .trim()
  .min(1, { error: APPLICATION_MESSAGES.appliedAtRequired })
  .refine(
    (value) =>
      value === "" ||
      (isoDate.safeParse(value).success && !value.startsWith("0000")),
    { error: APPLICATION_MESSAGES.appliedAtInvalid },
  );

export const applicationStatusSchema = z.enum(APPLICATION_STATUSES, {
  error: APPLICATION_MESSAGES.statusInvalid,
});

export const applicationPortalSchema = z.enum(APPLICATION_PORTALS, {
  error: APPLICATION_MESSAGES.portalInvalid,
});

/**
 * Editable columns only. `id`, `user_id`, `created_at` and `updated_at` are
 * not part of the shape, so unknown keys sent by the client are stripped and
 * never reach the database (DB-05). `portal` and `status` may be omitted to
 * use the column defaults.
 */
const applicationFields = z.object(
  {
    company: requiredText(APPLICATION_LIMITS.companyMaxLength, {
      required: APPLICATION_MESSAGES.companyRequired,
      tooLong: APPLICATION_MESSAGES.companyTooLong,
    }),
    position: requiredText(APPLICATION_LIMITS.positionMaxLength, {
      required: APPLICATION_MESSAGES.positionRequired,
      tooLong: APPLICATION_MESSAGES.positionTooLong,
    }),
    offer_url: offerUrlSchema,
    portal: applicationPortalSchema.optional(),
    applied_at: appliedAtSchema,
    salary_min: salarySchema,
    salary_max: salarySchema,
    status: applicationStatusSchema.optional(),
    notes: optionalText(
      APPLICATION_LIMITS.notesMaxLength,
      APPLICATION_MESSAGES.notesTooLong,
    ),
  },
  { error: APPLICATION_MESSAGES.invalidForm },
);

export const APPLICATION_FIELDS = applicationFields.keyof().options;

const salaryPair = applicationFields
  .pick({ salary_min: true, salary_max: true })
  .partial();

/** Mirrors `applications_salary_order`: only checked when both are set. */
function salaryInOrder(data: {
  salary_min?: number | null;
  salary_max?: number | null;
}): boolean {
  const { salary_min: min, salary_max: max } = data;
  return min === null || min === undefined || max === null || max === undefined
    ? true
    : min <= max;
}

const salaryOrderParams = {
  error: APPLICATION_MESSAGES.salaryOrder,
  path: ["salary_max"],
  // Report the order error even if other fields are invalid, as long as both
  // salaries are valid on their own.
  when: (payload: { value: unknown }) =>
    salaryPair.safeParse(payload.value).success,
};

export const applicationCreateSchema = applicationFields.refine(
  salaryInOrder,
  salaryOrderParams,
);

/**
 * Edit schema: the same fields, all optional. A field that is present is
 * validated exactly as on creation; blank optional fields clear the column.
 */
export const applicationUpdateSchema = applicationFields
  .partial()
  .refine(salaryInOrder, salaryOrderParams)
  .refine((data) => Object.values(data).some((value) => value !== undefined), {
    error: APPLICATION_MESSAGES.noChanges,
  });

export type ApplicationStatus = z.infer<typeof applicationStatusSchema>;
export type ApplicationPortal = z.infer<typeof applicationPortalSchema>;
export type ApplicationCreateInput = z.infer<typeof applicationCreateSchema>;
export type ApplicationUpdateInput = z.infer<typeof applicationUpdateSchema>;
