import { z } from "zod";

export const AUTH_ERROR_MESSAGES = {
  invalidCredentials: "Email o contraseña incorrectos",
  emailNotConfirmed:
    "Tienes que confirmar tu email antes de iniciar sesión. Revisa tu bandeja de entrada.",
  emailTaken:
    "Ya existe una cuenta con ese email. Inicia sesión o usa otro email.",
  weakPassword: "La contraseña es demasiado débil. Elige otra más segura.",
  rateLimited:
    "Has hecho demasiados intentos. Espera unos minutos y vuelve a intentarlo.",
  generic: "No se ha podido completar la operación. Inténtalo de nuevo.",
} as const;

export type AuthFlow = "login" | "signup";

const errorWithCode = z.object({ code: z.string() });

const SHARED_CODES: ReadonlyMap<string, string> = new Map([
  ["over_request_rate_limit", AUTH_ERROR_MESSAGES.rateLimited],
  ["over_email_send_rate_limit", AUTH_ERROR_MESSAGES.rateLimited],
]);

const CODES_BY_FLOW: Readonly<Record<AuthFlow, ReadonlyMap<string, string>>> = {
  login: new Map([
    ["invalid_credentials", AUTH_ERROR_MESSAGES.invalidCredentials],
    ["email_not_confirmed", AUTH_ERROR_MESSAGES.emailNotConfirmed],
  ]),
  signup: new Map([
    ["user_already_exists", AUTH_ERROR_MESSAGES.emailTaken],
    ["email_exists", AUTH_ERROR_MESSAGES.emailTaken],
    ["weak_password", AUTH_ERROR_MESSAGES.weakPassword],
  ]),
};

/** Code of a Supabase Auth error (`AuthError.code`), if it has one. */
export function authErrorCode(error: unknown): string | null {
  const parsed = errorWithCode.safeParse(error);
  return parsed.success ? parsed.data.code : null;
}

/**
 * Translates a Supabase Auth error into a Spanish message that is safe to show:
 * known codes get a specific message and anything else a generic one, so no
 * internal detail (or whether an email exists, on login) reaches the user.
 */
export function authErrorMessage(error: unknown, flow: AuthFlow): string {
  const code = authErrorCode(error);
  if (code === null) return AUTH_ERROR_MESSAGES.generic;
  return (
    CODES_BY_FLOW[flow].get(code) ??
    SHARED_CODES.get(code) ??
    AUTH_ERROR_MESSAGES.generic
  );
}

const LOGGED_FIELDS = ["name", "code", "message"] as const;

const loggableError = z.object({
  name: z.unknown().optional(),
  code: z.unknown().optional(),
  message: z.unknown().optional(),
});

export type AuthErrorLog = Partial<
  Record<(typeof LOGGED_FIELDS)[number], string>
>;

/**
 * What may be logged of an auth error: only its `name`, `code` and `message`
 * when they are strings, never the whole object (it can carry the request or
 * the user's data). Anything that is not an object logs as `{}`.
 */
export function authErrorLog(error: unknown): AuthErrorLog {
  const result: AuthErrorLog = {};
  const parsed = loggableError.safeParse(error);
  if (!parsed.success) return result;
  for (const field of LOGGED_FIELDS) {
    const value = parsed.data[field];
    if (typeof value === "string") result[field] = value;
  }
  return result;
}
