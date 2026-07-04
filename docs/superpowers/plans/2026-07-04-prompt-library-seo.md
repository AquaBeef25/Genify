# Public Prompt Library (SEO) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Server-render approved community submissions as indexable `/prompt/<slug>-<uuid>` pages (with metadata, JSON-LD, a `/prompt` hub, sitemap and robots) that funnel visitors into the guest generator.

**Architecture:** A read-only anon Supabase client + a `library.ts` helper module (slug/URL/data logic) power new **server components** under `app/(public)/prompt/`. Detail pages resolve a submission by the UUID embedded in the URL, emit full SEO `<head>` tags via `generateMetadata` and a `VideoObject` JSON-LD script, and cache with ISR (`revalidate = 3600`). `sitemap.ts` + `robots.ts` expose the URLs to crawlers; the existing `/gallery` is untouched.

**Tech Stack:** Next.js `16.2.9` (App Router, modified build) · React `19.2.4` (`cache`) · Tailwind CSS v4 · `@supabase/supabase-js` · `lucide-react`.

## Global Constraints

- **Modified Next.js `16.2.9`** — APIs confirmed against the bundled docs: `generateMetadata`/page `params` are a **`Promise`** you must `await` (`generate-metadata.md`); `sitemap.ts` exports a default fn returning `MetadataRoute.Sitemap` (may be async); `robots.ts` returns `MetadataRoute.Robots`. Metadata/JSON-LD only work in **Server Components**.
- **No test suite** — do NOT add a `test` script. Verify with `npm run lint` + `curl` against `npm run dev`. The SEO proof is that tags appear in the **server HTML** (`curl`, not browser DevTools).
- **No schema changes** — read `submissions where status = 'approved'` (already public via RLS).
- **Env var names are non-standard** — Supabase URL/key are `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. New: `NEXT_PUBLIC_SITE_URL` (canonical origin), with fallback `http://localhost:3000`.
- **URL contract:** `/prompt/<slugify(prompt_text)>-<full submission UUID>`; resolve by extracting the trailing UUID (regex `[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$`) and `.eq('id', uuid).eq('status','approved')`.
- **CTA copy:** "Copy prompt" + "Generate your own free" (links to `/`).
- **Gallery is left untouched** — no edits to `app/(public)/gallery/page.tsx` or the gallery components.

---

## File Structure

- `app/lib/supabase-server.ts` — **create.** `createPublicServerClient()`: anon, read-only client.
- `app/lib/library.ts` — **create.** Single source of truth: `SITE_URL`, `slugify`, `buildPromptPath`, `buildPromptUrl`, `parseSubmissionId`, `truncate`, `fetchApprovedSubmissions`, `fetchSubmissionById` (React-`cache`d).
- `app/components/library/CopyPromptButton.tsx` — **create.** Client copy control.
- `app/(public)/prompt/[slugId]/page.tsx` — **create.** Server detail page + `generateMetadata` + JSON-LD + CTAs.
- `app/(public)/prompt/error.tsx` — **create.** Section error boundary.
- `app/(public)/prompt/page.tsx` — **create.** Server index hub.
- `app/sitemap.ts` — **create.** Static routes + approved submissions.
- `app/robots.ts` — **create.** Allow crawl, disallow private routes, point at sitemap.
- `app/(public)/layout.tsx` — **modify.** Add a "Prompt Library" nav link.

---

### Task 1: Foundation — anon read client + library helpers

**Files:**
- Create: `app/lib/supabase-server.ts`
- Create: `app/lib/library.ts`

**Interfaces:**
- Consumes: `Submission` type from `app/lib/submissions.ts`; `createClient` from `@supabase/supabase-js`; `cache` from `react`.
- Produces (used by every later task):
  - `createPublicServerClient(): SupabaseClient`
  - `SITE_URL: string`
  - `slugify(text: string): string`
  - `buildPromptPath(s: Pick<Submission,"id"|"prompt_text">): string`
  - `buildPromptUrl(s: Pick<Submission,"id"|"prompt_text">): string`
  - `parseSubmissionId(slugId: string): string | null`
  - `truncate(text: string, max: number): string`
  - `fetchApprovedSubmissions(limit?: number): Promise<Submission[]>`
  - `fetchSubmissionById(id: string): Promise<Submission | null>` (React-`cache`d)

