# Design: Google Sign-In (OAuth)

- **Date:** 2026-07-08
- **Status:** Approved (ready for implementation plan)
- **Author:** brainstormed with Claude Code
- **Growth lever:** Activation — one-tap sign-in / account creation removes the
  email-confirm round-trip from the signup funnel.

## Context & problem

`/login` already renders a **Google** button (and a GitHub one), but both are
placeholders wired to `handleSocialSoon`, which just shows a "coming soon"
notice. Real OAuth was deferred: it needs a Supabase provider configured plus an
`/auth/callback` route. `CLAUDE.md` and `proxy.ts` both explicitly anticipate
that future route. This spec lights up **Google only**; GitHub stays a
placeholder.

Today the only path to an account is email + password, which requires an email
confirmation round-trip before first sign-in. Google sign-in removes that
friction for the common case.

## Goal & success criteria

A visitor can click **Continue with Google** on `/login`, complete Google's
consent screen, and land signed-in on `/` (Discover) with a working Supabase
session — in both local dev and the production Vercel deployment.

**Success:** the Google button completes a real OAuth round-trip and creates /
signs into a Supabase account; the existing email + password flow is unaffected.

## Decisions (locked during brainstorming)

| Decision | Choice |
| --- | --- |
| Providers now | **Google only** — GitHub button stays a placeholder |
| Auth flow | **PKCE** via `@supabase/ssr` (the only correct option for this stack) |
| Callback location | `app/auth/callback/route.ts` — outside the `(auth)`/`(dashboard)` route groups, stable URL `/auth/callback` |
| Post-login redirect | `/` (Discover) |
| `redirectTo` origin | `window.location.origin` — works local + prod without depending on `NEXT_PUBLIC_SITE_URL` |
| Server client | New `app/lib/supabase-server.ts` helper (not inlined in the route) |
| New app env vars | **None** — Google client ID/secret live in Supabase, not Vercel env |

## Non-goals (YAGNI)

- **No GitHub OAuth** — button stays a "coming soon" placeholder.
- **No account-linking UI** — Supabase links a Google identity to an existing
  account by matching *verified* email automatically; nothing to build.
- **No new env vars** in the app / Vercel — credentials live in Supabase.
- **No changes to the email + password flow.**

## Why PKCE + a callback route (approach rationale)

`@supabase/ssr` forces `flowType: 'pkce'` with `detectSessionInUrl: false`, so
the session is **not** auto-detected client-side. The browser client starts the
flow (storing a PKCE code-verifier cookie); Google redirects back with a
`?code=…`; a **server-side** route must call `exchangeCodeForSession(code)` to
set the session cookies that `proxy.ts` reads on every request. An implicit /
client-only flow would never populate those server cookies, so it is not viable
here. (Confirmed against current `/supabase/ssr` docs.)

**End-to-end flow:**

1. User clicks **Continue with Google** on `/login`.
2. `signInWithOAuth({ provider: 'google', options: { redirectTo: '<origin>/auth/callback' } })`
   redirects the browser to Google.
3. User consents → Google redirects to the Supabase callback
   (`https://<project-ref>.supabase.co/auth/v1/callback`).
4. Supabase redirects back to **`<origin>/auth/callback?code=…`**.
5. Our route handler exchanges the code for a session (writes auth cookies) and
   redirects to `/`. On failure it redirects to `/login?authError=1`.

## Part 1 — External setup (manual; prerequisite, no code works without it)

### 1a. Google Cloud Console
1. Create (or reuse) a project.
2. **APIs & Services → OAuth consent screen** → configure (External; app name,
   support email, developer email). Add the scopes `.../auth/userinfo.email`,
   `.../auth/userinfo.profile`, `openid`. Add yourself as a test user while the
   app is in "Testing".
3. **APIs & Services → Credentials → Create Credentials → OAuth client ID** →
   application type **Web application**.
