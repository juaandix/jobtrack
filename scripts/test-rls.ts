// Row Level Security isolation test for public.applications.
//
// Runs against the LOCAL Supabase stack only (never a remote project): it
// signs up two throwaway users through the Auth API with the public anon key
// and checks that neither of them, nor an anonymous visitor, can read or write
// the other's rows. It never uses the service role key.
//
// Usage: npm run db:test:rls (exits with a non-zero code if any check fails).
// The users it creates stay in the local database; `npm run db:reset` wipes them.

import { randomBytes, randomUUID } from "node:crypto";
import { existsSync } from "node:fs";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../src/lib/database.types";

type Client = SupabaseClient<Database>;

const LOCAL_HOSTS = new Set(["127.0.0.1", "localhost", "[::1]"]);

let failures = 0;

function report(passed: boolean, description: string, detail?: string): void {
  if (!passed) {
    failures += 1;
  }
  const suffix = passed || detail === undefined ? "" : ` (${detail})`;
  process.stdout.write(`${passed ? "PASS" : "FAIL"} ${description}${suffix}\n`);
}

function readConfig(): { url: string; anonKey: string } {
  if (existsSync(".env.local")) {
    process.loadEnvFile(".env.local");
  }
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    throw new Error(
      "Faltan NEXT_PUBLIC_SUPABASE_URL o NEXT_PUBLIC_SUPABASE_ANON_KEY (.env.local).",
    );
  }
  if (!LOCAL_HOSTS.has(new URL(url).hostname)) {
    throw new Error(
      `Este test solo se ejecuta contra Supabase local, no contra ${url}.`,
    );
  }
  return { url, anonKey };
}

function newClient(url: string, anonKey: string): Client {
  return createClient<Database>(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function signUp(client: Client, label: string): Promise<string> {
  const email = `rls-${label}-${randomUUID()}@example.com`;
  const password = randomBytes(24).toString("base64url");
  const { data, error } = await client.auth.signUp({ email, password });
  if (error || !data.session || !data.user) {
    throw new Error(
      `No se pudo registrar al usuario ${label}: ${error?.message ?? "sin sesión (¿confirmación de email activada?)"}`,
    );
  }
  return data.user.id;
}

async function countVisible(client: Client, id: string): Promise<number> {
  const { data } = await client.from("applications").select("id").eq("id", id);
  return data?.length ?? 0;
}

async function main(): Promise<void> {
  const { url, anonKey } = readConfig();
  const anon = newClient(url, anonKey);
  const clientA = newClient(url, anonKey);
  const clientB = newClient(url, anonKey);

  const userA = await signUp(clientA, "a");
  const userB = await signUp(clientB, "b");

  // A inserts without sending user_id (DB-05): the database fills it in.
  const insertA = await clientA
    .from("applications")
    .insert({ company: "Empresa A", position: "Puesto A" })
    .select("id, user_id")
    .single();
  if (insertA.error) {
    report(
      false,
      "A inserta su candidatura sin user_id",
      insertA.error.message,
    );
    return;
  }
  const rowA = insertA.data;
  report(rowA.user_id === userA, "La fila de A se guarda con user_id = A");

  // B: cannot see, change, delete or forge rows of A.
  const listB = await clientB.from("applications").select("id");
  report(
    !listB.error && listB.data.every((row) => row.id !== rowA.id),
    "B no ve la fila de A al listar",
    listB.error?.message,
  );
  report(
    (await countVisible(clientB, rowA.id)) === 0,
    "B no ve la fila de A por id",
  );

  // Writes go without .select(): RETURNING would also apply the SELECT policy
  // and could hide a broken INSERT/UPDATE/DELETE policy. The outcome is
  // checked afterwards from A's side.
  const updateB = await clientB
    .from("applications")
    .update({ company: "Hackeada" })
    .eq("id", rowA.id);
  const afterUpdateB = await clientA
    .from("applications")
    .select("company")
    .eq("id", rowA.id)
    .maybeSingle();
  report(
    !updateB.error && afterUpdateB.data?.company === "Empresa A",
    "El update de B sobre la fila de A no la modifica",
    updateB.error?.message ?? `company = ${afterUpdateB.data?.company}`,
  );

  const deleteB = await clientB.from("applications").delete().eq("id", rowA.id);
  report(
    !deleteB.error && (await countVisible(clientA, rowA.id)) === 1,
    "El delete de B sobre la fila de A no la borra",
    deleteB.error?.message ?? "la fila de A ha desaparecido",
  );

  const forgedInsert = await clientB
    .from("applications")
    .insert({ company: "Falsa", position: "Falsa", user_id: userA });
  const forgedRows = await clientA
    .from("applications")
    .select("id")
    .eq("company", "Falsa");
  report(
    forgedInsert.error?.code === "42501" && forgedRows.data?.length === 0,
    "El insert de B con user_id = A falla por la política",
    forgedInsert.error?.message ?? "el insert se aceptó",
  );

  // B owns a row but cannot hand it over to A (update WITH CHECK).
  const insertB = await clientB
    .from("applications")
    .insert({ company: "Empresa B", position: "Puesto B" })
    .select("id, user_id")
    .single();
  report(
    !insertB.error && insertB.data.user_id === userB,
    "B inserta su propia candidatura con user_id = B",
    insertB.error?.message,
  );
  if (insertB.data) {
    const handOver = await clientB
      .from("applications")
      .update({ user_id: userA })
      .eq("id", insertB.data.id);
    report(
      handOver.error?.code === "42501" &&
        (await countVisible(clientB, insertB.data.id)) === 1,
      "B no puede reasignar su fila a A (with check en update)",
      handOver.error?.message ?? "la reasignación se aceptó",
    );
    report(
      (await countVisible(clientA, insertB.data.id)) === 0,
      "A no ve la fila de B",
    );
  }

  // Anonymous visitor: sees nothing and cannot write.
  const listAnon = await anon.from("applications").select("id");
  report(
    (listAnon.data ?? []).length === 0,
    "Sin sesión no se ve ninguna fila",
  );
  const insertAnon = await anon
    .from("applications")
    .insert({ company: "Anónima", position: "Anónima", user_id: userA });
  const anonRows = await clientA
    .from("applications")
    .select("id")
    .eq("company", "Anónima");
  report(
    insertAnon.error !== null && anonRows.data?.length === 0,
    "Sin sesión no se puede insertar",
    "el insert anónimo se aceptó",
  );

  // A keeps full access to their own row.
  report((await countVisible(clientA, rowA.id)) === 1, "A ve su fila");

  const updateA = await clientA
    .from("applications")
    .update({ company: "Empresa A editada" })
    .eq("id", rowA.id)
    .select("company");
  report(
    !updateA.error && updateA.data[0]?.company === "Empresa A editada",
    "A actualiza su fila",
    updateA.error?.message,
  );

  const deleteA = await clientA
    .from("applications")
    .delete()
    .eq("id", rowA.id)
    .select("id");
  report(
    !deleteA.error && deleteA.data.length === 1,
    "A borra su fila",
    deleteA.error?.message,
  );
  report(
    (await countVisible(clientA, rowA.id)) === 0,
    "La fila de A ya no existe",
  );
}

try {
  await main();
} catch (error) {
  failures += 1;
  process.stderr.write(
    `ERROR ${error instanceof Error ? error.message : String(error)}\n`,
  );
}

process.stdout.write(
  failures === 0
    ? "RLS OK: aislamiento entre usuarios verificado.\n"
    : `RLS FALLA: ${failures} comprobación(es) no se cumplen.\n`,
);
process.exitCode = failures === 0 ? 0 : 1;
