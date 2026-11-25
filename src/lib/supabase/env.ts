export type SupabaseEnv = {
  url: string;
  anonKey: string;
};

/**
 * Reads the public Supabase settings. Each variable is read with a literal
 * property access so Next.js can inline the values in the browser bundle.
 */
export function getSupabaseEnv(): SupabaseEnv {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    const missing = [
      url ? null : "NEXT_PUBLIC_SUPABASE_URL",
      anonKey ? null : "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    ].filter((name): name is string => name !== null);
    throw new Error(
      `Faltan variables de entorno de Supabase: ${missing.join(", ")}. ` +
        "Cópialas de .env.example a .env.local y rellénalas.",
    );
  }

  return { url, anonKey };
}
