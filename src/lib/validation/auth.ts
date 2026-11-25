import { z } from "zod";

export const EMAIL_MAX_LENGTH = 254;
/** bcrypt (used by Supabase Auth) ignores everything after 72 bytes. */
export const PASSWORD_MAX_LENGTH = 72;
export const PASSWORD_MIN_LENGTH = 8;

export const AUTH_MESSAGES = {
  emailRequired: "Introduce tu email",
  emailInvalid: "El email no tiene un formato válido",
  emailTooLong: `El email no puede superar los ${EMAIL_MAX_LENGTH} caracteres`,
  passwordRequired: "Introduce tu contraseña",
  passwordTooShort: `La contraseña debe tener al menos ${PASSWORD_MIN_LENGTH} caracteres`,
  passwordTooLong: `La contraseña no puede superar los ${PASSWORD_MAX_LENGTH} caracteres`,
  passwordNeedsLetter: "La contraseña debe incluir al menos una letra",
  passwordNeedsNumber: "La contraseña debe incluir al menos un número",
  confirmPasswordRequired: "Confirma tu contraseña",
  passwordsDoNotMatch: "Las contraseñas no coinciden",
  invalidForm: "Los datos del formulario no son válidos",
} as const;

/**
 * Trimmed, lower-cased email. Checks abort in order (required, length,
 * format) so each field reports the most relevant message first.
 */
const emailSchema = z
  .string({ error: AUTH_MESSAGES.emailRequired })
  .trim()
  .toLowerCase()
  .min(1, { error: AUTH_MESSAGES.emailRequired, abort: true })
  .max(EMAIL_MAX_LENGTH, { error: AUTH_MESSAGES.emailTooLong, abort: true })
  .pipe(z.email({ error: AUTH_MESSAGES.emailInvalid }));

/** Login only checks presence and the bcrypt limit, so it does not reveal the policy. */
const loginPasswordSchema = z
  .string({ error: AUTH_MESSAGES.passwordRequired })
  .min(1, { error: AUTH_MESSAGES.passwordRequired, abort: true })
  .max(PASSWORD_MAX_LENGTH, { error: AUTH_MESSAGES.passwordTooLong });

const newPasswordSchema = z
  .string({ error: AUTH_MESSAGES.passwordRequired })
  .min(1, { error: AUTH_MESSAGES.passwordRequired, abort: true })
  .min(PASSWORD_MIN_LENGTH, { error: AUTH_MESSAGES.passwordTooShort })
  .max(PASSWORD_MAX_LENGTH, { error: AUTH_MESSAGES.passwordTooLong })
  .regex(/\p{L}/u, { error: AUTH_MESSAGES.passwordNeedsLetter })
  .regex(/[0-9]/, { error: AUTH_MESSAGES.passwordNeedsNumber });

export const loginSchema = z.object(
  {
    email: emailSchema,
    password: loginPasswordSchema,
  },
  { error: AUTH_MESSAGES.invalidForm },
);

const bothPasswordsFilled = z.object({
  password: z.string().min(1),
  confirmPassword: z.string().min(1),
});

export const signupSchema = z
  .object(
    {
      email: emailSchema,
      password: newPasswordSchema,
      confirmPassword: z
        .string({ error: AUTH_MESSAGES.confirmPasswordRequired })
        .min(1, { error: AUTH_MESSAGES.confirmPasswordRequired }),
    },
    { error: AUTH_MESSAGES.invalidForm },
  )
  .refine((data) => data.password === data.confirmPassword, {
    error: AUTH_MESSAGES.passwordsDoNotMatch,
    path: ["confirmPassword"],
    // Report the mismatch even when other fields (e.g. the email) are invalid,
    // as long as both passwords are non-empty strings.
    when: (payload) => bothPasswordsFilled.safeParse(payload.value).success,
  });

export type LoginInput = z.infer<typeof loginSchema>;
export type SignupInput = z.infer<typeof signupSchema>;
