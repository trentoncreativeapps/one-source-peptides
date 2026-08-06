/**
 * Environment access with legible failure.
 *
 * Every route here is server-rendered on demand, so a missing variable does
 * NOT fail the build — it throws on the first request instead, and the raw
 * error ("Invalid URL", or undefined) gives no clue which variable is at
 * fault. These helpers name it.
 */

function required(name: string, value: string | undefined): string {
  if (!value || !value.trim()) {
    throw new Error(
      `Missing environment variable: ${name}. ` +
        `Set it in Vercel → Project → Settings → Environment Variables, ` +
        `then redeploy (env changes only apply to a new build). ` +
        `Values come from Supabase → Project Settings → API. See SETUP.md.`
    );
  }
  return value;
}

export function supabaseUrl(): string {
  return required('NEXT_PUBLIC_SUPABASE_URL', process.env.NEXT_PUBLIC_SUPABASE_URL);
}

export function supabaseAnonKey(): string {
  return required('NEXT_PUBLIC_SUPABASE_ANON_KEY', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}

export function supabaseServiceRoleKey(): string {
  return required('SUPABASE_SERVICE_ROLE_KEY', process.env.SUPABASE_SERVICE_ROLE_KEY);
}
