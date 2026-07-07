# Deploying Genify to Vercel — Go-Live Runbook

An ordered checklist for shipping this app to production on Vercel, reusing the
existing Supabase project. Work top to bottom; each step is quick.

> **Target for the first deploy:** the free `https://<project>.vercel.app`
> domain. A custom domain can be added later (see [Adding a custom domain
> later](#adding-a-custom-domain-later)).

---

## 0. Pre-flight (already verified ✓)

These were confirmed while preparing this runbook — no action needed, listed so
you know the starting state is green:

- `npm run build` succeeds (Next.js 16.2.9 / Turbopack, TypeScript clean, 16
  routes).
- `next@16.2.9` resolves from the public npm registry in `package-lock.json`,
  so Vercel's `npm ci` will install it.
- Supabase (project `aeiyxldvixrurdrxvupf`) has all three tables with RLS
  enabled: `prompts`, `submissions`, `submission_likes`. Schema is applied.
- Node is pinned to `>=20` via `.nvmrc` (`22`) + `engines` so Vercel uses a
  supported runtime.

---

## 1. Push to GitHub

Vercel deploys from a Git repo. If the repo isn't on GitHub yet:

```bash
git push origin main
```

(If there's no remote yet: create an empty GitHub repo, then
`git remote add origin <url> && git push -u origin main`.)

---

## 2. Import the project into Vercel

1. Go to <https://vercel.com/new> and import the GitHub repo.
2. Framework preset: **Next.js** (auto-detected). Leave build/output settings at
   their defaults — do **not** override the build command.
3. **Do not click Deploy yet** — set the environment variables first (next
   step), otherwise the first build ships without them.

---

## 3. Set environment variables in Vercel

Project → **Settings → Environment Variables**. Add all five for the
**Production** (and Preview, if you want preview deploys to work) environment.
Values for the first four come straight from your local `.env.local`:

| Variable | Value |
| --- | --- |
| `GEMINI_API_KEY` | *(from `.env.local`)* |
| `NEXT_PUBLIC_SUPABASE_URL` | `https://aeiyxldvixrurdrxvupf.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | *(from `.env.local`)* |
| `NEXT_PUBLIC_ADMIN_USER_ID` | *(from `.env.local`)* |
| `NEXT_PUBLIC_SITE_URL` | **set after first deploy** — see step 5 |

> `NEXT_PUBLIC_SITE_URL` is chicken-and-egg: you need the assigned
> `*.vercel.app` URL before you can set it. Deploy once (step 4), grab the URL,
> set the var (step 5), then redeploy. Until it's set, sitemap/robots/canonical
> tags fall back to `http://localhost:3000`.

---

## 4. First deploy

Click **Deploy**. Wait for the build to go green. Note the production URL Vercel
assigns, e.g. `https://ai-prompt-generator-xxxx.vercel.app`.

---

## 5. Set `NEXT_PUBLIC_SITE_URL`, then redeploy

1. Back in **Settings → Environment Variables**, set
   `NEXT_PUBLIC_SITE_URL` = the exact production origin from step 4
   (e.g. `https://ai-prompt-generator-xxxx.vercel.app`, **no trailing slash**).
2. Trigger a redeploy (Deployments → ⋯ → **Redeploy**) so the value is baked in.
   `NEXT_PUBLIC_*` vars are inlined at build time, so a redeploy is required —
   editing the var alone doesn't update the running site.

---

## 6. Point Supabase Auth at the production origin ⚠️ critical

Password reset (`window.location.origin/reset-password`) and signup-confirmation
emails only work if Supabase knows the production origin. In the Supabase
dashboard → **Authentication → URL Configuration**:

1. **Site URL** → set to your production origin
   (`https://<project>.vercel.app`). This is what signup-confirmation email
   links use.
2. **Redirect URLs** → add:
   - `https://<project>.vercel.app/**`

   (Keep `http://localhost:3000/**` in the list so local dev still works.)

Skip this and reset/confirm emails will 400 or bounce users to the wrong origin.

---

## 7. Smoke test the live site

Walk the core flow on the production URL:

- [ ] Visit the site logged out → redirected to `/login`.
- [ ] **Sign up** with a fresh email → "check your email to confirm" notice.
- [ ] Open the confirmation email → link lands on the production origin (not
      localhost) → confirm.
- [ ] **Sign in** → lands on `/` (Discover).
- [ ] **Generate a prompt** (enter an idea, pick a format) → Markdown blueprint
      renders; copy-to-clipboard works.
- [ ] Open **`/history`** → the generated prompt appears.
- [ ] **Forgot password** flow → reset email link opens `/reset-password` on the
      production origin and lets you set a new password.
- [ ] `https://<project>.vercel.app/sitemap.xml` and `/robots.txt` show the
      production origin (confirms `NEXT_PUBLIC_SITE_URL` took effect).
- [ ] `/gallery` loads for logged-out visitors.
- [ ] `/admin` is reachable by the admin user (matching
      `NEXT_PUBLIC_ADMIN_USER_ID`) and not by others.

If any auth email points at `localhost`, revisit step 6 (Supabase Site URL).

---

## Optional post-deploy hardening

Not blockers — surfaced by Supabase's security advisors. Do them when convenient:

- **Enable leaked-password protection.** Dashboard → Authentication → Policies /
  Password settings → turn on "Leaked password protection" (checks
  HaveIBeenPwned). One toggle, zero risk.
  <https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection>
- **Lock down `sync_submission_likes_count()`.** It's a `SECURITY DEFINER`
  trigger function that's also RPC-callable by `anon`/`authenticated`. It only
  recomputes like counts, so exposure is low, but you can revoke direct
  execution:

  ```sql
  revoke execute on function public.sync_submission_likes_count() from anon, authenticated;
  ```

---

## Known caveats (by design — not deploy blockers)

- **Rate limiting is effectively off in production.** `app/lib/rate-limit.ts`
  keeps counts in per-process memory; on Vercel's serverless functions each
  invocation may hit a fresh instance, so the 3-req/60s cap rarely triggers. For
  real throttling, move to a shared store (e.g. Upstash Redis). Track as a
  follow-up.
- **OAuth buttons are placeholders.** Google/GitHub on `/login` show a "coming
  soon" notice — they need Supabase provider config + an `/auth/callback` route.
  Email + password work today.

---

## Rollback

Vercel keeps every deployment. If a release misbehaves: Deployments → pick the
last good one → **Promote to Production** (instant, no rebuild).

---

## Adding a custom domain later

1. Vercel → Settings → **Domains** → add the domain, follow the DNS steps.
2. Update `NEXT_PUBLIC_SITE_URL` to the custom origin → redeploy.
3. Update Supabase **Site URL** + **Redirect URLs** to the custom origin
   (repeat step 6 with the new domain).
