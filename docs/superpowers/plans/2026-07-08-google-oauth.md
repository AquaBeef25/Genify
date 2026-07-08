# Google Sign-In (OAuth) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Light up the existing Google button on `/login` so a visitor can sign in / create an account with Google via Supabase, landing signed-in on `/`.

**Architecture:** Supabase SSR **PKCE** flow. The browser client starts OAuth with `signInWithOAuth` (redirect to Google); Google returns to Supabase, which redirects to our new `app/auth/callback` Route Handler; that handler calls `exchangeCodeForSession(code)` on a cookie-writing server client to persist the session, then redirects into the app. `proxy.ts` must allow `/auth/callback` through unauthenticated.

**Tech Stack:** Next.js `16.2.9` (App Router, non-stock), React `19.2.4`, `@supabase/ssr` `^0.12.0`, Supabase Auth, Google Cloud OAuth 2.0.

## Global Constraints

- **Non-stock Next.js `16.2.9`.** Consult `node_modules/next/dist/docs/` before changing framework-level code. Middleware convention is `proxy.ts` (not `middleware.ts`).
- **No test suite.** `npm run lint` (ESLint) is the only automated check. There is **no** `test` script — do not invent one. Verify behavior by running the app (`npm run dev`) and driving the route. `npm run build` must also stay green.
- **Non-standard env names.** Supabase anon key is read as `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (not `..._ANON_KEY`). Match exactly.
- **Relative imports.** This repo has no `@/` path alias — use relative import paths (e.g. `../../lib/supabase-server`), matching existing files.
- **`proxy.ts` allow-list.** Any new unauthenticated route must be added to `publicAuthRoutes` in `proxy.ts`, or `proxy` redirects it to `/login`.
- **Design system.** Reuse `app/components/ui/` primitives (this feature reuses the existing `Button`). No raw hex/`zinc-*`.
- **Scope:** Google **only**. The GitHub button stays a `handleSocialSoon` placeholder.

## File Structure

| File | Change | Responsibility |
| --- | --- | --- |
| *(Google Cloud + Supabase dashboards)* | manual | Enable the Google provider with an OAuth client ID/secret |
| `app/lib/supabase-server.ts` | **create** | Cookie-writing server Supabase client (`next/headers`) for Route Handlers |
| `app/auth/callback/route.ts` | **create** | GET handler: exchange OAuth `code` → session → redirect into app |
| `proxy.ts` | modify | Add `/auth/callback` to `publicAuthRoutes` |
| `app/(auth)/login/page.tsx` | modify | Wire Google button → `signInWithOAuth`; surface `?authError=1` |
| `CLAUDE.md`, `docs/DEPLOY.md` | modify | Update stale "OAuth not wired" notes |

---

### Task 1: Enable the Google provider (manual, external — no code)

This is a prerequisite for the flow to *function*. The code in later tasks compiles and deploys without it, but the button errors until this is done. Doing it first lets you verify Task 5 end-to-end locally.

**Files:** none (Google Cloud Console + Supabase Dashboard).

- [ ] **Step 1: Get the Supabase callback URL**

In the Supabase Dashboard → **Authentication → Providers → Google**, note the **Callback URL (for OAuth)** shown there. It is:
`https://aeiyxldvixrurdrxvupf.supabase.co/auth/v1/callback`

- [ ] **Step 2: Create the Google OAuth client**