- [ ] **Step 1: Confirm `@supabase/supabase-js` is installed**

Run: `node -e "require.resolve('@supabase/supabase-js'); console.log('ok')"`
Expected: prints `ok`. (It's listed in the project's tech stack; if this fails, stop and ask.)

- [ ] **Step 2: Create `app/lib/supabase-server.ts`**

```ts
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
```

- [ ] **Step 3: Create `app/lib/library.ts`**

```ts
import { cache } from "react";
import { createPublicServerClient } from "./supabase-server";
import type { Submission } from "./submissions";

// Canonical site origin for metadata, sitemap and robots. Trailing slashes
// trimmed so we can safely concatenate paths.
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"
).replace(/\/+$/, "");

// A submission id is a UUID; it forms the resolvable tail of the URL.
const UUID = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";

// Turn free text into a short, URL-safe slug (the cosmetic part of the path).
export function slugify(text: string): string {
  const slug = text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60)
    .replace(/-+$/g, "");
  return slug || "prompt";
}

// Canonical path for a submission's public page: /prompt/<slug>-<uuid>.
export function buildPromptPath(
  s: Pick<Submission, "id" | "prompt_text">
): string {
  return `/prompt/${slugify(s.prompt_text)}-${s.id}`;
}

// Absolute canonical URL for a submission.
export function buildPromptUrl(
  s: Pick<Submission, "id" | "prompt_text">
): string {
  return `${SITE_URL}${buildPromptPath(s)}`;
}

// Pull the trailing submission UUID out of a `<slug>-<uuid>` route param.
export function parseSubmissionId(slugId: string): string | null {
  const match = slugId.match(new RegExp(`${UUID}$`, "i"));
  return match ? match[0].toLowerCase() : null;
}

// Collapse whitespace and hard-cap length (for titles/descriptions).
export function truncate(text: string, max: number): string {
  const clean = text.replace(/\s+/g, " ").trim();
  return clean.length <= max ? clean : `${clean.slice(0, max - 1).trimEnd()}…`;
}

// Recent approved submissions, newest first (index hub + sitemap).
export async function fetchApprovedSubmissions(
  limit = 100
): Promise<Submission[]> {
  const supabase = createPublicServerClient();
  const { data, error } = await supabase
    .from("submissions")
    .select("*")
    .eq("status", "approved")
    .order("submitted_at", { ascending: false })
    .limit(limit);
  if (error) {
    console.error("fetchApprovedSubmissions failed:", error.message);
    return [];
  }
  return (data ?? []) as Submission[];
}

// A single approved submission by id. Wrapped in React cache() so the detail
// page and its generateMetadata share ONE query per request.
export const fetchSubmissionById = cache(
  async (id: string): Promise<Submission | null> => {
    const supabase = createPublicServerClient();
    const { data, error } = await supabase
      .from("submissions")
      .select("*")
      .eq("id", id)
      .eq("status", "approved")
      .maybeSingle();
    if (error) {
      console.error("fetchSubmissionById failed:", error.message);
      return null;
    }
    return (data as Submission) ?? null;
  }
);
```

- [ ] **Step 4: Lint**

Run: `npm run lint`
Expected: no errors for the two new files.

- [ ] **Step 5: Sanity-check the pure slug/id logic (plain JS, no TS runner needed)**

Run:
```bash
node -e '
const UUID="[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";
const slugify=t=>{const s=t.toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,"").slice(0,60).replace(/-+$/g,"");return s||"prompt";};
const parse=x=>{const m=x.match(new RegExp(UUID+"$","i"));return m?m[0].toLowerCase():null;};
const id="6f2a1b3c-7d8e-4f10-9a2b-1c2d3e4f5a6b";
console.log("slug:", slugify("A Cinematic Coffee Commercial!!"));
console.log("parse ok:", parse(slugify("A Cinematic Coffee Commercial")+"-"+id)===id);
console.log("parse bad:", parse("no-uuid-here"));
'
```
Expected: `slug: a-cinematic-coffee-commercial`, `parse ok: true`, `parse bad: null`.

