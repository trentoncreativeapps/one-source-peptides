/**
 * Card gateway client — NMI / transactiongateway protocol.
 *
 * Deliberately written against the platform rather than a reseller. Both
 * candidates resell NMI: Seamless Chex white-labels it as
 * seamlesschex.transactiongateway.com, and AllayPay resells NMI directly.
 * Switching between them is PAYMENT_GATEWAY_URL plus a new security key — no
 * code change. Note Seamless Chex's own ACH product (Paynote) is a different
 * API; this is the card path.
 *
 *   POST <PAYMENT_GATEWAY_URL>
 *   application/x-www-form-urlencoded, authenticated with `security_key`,
 *   responding with a urlencoded body (response=1 approved, 2 declined, 3 error).
 *
 * PCI POSTURE — the reason this file never accepts a card number:
 * card details are tokenised in the browser by Collect.js and arrive here only
 * as `payment_token`. That keeps the server out of scope for handling PAN
 * (SAQ-A-EP rather than full SAQ-D). Passing raw `ccnumber` through this
 * function would drag the whole application into PCI scope, so it isn't
 * possible by design — there is no parameter for it.
 */

const RESPONSE_APPROVED = '1';
const RESPONSE_DECLINED = '2';

export type GatewayResult =
  | { ok: true; transactionId: string; authCode: string | null; raw: Record<string, string> }
  | { ok: false; declined: boolean; message: string; raw: Record<string, string> };

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v || !v.trim()) {
    throw new Error(
      `Missing environment variable: ${name}. Set it in Vercel → Settings → ` +
        `Environment Variables (keys come from the gateway portal, ` +
        `Settings → Security Keys). See SETUP.md.`
    );
  }
  return v;
}

/** The gateway answers in urlencoded form, not JSON. */
function parseGatewayResponse(body: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of new URLSearchParams(body)) out[k] = v;
  return out;
}

async function post(fields: Record<string, string>): Promise<GatewayResult> {
  // No default: an unset gateway URL should fail loudly, not silently post
  // live card tokens at whichever host was hard-coded first.
  const url = requireEnv('PAYMENT_GATEWAY_URL');

  const body = new URLSearchParams({
    security_key: requireEnv('PAYMENT_GATEWAY_SECURITY_KEY'),
    ...fields,
  });

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
    // never let a hung gateway hold a request open indefinitely
    signal: AbortSignal.timeout(20_000),
  });

  if (!res.ok) {
    return {
      ok: false,
      declined: false,
      message: `Gateway returned HTTP ${res.status}`,
      raw: {},
    };
  }

  const raw = parseGatewayResponse(await res.text());

  if (raw.response === RESPONSE_APPROVED) {
    return {
      ok: true,
      transactionId: raw.transactionid ?? '',
      authCode: raw.authcode ?? null,
      raw,
    };
  }

  return {
    ok: false,
    declined: raw.response === RESPONSE_DECLINED,
    // responsetext is the gateway's human-readable reason
    message: raw.responsetext || 'The payment could not be processed.',
    raw,
  };
}

/** One-off sale against a Collect.js token. Amount in cents. */
export function chargeToken(opts: {
  paymentToken: string;
  amountCents: number;
  orderId?: string;
  email?: string;
  /** Free-text shown on gateway reports, not the card statement. */
  description?: string;
}): Promise<GatewayResult> {
  return post({
    type: 'sale',
    payment_token: opts.paymentToken,
    amount: (opts.amountCents / 100).toFixed(2),
    ...(opts.orderId ? { orderid: opts.orderId } : {}),
    ...(opts.email ? { email: opts.email } : {}),
    ...(opts.description ? { order_description: opts.description } : {}),
  });
}

/**
 * Annual membership subscription.
 *
 * The plan is $599.88 taken at sign-up and again every 12 months, so this is
 * month_frequency 12 with the first charge immediate. `plan_payments` 0 means
 * it continues until cancelled.
 */
export function createAnnualSubscription(opts: {
  paymentToken: string;
  amountCents: number;
  email?: string;
  planId?: string;
}): Promise<GatewayResult> {
  return post({
    recurring: 'add_subscription',
    payment_token: opts.paymentToken,
    plan_amount: (opts.amountCents / 100).toFixed(2),
    month_frequency: '12',
    day_of_month: String(new Date().getUTCDate()),
    plan_payments: '0',
    ...(opts.planId ? { plan_id: opts.planId } : {}),
    ...(opts.email ? { email: opts.email } : {}),
  });
}

export function cancelSubscription(subscriptionId: string): Promise<GatewayResult> {
  return post({ recurring: 'delete_subscription', subscription_id: subscriptionId });
}

export function refund(transactionId: string, amountCents?: number): Promise<GatewayResult> {
  return post({
    type: 'refund',
    transactionid: transactionId,
    ...(amountCents != null ? { amount: (amountCents / 100).toFixed(2) } : {}),
  });
}

export function isGatewayConfigured(): boolean {
  return Boolean(process.env.PAYMENT_GATEWAY_SECURITY_KEY?.trim());
}
