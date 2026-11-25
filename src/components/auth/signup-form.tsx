"use client";

import Link from "next/link";
import { useActionState, useState, type FormEvent } from "react";
import { signup } from "@/lib/auth/actions";
import {
  INITIAL_SIGNUP_STATE,
  SIGNUP_FIELDS,
  readFormFields,
  type SignupField,
} from "@/lib/auth/form-state";
import { LOGIN_PATH, NEXT_PARAM, withNextParam } from "@/lib/auth/routes";
import { PASSWORD_MIN_LENGTH, signupSchema } from "@/lib/validation/auth";
import { fieldErrors, type FieldErrors } from "@/lib/validation/errors";
import { FormMessages, focusFirstInvalidField } from "./form-messages";
import { TextField } from "./text-field";

type SignupFormProps = {
  /** Already sanitised destination after creating the account. */
  next: string;
};

export function SignupForm({ next }: SignupFormProps) {
  const [state, formAction, pending] = useActionState(
    signup,
    INITIAL_SIGNUP_STATE,
  );
  // Errors of the last submit blocked in the browser; `null` once a submit
  // passes the client validation and reaches the server.
  const [clientErrors, setClientErrors] =
    useState<FieldErrors<SignupField> | null>(null);

  const errors = clientErrors ?? state.fieldErrors;
  const formError = clientErrors ? null : state.formError;
  const notice = clientErrors ? null : state.notice;

  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    const form = event.currentTarget;
    const result = signupSchema.safeParse(
      readFormFields(new FormData(form), SIGNUP_FIELDS),
    );
    if (result.success) {
      setClientErrors(null);
      return;
    }
    event.preventDefault();
    const nextErrors = fieldErrors(result.error, SIGNUP_FIELDS);
    setClientErrors(nextErrors);
    focusFirstInvalidField(form, SIGNUP_FIELDS, nextErrors);
  }

  return (
    <form
      action={formAction}
      onSubmit={handleSubmit}
      noValidate
      className="flex flex-col gap-4"
    >
      <input type="hidden" name={NEXT_PARAM} value={next} />
      <FormMessages error={formError} notice={notice} />
      <TextField
        id="signup-email"
        name="email"
        label="Email"
        type="email"
        autoComplete="email"
        defaultValue={state.values.email}
        error={errors.email}
      />
      <TextField
        id="signup-password"
        name="password"
        label="Contraseña"
        type="password"
        autoComplete="new-password"
        hint={`Al menos ${PASSWORD_MIN_LENGTH} caracteres, con una letra y un número.`}
        error={errors.password}
      />
      <TextField
        id="signup-confirm-password"
        name="confirmPassword"
        label="Repite la contraseña"
        type="password"
        autoComplete="new-password"
        error={errors.confirmPassword}
      />
      <button
        type="submit"
        disabled={pending}
        className="min-h-11 rounded-md bg-blue-700 px-4 py-2 font-medium text-white hover:bg-blue-800 focus-visible:ring-2 focus-visible:ring-blue-700 focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:bg-zinc-500"
      >
        {pending ? "Creando cuenta…" : "Crear cuenta"}
      </button>
      <p className="text-sm text-zinc-700 dark:text-zinc-300">
        ¿Ya tienes cuenta?{" "}
        <Link
          href={withNextParam(LOGIN_PATH, next)}
          className="font-medium text-blue-700 underline underline-offset-2 hover:text-blue-800 focus-visible:rounded-sm focus-visible:ring-2 focus-visible:ring-blue-700 focus-visible:outline-none dark:text-blue-400 dark:hover:text-blue-300"
        >
          Inicia sesión
        </Link>
      </p>
    </form>
  );
}
