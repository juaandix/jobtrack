"use client";

import Link from "next/link";
import { useActionState, useState, type FormEvent } from "react";
import {
  FormMessages,
  focusFirstInvalidField,
} from "@/components/auth/form-messages";
import { InputField, SelectField, TextAreaField } from "./form-fields";
import type { ApplicationField } from "@/lib/applications/errors";
import {
  initialApplicationFormState,
  readApplicationForm,
  type ApplicationFormState,
  type ApplicationFormValues,
} from "@/lib/applications/form-state";
import { PORTAL_LABELS, STATUS_LABELS } from "@/lib/applications/labels";
import { APPLICATIONS_PATH } from "@/lib/applications/routes";
import {
  APPLICATION_FIELDS,
  APPLICATION_MESSAGES,
  APPLICATION_PORTALS,
  APPLICATION_STATUSES,
  applicationCreateSchema,
} from "@/lib/validation/application";
import { fieldErrors, type FieldErrors } from "@/lib/validation/errors";

const PORTAL_OPTIONS = APPLICATION_PORTALS.map((value) => ({
  value,
  label: PORTAL_LABELS[value],
}));

const STATUS_OPTIONS = APPLICATION_STATUSES.map((value) => ({
  value,
  label: STATUS_LABELS[value],
}));

type ApplicationFormProps = {
  /** Create action, or the update action with the id already bound. */
  action: (
    previous: ApplicationFormState,
    formData: FormData,
  ) => Promise<ApplicationFormState>;
  initialValues: ApplicationFormValues;
  submitLabel: string;
  pendingLabel: string;
};

/**
 * Single form to create and edit an application. It validates with the same
 * Zod schema as the server before submitting (VAL-01); the server validates
 * again and its errors are shown the same way.
 */
export function ApplicationForm({
  action,
  initialValues,
  submitLabel,
  pendingLabel,
}: ApplicationFormProps) {
  const [state, formAction, pending] = useActionState(
    action,
    initialApplicationFormState(initialValues),
  );
  // Errors of the last submit blocked in the browser; `null` once a submit
  // passes the client validation and reaches the server.
  const [clientErrors, setClientErrors] =
    useState<FieldErrors<ApplicationField> | null>(null);

  const errors = clientErrors ?? state.fieldErrors;
  const formError = clientErrors
    ? APPLICATION_MESSAGES.invalidForm
    : state.formError;
  const values = state.values;

  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    const form = event.currentTarget;
    const result = applicationCreateSchema.safeParse(
      readApplicationForm(new FormData(form)),
    );
    if (result.success) {
      setClientErrors(null);
      return;
    }
    event.preventDefault();
    const nextErrors = fieldErrors(result.error, APPLICATION_FIELDS);
    setClientErrors(nextErrors);
    focusFirstInvalidField(form, APPLICATION_FIELDS, nextErrors);
  }

  return (
    <form
      action={formAction}
      onSubmit={handleSubmit}
      noValidate
      className="flex flex-col gap-4"
    >
      <FormMessages error={formError} />
      <div className="grid gap-4 sm:grid-cols-2">
        <InputField
          id="application-company"
          name="company"
          label="Empresa"
          type="text"
          autoComplete="organization"
          required
          defaultValue={values.company}
          error={errors.company}
        />
        <InputField
          id="application-position"
          name="position"
          label="Puesto"
          type="text"
          autoComplete="organization-title"
          required
          defaultValue={values.position}
          error={errors.position}
        />
        <SelectField
          id="application-status"
          name="status"
          label="Estado"
          options={STATUS_OPTIONS}
          required
          defaultValue={values.status}
          error={errors.status}
        />
        <SelectField
          id="application-portal"
          name="portal"
          label="Portal"
          options={PORTAL_OPTIONS}
          required
          defaultValue={values.portal}
          error={errors.portal}
        />
        <InputField
          id="application-applied-at"
          name="applied_at"
          label="Fecha de la candidatura"
          type="date"
          required
          defaultValue={values.applied_at}
          error={errors.applied_at}
        />
        <InputField
          id="application-offer-url"
          name="offer_url"
          label="Enlace a la oferta"
          type="url"
          inputMode="url"
          autoComplete="url"
          hint="Empieza por http:// o https://"
          defaultValue={values.offer_url}
          error={errors.offer_url}
        />
        <InputField
          id="application-salary-min"
          name="salary_min"
          label="Salario mínimo"
          type="text"
          inputMode="numeric"
          autoComplete="off"
          hint="Bruto anual en euros, sin puntos (p. ej. 30000)"
          defaultValue={values.salary_min}
          error={errors.salary_min}
        />
        <InputField
          id="application-salary-max"
          name="salary_max"
          label="Salario máximo"
          type="text"
          inputMode="numeric"
          autoComplete="off"
          hint="Bruto anual en euros, sin puntos (p. ej. 40000)"
          defaultValue={values.salary_max}
          error={errors.salary_max}
        />
      </div>
      <TextAreaField
        id="application-notes"
        name="notes"
        label="Notas"
        defaultValue={values.notes}
        error={errors.notes}
      />
      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <Link
          href={APPLICATIONS_PATH}
          className="inline-flex min-h-11 items-center justify-center rounded-md border border-zinc-400 px-4 py-2 font-medium text-zinc-900 hover:bg-zinc-100 focus-visible:ring-2 focus-visible:ring-blue-700 focus-visible:ring-offset-2 focus-visible:outline-none dark:text-zinc-50 dark:hover:bg-zinc-800"
        >
          Cancelar
        </Link>
        <button
          type="submit"
          disabled={pending}
          className="min-h-11 rounded-md bg-blue-700 px-4 py-2 font-medium text-white hover:bg-blue-800 focus-visible:ring-2 focus-visible:ring-blue-700 focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:bg-zinc-500"
        >
          {pending ? pendingLabel : submitLabel}
        </button>
      </div>
    </form>
  );
}
