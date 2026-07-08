import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '../../lib/supabase-server';

// OAuth (PKCE) callback. Supabase redirects here with ?code=... after the user
// authorizes with Google. We exchange the code for a session (writing the auth
// cookies) and send the user into the app.
//
// NOTE: proxy.ts lists /auth/callback in publicAuthRoutes — the user has no
// session yet when this runs, so otherwise proxy bounces them to /login before
// the exchange can happen.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');

  // Only honor relative redirect targets (prevents open redirect via ?next=).
  let next = searchParams.get('next') ?? '/';
  if (!next.startsWith('/')) next = '/';

  if (code) {
    const supabase = await createRouteHandlerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      // Behind Vercel's proxy the user-facing host is in x-forwarded-host.
      const forwardedHost = request.headers.get('x-forwarded-host');
      const isLocalEnv = process.env.NODE_ENV === 'development';
      if (isLocalEnv) {
        return NextResponse.redirect(`${origin}${next}`);
      } else if (forwardedHost) {
        return NextResponse.redirect(`https://${forwardedHost}${next}`);
      }
      return NextResponse.redirect(`${origin}${next}`);
    }
    console.error('[auth/callback] code exchange failed:', error.message);
  }

  // No code, or the exchange failed → back to login with an error flag.
  return NextResponse.redirect(`${origin}/login?authError=1`);
}
