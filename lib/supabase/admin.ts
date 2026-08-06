import { createClient } from '@supabase/supabase-js';

/**
 * Service-role client. Bypasses ALL row-level security.
 *
 * Only for server-side work that legitimately must act outside a user's
 * permissions: creating orders with server-computed prices, approving
 * wholesale applications, seeding. Never import this into a client component,
 * and never use it to answer a request on a visitor's behalf without first
 * checking who they are.
 */
export function createAdminClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error('SUPABASE_SERVICE_ROLE_KEY is not set');

  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
