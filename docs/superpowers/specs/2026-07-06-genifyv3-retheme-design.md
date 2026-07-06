# GenifyV3 Warm Re-theme — Design Spec

**Date:** 2026-07-06
**Status:** Approved (pending user review)
**Source design:** claude.ai/design project `GenifyV3`
(`5dddec0e-0155-463c-81bc-3d9daf1b4fe3`) — screen files `Login.dc.html`,
`Dashboard.dc.html`, `History.dc.html`, `Gallery.dc.html`, `Submit.dc.html`.
(`Canvas.dc.html` / `Canvas-2.dc.html` are empty artboards and carry no design.)

---

## 1. Goal

Replace the current **dark, indigo/violet, Geist** design system with the
**warm, light, editorial** GenifyV3 look across the entire app, then make the new
UI elements the mockups introduce (social sign-in, forgot-password, gallery
stats, history card actions) actually functional.

The app must remain fully working at every phase — no feature currently in the
product (email/password auth, generate, refine, storyboard, signup wall,
search/filter, delete, gallery submit/moderation, SEO prompt library) may
regress.

### Success criteria

- Every route renders in the warm/light theme with no leftover dark surfaces or
  `zinc-*`/dark hardcoded colors.
- `npm run lint` passes; the app builds and each route can be driven in
  `npm run dev`.
- Google/GitHub sign-in and password reset work once the user completes the
  external Supabase/provider configuration documented here.
- Gallery stats show real data.

### Non-goals

- No light/dark toggle — the app becomes light-only.
- No change to the generation pipeline, rate limiting, RLS, or DB schema
  (except any additive column the gallery stats or OAuth need — none currently
  anticipated).
- Do **not** relocate the public Gallery/Library out of the `(public)` route
  group. The mockups show Gallery inside the dashboard sidebar shell, but the app
  deliberately serves `(public)/gallery` with a minimal shell so logged-out
  visitors can browse (per `CLAUDE.md`). We keep that architecture and only
  apply the warm theme. This is an intentional deviation from the mockup's
  chrome.

---

## 2. Design language

Extracted from the mockups.

### Color

| Role | Value |
| --- | --- |
| Page background | `linear-gradient(135deg, #fef9f3 0%, #f5f0eb 50%, #f0e8e0 100%)` |
| Main content bg | `linear-gradient(180deg, #fef9f3 0%, #f8f3ed 100%)` |
| Sidebar / raised cream | `#faf7f2` |
| Card surface | `#ffffff` |
| Input fill | `#faf7f2` (→ `#fff9f6` on focus) |
| Hairline border | `#e8dfd5` |
| Accent | terracotta gradient `#d97757 → #c16a4d` |
| Accent tint (bg / border) | `rgba(217,119,87,0.08)` / `rgba(217,119,87,0.15–0.2)` |
| Ink (primary text) | `#3d3a37` |
| Muted text | `#6b6159` |
| Subtle text | `#9b8f87` |
| Faint text / labels | `#b8aaa0` |
| Danger (delete/errors) | `#cc4b37` (warm-readable red on cream) |
| Success | `#3f9d6b` (green, tuned for light bg) |

Per-format badge colors (History mockup): TikTok = terracotta `#d97757`,
YouTube = blue `#6496c8`, Cinematic = purple `#9678b4`. These are decorative
accents layered over the accent-tinted pill.

### Typography

- **Headings / display:** Cormorant Garamond (serif), weights 400–700.
- **Body / UI:** Inter, weights 400–700.
- **Code (generated prompts):** keep Geist Mono (already loaded).
- Scale from mockups: hero `44px` serif bold, screen `h1` `36px` serif,
  card titles `18–24px` serif, labels `10–11px` uppercase `letter-spacing:1px`,
  body `13–15px` Inter.

### Surfaces & motion

- Cards: white, `1px #e8dfd5` border, radius `16px`, soft shadow
  `0 2px 8px rgba(0,0,0,0.04)`; hover lifts border to accent +
  `0 4px 16px rgba(217,119,87,0.1)`.
- Decorative: replace the dark violet `hero-glow` with restrained warm accents —
  a low-opacity terracotta dot pattern / clip-path triangle behind heroes
  (Dashboard mockup) and floating blob shapes on Login. Keep them subtle and
  respect `prefers-reduced-motion`.
