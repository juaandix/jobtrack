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
