import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { NEXT_PARAM, resolveAuthRedirect } from "@/lib/auth/routes";
import type { Database } from "@/lib/database.types";
import { getSupabaseEnv } from "./env";

/**
 * Refreshes the Supabase session cookies on every request and redirects
 * according to `resolveAuthRedirect` (private routes without a user go to
 * `/login`, auth pages with a user go to `/dashboard`).
 */
export async function updateSession(
  request: NextRequest,
): Promise<NextResponse> {
  const { url, anonKey } = getSupabaseEnv();
  let response = NextResponse.next({ request });

  const supabase = createServerClient<Database>(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value);
        });
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
        Object.entries(headers).forEach(([key, value]) => {
          response.headers.set(key, value);
        });
      },
    },
  });

  // Do not run code between createServerClient and getClaims: getClaims
  // verifies the JWT (never trust getSession alone on the server) and
  // triggers the token refresh that writes the new cookies.
  const { data } = await supabase.auth.getClaims();
  const hasUser = Boolean(data?.claims.sub);

  const decision = resolveAuthRedirect(
    request.nextUrl.pathname,
    request.nextUrl.search,
    hasUser,
  );
  if (decision.kind === "none") {
    return response;
  }

  const target = request.nextUrl.clone();
  target.pathname = decision.pathname;
  target.search = "";
  if (decision.next) {
    target.searchParams.set(NEXT_PARAM, decision.next);
  }
  const redirect = NextResponse.redirect(target);
  response.cookies.getAll().forEach((cookie) => {
    redirect.cookies.set(cookie);
  });
  return redirect;
}
