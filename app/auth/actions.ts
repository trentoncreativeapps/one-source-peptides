'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

const RESEARCHER_TYPES = ['researcher', 'clinic', 'university', 'distributor', 'other'] as const;
type ResearcherType = (typeof RESEARCHER_TYPES)[number];

export type AuthResult = { error: string } | { ok: true };

export async function signIn(formData: FormData): Promise<AuthResult> {
  const email = String(formData.get('email') ?? '').trim();
  const password = String(formData.get('password') ?? '');

  if (!email || !password) return { error: 'Enter your email and password.' };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  // Deliberately vague: a precise message would confirm which emails exist.
  if (error) return { error: 'That email and password combination does not match an account.' };

  revalidatePath('/', 'layout');
  return { ok: true };
}

export async function signUp(formData: FormData): Promise<AuthResult> {
  const email = String(formData.get('email') ?? '').trim();
  const password = String(formData.get('password') ?? '');
  const fullName = String(formData.get('full_name') ?? '').trim();
  const organization = String(formData.get('organization') ?? '').trim();
  const researcherType = String(formData.get('researcher_type') ?? '') as ResearcherType;
  const ageConfirmed = formData.get('age_confirmed') === 'on';
  const tosAccepted = formData.get('tos_accepted') === 'on';

  if (!fullName) return { error: 'Enter your name.' };
  if (!email) return { error: 'Enter your email address.' };
  if (password.length < 8) return { error: 'Choose a password of at least 8 characters.' };
  if (!RESEARCHER_TYPES.includes(researcherType)) return { error: 'Select a researcher type.' };

  // Organisation is required for the institutional types, per spec §2.
  if (['clinic', 'university', 'distributor'].includes(researcherType) && !organization) {
    return { error: 'Enter your organization or institution name.' };
  }

  // Re-checked server-side: the client checkboxes are a convenience, not the control.
  if (!ageConfirmed) return { error: 'You must confirm you are 21 or older.' };
  if (!tosAccepted) return { error: 'You must accept the Terms of Service.' };

  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      // Read by the handle_new_user() trigger to build the profiles row.
      data: {
        full_name: fullName,
        organization: organization || null,
        researcher_type: researcherType,
        age_confirmed: true,
        tos_accepted: true,
      },
    },
  });

  if (error) return { error: error.message };

  revalidatePath('/', 'layout');
  return { ok: true };
}

export async function signOut(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath('/', 'layout');
}