- Keep the existing `fade-rise` entrance animation (mockups reuse it verbatim).

---

## 3. Approach

**Token-first re-theme (chosen).** Rewrite the semantic tokens and shared
primitives so ~80% of screens re-skin automatically (every screen already
consumes `bg-canvas`/`text-ink`/`text-accent`/`border-line`), then adjust each
page's layout to match the mockups, then add the new features.

Alternatives rejected: per-screen inline rewrite (abandons the token system,
unmaintainable); dual light/dark theme (user chose replace, mockups define only
the light look).

### Framework constraint

This repo pins a **non-stock Next.js 16.2.9**. Per `AGENTS.md`, before writing
any framework-level code — `next/font` usage in `app/layout.tsx`, the new
`/auth/callback` route handler, and any `proxy.ts` change — read the relevant
guide in `node_modules/next/dist/docs/`. `proxy.ts` (not `middleware.ts`) is the
auth gate and must be updated to allow the new unauthenticated routes.

---

## 4. Phase 1 — Theme foundation

Makes the whole app warm/light with all existing features intact.

### 4.1 `app/globals.css` — token swap

Rewrite the `@theme` block (keep the token **names** so utilities keep working;
only change values):

| Token | New value |
| --- | --- |
| `--color-canvas` | `#fef9f3` (base cream; body paints the gradient) |
| `--color-surface` | `#ffffff` |
| `--color-surface-2` | `#faf7f2` |
| `--color-elevated` | `#f2ebe3` |
| `--color-line` | `#e8dfd5` |
| `--color-line-strong` | `#dcd0c4` |
| `--color-ink` | `#3d3a37` |
| `--color-muted` | `#6b6159` |
| `--color-subtle` | `#9b8f87` |
| `--color-faint` | `#b8aaa0` |
| `--color-accent` | `#d97757` |
| `--color-accent-2` | `#c16a4d` |
| `--color-accent-ink` | `#c16a4d` (accent-colored text on cream/tint) |
| `--color-success` | `#3f9d6b` (green, readable on cream) |
| `--color-danger` | `#cc4b37` (red, readable on cream; distinct from the terracotta accent) |

Also:
- `:root { color-scheme: light; }`
- `body { background: <page gradient>; color: var(--color-ink); }` with the Inter
  stack.
- `.accent-gradient` → `linear-gradient(135deg, #d97757, #c16a4d)`.
- Repurpose `.hero-glow` into a warm, low-opacity accent (or add a
  `.hero-pattern` helper for the dot/triangle motif). Keep width-capped so it
  never causes horizontal scroll.
- Add a `--font-serif` theme var mapped to the Cormorant variable and a
  `font-serif` utility (via `@theme inline`).

### 4.2 `app/layout.tsx` — fonts

Load Cormorant Garamond + Inter via `next/font/google`, expose CSS variables
(`--font-inter`, `--font-cormorant`), keep `Geist_Mono` for code. Set body font
to Inter; headings opt into `font-serif`. Remove the Geist Sans dependency from
the sans stack (or keep as fallback). Update `<html>` variable classes.

### 4.3 Primitives (`app/components/ui/`)

- **Button** — redefine variants for light theme:
  - `primary`: terracotta gradient, white text, hover `brightness-110` (replaces
    the old white-on-black). This is the main CTA in every mockup.
  - `accent`: same terracotta gradient (used by Refine) — or a slightly softer
    tint to differentiate; decide during build, default to the gradient.
  - `secondary`: `border-line`, transparent, `text-muted`, hover cream.
  - `ghost`: subtle bordered, for Copy etc.
  - Fix disabled states for light bg.
- **Card** — white fill, `border-line`, radius `16px` (`rounded-2xl`), soft
  light shadow; add optional hover-lift used by grid cards.
- **Field / Input / Textarea / Label** — input fill `surface-2`, focus border +
  ring in accent, label stays uppercase (color `muted`/`subtle`). Focus bg
  `#fff9f6`.
- **Badge** — accent-tinted pill; support an optional color override for the
  per-format History colors.
- **Switch** — off track cream/`line-strong`, on track terracotta gradient,
  white thumb.
