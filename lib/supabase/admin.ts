// ⚠️ SERVER ONLY — usa SUPABASE_SERVICE_ROLE_KEY (bypassa RLS).
// NUNCA importar este arquivo em código com "use client". Nunca expor a key ao browser.

import { createClient as createSupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/database.types";

export function createAdminClient() {
  return createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}
