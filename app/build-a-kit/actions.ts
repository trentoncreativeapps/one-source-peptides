'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

export type SaveKitResult = { error: string } | { ok: true; name: string };

/**
 * Persists a kit for the signed-in researcher. Writes go through the visitor's
 * own session, so the owner-only RLS policies on kits/kit_items are what
 * actually enforce ownership — owner_id is not trusted from the client.
 */
export async function saveKit(formData: FormData): Promise<SaveKitResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Sign in to save a kit.' };

  const name = String(formData.get('kit_name') ?? '').trim() || 'Untitled kit';
  const raw = String(formData.get('variant_ids') ?? '');
  const variantIds = raw.split(',').map((s) => s.trim()).filter(Boolean);

  if (variantIds.length === 0) return { error: 'Add at least one product to the kit.' };

  // Confirm every id is a real variant before writing anything, so a partial
  // kit can't be created from a stale or hand-edited payload.
  const { data: found, error: lookupError } = await supabase
    .from('product_variants')
    .select('id')
    .in('id', variantIds);

  if (lookupError) return { error: 'Could not verify the selected sizes.' };
  if ((found?.length ?? 0) !== variantIds.length) {
    return { error: 'One of the selected sizes is no longer available. Refresh and try again.' };
  }

  const { data: kit, error: kitError } = await supabase
    .from('kits')
    .insert({ owner_id: user.id, name })
    .select('id')
    .single();

  if (kitError || !kit) return { error: 'Could not save the kit.' };

  const counts = new Map<string, number>();
  for (const id of variantIds) counts.set(id, (counts.get(id) ?? 0) + 1);

  const { error: itemsError } = await supabase.from('kit_items').insert(
    Array.from(counts, ([variant_id, qty]) => ({ kit_id: kit.id, variant_id, qty }))
  );

  if (itemsError) {
    // Don't leave an empty kit behind if the items failed.
    await supabase.from('kits').delete().eq('id', kit.id);
    return { error: 'Could not save the kit contents.' };
  }

  revalidatePath('/build-a-kit');
  return { ok: true, name };
}
