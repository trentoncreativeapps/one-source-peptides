'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

export type SignupResult =
  | { error: string }
  | { ok: true; status: string };

/**
 * Records a membership enrolment request.
 *
 * This does NOT grant the discount. profiles.membership_status is not writable
 * by the account holder (migration 0003) precisely so that requesting and
 * receiving a 25% discount stay separate — only billing promotes a request to
 * an active membership.
 *
 * The plan's price, discount and interval are snapshotted onto the request, so
 * a later price change cannot retroactively alter what the member agreed to.
 */
export async function requestMembership(): Promise<SignupResult> {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Sign in first — membership sits on top of a research account.' };

  const { data: plan, error: planError } = await supabase
    .from('membership_plans')
    .select('id, price_cents, discount_bp, interval')
    .eq('active', true)
    .order('price_cents')
    .limit(1)
    .maybeSingle();

  if (planError || !plan) {
    return { error: 'No membership plan is configured yet. Please try again later.' };
  }

  // Already enrolled?
  const { data: profile } = await supabase
    .from('profiles')
    .select('membership_status')
    .eq('id', user.id)
    .maybeSingle();

  if (profile?.membership_status === 'active') {
    return { error: 'Your membership is already active.' };
  }

  // Existing open request?
  const { data: open } = await supabase
    .from('membership_signups')
    .select('id, status')
    .eq('owner_id', user.id)
    .in('status', ['requested', 'awaiting_payment'])
    .maybeSingle();

  if (open) return { ok: true, status: open.status };

  const { error: insertError } = await supabase.from('membership_signups').insert({
    owner_id: user.id,
    plan_id: plan.id,
    status: 'requested',
    quoted_price_cents: plan.price_cents,
    quoted_discount_bp: plan.discount_bp,
    quoted_interval: plan.interval,
  });

  if (insertError) {
    // Most likely cause: migration 0005 has not been applied yet. Say something
    // useful rather than surfacing a raw PostgREST message.
    return {
      error:
        'Enrolment could not be recorded. If this persists, the membership tables ' +
        'may not be set up yet.',
    };
  }

  revalidatePath('/membership');
  return { ok: true, status: 'requested' };
}

export async function withdrawMembershipRequest(): Promise<SignupResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Sign in first.' };

  const { error } = await supabase
    .from('membership_signups')
    .update({ status: 'withdrawn', resolved_at: new Date().toISOString() })
    .eq('owner_id', user.id)
    .in('status', ['requested', 'awaiting_payment']);

  if (error) return { error: 'Could not withdraw the request.' };

  revalidatePath('/membership');
  return { ok: true, status: 'withdrawn' };
}
