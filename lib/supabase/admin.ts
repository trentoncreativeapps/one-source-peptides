import { createClient } from '@supabase/supabase-js';
import { supabaseServiceRoleKey, supabaseUrl } from '@/lib/env';

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
  return createClient(supabaseUrl(), supabaseServiceRoleKey(), {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
