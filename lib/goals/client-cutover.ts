import type { SupabaseClient } from '@supabase/supabase-js';
import supabase from '@/lib/db/client';

// TD-005 B6: the per-account desktop cut-over allowlist (Migration 089). A feature is live for the
// signed-in account only when my_client_cutovers_v1() lists it. Fails closed (false) on any error, so
// "flag default off" holds even if the RPC is unreachable. Not cached: `db` may be a per-request server
// client (lib/db/goals.ts's API-route callers), so a module-level cache would leak between accounts.
export type ClientCutoverFeature = 'milestone_work_v1' | 'activity_window_v1';

export async function hasClientCutover(
  feature: ClientCutoverFeature,
  db: SupabaseClient = supabase,
): Promise<boolean> {
  try {
    const { data, error } = await db.rpc('my_client_cutovers_v1');
    if (error || !data?.ok) return false;
    const features = (data.data?.features as string[] | undefined) ?? [];
    return features.includes(feature);
  } catch {
    return false;
  }
}
