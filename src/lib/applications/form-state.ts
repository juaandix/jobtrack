import type { ApplicationField } from "./errors";
import type { Application } from "./repository";
import { readFormFields } from "@/lib/auth/form-state";
import { APPLICATION_FIELDS } from "@/lib/validation/application";
import type { FieldErrors } from "@/lib/validation/errors";

/** Raw text of each form field, as the user typed it. */
export type ApplicationFormValues = Partial<Record<ApplicationField, string>>;

/**
 * State shared by the create/update Server Actions and the application form
 * (`useActionState`). On success the actions redirect, so the state only ever
 * carries errors plus the submitted values, which are rendered back so the
 * user does not lose what they typed.
 */
export type ApplicationFormState = {
  fieldErrors: FieldErrors<ApplicationField>;
  formError: string | null;
  values: ApplicationFormValues;
};

/** Result of the delete Server Action; `null` before the first attempt. */
export type DeleteApplicationState =
  { ok: true; data: { id: string } } | { ok: false; message: string } | null;

/** Values of a new application: column defaults and today's date. */
export function newApplicationValues(today: string): ApplicationFormValues {
  return { portal: "otro", status: "enviada", applied_at: today };
}

/** Form values of an existing application (`null` columns become ""). */
export function applicationFormValues(
  application: Application,
): ApplicationFormValues {
  return {
    company: application.company,
    position: application.position,
    offer_url: application.offer_url ?? "",
    portal: application.portal,
    applied_at: application.applied_at,
    salary_min: application.salary_min?.toString() ?? "",
    salary_max: application.salary_max?.toString() ?? "",
    status: application.status,
    notes: application.notes ?? "",
  };
}

export function initialApplicationFormState(
  values: ApplicationFormValues,
): ApplicationFormState {
  return { fieldErrors: {}, formError: null, values };
}

/**
 * Reads the application fields of a form as strings, ready for `safeParse`.
 * Any other field (such as `user_id` or `id`) is ignored (DB-05).
 */
export function readApplicationForm(formData: FormData): ApplicationFormValues {
  return readFormFields(formData, APPLICATION_FIELDS);
}
