import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/**
 * Supabase browser client.
 *
 * Uses NEXT_PUBLIC_ env vars (safe for the client — the anon key is public by
 * design; Row-Level Security protects the actual data).
 *
 * Null-safe: if env vars are missing (e.g., during build without config), the
 * client is null and the Studio auth gracefully no-ops. The public site still
 * renders from its static/hardcoded sources.
 */
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const supabase: SupabaseClient | null =
  supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
        },
      })
    : null;

/** The email the Studio login maps the username "diva" to. */
export const STUDIO_AUTH_EMAIL_SUFFIX = '@studio.local';

/** Maps a plain username (e.g. "diva") to the Supabase auth email. */
export function usernameToEmail(username: string): string {
  return username.includes('@') ? username : `${username}${STUDIO_AUTH_EMAIL_SUFFIX}`;
}
