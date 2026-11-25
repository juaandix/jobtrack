export const LOGIN_PATH = "/login";
export const SIGNUP_PATH = "/registro";
export const DASHBOARD_PATH = "/dashboard";
export const NEXT_PARAM = "next";

const PRIVATE_PREFIXES: readonly string[] = [DASHBOARD_PATH];
const AUTH_PATHS: readonly string[] = [LOGIN_PATH, SIGNUP_PATH];

function normalizePath(pathname: string): string {
  if (pathname.length > 1 && pathname.endsWith("/")) {
    return pathname.replace(/\/+$/, "") || "/";
  }
  return pathname;
}

function matchesPrefix(pathname: string, prefix: string): boolean {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

/** True for `/dashboard` and every route nested under it. */
export function isPrivatePath(pathname: string): boolean {
  const path = normalizePath(pathname);
  return PRIVATE_PREFIXES.some((prefix) => matchesPrefix(path, prefix));
}

/** True for the login and signup pages, which a signed-in user should skip. */
export function isAuthPath(pathname: string): boolean {
  return AUTH_PATHS.includes(normalizePath(pathname));
}

function hasControlCharacter(value: string): boolean {
  for (const char of value) {
    const code = char.charCodeAt(0);
    if (code <= 0x1f || code === 0x7f) return true;
  }
  return false;
}

/**
 * Returns `value` only if it is an internal relative path (`/algo`), so it can
 * be used as a redirect target without allowing open redirects. Anything else
 * (absolute URLs, protocol-relative `//host`, backslashes, control characters,
 * empty or missing values) falls back to `fallback`.
 */
export function safeNextPath(
  value: string | null | undefined,
  fallback: string = DASHBOARD_PATH,
): string {
  if (typeof value !== "string" || value === "") return fallback;
  if (!value.startsWith("/")) return fallback;
  if (value.startsWith("//")) return fallback;
  if (value.includes("\\")) return fallback;
  if (hasControlCharacter(value)) return fallback;
  return value;
}

export type AuthRedirect =
  { kind: "none" } | { kind: "redirect"; pathname: string; next?: string };

/**
 * Decides where the proxy must send a request, given its path (and query
 * string) and whether there is a verified user.
 */
export function resolveAuthRedirect(
  pathname: string,
  search: string,
  hasUser: boolean,
): AuthRedirect {
  if (!hasUser && isPrivatePath(pathname)) {
    return {
      kind: "redirect",
      pathname: LOGIN_PATH,
      next: safeNextPath(`${pathname}${search}`),
    };
  }
  if (hasUser && isAuthPath(pathname)) {
    return { kind: "redirect", pathname: DASHBOARD_PATH };
  }
  return { kind: "none" };
}
