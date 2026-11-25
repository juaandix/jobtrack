import { z } from "zod";
import {
  applicationDatabaseError,
  databaseErrorCode,
  notFoundError,
  validationError,
  type ApplicationOperation,
  type ApplicationResult,
} from "./errors";
import type { Tables } from "@/lib/database.types";
import { createClient } from "@/lib/supabase/server";
import {
  applicationCreateSchema,
  applicationUpdateSchema,
} from "@/lib/validation/application";

/*
 * Data access for the signed-in user's applications. Every query runs with the
 * server client (the user's session and the public key), so Row Level Security
 * decides which rows exist: nothing here filters by `user_id`, and `user_id`
 * is never sent (the column defaults to `auth.uid()`, DB-05).
 */

export type Application = Tables<"applications">;

const TABLE = "applications";

/** Postgres accepts any 8-4-4-4-12 hex string as a `uuid`. */
const applicationIdSchema = z.guid();

function isApplicationId(id: unknown): id is string {
  return applicationIdSchema.safeParse(id).success;
}

function fail<T>(
  error: unknown,
  operation: ApplicationOperation,
): ApplicationResult<T> {
  // Only the error code: never the row or the user's input.
  console.error(
    `[applications] ${operation} failed`,
    databaseErrorCode(error) ?? "unknown",
  );
  return { ok: false, error: applicationDatabaseError(error, operation) };
}

function notFound<T>(): ApplicationResult<T> {
  return { ok: false, error: notFoundError() };
}

/** The user's applications, newest first (`applied_at` desc). */
export async function listApplications(): Promise<
  ApplicationResult<Application[]>
> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .order("applied_at", { ascending: false })
    .order("created_at", { ascending: false });
  if (error) return fail(error, "list");
  return { ok: true, data };
}

/** One of the user's applications; `not_found` if it is missing or not theirs. */
export async function getApplication(
  id: string,
): Promise<ApplicationResult<Application>> {
  if (!isApplicationId(id)) return notFound();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) return fail(error, "get");
  if (data === null) return notFound();
  return { ok: true, data };
}

/** Validates the input with `applicationCreateSchema` and inserts the row. */
export async function createApplication(
  input: unknown,
): Promise<ApplicationResult<Application>> {
  const parsed = applicationCreateSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: validationError(parsed.error) };
  }
  const supabase = await createClient();
  const { data, error } = await supabase
    .from(TABLE)
    .insert(parsed.data)
    .select("*")
    .single();
  if (error) return fail(error, "create");
  return { ok: true, data };
}

/**
 * Validates the changes with `applicationUpdateSchema` and applies them.
 * `not_found` if no row was updated (missing, or hidden by RLS).
 */
export async function updateApplication(
  id: string,
  input: unknown,
): Promise<ApplicationResult<Application>> {
  if (!isApplicationId(id)) return notFound();
  const parsed = applicationUpdateSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: validationError(parsed.error) };
  }
  const supabase = await createClient();
  const { data, error } = await supabase
    .from(TABLE)
    .update(parsed.data)
    .eq("id", id)
    .select("*")
    .maybeSingle();
  if (error) return fail(error, "update");
  if (data === null) return notFound();
  return { ok: true, data };
}

/**
 * Deletes one of the user's applications and returns its id.
 * `not_found` if no row was deleted (missing, or hidden by RLS).
 */
export async function deleteApplication(
  id: string,
): Promise<ApplicationResult<{ id: string }>> {
  if (!isApplicationId(id)) return notFound();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from(TABLE)
    .delete()
    .eq("id", id)
    .select("id")
    .maybeSingle();
  if (error) return fail(error, "delete");
  if (data === null) return notFound();
  return { ok: true, data };
}
