"use client";

import Link from "next/link";
import { useActionState, useState, type FormEvent } from "react";
import { login } from "@/lib/auth/actions";
import {
  INITIAL_LOGIN_STATE,
  LOGIN_FIELDS,
  type LoginField,
} from "@/lib/auth/form-state";
import { NEXT_PARAM, SIGNUP_PATH, withNextParam } from "@/lib/auth/routes";
import { loginSchema } from "@/lib/validation/auth";
import { fieldErrors, type FieldErrors } from "@/lib/validation/errors";
import { focusFirstInvalidField } from "@/components/forms/focus-first-invalid-field";
import { FormMessages } from "@/components/forms/form-messages";
import { PRIMARY_BUTTON_CLASS, TEXT_LINK_CLASS } from "@/components/ui/classes";
import { readFormFields } from "@/lib/forms/fields";
import { TextField } from "./text-field";

type LoginFormProps = {
  /** Already sanitised destination after signing in. */
  next: string;
};

export function LoginForm({ next }: LoginFormProps) {
  const [state, formAction, pending] = useActionState(
    login,
    INITIAL_LOGIN_STATE,
  );
  // Errors of the last submit blocked in the browser; `null` once a submit
  // passes the client validation and reaches the server.
  const [clientErrors, setClientErrors] =
    useState<FieldErrors<LoginField> | null>(null);

  const errors = clientErrors ?? state.fieldErrors;
  const formError = clientErrors ? null : state.formError;

  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    const form = event.currentTarget;
    const result = loginSchema.safeParse(
      readFormFields(new FormData(form), LOGIN_FIELDS),
    );
    if (result.success) {
      setClientErrors(null);
      return;
    }
    event.preventDefault();
    const nextErrors = fieldErrors(result.error, LOGIN_FIELDS);
    setClientErrors(nextErrors);
    focusFirstInvalidField(form, LOGIN_FIELDS, nextErrors);
  }

  return (
    <form
      action={formAction}
      onSubmit={handleSubmit}
      noValidate
      className="flex flex-col gap-4"
    >
      <input type="hidden" name={NEXT_PARAM} value={next} />
      <FormMessages error={formError} />
      <TextField
        id="login-email"
        name="email"
        label="Email"
        type="email"
        autoComplete="email"
        defaultValue={state.values.email}
        error={errors.email}
      />
      <TextField
        id="login-password"
        name="password"
        label="Contraseña"
        type="password"
        autoComplete="current-password"
        error={errors.password}
      />
      <button type="submit" disabled={pending} className={PRIMARY_BUTTON_CLASS}>
        {pending ? "Entrando…" : "Iniciar sesión"}
      </button>
      <p className="text-sm text-zinc-700 dark:text-zinc-300">
        ¿No tienes cuenta?{" "}
        <Link
          href={withNextParam(SIGNUP_PATH, next)}
          className={TEXT_LINK_CLASS}
        >
          Regístrate
        </Link>
      </p>
    </form>
  );
}