- [ ] **Step 6: Commit**

```bash
git add app/lib/supabase-server.ts app/lib/library.ts
git commit -m "feat: add anon read client and prompt-library helpers

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 2: Detail page + copy button + error boundary

**Files:**
- Create: `app/components/library/CopyPromptButton.tsx`
- Create: `app/(public)/prompt/[slugId]/page.tsx`
- Create: `app/(public)/prompt/error.tsx`

**Interfaces:**
- Consumes: `fetchSubmissionById`, `parseSubmissionId`, `buildPromptUrl`, `truncate` from `app/lib/library.ts`; `parseVideoUrl` from `app/lib/embed.ts`; `notFound` from `next/navigation`.
- Produces: route `GET /prompt/[slugId]` (server-rendered HTML + `<head>` metadata + JSON-LD); `CopyPromptButton` default export `({ text: string }) => JSX.Element`.

- [ ] **Step 1: Create `app/components/library/CopyPromptButton.tsx`**

```tsx
"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";

// Client copy-to-clipboard control for the (server-rendered) prompt page.
export default function CopyPromptButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard can be unavailable (insecure context); fail silently.
    }
  };

  return (
    <button
      onClick={handleCopy}
      className="inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-semibold text-black transition-colors hover:bg-zinc-200"
    >
      {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
      {copied ? "Copied!" : "Copy prompt"}
    </button>
  );
}
```

- [ ] **Step 2: Create `app/(public)/prompt/[slugId]/page.tsx`**

```tsx
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Sparkles } from "lucide-react";
import { parseVideoUrl } from "../../../lib/embed";
import {
  fetchSubmissionById,
  parseSubmissionId,
  buildPromptUrl,
  truncate,
} from "../../../lib/library";
import CopyPromptButton from "../../../components/library/CopyPromptButton";

export const revalidate = 3600;

type Props = { params: Promise<{ slugId: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slugId } = await params;
  const id = parseSubmissionId(slugId);
  const submission = id ? await fetchSubmissionById(id) : null;

  if (!submission) {
    return { title: "Prompt not found | Genify" };
  }

  const title = `${truncate(submission.prompt_text, 60)} · AI video prompt | Genify`;
  const description = truncate(submission.prompt_text, 155);
  const canonical = buildPromptUrl(submission);
  const images = submission.thumbnail_url ? [submission.thumbnail_url] : [];

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: { title, description, url: canonical, type: "article", images },
    twitter: { card: "summary_large_image", title, description, images },
  };
}

