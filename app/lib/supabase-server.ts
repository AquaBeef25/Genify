import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

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

// Request-scoped, session-aware server client backed by the request cookies
// (via next/headers). Reads AND writes auth cookies, so it can persist the
// session that exchangeCodeForSession() returns in the OAuth callback route.
// Mirrors the cookie handling in proxy.ts. Env names are intentionally
// non-standard (PUBLISHABLE, not ANON) — see CLAUDE.md.
export async function createRouteHandlerClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // setAll can throw if called during a Server Component render;
            // proxy.ts refreshes sessions, so it's safe to ignore there. In
            // the callback Route Handler the cookie write succeeds.
          }
        },
      },
    }
  );
}
