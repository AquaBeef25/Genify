# Design: Public Prompt Library (SEO)

- **Date:** 2026-07-04
- **Status:** Approved (ready for implementation plan)
- **Author:** brainstormed with Claude Code
- **Growth lever:** Discovery — earn organic search traffic and funnel it into guest generation.

## Context & problem

Approved community `submissions` are already public (RLS policy *"Approved
submissions are public"* grants the anonymous role `select` on
`status = 'approved'`), and each row carries a rich, keyword-heavy
`prompt_text` plus an embedded video result. But **Google cannot see any of
it**: the gallery (`/gallery`) is fully client-rendered (`"use client"` +
`useEffect` fetch), individual results open in a **modal** (no per-item URLs),
and there is **no sitemap and no per-page metadata**. To a crawler, `/gallery`
is an empty shell.

This feature exposes that existing, already-moderated content as a crawlable,
indexable library, and points each page at the guest generator so search
traffic converts.

## Goal & success criteria

Make `/prompt/*` pages server-rendered and indexable, discoverable via sitemap,
and wired to a conversion CTA.

**Success:** `/prompt/*` pages enter Google's index; organic sessions rise;
prompt pages drive click-through to the generator (`/`).

## Decisions (locked during brainstorming)

| Decision | Choice |
| --- | --- |
| Content source | **Approved `submissions`** (reuse existing public, moderated rows) |
| URL structure | **`/prompt/<slug>-<uuid>`** — descriptive slug + full submission UUID |
| Page CTA | **Copy prompt** + **"Generate your own free"** (links to `/`, the guest generator) |
| SEO surface (v1) | Detail pages + server-rendered **`/prompt` index hub** + `sitemap.ts` + `robots.ts` |
| Rendering | **ISR**, `export const revalidate = 3600` (1 hour) |
| Gallery | **Left untouched** — cards→detail wiring deferred to v2 to avoid regressions |
| Canonical origin | new env **`NEXT_PUBLIC_SITE_URL`** (with a safe fallback) |

## Non-goals (YAGNI)

- No schema changes (reuse `submissions` as-is).
- No changes to the existing `/gallery` grid, modal, or likes (v2 may wire cards
  to detail pages and move likes onto the detail page).
- No per-platform category pages in v1 (`/prompt/<platform>` is a fast-follow).
- No like button on the detail page (detail pages are a read/copy/convert SEO
  surface; likes stay an authenticated gallery feature).
- No `generateStaticParams` / build-time prerender — ISR renders on demand and
  caches.

## Data & access

Source: `submissions where status = 'approved'`, readable by the anonymous role
via existing RLS. Fields used: `id`, `prompt_text`, `platform`, `model_version`,
`video_url`, `thumbnail_url`, `submitter_name`, `submitter_url`, `submitted_at`.

A new **anon read client** for server components/metadata routes
(`app/lib/supabase-server.ts`) is needed because the existing
`app/lib/supabase.ts` only exposes `createBrowserClient`. It uses the same URL +
publishable key, requires no session, and only ever reads approved rows.

## Routing (all server-rendered)

### `/prompt` — index hub (`app/(public)/prompt/page.tsx`)
Server component. Fetches recent approved submissions (cap ~100 for v1) and
renders each as a real `<a href>`/`<Link>` to its detail page. This is the crawl
entry point and internal-linking backbone. `export const revalidate = 3600`.

### `/prompt/[slugId]` — detail page (`app/(public)/prompt/[slugId]/page.tsx`)
- **URL:** `slugify(prompt_text) + "-" + <full submission UUID>`, e.g.
  `/prompt/a-cinematic-coffee-commercial-6f2a1b3c-7d8e-4f10-9a2b-1c2d3e4f5a6b`.
- **Resolution:** extract the trailing UUID with a fixed regex
  (`/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i`), then
  `.eq('id', uuid).eq('status','approved')` — an exact, indexed PK lookup (no
  collisions, no cast hacks). The slug is cosmetic.
- **Canonical:** always the computed slug for that row, so wrong-slug URLs with
  the right UUID dedupe cleanly.
- **Content:** the prompt text (rendered/monospace, copyable), the embedded
  video (reuse `app/lib/embed.ts` `parseVideoUrl` for a safe embed), platform +
  model badge, creator credit, the two CTAs, and JSON-LD.
- `export const revalidate = 3600`.

## SEO mechanics

