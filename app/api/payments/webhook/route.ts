import { createHmac, timingSafeEqual } from 'node:crypto';
import { NextResponse, type NextRequest } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

/**
 * Gateway webhook receiver — the only thing that may activate a membership.
 *
 * A member's 25% discount comes from profiles.membership_status, which the
 * account holder cannot write (migration 0003). This route holds the
 * service-role key, so it is the single path that can set it. That is the whole
 * point: the discount can only exist because money moved.
 *
 * Events worth handling on a high-risk account with $599.88 taken upfront:
 *   recurring  — renewals succeeded / failed
 *   transaction — sale settled or voided
 *   chargeback — dispute raised; membership should not survive one
 *
 * !! VERIFY BEFORE GOING LIVE !!
 * The signature header name and encoding below follow the NMI webhook
 * convention, which both Seamless Chex and AllayPay inherit. Confirm both
 * against Settings → Webhooks in your gateway portal before going live. If
 * they differ, fix `SIGNATURE_HEADER` / `verify()` rather than loosening the
 * check.
 */

const SIGNATURE_HEADER = 'webhook-signature';

function verify(rawBody: string, header: string | null, secret: string): boolean {
  if (!header) return false;

  // Convention: "t=<unix seconds>,v1=<hex hmac of `${t}.${body}`>"
  const parts = new Map(
    header.split(',').map((kv) => {
      const i = kv.indexOf('=');
      return [kv.slice(0, i).trim(), kv.slice(i + 1).trim()] as const;
    })
  );

  const timestamp = parts.get('t');
  const provided = parts.get('v1');
  if (!timestamp || !provided) return false;

  // Reject anything older than five minutes so a captured request can't be replayed.
  const ageSeconds = Math.abs(Date.now() / 1000 - Number(timestamp));
  if (!Number.isFinite(ageSeconds) || ageSeconds > 300) return false;

  const expected = createHmac('sha256', secret)
    .update(`${timestamp}.${rawBody}`)
    .digest('hex');

  const a = Buffer.from(expected, 'utf8');
  const b = Buffer.from(provided, 'utf8');
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function POST(request: NextRequest) {
  const secret = process.env.PAYMENT_GATEWAY_WEBHOOK_SECRET;

  // Fail closed. An unverified webhook could hand out memberships for free.
  if (!secret?.trim()) {
    console.error('[webhook] PAYMENT_GATEWAY_WEBHOOK_SECRET is not set; rejecting');
    return NextResponse.json({ error: 'not configured' }, { status: 503 });
  }

  const rawBody = await request.text();

  if (!verify(rawBody, request.headers.get(SIGNATURE_HEADER), secret)) {
    return NextResponse.json({ error: 'invalid signature' }, { status: 401 });
  }

  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: 'invalid payload' }, { status: 400 });
  }

  const eventId = String(payload.event_id ?? payload.id ?? '');
  const eventType = String(payload.event_type ?? payload.type ?? '');
  if (!eventId || !eventType) {
    return NextResponse.json({ error: 'missing event id or type' }, { status: 400 });
  }

  const admin = createAdminClient();

  // Idempotency: membership_events.stripe_event_id is unique, so a replayed
  // delivery collides and is skipped rather than double-applied. (Column name
  // predates this gateway; it stores whichever processor's event id applies.)
  const { error: dupe } = await admin.from('membership_events').insert({
    owner_id: null,
    event: mapEvent(eventType),
    stripe_event_id: eventId,
    occurred_at: new Date().toISOString(),
  });

  if (dupe && dupe.code === '23505') {
    return NextResponse.json({ received: true, duplicate: true });
  }

  // Membership activation intentionally not wired yet: it needs the payload's
  // customer/subscription field names, which should be read off a real
  // delivery rather than guessed. Logged so the first live events can be
  // inspected in Vercel's function logs.
  console.log('[webhook]', eventType, eventId, Object.keys(payload).join(','));

  return NextResponse.json({ received: true });
}

function mapEvent(eventType: string): string {
  const t = eventType.toLowerCase();
  if (t.includes('chargeback') || t.includes('dispute')) return 'cancelled';
  if (t.includes('fail') || t.includes('decline')) return 'payment_failed';
  if (t.includes('recurring') || t.includes('renew')) return 'renewed';
  if (t.includes('cancel') || t.includes('delete')) return 'cancelled';
  return 'started';
}

// Reject anything that isn't a signed POST.
export async function GET() {
  return NextResponse.json({ error: 'method not allowed' }, { status: 405 });
}
