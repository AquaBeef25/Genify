import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Next.js 16 renamed the `middleware` file convention to `proxy` (same
// mechanism, runs before a route is rendered — see
// node_modules/next/dist/docs/01-app/.../proxy.md). This project previously had
// no proxy/middleware at all, which is why:
//   1. the whole site was reachable without signing in, and
//   2. refreshed Supabase sessions were never persisted to cookies.
// This file fixes both: it gates every page behind a Supabase session and
// writes any refreshed auth cookies back onto the response.
export async function proxy(request: NextRequest) {
  // Passthrough response we can attach refreshed auth cookies to.
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    // Non-standard env name (publishable, not anon) — see CLAUDE.md.
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet, headers) {
          // Mirror refreshed cookies onto the incoming request (so this same
          // request sees them) and rebuild the outgoing response with them.
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
          // Auth responses must not be cached by any CDN/proxy, or one user's
          // session could be served to another (headers supplied by @supabase/ssr).
          Object.entries(headers).forEach(([key, value]) =>
            response.headers.set(key, value)
          );
        },
      },
    }
  );

  // Do NOT run logic between createServerClient and getUser — getUser()
  // revalidates the token with Supabase and triggers the cookie refresh above.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // The entire app requires login. These auth pages are the only public ones;
  // static assets, /api, and metadata files are excluded via `config.matcher`.
  const { pathname } = request.nextUrl;
  // /auth/callback must be public: mid-OAuth the user has no session yet, so
  // proxy would otherwise redirect it to /login before the code is exchanged.
  const publicAuthRoutes = [
    "/login",
    "/forgot-password",
    "/reset-password",
    "/auth/callback",
  ];
  const isPublicAuth = publicAuthRoutes.some((r) => pathname.startsWith(r));
  if (!user && !isPublicAuth) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // Already signed in and heading to /login? Send them into the app. (Reset
  // pages stay reachable while signed in — the recovery link opens a session.)
  if (user && pathname.startsWith("/login")) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Run on every route EXCEPT:
     * - api                    (route handlers return JSON and enforce their own auth)
     * - _next/static           (build assets)
     * - _next/image            (image optimizer)
     * - favicon.ico / sitemap.xml / robots.txt (metadata files)
     * - static image files by extension
     */
    "/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
