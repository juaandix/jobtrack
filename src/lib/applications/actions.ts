"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import {
  notFoundError,
  validationError,
  type ApplicationError,
  type ApplicationResult,
} from "./errors";
import {
  readApplicationForm,
  type ApplicationFormState,
  type ApplicationFormValues,
  type DeleteApplicationState,
} from "./form-state";
import {
  applicationIdSchema,
  createApplication,
  type Application,
  deleteApplication,
  updateApplication,
} from "./repository";
import { APPLICATIONS_PATH, BOARD_PATH } from "./routes";
import { LOGIN_PATH } from "@/lib/auth/routes";
import { getSessionUser } from "@/lib/auth/session";
import { readStringField } from "@/lib/forms/fields";
import {
  applicationCreateSchema,
  applicationStatusSchema,
  applicationUpdateSchema,
} from "@/lib/validation/application";

/*
 * Server Actions of the application CRUD. Each one checks the session first
 * (Server Actions are reachable with a plain POST), validates the input with
 * the shared Zod schema before touching the database (VAL-02) and never sends
 * `user_id`: the column defaults to `auth.uid()` and RLS scopes every query to
 * the signed-in user (DB-05).
 */

async function requireSession(): Promise<void> {
  const user = await getSessionUser();
  if (user === null) {
    redirect(LOGIN_PATH);
  }
}

function failedForm(
  error: ApplicationError,
  values: ApplicationFormValues,
): ApplicationFormState {
  return { fieldErrors: error.fieldErrors, formError: error.message, values };
}

/** Creates an application from the form and goes back to the list. */
export async function createApplicationAction(
  _previous: ApplicationFormState,
  formData: FormData,
): Promise<ApplicationFormState> {
  await requireSession();
  const values = readApplicationForm(formData);

  const parsed = applicationCreateSchema.safeParse(values);
  if (!parsed.success) {
    return failedForm(validationError(parsed.error), values);
  }

  const result = await createApplication(parsed.data);
  if (!result.ok) {
    return failedForm(result.error, values);
  }

  revalidatePath(APPLICATIONS_PATH);
  redirect(APPLICATIONS_PATH);
}

/**
 * Updates one of the user's applications (the id is bound on the server with
 * `.bind`). A missing or someone else's application yields "not found".
 */
export async function updateApplicationAction(
  id: string,
  _previous: ApplicationFormState,
  formData: FormData,
): Promise<ApplicationFormState> {
  await requireSession();
  const values = readApplicationForm(formData);

  const parsed = applicationUpdateSchema.safeParse(values);
  if (!parsed.success) {
    return failedForm(validationError(parsed.error), values);
  }

  const result = await updateApplication(id, parsed.data);
  if (!result.ok) {
    return failedForm(result.error, values);
  }

  revalidatePath(APPLICATIONS_PATH);
  redirect(APPLICATIONS_PATH);
}

/**
 * Deletes the application whose id comes in the `id` field. An id that is not
 * a uuid is reported as "not found" without querying; RLS hides other users'
 * rows, so deleting them also yields "not found", never success.
 */
export async function deleteApplicationAction(
  _previous: DeleteApplicationState,
  formData: FormData,
): Promise<DeleteApplicationState> {
  await requireSession();

  const parsed = applicationIdSchema.safeParse(readStringField(formData, "id"));
  if (!parsed.success) {
    return { ok: false, message: notFoundError().message };
  }

  const result = await deleteApplication(parsed.data);
  if (!result.ok) {
    return { ok: false, message: result.error.message };
  }

  revalidatePath(APPLICATIONS_PATH);
  return { ok: true, data: result.data };
}

const statusChangeSchema = z.object({
  id: applicationIdSchema,
  status: applicationStatusSchema,
});

/**
 * Changes only the status of one of the user's applications (kanban). Both
 * arguments come from the client, so they are validated before querying: an
 * invalid id or status is a validation error. A missing or someone else's
 * application yields "not found", never success.
 */
export async function updateStatusAction(
  id: string,
  status: string,
): Promise<ApplicationResult<Application>> {
  await requireSession();

  const parsed = statusChangeSchema.safeParse({ id, status });
  if (!parsed.success) {
    return { ok: false, error: validationError(parsed.error) };
  }

  const result = await updateApplication(parsed.data.id, {
    status: parsed.data.status,
  });
  if (!result.ok) return result;

  revalidatePath(APPLICATIONS_PATH);
  revalidatePath(BOARD_PATH);
  return result;
}
