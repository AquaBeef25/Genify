# GenifyV3 Warm Re-theme Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the dark indigo/violet Genify theme with the warm, light,
editorial "GenifyV3" look across the whole app, then wire up the new mockup
elements (Google/GitHub sign-in, password reset, real gallery stats, history
card actions).

**Architecture:** Token-first. The app already routes all color through
semantic Tailwind v4 tokens (`bg-canvas`, `text-ink`, `text-accent`,
`border-line`, …) defined in `app/globals.css` `@theme`. Swapping those values +
fonts + the shared UI primitives re-skins ~80% of the app automatically; then
each screen's layout is updated to match the mockups; then the new features are
built. Sequential phases, each leaving a working app.

**Tech Stack:** Next.js 16.2.9 (App Router, **non-stock** — read
`node_modules/next/dist/docs/` before any framework-level change), React 19,
Tailwind CSS v4, `lucide-react`, `react-markdown`, Supabase
(`@supabase/ssr`), `next/font/google`.

**Design spec:** `docs/superpowers/specs/2026-07-06-genifyv3-retheme-design.md`
(read it — every task's visual intent comes from there).

## Global Constraints

- **Non-stock Next.js 16.2.9.** Before editing `app/layout.tsx` (`next/font`),
  creating `app/auth/callback/route.ts` (route handler), or editing `proxy.ts`,
  read the matching guide in `node_modules/next/dist/docs/`.
- **No test runner.** Verify every task with `npm run lint` (must pass with no
  new errors) **and** `npm run dev`, driving the affected route in a browser.
  Never add a `test` script.
- **Auth gate is `proxy.ts`** (repo root), not `middleware.ts`. It redirects
  logged-out visitors to `/login` for every route except the allow-list. New
  unauthenticated routes must be added there.
- **Env var names are non-standard:** anon key = `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`;
  Gemini key falls back to misspelled `GEMENI_API_KEY`; admin =
  `NEXT_PUBLIC_ADMIN_USER_ID`. Match existing names.
- **Design system first.** Build UI from `app/components/ui/` primitives and
  semantic tokens — never hand-rolled hex or `zinc-*`.
- **Keep token names identical** when re-theming `@theme`; only change values, so
  existing utilities keep working.
- **Icons:** Lucide, tinted with the accent — never emoji.
- **Palette (verbatim):** canvas `#fef9f3`, surface `#ffffff`, surface-2
  `#faf7f2`, elevated `#f2ebe3`, line `#e8dfd5`, line-strong `#dcd0c4`, ink
  `#3d3a37`, muted `#6b6159`, subtle `#9b8f87`, faint `#b8aaa0`, accent
  `#d97757`, accent-2 `#c16a4d`, accent-ink `#c16a4d`, success `#3f9d6b`, danger
  `#cc4b37`. Accent gradient = `linear-gradient(135deg, #d97757, #c16a4d)`.
  Page gradient = `linear-gradient(135deg,#fef9f3 0%,#f5f0eb 50%,#f0e8e0 100%)`.
- **Fonts:** Cormorant Garamond (serif) for headings/display, Inter for body/UI,
  Geist Mono retained for code.
- **Branch:** `feat/genifyv3-retheme` (already created; the spec is committed
  there). Commit after each task.

---

## Phase 1 — Theme foundation

Result after Phase 1: the entire app renders warm/light with every existing
feature intact, even before any per-screen layout work.

### Task 1: Load Cormorant Garamond + Inter fonts

**Files:**
- Modify: `app/layout.tsx`

**Interfaces:**
- Produces: CSS variables `--font-inter`, `--font-cormorant`, `--font-geist-mono`
  on `<html>`, consumed by `globals.css` (Task 2).

- [ ] **Step 1: Read the framework font guide**

Read `node_modules/next/dist/docs/` for the `next/font` guide (search for
`font` in that directory). Confirm `next/font/google` usage matches this build.

- [ ] **Step 2: Replace font imports in `app/layout.tsx`**

```tsx
import './globals.css';
import type { Metadata } from 'next';
import { Cormorant_Garamond, Inter, Geist_Mono } from 'next/font/google';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
});

const cormorant = Cormorant_Garamond({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-cormorant',
});

const geistMono = Geist_Mono({
  subsets: ['latin'],
  variable: '--font-geist-mono',
});

export const metadata: Metadata = {
  title: 'Genify — AI Video Prompt Generator',
  description:
    'Turn a short idea into a directed, production-ready AI-video prompt.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${cormorant.variable} ${geistMono.variable}`}
    >
      <body className="min-h-full antialiased">{children}</body>
    </html>
  );
}
```

- [ ] **Step 3: Verify**

Run `npm run lint` (expect: no new errors). The page will still look dark until
Task 2 — that's expected. Fonts don't visibly apply yet because `globals.css`
still maps `--font-sans` to Geist.

- [ ] **Step 4: Commit**

```bash
git add app/layout.tsx
git commit -m "feat(theme): load Cormorant Garamond + Inter fonts"
```

### Task 2: Swap design tokens to the warm palette

**Files:**
- Modify: `app/globals.css`

**Interfaces:**
- Consumes: font variables from Task 1.
- Produces: re-valued `@theme` tokens (same names), `.accent-gradient`,
  `.hero-glow`/`.hero-pattern`, `font-serif` utility — consumed by every screen
  and primitive.

- [ ] **Step 1: Rewrite `@theme` and base styles**

Replace the top of `app/globals.css` (the `@theme` block through `body`) with:

```css
@import "tailwindcss";

