"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { authErrorLog, authErrorMessage } from "./errors";
import {
  AUTH_NOTICES,
  INITIAL_LOGIN_STATE,
  INITIAL_SIGNUP_STATE,
  LOGIN_FIELDS,
  SIGNUP_FIELDS,
  type LoginFormState,
  type SignupFormState,
} from "./form-state";
import { LOGIN_PATH, NEXT_PARAM, safeNextPath } from "./routes";
import { readFormFields, readStringField } from "@/lib/forms/fields";
import { createClient } from "@/lib/supabase/server";
import { loginSchema, signupSchema } from "@/lib/validation/auth";
import { fieldErrors } from "@/lib/validation/errors";

function redirectTarget(formData: FormData): string {
  return safeNextPath(readStringField(formData, NEXT_PARAM));
}

function logAuthError(operation: string, error: unknown): void {
  // Only name, code and message: never the whole error, the email or the
  // password.
  console.error(`[auth] ${operation} failed`, authErrorLog(error));
}

/** Validates the login form and signs the user in with email and password. */
export async function login(
  _previous: LoginFormState,
  formData: FormData,
): Promise<LoginFormState> {
  const input = readFormFields(formData, LOGIN_FIELDS);
  const values = { email: input.email ?? "" };

  const parsed = loginSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ...INITIAL_LOGIN_STATE,
      fieldErrors: fieldErrors(parsed.error, LOGIN_FIELDS),
      values,
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) {
    logAuthError("login", error);
    return {
      ...INITIAL_LOGIN_STATE,
      formError: authErrorMessage(error, "login"),
      values,
    };
  }

  revalidatePath("/", "layout");
  redirect(redirectTarget(formData));
}

/** Validates the signup form and creates the account. */
export async function signup(
  _previous: SignupFormState,
  formData: FormData,
): Promise<SignupFormState> {
  const input = readFormFields(formData, SIGNUP_FIELDS);
  const values = { email: input.email ?? "" };

  const parsed = signupSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ...INITIAL_SIGNUP_STATE,
      fieldErrors: fieldErrors(parsed.error, SIGNUP_FIELDS),
      values,
    };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
  });
  if (error) {
    logAuthError("signup", error);
    return {
      ...INITIAL_SIGNUP_STATE,
      formError: authErrorMessage(error, "signup"),
      values,
    };
  }

  // With email confirmation enabled there is no session until the user
  // confirms, so there is nothing private to redirect to yet.
  if (!data.session) {
    return {
      ...INITIAL_SIGNUP_STATE,
      notice: AUTH_NOTICES.confirmEmail,
      values,
    };
  }

  revalidatePath("/", "layout");
  redirect(redirectTarget(formData));
}

/** Signs the user out and sends them to the login page. */
export async function logout(): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.auth.signOut();
  if (error) {
    logAuthError("logout", error);
  }
  revalidatePath("/", "layout");
  redirect(LOGIN_PATH);
}
