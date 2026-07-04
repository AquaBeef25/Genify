import { createClient } from "@supabase/supabase-js";

// Anonymous, read-only Supabase client for Server Components and metadata
// routes (sitemap/robots). No user session is involved — it only ever reads
// rows RLS exposes publicly (submissions where status = 'approved').
export function createPublicServerClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
}