In [Google Cloud Console](https://console.cloud.google.com/):
1. Create or select a project.
2. **APIs & Services → OAuth consent screen** → User type **External** → fill app name, user support email, developer contact → Save. Add scopes `.../auth/userinfo.email`, `.../auth/userinfo.profile`, `openid`. While in **Testing**, add your own Google account under **Test users**.
3. **APIs & Services → Credentials → Create Credentials → OAuth client ID** → Application type **Web application**.
4. Under **Authorized redirect URIs**, add the Supabase callback URL from Step 1.
5. Create, then copy the **Client ID** and **Client Secret**.

- [ ] **Step 3: Enable Google in Supabase**

Supabase Dashboard → **Authentication → Providers → Google** → toggle **Enabled**, paste the **Client ID** and **Client Secret**, Save.

- [ ] **Step 4: Confirm redirect URLs allow-list**

Supabase Dashboard → **Authentication → URL Configuration → Redirect URLs**. Ensure both are present (add if missing — these are the same wildcards from `docs/DEPLOY.md` step 6):
- `http://localhost:3000/**`
- `https://<your-project>.vercel.app/**`

- [ ] **Step 5: Verify**

The Google provider row in Supabase shows **Enabled**. No app code or env change is needed (credentials live in Supabase).

---

### Task 2: Server Supabase client helper

**Files:**
- Create: `app/lib/supabase-server.ts`

**Interfaces:**
- Produces: `async function createClient(): Promise<SupabaseClient>` — a request-scoped server client that reads/writes auth cookies via `next/headers`. Consumed by Task 3.

- [ ] **Step 1: Create the server client helper**

Create `app/lib/supabase-server.ts`:

```ts
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

// Server-side Supabase client for Route Handlers / Server Components.
// Mirrors the cookie handling in proxy.ts, but reads cookies from next/headers
// (request-scoped) instead of a NextRequest. The OAuth callback route needs a
// cookie-WRITING server client so the session from exchangeCodeForSession()
// is persisted. Env names are intentionally non-standard (PUBLISHABLE, not
// ANON) — see CLAUDE.md.
export async function createClient() {
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
```

- [ ] **Step 2: Lint**

Run: `npm run lint`
Expected: no new errors/warnings.

- [ ] **Step 3: Commit**

```bash
git add app/lib/supabase-server.ts
git commit -m "feat(auth): add cookie-writing server Supabase client helper"
```

---

### Task 3: OAuth callback Route Handler

**Files:**
- Create: `app/auth/callback/route.ts`

**Interfaces:**
- Consumes: `createClient` from `../../lib/supabase-server` (Task 2).
- Produces: a `GET` handler at path `/auth/callback` that redirects to `/` (or a relative `?next=`) on success, or `/login?authError=1` on failure.

- [ ] **Step 1: Create the callback route**

Create `app/auth/callback/route.ts`:

```ts
import { NextResponse } from 'next/server';
import { createClient } from '../../lib/supabase-server';

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
    const supabase = await createClient();
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
  }

  // No code, or the exchange failed → back to login with an error flag.
  return NextResponse.redirect(`${origin}/login?authError=1`);
}
```

- [ ] **Step 2: Lint**

Run: `npm run lint`
Expected: no new errors/warnings.

- [ ] **Step 3: Commit** (route + proxy are verified together in Task 4)

```bash
git add app/auth/callback/route.ts
git commit -m "feat(auth): add /auth/callback OAuth code-exchange route"
```

---

### Task 4: Allow `/auth/callback` through `proxy.ts`

**Files:**
- Modify: `proxy.ts` (the `publicAuthRoutes` array, ~line 54)

**Interfaces:**
- Consumes: the route from Task 3.
- Produces: `/auth/callback` reachable without a session, so the code exchange can run.

- [ ] **Step 1: Add the route to the allow-list**

In `proxy.ts`, change:

```ts
  const publicAuthRoutes = ["/login", "/forgot-password", "/reset-password"];
```

to:

```ts
  // /auth/callback must be public: mid-OAuth the user has no session yet, so
  // proxy would otherwise redirect it to /login before the code is exchanged.
  const publicAuthRoutes = [
    "/login",
    "/forgot-password",
    "/reset-password",
    "/auth/callback",
  ];
```

- [ ] **Step 2: Lint**

Run: `npm run lint`
Expected: no new errors/warnings.

- [ ] **Step 3: Verify the route is reachable and runs (no session)**

Start the dev server in one terminal:

Run: `npm run dev`

In another terminal, hit the callback with no `code`:

Run: `curl.exe -i "http://localhost:3000/auth/callback"`
Expected: a `307`/`308` redirect whose `location:` header is `/login?authError=1`.

> Interpreting this: `?authError=1` proves the **route handler ran** (so the proxy let it through). If instead you get redirected to plain `/login` with no query, the proxy allow-list entry (Step 1) isn't taking effect — restart `npm run dev` and recheck.

Stop the dev server.

- [ ] **Step 4: Commit**

```bash
git add proxy.ts
git commit -m "feat(auth): allow /auth/callback through the proxy auth gate"
```

---

### Task 5: Wire the Google button on `/login`

**Files:**
- Modify: `app/(auth)/login/page.tsx`

**Interfaces:**
- Consumes: the browser Supabase client already created in the page (`const supabase = createClient()`), and the `/auth/callback` route (Task 3).
- Produces: a working Google sign-in entry point + a visible error when the callback bounced back with `?authError=1`.

- [ ] **Step 1: Import `useEffect`**

In `app/(auth)/login/page.tsx`, change:

```ts
import { useState } from 'react';
```

to:

```ts
import { useEffect, useState } from 'react';
```

> We read `?authError=1` via `window.location.search` in a `useEffect` (not `useSearchParams`) on purpose: `useSearchParams` would force a Suspense boundary and turn the currently-static `/login` route dynamic. This keeps the build unchanged.

- [ ] **Step 2: Surface the callback error flag**

In the component body, immediately after the existing `const supabase = createClient();` line, add:

```ts
  // The OAuth callback redirects here as /login?authError=1 when the code
  // exchange (or the flow start) failed. Surface it in the existing notice.
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get('authError')) {
      setError('Google sign-in failed — please try again, or use email & password.');
    }
  }, []);
```

- [ ] **Step 3: Add the Google sign-in handler**

Directly above the existing `handleSocialSoon` function, add:

```ts
  const handleGoogleSignIn = async () => {
    setError(null);
    setNotice(null);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    // On success the browser is already navigating to Google; we only reach
    // here if the flow failed to *start*.
    if (error) setError(error.message);
  };
```

- [ ] **Step 4: Point the Google button at the new handler**

Find the Google `Button` (the one whose label text is `Google`) and change its handler from `handleSocialSoon` to `handleGoogleSignIn`:

```tsx
            <Button type="button" variant="secondary" onClick={handleGoogleSignIn}>
```

Leave the GitHub `Button` on `onClick={handleSocialSoon}` (still a placeholder). Do not touch the SVGs or labels.

- [ ] **Step 5: Lint and build**

Run: `npm run lint`
Expected: no new errors/warnings.

Run: `npm run build`
Expected: success; `/login` still listed as `○ (Static)` in the route table (confirms we didn't force it dynamic).

- [ ] **Step 6: Verify end-to-end (requires Task 1 done)**

Run: `npm run dev`, then in a browser:
1. Open `http://localhost:3000/login` → click the **Google** button → Google consent screen appears → authorize.
2. You are redirected back and land signed-in on `/` (Discover).
3. Generate a prompt → it renders and appears under `/history` (confirms a real session + DB insert under your user).
4. **Failure path:** open `/login` again, click **Google**, then **Cancel** at Google's consent screen → you return to `/login?authError=1` and the red "Google sign-in failed…" notice shows (no crash).

Stop the dev server.

- [ ] **Step 7: Commit**

```bash
git add "app/(auth)/login/page.tsx"
git commit -m "feat(auth): wire Google sign-in button to signInWithOAuth"
```

---

### Task 6: Update stale docs

**Files:**
- Modify: `CLAUDE.md`
- Modify: `docs/DEPLOY.md`

Several docs still say OAuth is "not wired yet." Bring them in line with reality (Google works; GitHub still pending).

- [ ] **Step 1: Update `CLAUDE.md`**

In the "How It Works" / login description, replace the note that says Google/GitHub OAuth "is not wired yet" (placeholder "coming soon") with wording that reflects: **Google OAuth is live** via `signInWithOAuth` + the `app/auth/callback` route (added to `proxy.ts`'s `publicAuthRoutes`); **GitHub remains a placeholder**. Also update the `app/(auth)/login/page.tsx` description so it no longer calls the Google button a placeholder. (Search `CLAUDE.md` for `OAuth is not wired` and `handleSocialSoon` and adjust those sentences.)

- [ ] **Step 2: Update `docs/DEPLOY.md`**

Under **Known caveats**, edit the "OAuth buttons are placeholders" bullet to say **only GitHub** is a placeholder now; Google sign-in works (and note it requires the Google provider enabled in Supabase per the Google-OAuth spec/plan). If a "point Supabase Auth at the production origin" reader would benefit, add a one-line reminder that the Google provider must also be enabled and its redirect URLs must include the production origin.

- [ ] **Step 3: Lint (docs only — sanity)**

Run: `npm run lint`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add CLAUDE.md docs/DEPLOY.md
git commit -m "docs: reflect live Google OAuth (GitHub still pending)"
```

---

## Post-implementation: production rollout

After merging, follow `docs/DEPLOY.md` as usual, plus:
1. Ensure the Google provider is enabled in Supabase (Task 1) — it's a project-level setting, shared by all deploys.
2. Confirm the production origin (`https://<project>.vercel.app`) is in Supabase's **Redirect URLs** (Task 1, Step 4).
3. Smoke-test the Google flow on the live URL: the post-consent redirect should land on the **production** origin, not localhost (the `x-forwarded-host` handling in Task 3 covers Vercel's proxy).

## Self-review notes

- **Spec coverage:** External setup → Task 1; `supabase-server.ts` → Task 2; `/auth/callback` route → Task 3; `proxy.ts` allow-list → Task 4; login button + `authError` notice → Task 5; behavior/doc consistency → Task 6. All spec sections mapped.
- **No test framework:** verification uses `npm run lint` + `npm run build` + driving the flow, per Global Constraints — no fabricated `test` script.
- **Type/name consistency:** `createClient` (server, Task 2) is imported and awaited in Task 3; `handleGoogleSignIn` defined and referenced in Task 5; `publicAuthRoutes` matches the existing name in `proxy.ts`.