/* ------------------------------------------------------------------ *
 * Genify design tokens — warm & light, single terracotta accent.
 * Semantic names generate Tailwind utilities (bg-surface, text-muted,
 * border-line, text-accent, …); the accent is retunable from one place.
 * ------------------------------------------------------------------ */
@theme {
  --color-canvas: #fef9f3;
  --color-surface: #ffffff;
  --color-surface-2: #faf7f2;
  --color-elevated: #f2ebe3;

  --color-line: #e8dfd5;
  --color-line-strong: #dcd0c4;

  --color-ink: #3d3a37;
  --color-muted: #6b6159;
  --color-subtle: #9b8f87;
  --color-faint: #b8aaa0;

  --color-accent: #d97757;
  --color-accent-2: #c16a4d;
  --color-accent-ink: #c16a4d;

  --color-success: #3f9d6b;
  --color-danger: #cc4b37;
}

@theme inline {
  --font-sans: var(--font-inter);
  --font-serif: var(--font-cormorant);
  --font-mono: var(--font-geist-mono);
}

:root {
  color-scheme: light;
}

body {
  background: linear-gradient(135deg, #fef9f3 0%, #f5f0eb 50%, #f0e8e0 100%);
  background-attachment: fixed;
  color: var(--color-ink);
  font-family: var(--font-inter), ui-sans-serif, system-ui, -apple-system,
    "Segoe UI", sans-serif;
}
```

- [ ] **Step 2: Update `.accent-gradient` and the hero decoration**

Replace the `.accent-gradient` and `.hero-glow` blocks with:

```css
/* Reusable gradient for the brand mark / accent surfaces. */
.accent-gradient {
  background-image: linear-gradient(135deg, #d97757, #c16a4d);
}

/* Soft terracotta wash behind heroes. Width-capped so it never causes
 * horizontal scroll. */
.hero-glow::before {
  content: "";
  position: absolute;
  left: 50%;
  top: -70px;
  transform: translateX(-50%);
  width: min(360px, 90%);
  height: 220px;
  background: radial-gradient(
    closest-side,
    rgba(217, 119, 87, 0.12),
    transparent
  );
  pointer-events: none;
  z-index: 0;
}
```

Leave the `fade-rise`/`animate-rise`, `scrollbar-thin`, and reduced-motion
blocks in place (retune the scrollbar thumb to `var(--color-line-strong)` —
already token-based, so no change needed).

- [ ] **Step 3: Verify**

Run `npm run lint`. Then `npm run dev` and open `/login` and `/` (log in). The
whole app should now be cream/white with terracotta accents and Inter body text.
Known rough edges to fix in later tasks: the primary button is still white
(Task 3), and headings aren't serif yet (applied per-screen). No dark surfaces
should remain.

- [ ] **Step 4: Commit**

```bash
git add app/globals.css
git commit -m "feat(theme): swap design tokens to warm/light terracotta palette"
```

### Task 3: Re-theme the Button primitive

**Files:**
- Modify: `app/components/ui/Button.tsx`

**Interfaces:**
- Produces: `Button` with variants `primary` (terracotta gradient), `accent`
  (terracotta gradient), `secondary` (bordered), `ghost` (subtle) — consumed by
  every screen. Signature unchanged: `variant`, `size`, `loading`.

- [ ] **Step 1: Rewrite the variant map**

Replace the `variants` constant in `app/components/ui/Button.tsx` with:

```tsx
const variants: Record<Variant, string> = {
  // Terracotta gradient is the primary action color (warm & light).
  primary:
    'accent-gradient text-white shadow-sm hover:brightness-105 disabled:opacity-50 disabled:hover:brightness-100',
  // Same gradient for secondary-emphasis actions (Refine, etc.).
  accent:
    'accent-gradient text-white hover:brightness-105 disabled:opacity-50 disabled:hover:brightness-100',
  secondary:
    'border border-line bg-transparent text-muted hover:border-line-strong hover:bg-surface-2 hover:text-ink disabled:opacity-50',
  ghost:
    'border border-line bg-transparent text-muted hover:bg-surface-2 hover:text-ink disabled:opacity-50',
};
```

(Leave `base`, `sizes`, and the component body unchanged.)

- [ ] **Step 2: Verify**

Run `npm run lint`. Then `npm run dev` → `/`: the **Generate prompt** button is a
terracotta gradient, **Refine** is the gradient, **Copy** is a subtle bordered
ghost button. Loading spinner still shows.

- [ ] **Step 3: Commit**

```bash
git add app/components/ui/Button.tsx
git commit -m "feat(theme): terracotta gradient primary/accent buttons"
```

### Task 4: Re-theme Card, Field, Badge, Switch, Skeleton, Spinner

**Files:**
- Modify: `app/components/ui/Card.tsx`
- Modify: `app/components/ui/Field.tsx`
- Modify: `app/components/ui/Badge.tsx`
- Modify: `app/components/ui/Switch.tsx`
- Modify: `app/components/ui/Skeleton.tsx`
- Modify: `app/components/ui/Spinner.tsx`

**Interfaces:**
- Consumes: warm tokens (Task 2).
- Produces: `Badge` gains an optional `tone` / `className` override for
  per-format colors (History, Task 9). Confirm the exact prop by reading
  `Badge.tsx` first; if it already forwards `className`, no API change is needed.

- [ ] **Step 1: Card — white fill + soft light shadow**

In `app/components/ui/Card.tsx`, replace the class string with:

```tsx
'rounded-2xl border border-line bg-surface shadow-[0_2px_8px_rgba(0,0,0,0.04)]',
```

- [ ] **Step 2: Field — warm input fill + accent focus**

In `app/components/ui/Field.tsx`, replace `controlBase` with:

```tsx
const controlBase =
  'w-full rounded-lg border border-line bg-surface-2 px-3.5 py-3 text-sm text-ink placeholder:text-faint transition-colors focus:outline-none focus:border-accent focus:bg-surface focus:ring-2 focus:ring-accent/15';
```

(Label already uses `text-subtle` uppercase — keep.)

- [ ] **Step 3: Read Badge, Switch, Skeleton, Spinner and retune for light bg**

Read each file. Apply:
- **Badge:** ensure the pill uses `bg-accent/10 border-accent/30 text-accent-ink`;
  ensure `className` is merged last so callers can override the color (needed for
  History per-format tints). If it doesn't forward `className`, add it via `cn`.
- **Switch:** off track `bg-elevated border-line-strong`; on track
  `accent-gradient`; thumb white when on, `bg-subtle` when off.
- **Skeleton:** shimmer base `bg-elevated` (was a dark surface).
- **Spinner:** stroke uses `currentColor` (inherits button text) — verify it
  reads on the gradient button; no change if already `currentColor`.

- [ ] **Step 4: Verify**

Run `npm run lint`. Then `npm run dev` → `/`: input fields are cream with a
terracotta focus ring; the storyboard switch turns terracotta; the loading
skeleton is a light shimmer.

- [ ] **Step 5: Commit**

```bash
git add app/components/ui/
git commit -m "feat(theme): re-theme Card, Field, Badge, Switch, Skeleton, Spinner for light mode"
```

### Task 5: Re-theme Sidebar, AppShell, Brand

**Files:**
- Modify: `app/components/layout/sidebar.tsx`
- Modify: `app/components/layout/AppShell.tsx`
- Modify: `app/components/layout/Brand.tsx`

**Interfaces:**
- Consumes: warm tokens, `accent-gradient`, `font-serif`.
- Produces: the warm app chrome used by the `(dashboard)` layout.

- [ ] **Step 1: Sidebar — cream panel, 280px, terracotta active state**

In `app/components/layout/sidebar.tsx`:
- Change the `<aside>` class from `w-64 ... bg-canvas` to
  `w-[280px] ... bg-surface-2` (keep `border-r border-line`, flex column, padding).
- Active nav item: keep `border-accent/30 bg-accent/10` but change active text
  from `text-white` to `text-ink`; active icon stays `text-accent`.
- Inactive item hover: `hover:bg-surface hover:text-ink` (already token-based).
- User block: `border-line bg-surface`; avatar keeps `accent-gradient text-white`.
- Icons stay Lucide (already are).

- [ ] **Step 2: AppShell — recolor the mobile frame**

Read `app/components/layout/AppShell.tsx`. Replace any dark surfaces
(`bg-canvas`/`bg-surface` top bar, borders) so the mobile top bar + slide-over
use `bg-surface-2`/`border-line` and the slide-over backdrop is a warm
translucent (`bg-black/20` is fine on light). Keep all responsive behavior and
the menu toggle.

- [ ] **Step 3: Brand — serif wordmark**

Read `app/components/layout/Brand.tsx`. Ensure the wordmark "Genify" renders in
`font-serif` and the mark box uses `accent-gradient`. Add the "Prompt Studio"
caption (`text-subtle uppercase tracking-wider text-[11px]`) to match the
mockups if the layout allows.

- [ ] **Step 4: Verify**

Run `npm run lint`. Then `npm run dev` → `/`: cream sidebar, terracotta-tinted
active link, serif "Genify" wordmark. Resize to mobile → the slide-over is warm.

- [ ] **Step 5: Commit**

```bash
git add app/components/layout/
git commit -m "feat(theme): warm sidebar, app shell, and serif brand"
```

### Task 6: Fix hardcoded dark colors on dashboard + history

**Files:**
- Modify: `app/(dashboard)/page.tsx` (markdown components block, ~lines 35-72)
- Modify: `app/(dashboard)/history/page.tsx` (empty-state block, ~lines 163-181)

**Interfaces:**
- Consumes: warm tokens.

- [ ] **Step 1: Replace `zinc-*` and literal hex in the markdown renderer**

In `app/(dashboard)/page.tsx` `markdownComponents`, replace dark literals with
tokens:
- `text-zinc-300` → `text-muted` (paragraph and list text).
- The code/pre color `#d6d3ff` and canvas bg → use `text-accent-ink` (or
  `#5b4636`) on `bg-surface-2 border-line border-l-accent`.
- Keep the `accent-gradient` heading bar and `bg-accent` list bullet (now
  terracotta automatically).

- [ ] **Step 2: Replace the history empty-state button**

In `app/(dashboard)/history/page.tsx`, change the "Create a prompt" link from
`bg-white text-black hover:bg-zinc-200` to the accent gradient:
`accent-gradient text-white hover:brightness-105`.

- [ ] **Step 3: Verify**

Run `npm run lint`. Then `npm run dev`: generate a prompt on `/` — markdown
renders in warm ink with a terracotta heading bar and bullets. Visit `/history`
with no prompts — the empty-state CTA is terracotta.

- [ ] **Step 4: Commit**

```bash
git add app/\(dashboard\)/page.tsx app/\(dashboard\)/history/page.tsx
git commit -m "feat(theme): replace hardcoded dark colors with tokens on dashboard/history"
```

**End of Phase 1: run `npm run dev`, click through `/login`, `/`, `/history`,
`/gallery`, `/submit`. No dark surfaces, no horizontal scroll, all features
work. Commit any stray fixes.**

---

## Phase 2 — Screen layouts

Match the mockup layouts using the now-warm primitives. Reference the design
spec §5 and the source `.dc.html` files for exact structure.

### Task 7: Login — two-column split layout

**Files:**
- Modify: `app/(auth)/login/page.tsx`

**Interfaces:**
- Consumes: `Card`, `Button`, `Field`. Keeps existing handlers `handleSignIn`,
  `handleSignUp`, and state (`email`, `password`, `error`, `notice`, `loading`).
- Produces: placeholder social buttons + "Forgot password?" link, wired in
  Phase 3 (Tasks 13-14). For now the social buttons are disabled/no-op and the
  link points to `/forgot-password` (route created in Task 14).

- [ ] **Step 1: Rebuild the layout as a two-column split**

Replace the returned JSX with a two-column flex: left branding panel
(`hidden md:flex`, cream gradient, serif "Genify" + "Prompt Studio", the tagline
"Turn ideas into videos with AI prompts", floating blob decoration with
`prefers-reduced-motion` respected), right form column (centered, `max-w-[380px]`).
Keep the form fields bound to existing state. Add:
- "Welcome back" serif `h1` + "Sign in to continue creating" subtitle.
- A **Forgot password?** `Link` to `/forgot-password` (right-aligned).
- Existing **Sign in** (primary) and keep **Create account** as the sign-up path
  (secondary), preserving both handlers and the error/notice blocks (use
  `text-danger`/`text-success` token classes).
- An "Or continue with" divider + two **secondary** buttons labeled Google and
  GitHub with Lucide icons — `onClick` left as a stub `handleOAuth('google'|'github')`
  that currently does nothing (implemented in Task 13). Render them
  `disabled`-styled with a `title="Coming soon"` until Task 13.

Full mobile behavior: single column, branding panel hidden.

- [ ] **Step 2: Verify**

Run `npm run lint`. Then `npm run dev` → `/login`: two-column on desktop, single
on mobile; email/password sign-in and sign-up still work; the branding panel and
serif type match the mockup. Social buttons are visible but inert.

- [ ] **Step 3: Commit**

```bash
git add app/\(auth\)/login/page.tsx
git commit -m "feat(login): two-column split layout with social + forgot-password affordances"
```

### Task 8: Dashboard — serif hero + warm generator/result cards

**Files:**
- Modify: `app/(dashboard)/page.tsx`

**Interfaces:**
- Consumes: warm primitives. Keeps all state/handlers (`handleGenerate`,
  `handleRefine`, `handleCopy`, signup wall).

- [ ] **Step 1: Apply serif + warm structure**

- Hero: add `font-serif` to the `h1`, keep the accent eyebrow (Lucide `Sparkles`
  in `text-accent`), keep copy.
- Generator card + result card already use `Card` — they inherit the warm look.
  Add `font-serif` to result markdown `h2`/`h3` headings in `markdownComponents`
  (headings only; body stays Inter).
- Format buttons: active state `border-accent bg-accent/10 text-ink` (already
  close; verify against Task 2 tokens).
- Keep the share CTA and refine input; ensure their accent classes read on light.

- [ ] **Step 2: Verify**

Run `npm run lint`. Then `npm run dev` → `/`: serif hero, warm cards, generate +
refine + copy + storyboard + signup wall all work; markdown headings are serif
with a terracotta bar.

- [ ] **Step 3: Commit**

```bash
git add app/\(dashboard\)/page.tsx
git commit -m "feat(dashboard): serif hero and warm generator/result styling"
```

### Task 9: History — serif header, per-format badges, View/Share/Delete cards

**Files:**
- Modify: `app/(dashboard)/history/page.tsx`
- Modify: `app/components/shared/PromptCard.tsx`

**Interfaces:**
- Consumes: `Badge` `className` override (Task 4), `Card`.
- Produces: `PromptCard` with a footer of View / Share / Delete actions. `View`
  opens a modal (reuse the pattern in `app/components/gallery/SubmissionModal.tsx`
  — read it first) or expands inline; `Share` is a `Link` to
  `/submit?promptId=<id>`; `Delete` calls the existing `onDelete(id)`.

- [ ] **Step 1: History header + filter pills**

In `app/(dashboard)/history/page.tsx`: add `font-serif` to the `h1`; keep the
search input (retune to warm tokens if it hardcodes anything) and the format
filter pills (active `border-accent/30 bg-accent/10 text-accent-ink`).

- [ ] **Step 2: PromptCard — footer actions + per-format badge color**

Read `app/components/shared/PromptCard.tsx`. Restructure to the mockup card:
header (badge + date), body preview (`line-clamp-2`), footer with three buttons.
Map format → badge tint via a lookup:

```tsx
const FORMAT_TONE: Record<string, string> = {
  tiktok: 'bg-accent/10 border-accent/30 text-accent-ink',
  youtube: 'bg-[#6496c8]/12 border-[#6496c8]/30 text-[#4f7ba8]',
  commercial: 'bg-[#9678b4]/12 border-[#9678b4]/30 text-[#7a5f9a]',
};
```

Footer:
- **View** (secondary) → opens the modal/expand with the full `generated_result`
  rendered via `react-markdown` (reuse `markdownComponents` — consider extracting
  them to a shared module if duplicated; otherwise inline a minimal renderer).
- **Share** (ghost, `text-accent-ink`) → `Link` to `/submit?promptId={prompt.id}`.
- **Delete** (icon-only, Lucide `Trash2`, `hover:text-danger`) → `onDelete`.

- [ ] **Step 3: Verify**

Run `npm run lint`. Then `npm run dev` → `/history`: cards show colored per-format
badges, View opens the full prompt, Share links to submit prefilled, Delete still
removes the row (RLS-safe). Search + filter still work.

- [ ] **Step 4: Commit**

```bash
git add app/\(dashboard\)/history/page.tsx app/components/shared/PromptCard.tsx
git commit -m "feat(history): serif header, per-format badges, View/Share/Delete card actions"
```

### Task 10: Gallery + Submit — warm layouts

**Files:**
- Modify: `app/(public)/gallery/page.tsx`
- Modify: `app/components/gallery/SubmissionCard.tsx`
- Modify: `app/components/gallery/SubmissionModal.tsx`
- Modify: `app/components/gallery/Leaderboard.tsx`
- Modify: `app/(public)/layout.tsx`
- Modify: `app/(dashboard)/submit/page.tsx`

**Interfaces:**
- Consumes: warm primitives. The Leaderboard **stat data** is wired in Task 12;
  this task only re-themes the components (stat cards may show existing/placeholder
  data until Task 12).

- [ ] **Step 1: Gallery page + public layout**

Read `app/(public)/layout.tsx` and `app/(public)/gallery/page.tsx`. Recolor the
minimal public shell to warm tokens. Add a serif `h1` ("Prompts in action") +
accent eyebrow. Keep the `(public)` architecture (do NOT move gallery into the
dashboard sidebar — spec §1 non-goal).

- [ ] **Step 2: SubmissionCard + SubmissionModal**

Read both. Apply: white card, `border-line`, radius `16px`, hover lift
(`hover:border-accent hover:shadow-[0_4px_16px_rgba(217,119,87,0.1)]`), Approved
badge as accent pill, like count with Lucide `Heart`. Modal chrome → warm.

- [ ] **Step 3: Leaderboard stat cards**

Read `app/components/gallery/Leaderboard.tsx`. Re-theme the stat cards (white,
`border-line`, serif `32px` accent number, faint uppercase label). Leave the data
source as-is for now (Task 12 makes it real if it isn't already).

- [ ] **Step 4: Submit form**

In `app/(dashboard)/submit/page.tsx`: warm form card, uppercase labels, the
AI-model button grid (active = `border-accent bg-accent/10`), the accent info
note (`bg-accent/6 border-l-accent`), terracotta submit. Keep client validation
and the server validation via `app/lib/embed.ts` untouched.

- [ ] **Step 5: Verify**

Run `npm run lint`. Then `npm run dev`: `/gallery` (logged out too) renders warm
with stat cards + submission grid; `/submit` matches the mockup and still
validates URLs. Open a submission modal.

- [ ] **Step 6: Commit**

```bash
git add app/\(public\)/ app/components/gallery/ app/\(dashboard\)/submit/page.tsx
git commit -m "feat(gallery,submit): warm layouts for gallery, cards, modal, leaderboard, submit form"
```

### Task 11: Re-theme remaining surfaces (library, prompt pages, admin, signup wall, errors)

**Files:**
- Modify: `app/(public)/prompt/[slugId]/page.tsx`
- Modify: `app/(public)/prompt/page.tsx`
- Modify: `app/(public)/prompt/error.tsx`
- Modify: `app/components/library/CopyPromptButton.tsx`
- Modify: `app/(dashboard)/admin/page.tsx`
- Modify: `app/components/shared/SignupWall.tsx`
- Modify: `app/(dashboard)/history/error.tsx`

**Interfaces:**
- Consumes: warm tokens/primitives.

- [ ] **Step 1: Sweep each file for dark literals**

Read each file. Replace any `zinc-*`, dark hex, `text-white`-on-dark, or
`bg-black`-style classes with semantic tokens. Add `font-serif` to page-level
headings. These are read-mostly SEO/admin surfaces — keep structure, swap color.

- [ ] **Step 2: Verify**

Run `npm run lint`. Then `npm run dev`: visit a `/prompt/<slugId>` library page,
`/admin` (as admin), trigger the signup wall as a guest, and force a history
error — all render warm with no dark remnants.

- [ ] **Step 3: Commit**

```bash
git add app/\(public\)/prompt/ app/components/library/ app/\(dashboard\)/admin/page.tsx app/components/shared/SignupWall.tsx app/\(dashboard\)/history/error.tsx
git commit -m "feat(theme): re-theme library, prompt, admin, signup wall, and error surfaces"
```

**End of Phase 2: every route matches the warm mockups. Full click-through +
`npm run lint`.**

---

## Phase 3 — New functionality

### Task 12: Real gallery stats

**Files:**
- Modify: `app/lib/submissions.ts` (add stat query helper)
- Modify: `app/components/gallery/Leaderboard.tsx` (consume real stats)
- Modify: `app/(public)/gallery/page.tsx` (fetch + pass stats) — only if the page
  is where data is loaded; confirm by reading it.

**Interfaces:**
- Produces: `getGalleryStats()` returning
  `{ total: number; thisMonth: number; topCreator: string | null }`.

- [ ] **Step 1: Read current data flow**

Read `app/lib/submissions.ts`, `app/components/gallery/Leaderboard.tsx`, and
`app/(public)/gallery/page.tsx` to see how approved submissions are already
fetched (Leaderboard may already compute some of this).

- [ ] **Step 2: Add `getGalleryStats()`**

In `app/lib/submissions.ts`, add a function that queries `approved` submissions:
- `total` = count of approved.
- `thisMonth` = count of approved with `submitted_at >= start-of-current-month`.
- `topCreator` = `submitter_name` (or `@handle`) with the most approved
  submissions (or highest summed `likes_count`) — pick most approved for
  simplicity; tie-break by likes.

Use the server Supabase client (`app/lib/supabase-server.ts`). Respect RLS
(anyone reads approved). Prefer a single `select` with `count` where possible; if
counts need an RPC for performance, add a `security definer` SQL function to
`supabase/schema.sql` and document running it.

- [ ] **Step 3: Wire Leaderboard to real data**

Pass the stats into `Leaderboard` and render them in the three stat cards
(Total submissions / This month / Top creator). Handle the empty state
(`topCreator` null → "—").

- [ ] **Step 4: Verify**

Run `npm run lint`. Then `npm run dev` → `/gallery`: the three numbers reflect
actual approved rows (seed a couple via `/submit` + approve in `/admin` if empty).

- [ ] **Step 5: Commit**

```bash
git add app/lib/submissions.ts app/components/gallery/ app/\(public\)/gallery/page.tsx supabase/schema.sql
git commit -m "feat(gallery): real leaderboard stats (total, this month, top creator)"
```

### Task 13: Google/GitHub OAuth sign-in

**Files:**
- Create: `app/auth/callback/route.ts`
- Modify: `proxy.ts` (allow `/auth/callback`)
- Modify: `app/(auth)/login/page.tsx` (implement `handleOAuth`)
- Modify: `app/lib/supabase.ts` (only if a helper is needed — likely not)

**Interfaces:**
- Consumes: browser Supabase client (`createClient`) for `signInWithOAuth`;
  server client (`supabase-server.ts`) for the callback exchange.

- [ ] **Step 1: Read the framework route-handler guide**

Read `node_modules/next/dist/docs/` for the Route Handlers / `proxy` guides
before creating the handler and editing `proxy.ts`.

- [ ] **Step 2: Add the callback route handler**

Create `app/auth/callback/route.ts`:

```ts
import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/app/lib/supabase-server'; // match the file's actual export

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/';

  if (code) {
    const supabase = await createServerClient(); // match actual signature
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(`${origin}${next}`);
  }
  return NextResponse.redirect(`${origin}/login?error=oauth`);
}
```

Read `app/lib/supabase-server.ts` first and match its real export name and
async-ness (do not guess — adjust the import/call accordingly).

- [ ] **Step 3: Allow `/auth/callback` in `proxy.ts`**

Read `proxy.ts`. Add `/auth/callback` to the same allow-list that already exempts
`/login`, so the unauthenticated code exchange isn't redirected.

- [ ] **Step 4: Implement `handleOAuth` in login**

In `app/(auth)/login/page.tsx`, enable the Google/GitHub buttons:

```tsx
const handleOAuth = async (provider: 'google' | 'github') => {
  const { error } = await supabase.auth.signInWithOAuth({
    provider,
    options: { redirectTo: `${window.location.origin}/auth/callback` },
  });
  if (error) setError(error.message);
};
```

Remove the disabled/`title="Coming soon"` state from Task 7.

- [ ] **Step 5: Verify (code path) + document external setup**

Run `npm run lint`. `npm run dev` → clicking Google/GitHub should redirect to the
provider (or return a clear Supabase "provider not enabled" error if unconfigured
— that's expected until the user finishes setup). Add a short `## OAuth setup`
section to `CLAUDE.md` (or a new `docs/oauth-setup.md`) with the exact steps:
create Google Cloud OAuth client + GitHub OAuth app, set redirect URI to
`https://<project>.supabase.co/auth/v1/callback`, enable providers in Supabase
with client id/secret, add app origin(s) to Supabase Redirect URLs.

- [ ] **Step 6: Commit**

```bash
git add app/auth/callback/route.ts proxy.ts app/\(auth\)/login/page.tsx docs/oauth-setup.md CLAUDE.md
git commit -m "feat(auth): Google/GitHub OAuth sign-in with callback route"
```

### Task 14: Password reset flow

**Files:**
- Create: `app/(auth)/forgot-password/page.tsx`
- Create: `app/(auth)/reset-password/page.tsx`
- Modify: `proxy.ts` (allow both routes)

**Interfaces:**
- Consumes: browser Supabase client `resetPasswordForEmail`, `updateUser`.

- [ ] **Step 1: Forgot-password page**

Create `app/(auth)/forgot-password/page.tsx` — a client component matching the
login styling: email field → on submit
`supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/reset-password` })`,
then show a "Check your email" notice. Include a back-to-login link.

- [ ] **Step 2: Reset-password page**

Create `app/(auth)/reset-password/page.tsx` — reached from the emailed link
(Supabase sets a recovery session). New-password + confirm fields → on submit
`supabase.auth.updateUser({ password })`, then redirect to `/login` with a
success notice. Guard against mismatched passwords client-side.

- [ ] **Step 3: Allow both routes in `proxy.ts`**

Add `/forgot-password` and `/reset-password` to the `proxy.ts` allow-list (a
logged-out user must reach them).

- [ ] **Step 4: Verify**

Run `npm run lint`. `npm run dev` → `/login` → **Forgot password?** → submit an
email → confirm the notice. (Full email round-trip needs the Supabase redirect
URL configured — note it in `docs/oauth-setup.md`.)

- [ ] **Step 5: Commit**

```bash
git add app/\(auth\)/forgot-password/page.tsx app/\(auth\)/reset-password/page.tsx proxy.ts
git commit -m "feat(auth): forgot-password and reset-password flow"
```

**End of Phase 3: OAuth + reset code paths in place (pending the user's Supabase
provider config), gallery stats live, history actions complete.**

---

## Self-Review Notes (author)

- **Spec coverage:** Phase 1 = spec §4 (tokens/fonts/primitives/chrome + dark-color
  sweep). Phase 2 = spec §5 (all screens incl. library/admin/errors, Task 11).
  Phase 3 = spec §6 (OAuth 6.1, reset 6.2, stats 6.3, history View 6.4 — View is
  in Task 9). Icons = Lucide (Global Constraints). Non-goal (don't move gallery)
  honored in Task 10.
- **External dependency:** OAuth/reset need the user's Supabase config — captured
  as documentation steps in Task 13/14, not code that can complete alone.
- **Type consistency:** `getGalleryStats()` shape defined once (Task 12);
  `handleOAuth('google'|'github')` stubbed in Task 7, implemented in Task 13;
  `FORMAT_TONE` keys match the app's format values (`tiktok`/`youtube`/`commercial`).
- **Framework caution:** Tasks touching `next/font`, route handlers, and `proxy.ts`
  each begin by reading `node_modules/next/dist/docs/`.
- **Verification:** no test runner — every task ends with `npm run lint` + a
  concrete in-app check (per CLAUDE.md).
