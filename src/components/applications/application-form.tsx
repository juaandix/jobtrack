"use client";

import Link from "next/link";
import { useActionState, useId, useState, type FormEvent } from "react";
import { InputField, SelectField, TextAreaField } from "./form-fields";
import { focusFirstInvalidField } from "@/components/forms/focus-first-invalid-field";
import { FormMessages } from "@/components/forms/form-messages";
import {
  PRIMARY_BUTTON_CLASS,
  SECONDARY_BUTTON_CLASS,
} from "@/components/ui/classes";
import type { ApplicationField } from "@/lib/applications/errors";
import {
  applicationFormErrors,
  initialApplicationFormState,
  readApplicationForm,
  type ApplicationFormMode,
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
} from "@/lib/validation/application";
import type { FieldErrors } from "@/lib/validation/errors";

const PORTAL_OPTIONS = APPLICATION_PORTALS.map((value) => ({
  value,
  label: PORTAL_LABELS[value],
}));

const STATUS_OPTIONS = APPLICATION_STATUSES.map((value) => ({
  value,
  label: STATUS_LABELS[value],
}));

type ApplicationFormProps = {
  /** Picks the schema of the client validation, the same as the action's. */
  mode: ApplicationFormMode;
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
 * Zod schema as the server action of its mode before submitting (VAL-01);
 * the server validates again and its errors are shown the same way. Field ids
 * come from `useId`: with cacheComponents a visited form can stay mounted
 * (hidden) next to the other one.
 */
export function ApplicationForm({
  mode,
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
  const id = useId();

  const errors = clientErrors ?? state.fieldErrors;
  const formError = clientErrors
    ? APPLICATION_MESSAGES.invalidForm
    : state.formError;
  const values = state.values;

  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    const form = event.currentTarget;
    const nextErrors = applicationFormErrors(
      mode,
      readApplicationForm(new FormData(form)),
    );
    setClientErrors(nextErrors);
    if (nextErrors === null) return;
    event.preventDefault();
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
          id={`${id}-company`}
          name="company"
          label="Empresa"
          type="text"
          autoComplete="organization"
          required
          defaultValue={values.company}
          error={errors.company}
        />
        <InputField
          id={`${id}-position`}
          name="position"
          label="Puesto"
          type="text"
          autoComplete="organization-title"
          required
          defaultValue={values.position}
          error={errors.position}
        />
        <SelectField
          id={`${id}-status`}
          name="status"
          label="Estado"
          options={STATUS_OPTIONS}
          required
          defaultValue={values.status}
          error={errors.status}
        />
        <SelectField
          id={`${id}-portal`}
          name="portal"
          label="Portal"
          options={PORTAL_OPTIONS}
          required
          defaultValue={values.portal}
          error={errors.portal}
        />
        <InputField
          id={`${id}-applied-at`}
          name="applied_at"
          label="Fecha de la candidatura"
          type="date"
          required
          defaultValue={values.applied_at}
          error={errors.applied_at}
        />
        <InputField
          id={`${id}-offer-url`}
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
          id={`${id}-salary-min`}
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
          id={`${id}-salary-max`}
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
        id={`${id}-notes`}
        name="notes"
        label="Notas"
        defaultValue={values.notes}
        error={errors.notes}
      />
      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <Link href={APPLICATIONS_PATH} className={SECONDARY_BUTTON_CLASS}>
          Cancelar
        </Link>
        <button
          type="submit"
          disabled={pending}
          className={PRIMARY_BUTTON_CLASS}
        >
          {pending ? pendingLabel : submitLabel}
        </button>
      </div>
    </form>
  );
}
