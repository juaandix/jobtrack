import { loginSchema, signupSchema } from "@/lib/validation/auth";
import type { FieldErrors } from "@/lib/validation/errors";

export const LOGIN_FIELDS = loginSchema.keyof().options;
export const SIGNUP_FIELDS = signupSchema.keyof().options;

export type LoginField = (typeof LOGIN_FIELDS)[number];
export type SignupField = (typeof SIGNUP_FIELDS)[number];

/**
 * State shared by an auth Server Action and its form (`useActionState`).
 * `values` only echoes back fields that are safe to re-render: never passwords.
 */
export type AuthFormState<F extends string> = {
  fieldErrors: FieldErrors<F>;
  formError: string | null;
  notice: string | null;
  values: { email?: string };
};

export type LoginFormState = AuthFormState<LoginField>;
export type SignupFormState = AuthFormState<SignupField>;

export const AUTH_NOTICES = {
  confirmEmail:
    "Te hemos enviado un email para confirmar la cuenta. Ábrelo y después inicia sesión.",
} as const;

export const INITIAL_LOGIN_STATE: LoginFormState = {
  fieldErrors: {},
  formError: null,
  notice: null,
  values: {},
};

export const INITIAL_SIGNUP_STATE: SignupFormState = {
  fieldErrors: {},
  formError: null,
  notice: null,
  values: {},
};

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