export default async function PromptPage({ params }: Props) {
  const { slugId } = await params;
  const id = parseSubmissionId(slugId);
  const submission = id ? await fetchSubmissionById(id) : null;

  if (!submission) notFound();

  const video = parseVideoUrl(submission.video_url);

  // VideoObject structured data for rich results.
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "VideoObject",
    name: truncate(submission.prompt_text, 100),
    description: truncate(submission.prompt_text, 300),
    thumbnailUrl: submission.thumbnail_url ?? video?.thumbnailUrl ?? undefined,
    embedUrl: video?.embedUrl ?? undefined,
    contentUrl: submission.video_url,
    uploadDate: submission.submitted_at,
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 md:px-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <nav className="mb-6 text-sm text-zinc-400">
        <Link href="/prompt" className="hover:text-white">
          ← Prompt Library
        </Link>
      </nav>

      {video && (
        <div className="mb-6 aspect-video w-full overflow-hidden rounded-xl border border-zinc-800 bg-black">
          <iframe
            src={video.embedUrl}
            title="Video result"
            className="h-full w-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      )}

      <div className="mb-4 flex flex-wrap items-center gap-2 text-xs">
        <span className="rounded-full border border-zinc-700 px-2.5 py-1 font-medium text-zinc-300">
          {submission.platform}
        </span>
        {submission.model_version && (
          <span className="rounded-full border border-zinc-800 px-2.5 py-1 text-zinc-400">
            {submission.model_version}
          </span>
        )}
        {submission.submitter_name && (
          <span className="text-zinc-500">
            by{" "}
            {submission.submitter_url ? (
              <a
                href={submission.submitter_url}
                target="_blank"
                rel="noopener noreferrer nofollow"
                className="text-zinc-400 underline hover:text-white"
              >
                {submission.submitter_name}
              </a>
            ) : (
              <span className="text-zinc-400">{submission.submitter_name}</span>
            )}
          </span>
        )}
      </div>

      <h1 className="mb-4 text-2xl font-bold tracking-tight text-white">
        AI Video Prompt
      </h1>

      <div className="mb-6 whitespace-pre-wrap rounded-xl border border-zinc-800 bg-zinc-900/50 p-5 font-mono text-sm leading-relaxed text-zinc-200">
        {submission.prompt_text}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <CopyPromptButton text={submission.prompt_text} />
        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-lg border border-blue-800 bg-blue-950/30 px-4 py-2 text-sm font-semibold text-blue-200 transition-colors hover:bg-blue-950/60"
        >
          <Sparkles className="h-4 w-4" />
          Generate your own free
        </Link>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Create `app/(public)/prompt/error.tsx`**

```tsx
"use client";

// Error boundary for the /prompt section. `error` is required by the
// convention but unused here, so it is not bound.
export default function PromptError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 text-center">
      <h2 className="text-xl font-bold text-white">Something went wrong</h2>
      <p className="mt-2 text-sm text-zinc-400">
        We couldn&apos;t load this prompt right now.
      </p>
      <button
        onClick={reset}
        className="mt-6 rounded-lg bg-white px-4 py-2 text-sm font-semibold text-black hover:bg-zinc-200"
      >
        Try again
      </button>
    </div>
  );
}
```

- [ ] **Step 4: Lint**

Run: `npm run lint`
Expected: no errors for the three new files.

- [ ] **Step 5: Get an approved submission id, then verify the page (Bash tool)**

Start the dev server if not running: `npm run dev` (needs `.env.local`).

Find an approved submission's `id` to test with. If you have the Supabase MCP, run a query; otherwise open `/prompt` (Task 3) or the gallery and copy an id. With `SLUGID="anything-<uuid>"`:

Run (server HTML must contain the SEO tags):
```bash
curl -s "http://localhost:3000/prompt/x-<APPROVED_UUID>" \
  | grep -oE '<title>[^<]*</title>|rel="canonical"|property="og:title"|application/ld\+json' | sort -u
```
Expected: shows `<title>…</title>`, `rel="canonical"`, `property="og:title"`, and `application/ld+json` — proving metadata + JSON-LD are in the server response.

Verify a bad UUID 404s:
```bash
curl -s -o /dev/null -w "%{http_code}\n" \
  "http://localhost:3000/prompt/x-00000000-0000-0000-0000-000000000000"
```
Expected: `404`.

> If there are **no** approved submissions yet, the id test can't run; still confirm the 404 case above, and revisit this step after seeding/approving a submission.

- [ ] **Step 6: Commit**

```bash
git add app/components/library/CopyPromptButton.tsx "app/(public)/prompt/[slugId]/page.tsx" "app/(public)/prompt/error.tsx"
git commit -m "feat: add server-rendered public prompt detail page with SEO metadata

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 3: Index hub

**Files:**
- Create: `app/(public)/prompt/page.tsx`

**Interfaces:**
- Consumes: `fetchApprovedSubmissions`, `buildPromptPath`, `truncate` from `app/lib/library.ts`.
- Produces: route `GET /prompt` (server HTML listing `<a href="/prompt/...">` links).

- [ ] **Step 1: Create `app/(public)/prompt/page.tsx`**

```tsx
import type { Metadata } from "next";
import Link from "next/link";
import {
  fetchApprovedSubmissions,
  buildPromptPath,
  truncate,
} from "../../lib/library";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "AI Video Prompt Library | Genify",
  description:
    "Browse real AI video prompts used to create results with Veo, Sora, Kling, Runway and more. Copy any prompt or generate your own free.",
  alternates: { canonical: "/prompt" },
};

export default async function PromptLibraryPage() {
  const submissions = await fetchApprovedSubmissions(100);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 md:px-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight text-white">
          AI Video Prompt Library
        </h1>
        <p className="mt-1 text-sm text-zinc-400">
          Real prompts behind community results — copy any of them, or generate
          your own free.
        </p>
      </div>

      {submissions.length === 0 ? (
        <div className="flex h-64 items-center justify-center rounded-xl border border-dashed border-zinc-800 bg-zinc-900/20 text-sm text-zinc-500">
          No published prompts yet.
        </div>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {submissions.map((s) => (
            <li key={s.id}>
              <Link
                href={buildPromptPath(s)}
                className="flex h-full flex-col gap-3 rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 transition-colors hover:border-zinc-700 hover:bg-zinc-900"
              >
                {s.thumbnail_url && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={s.thumbnail_url}
                    alt=""
                    className="aspect-video w-full rounded-lg object-cover"
                  />
                )}
                <span className="text-xs font-medium text-zinc-400">
                  {s.platform}
                  {s.model_version ? ` · ${s.model_version}` : ""}
                </span>
                <span className="line-clamp-3 text-sm text-zinc-200">
                  {truncate(s.prompt_text, 140)}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Lint**

Run: `npm run lint`
Expected: no errors (the `<img>` warning is suppressed by the inline disable comment).

- [ ] **Step 3: Verify the hub renders crawlable links**

Run:
```bash
curl -s "http://localhost:3000/prompt" | grep -oE 'href="/prompt/[^"]+"' | head -5
```
Expected: with ≥1 approved submission, one or more `href="/prompt/<slug>-<uuid>"` links. With none, expect no links but HTTP 200 and the "No published prompts yet." copy (check with `curl -s .../prompt | grep -o "No published prompts yet."`).

- [ ] **Step 4: Commit**

```bash
git add "app/(public)/prompt/page.tsx"
git commit -m "feat: add server-rendered prompt library index hub

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 4: sitemap + robots

**Files:**
- Create: `app/sitemap.ts`
- Create: `app/robots.ts`

**Interfaces:**
- Consumes: `fetchApprovedSubmissions`, `buildPromptUrl`, `SITE_URL` from `app/lib/library.ts`.
- Produces: `GET /sitemap.xml`, `GET /robots.txt`.

- [ ] **Step 1: Create `app/sitemap.ts`**

```ts
import type { MetadataRoute } from "next";
import {
  fetchApprovedSubmissions,
  buildPromptUrl,
  SITE_URL,
} from "./lib/library";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/`, changeFrequency: "weekly", priority: 1 },
    { url: `${SITE_URL}/gallery`, changeFrequency: "daily", priority: 0.8 },
    { url: `${SITE_URL}/prompt`, changeFrequency: "daily", priority: 0.8 },
  ];

  // On fetch failure this returns [], so the sitemap degrades to static routes.
  const submissions = await fetchApprovedSubmissions(1000);
  const promptRoutes: MetadataRoute.Sitemap = submissions.map((s) => ({
    url: buildPromptUrl(s),
    lastModified: new Date(s.submitted_at),
    changeFrequency: "monthly",
    priority: 0.6,
  }));

  return [...staticRoutes, ...promptRoutes];
}
```

- [ ] **Step 2: Create `app/robots.ts`**

```ts
import type { MetadataRoute } from "next";
import { SITE_URL } from "./lib/library";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin", "/history", "/submit"],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
```

- [ ] **Step 3: Lint**

Run: `npm run lint`
Expected: no errors for the two new files.

- [ ] **Step 4: Verify sitemap + robots**

Run:
```bash
echo "=== robots ==="; curl -s "http://localhost:3000/robots.txt"
echo "=== sitemap (head) ==="; curl -s "http://localhost:3000/sitemap.xml" | head -c 600; echo
```
Expected: `robots.txt` shows `Allow: /`, `Disallow: /admin` (+ `/history`, `/submit`), and a `Sitemap:` line. `sitemap.xml` is valid XML including `<loc>…/prompt</loc>` and, if any approved submissions exist, `<loc>…/prompt/<slug>-<uuid></loc>` entries.

- [ ] **Step 5: Commit**

```bash
git add app/sitemap.ts app/robots.ts
git commit -m "feat: add sitemap and robots for the prompt library

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 5: Public nav link to the library

**Files:**
- Modify: `app/(public)/layout.tsx`

**Interfaces:**
- Consumes: nothing new (uses existing `Link`).
- Produces: a "Prompt Library" link → `/prompt` in the public header.

- [ ] **Step 1: Add a nav group next to the logo**

In `app/(public)/layout.tsx`, replace the logo `<Link>` block so the logo and a nav sit in one left-hand group. Find:

```tsx
          <Link href="/gallery" className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-black">
              <Sparkles className="h-5 w-5" />
            </div>
            <span className="text-lg font-bold tracking-tight">
              Genify <span className="text-zinc-500">Gallery</span>
            </span>
          </Link>
```

Replace with:

```tsx
          <div className="flex items-center gap-6">
            <Link href="/gallery" className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-black">
                <Sparkles className="h-5 w-5" />
              </div>
              <span className="text-lg font-bold tracking-tight">
                Genify <span className="text-zinc-500">Gallery</span>
              </span>
            </Link>
            <nav className="hidden items-center gap-4 text-sm sm:flex">
              <Link
                href="/gallery"
                className="text-zinc-400 transition-colors hover:text-white"
              >
                Gallery
              </Link>
              <Link
                href="/prompt"
                className="text-zinc-400 transition-colors hover:text-white"
              >
                Prompt Library
              </Link>
            </nav>
          </div>
```

- [ ] **Step 2: Lint**

Run: `npm run lint`
Expected: no errors.

- [ ] **Step 3: Verify the link is server-rendered in the gallery header**

Run:
```bash
curl -s "http://localhost:3000/gallery" | grep -oE 'href="/prompt"'
```
Expected: `href="/prompt"` appears.

- [ ] **Step 4: Commit**

```bash
git add "app/(public)/layout.tsx"
git commit -m "feat: link the prompt library from the public nav

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Self-Review

**Spec coverage** — every spec requirement maps to a task:
- Approved-submissions content source → Task 1 (`fetchApprovedSubmissions`/`fetchSubmissionById` filter `status='approved'`).
- `/prompt/<slug>-<uuid>` URL + UUID resolution → Task 1 (`buildPromptPath`, `parseSubmissionId`) + Task 2 (page resolution + `notFound`).
- Server-rendered detail page w/ metadata, canonical, OG, Twitter, JSON-LD → Task 2.
- Copy + "Generate your own free" CTAs → Task 2 (`CopyPromptButton` + `/` link).
- `/prompt` index hub with crawlable links → Task 3.
- `sitemap.ts` (static + submissions) + `robots.ts` (disallow `/admin`,`/history`,`/submit`) → Task 4.
- ISR `revalidate = 3600` → Tasks 2, 3, 4.
- `NEXT_PUBLIC_SITE_URL` + fallback → Task 1 (`SITE_URL`).
- Public nav link, gallery otherwise untouched → Task 5 (only edits the header nav group).
- Error handling: bad/parseless id → 404 (Task 2); section `error.tsx` (Task 2); sitemap/robots degrade to static (Task 4, `fetch…` returns `[]`).

**Placeholder scan** — no TBD/TODO; every code step is complete file content or an exact find/replace. The only runtime unknown (an approved submission's UUID) is handled with explicit fallback verification.

**Type consistency** — helper names/signatures declared in Task 1's Interfaces block are used verbatim in Tasks 2–4 (`fetchSubmissionById`, `parseSubmissionId`, `buildPromptPath`, `buildPromptUrl`, `truncate`, `fetchApprovedSubmissions`, `SITE_URL`). `CopyPromptButton`'s `{ text }` prop matches its Task 2 call site. `Submission` fields referenced (`prompt_text`, `platform`, `model_version`, `video_url`, `thumbnail_url`, `submitter_name`, `submitter_url`, `submitted_at`, `id`) all exist in `app/lib/submissions.ts`.