- **`generateMetadata({ params })`** on the detail page: `title` = truncated
  prompt (~60 chars) + " · AI video prompt | Genify"; `description` = truncated
  `prompt_text`; `alternates.canonical` = absolute canonical URL;
  `openGraph` = { title, description, url, type: "article", images:
  [thumbnail_url ?? default] }; `twitter` = summary_large_image.
- **`app/sitemap.ts`** (`MetadataRoute.Sitemap`): static routes (`/`, `/gallery`,
  `/prompt`) + one entry per approved submission (`url` = canonical,
  `lastModified` = `submitted_at`). Absolute URLs from `NEXT_PUBLIC_SITE_URL`.
- **`app/robots.ts`** (`MetadataRoute.Robots`): `rules` allow `/` with
  `disallow: ['/admin', '/history', '/submit']`; `sitemap` points at
  `${SITE_URL}/sitemap.xml`.
- **JSON-LD** on the detail page: a `<script type="application/ld+json">` with a
  `VideoObject` (name, description, thumbnailUrl, embedUrl, uploadDate).
- **Canonical origin:** `NEXT_PUBLIC_SITE_URL` (e.g. `https://genify.app`), read
  by metadata + sitemap + robots. A module-level fallback constant
  (`http://localhost:3000`) plus a `console.warn` when unset keeps dev working.

## Page CTA

The detail page renders a **Copy prompt** button (client subcomponent
`app/components/library/CopyPromptButton.tsx`, since a server component can't do
`onClick`) and a prominent **"Generate your own free"** `<Link href="/">` — the
visitor lands directly in the generator.

## Files

| File | Change | Responsibility |
| --- | --- | --- |
| `app/lib/supabase-server.ts` | create | anon read client for server components/metadata |
| `app/lib/library.ts` | create | `slugify`, `buildPromptPath`, `parseSubmissionId`, `fetchApprovedSubmissions(limit)`, `fetchSubmissionById(id)`, `truncate` — single source of truth for slug/URL/data |
| `app/(public)/prompt/page.tsx` | create | server index hub |
| `app/(public)/prompt/[slugId]/page.tsx` | create | server detail page + `generateMetadata` + JSON-LD + CTAs |
| `app/components/library/CopyPromptButton.tsx` | create | client copy-to-clipboard control |
| `app/(public)/prompt/error.tsx` | create | error boundary for the section |
| `app/sitemap.ts` | create | sitemap of static routes + approved submissions |
| `app/robots.ts` | create | robots rules + sitemap pointer |
| `app/(public)/layout.tsx` | modify | add a "Prompt Library" nav link → `/prompt` |

## Error handling

- Unparseable slugId or no matching approved row → `notFound()` (404). Pending /
  rejected rows return nothing under RLS → also 404.
- Server fetch error inside a page → nearest `error.tsx` (added for the section).
- `sitemap.ts` / `robots.ts` fetch failure → return the static routes only
  (degrade gracefully; never throw a 500 for `/sitemap.xml`).
- `NEXT_PUBLIC_SITE_URL` unset → fallback constant + `console.warn`.

## Framework note

`generateMetadata`, `sitemap.ts`, and `robots.ts` are framework-level and this
is a modified Next `16.2.9` build. Per `AGENTS.md`, consult the bundled guides
before writing them:
- `node_modules/next/dist/docs/01-app/03-api-reference/04-functions/generate-metadata.md`
- `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/01-metadata/sitemap.md`
- `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/01-metadata/robots.md`

## Verification (no test suite — manual + curl, per CLAUDE.md)

Ensure at least one **approved** submission exists, then run `npm run lint` and
`npm run dev`:

1. `curl -s http://localhost:3000/prompt/<slug>-<uuid>` → the server HTML
   contains `<title>`, `<meta name="description">`, `<link rel="canonical">`,
   `og:*` tags, and the JSON-LD `<script>`. **This is the actual SEO proof** —
   the content must be in the server response, not injected by client JS.
2. `curl -s http://localhost:3000/prompt` → hub HTML contains `<a href="/prompt/...">`
   links to detail pages.
3. `curl -s http://localhost:3000/sitemap.xml` → includes the detail URL(s).
4. `curl -s http://localhost:3000/robots.txt` → allows crawling and references
   the sitemap.
5. A bad UUID (`/prompt/x-00000000-0000-0000-0000-000000000000`) → HTTP 404.
6. Everything works logged-out / in incognito (no session required).