- **Skeleton / Spinner** — recolor for light bg (cream shimmer, accent spinner).
- **Brand** — mark uses the terracotta gradient box; wordmark "Genify" in
  Cormorant with the "Prompt Studio" caption per the mockups.

### 4.4 Layout chrome

- **`sidebar.tsx`** — bg `surface-2` (`#faf7f2`), `border-line`, width `280px`
  (`w-[280px]`). Group labels faint uppercase. Active item = accent tint bg +
  accent border + ink text; **Lucide icons tinted terracotta** (not emoji). User
  identity block: terracotta-gradient avatar, keep sign-out. Preserve the
  admin-only Moderation link and all existing hrefs.
- **`AppShell.tsx`** — recolor the responsive frame + mobile top bar / slide-over
  to cream; keep all responsive behavior.

### 4.5 Fix hardcoded dark colors

Sweep for literal dark values that bypass tokens and replace with tokens:
- `app/(dashboard)/page.tsx` markdown components: `text-zinc-300`, `#d6d3ff`
  mono, etc.
- `app/(dashboard)/history/page.tsx` empty-state `bg-white text-black`,
  `hover:bg-zinc-200`.
- Any `rgba(...,0,0,0,0.6)` heavy shadows.

---

## 5. Phase 2 — Screen layouts

Match the mockups, using the re-themed primitives. Keep Lucide icons throughout.

- **Login (`app/(auth)/login/page.tsx`)** — two-column split: left branding
  panel (serif "Genify" + "Prompt Studio", tagline, floating blob shapes),
  right form column ("Welcome back", email/password, **Forgot password?** link,
  terracotta Sign in, **"Or continue with" divider + Google/GitHub buttons**,
  "Create one" link). Preserve existing email/password sign-in + sign-up logic
  and error/notice states. Responsive: collapse to single column on mobile.
- **Dashboard (`app/(dashboard)/page.tsx`)** — serif hero ("Turn an idea into a
  shot-ready prompt."), accent eyebrow, warm generator card (idea textarea,
  3 format buttons, storyboard switch, terracotta Generate), warm result card
  (badge + "Generated blueprint" + Copy, serif markdown headings with
  terracotta accent bar, share CTA, refine input). All existing state/handlers
  and the signup wall stay.
- **History (`app/(dashboard)/history/page.tsx` + `PromptCard.tsx`)** — serif
  header, format filter pills, responsive grid. Cards gain the mockup's footer
  actions: **View** / **Share** / **Delete**. Per-format badge colors. Keep
  search + client filter + real delete (RLS-safe `.select()` check).
- **Gallery (`app/(public)/gallery/page.tsx` + `Leaderboard.tsx`,
  `SubmissionCard.tsx`, `SubmissionModal.tsx`)** — serif header, **stat row**
  (Total submissions / This month / Top creator), warm submission cards with
  hover lift, Approved badge, like count. Re-theme the existing
  `Leaderboard`/`SubmissionCard`/`SubmissionModal` rather than replacing them.
- **Submit (`app/(dashboard)/submit/page.tsx`)** — warm form: video link (+
  "YouTube/Vimeo/Runway only" hint), AI-model button grid, creator name/url,
  accent info note, terracotta Submit. Keep client + server URL validation via
  `app/lib/embed.ts` (single source of truth for allowed hosts).
- **Also re-theme (whole-app scope):** `(public)/layout.tsx` minimal shell,
  `(public)/prompt/[slugId]` SEO library pages + `CopyPromptButton`, `admin`
  moderation page, `SignupWall`, error boundaries.

---

## 6. Phase 3 — New functionality

### 6.1 Google/GitHub OAuth

- **Code:** add social buttons calling
  `supabase.auth.signInWithOAuth({ provider: 'google' | 'github', options: { redirectTo: <origin>/auth/callback } })`.
  Add a **`app/auth/callback/route.ts`** GET handler that calls
  `supabase.auth.exchangeCodeForSession(code)` and redirects to `/`. Use the
  server Supabase client (`app/lib/supabase-server.ts`).
- **`proxy.ts`:** allow `/auth/callback` (and `/login` already allowed) through
  unauthenticated so the code exchange can complete.
