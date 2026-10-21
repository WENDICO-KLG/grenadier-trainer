export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const SUPABASE_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  "";

/** Secret Keys umgehen RLS und dürfen nie im Browser landen. */
export const usesSecretKey = SUPABASE_KEY.startsWith("sb_secret_");

export const isSupabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_KEY) && !usesSecretKey;
