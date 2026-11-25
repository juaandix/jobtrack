import { redirect } from "next/navigation";
import { connection } from "next/server";
import { LOGIN_PATH } from "@/lib/auth/routes";
import { createClient } from "@/lib/supabase/server";

export type SessionUser = {
  id: string;
  email: string | null;
};

/**
 * The signed-in user, from the verified JWT claims (`getClaims` checks the
 * signature; `getSession` alone must never be trusted on the server).
 */
export async function getSessionUser(): Promise<SessionUser | null> {
  // Verifying the JWT compares its expiry with the current time, so it must
  // only run at request time, never while prerendering.
  await connection();
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  if (error || !data?.claims.sub) return null;
  const { sub, email } = data.claims;
  return { id: sub, email: typeof email === "string" ? email : null };
}

/** Like `getSessionUser`, but redirects to the login page without a user. */
export async function requireSessionUser(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (user === null) {
    redirect(LOGIN_PATH);
  }
  return user;
}