- **External config (USER — cannot be done in code):**
  1. Create a **Google Cloud OAuth 2.0 Client** (Web) and a **GitHub OAuth App**;
     set the authorized redirect URI to the Supabase callback
     (`https://<project>.supabase.co/auth/v1/callback`).
  2. In **Supabase → Authentication → Providers**, enable Google and GitHub and
     paste each client ID/secret.
  3. Add the app origin(s) to Supabase **Redirect URLs**.
  Buttons are inert until this is done — surface a friendly error if the provider
  is disabled.

### 6.2 Password reset

- **`app/(auth)/forgot-password/page.tsx`** — email field →
  `supabase.auth.resetPasswordForEmail(email, { redirectTo: <origin>/reset-password })`,
  confirmation notice.
- **`app/(auth)/reset-password/page.tsx`** — reached from the emailed link; new
  password field → `supabase.auth.updateUser({ password })`, then redirect to
  `/login`.
- Allow both routes through `proxy.ts`. Add the reset redirect URL to Supabase
  Redirect URLs (user config).

### 6.3 Gallery stats (real data)

- Compute **Total submissions** (count of `approved`), **This month** (approved
  with `submitted_at` in current month), **Top creator** (submitter with most
  approved submissions or highest summed `likes_count`). Prefer a small server
  query in the gallery page / `submissions.ts`; reuse/extend the existing
  `Leaderboard.tsx`. Respect RLS (anyone reads `approved`). No schema change
  expected; if a performant count needs an RPC, add a `security definer`
  function in `supabase/schema.sql`.

### 6.4 History "View" action

- **View** opens the full generated blueprint (reuse a modal like
  `SubmissionModal`, or expand in place). **Share** links to
  `/submit?promptId=<id>`. **Delete** keeps the existing RLS-safe deletion.

---

## 7. Accessibility & quality

- Verify text contrast on cream/white meets WCAG AA (muted/subtle on cream can
  be borderline — darken if needed).
- Keep focus-visible rings (accent), `aria-pressed` on format/model toggles,
  labels tied to inputs.
- Respect `prefers-reduced-motion` for float/fade/pattern animations.
- Keep the page from ever scrolling horizontally (width-cap decorative
  elements).

---

## 8. File change inventory

**Phase 1:** `app/globals.css`, `app/layout.tsx`, `app/components/ui/{Button,
Card,Field,Badge,Switch,Skeleton,Spinner}.tsx`, `app/components/layout/{sidebar,
AppShell,Brand}.tsx`, plus token-fix sweeps in the dashboard/history pages.

**Phase 2:** `app/(auth)/login/page.tsx`, `app/(dashboard)/page.tsx`,
`app/(dashboard)/history/page.tsx`, `app/components/shared/PromptCard.tsx`,
`app/(public)/gallery/page.tsx`, `app/components/gallery/{Leaderboard,
SubmissionCard,SubmissionModal}.tsx`, `app/(dashboard)/submit/page.tsx`,
`app/(public)/layout.tsx`, `app/(public)/prompt/[slugId]/page.tsx`,
`app/components/library/CopyPromptButton.tsx`, `app/(dashboard)/admin/page.tsx`,
`app/components/shared/SignupWall.tsx`.

**Phase 3:** new `app/auth/callback/route.ts`,
`app/(auth)/forgot-password/page.tsx`, `app/(auth)/reset-password/page.tsx`;
edits to `proxy.ts`, `app/(auth)/login/page.tsx` (social buttons),
`app/lib/submissions.ts` / gallery for stats; optional `supabase/schema.sql` RPC.

---

## 9. Risks

- **Non-stock Next.js 16** — read `node_modules/next/dist/docs/` before
  `next/font`, the route handler, and `proxy.ts` edits.
- **OAuth external dependency** — buttons don't work until the user configures
  providers in Supabase; must fail gracefully.
- **Light-mode contrast** — the warm muted grays can fail AA; validate.
- **Token reuse across public/SEO pages** — re-theming tokens changes those pages
  too; verify the library/prompt pages still read well.
- **No test suite** — verify by running `npm run dev` and driving each route +
  `npm run lint`.

---

## 10. Verification

For each phase: `npm run lint`, then `npm run dev` and drive every affected route
(login incl. social + forgot-password, dashboard generate/refine/storyboard,
history search/filter/view/share/delete, gallery + stats, submit validation,
public library, admin). Confirm no dark surfaces remain and no horizontal
scroll.
