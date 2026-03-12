import { createClient } from '@supabase/supabase-js';
import { env } from './env.js';

// Admin client (service role - bypasses RLS)
export const supabaseAdmin = createClient(
  env.SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY
);

// User-context client (respects RLS)
export function createUserClient(accessToken) {
  return createClient(
    env.SUPABASE_URL,
    env.SUPABASE_ANON_KEY,
    {
      global: {
        headers: { Authorization: `Bearer ${accessToken}` },
      },
    }
  );
}
