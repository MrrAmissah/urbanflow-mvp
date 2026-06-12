import { createClient, SupabaseClient } from '@supabase/supabase-js';

let supabaseAdmin: SupabaseClient | null = null;

export function hasSupabaseServerConfig() {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    return Boolean(
      url &&
        (url.startsWith('http://') || url.startsWith('https://')) &&
        new URL(url) &&
        process.env.SUPABASE_SERVICE_ROLE_KEY
    );
  } catch {
    return false;
  }
}

export function getSupabaseAdmin() {
  if (!hasSupabaseServerConfig()) {
    throw new Error('Supabase server environment variables are not configured.');
  }

  if (!supabaseAdmin) {
    supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );
  }

  return supabaseAdmin;
}