4. Under **Authorized redirect URIs**, add the Supabase callback:
   `https://aeiyxldvixrurdrxvupf.supabase.co/auth/v1/callback`
   (Supabase Dashboard → Authentication → Providers → Google shows this exact
   URL — copy it from there to be safe.)
5. Copy the **Client ID** and **Client Secret**.

### 1b. Supabase Dashboard
1. **Authentication → Providers → Google** → toggle **Enabled**.
2. Paste the **Client ID** and **Client Secret** → Save.
3. **Authentication → URL Configuration → Redirect URLs** must allow the app's
   callback. The wildcards from `docs/DEPLOY.md` step 6 already cover it:
   - `http://localhost:3000/**`
   - `https://<project>.vercel.app/**`
   Verify both are present (add them if the runbook step hasn't been done yet).

> No app / Vercel env changes. The Google credentials are stored in Supabase.

## Part 2 — Code changes

### 2a. `app/lib/supabase-server.ts` *(new)*
A `createClient()` server helper that builds a `createServerClient` from
`@supabase/ssr` using `cookies()` from `next/headers`, with `getAll` / `setAll`
handlers (matching the cookie pattern already used in `proxy.ts`). Reads the same
non-standard env names: `NEXT_PUBLIC_SUPABASE_URL` and
`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. Needed because `app/lib/supabase.ts` only
exposes the browser client, and the callback route needs a cookie-writing server
client.

### 2b. `app/auth/callback/route.ts` *(new)*
A `GET` route handler:
- Parse `code` (and optional `next`, defaulting to `/`) from the request URL.
- If no `code`: redirect to `/login?authError=1`.
- Build the server client (2a) and call `supabase.auth.exchangeCodeForSession(code)`.
- On success: redirect to `next` (default `/`).
- On error: redirect to `/login?authError=1`.
- Placed at `app/auth/callback/route.ts` so its path is `/auth/callback`,
  independent of the `(auth)` / `(dashboard)` route groups.

### 2c. `proxy.ts` *(edit)*
Add `/auth/callback` to the `publicAuthRoutes` allow-list. **Critical:** mid-OAuth
the user has no session yet, so without this the proxy redirects
`/auth/callback` → `/login` before the code is ever exchanged, breaking the flow.

### 2d. `app/(auth)/login/page.tsx` *(edit)*
- Replace the **Google** button's `onClick={handleSocialSoon}` with a new
  `handleGoogleSignIn` that calls
  `supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: \`${window.location.origin}/auth/callback\` } })`.
  Using `window.location.origin` keeps it correct in local dev and prod.
- On OAuth start error, surface it via the existing `error` notice state.
- **GitHub button unchanged** (still `handleSocialSoon`).
- Read `?authError=1` (via `useSearchParams`) and show the existing red notice
  ("Google sign-in failed — please try again or use email & password.") so a
  failed callback isn't silent.

## Behavior notes (not things to build)

- **Account linking:** a Google sign-in with the same *verified* email as an
  existing email/password account is linked by Supabase into one account — no
  duplicate row, no extra code.
- **Existing email + password login is untouched.**
- **Rate limiting / other flows** are out of scope.

## Testing / verification (no test suite in this repo)

Verification is driving the real flow (per `AGENTS.md` / `CLAUDE.md` — lint is
the only automated check; `npm run lint` must stay clean and `npm run build`
must pass):

1. **Local:** `npm run dev` → `/login` → **Continue with Google** → complete
   Google consent → lands on `/` signed in → generate a prompt → appears in
   `/history`.
2. **Failure path:** cancel at Google's consent screen → returns to
   `/login?authError=1` and shows the error notice (no crash).
3. **Production:** after enabling the provider, repeat the happy path on the live
   Vercel URL; confirm the redirect lands on the prod origin (not localhost).

## Rollout / sequencing

The external setup (Part 1) is a prerequisite for the code to *function*, but the
code (Part 2) can be written and merged first — the Google button simply errors
until the provider is enabled. Recommended order: write code → enable provider in
Google Cloud + Supabase → verify locally → deploy → verify in prod.
