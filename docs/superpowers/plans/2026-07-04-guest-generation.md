# Guest Generation (Try-Before-Signup) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a logged-out visitor generate one full prompt before a signup wall, to fix the biggest activation leak in the funnel.

**Architecture:** Relax the `/api/generate` auth gate so an unauthenticated request is allowed exactly once, tracked by an HttpOnly `guest_gen_used` cookie set on the response (no DB save for guests); the existing per-IP rate limiter is the abuse backstop. The generator page detects guest state, mirrors the "used" flag in `localStorage` for instant UX, hides refine/share for guests, and renders an inline `SignupWall` card after the free result or on any further attempt.

**Tech Stack:** Next.js `16.2.9` (App Router, modified build) · React `19.2.4` · Tailwind CSS v4 · `@supabase/ssr` · `lucide-react` · Google Gemini (`gemini-2.5-flash`).

## Global Constraints

- **Modified Next.js `16.2.9`** — framework-level cookie API confirmed against `node_modules/next/dist/docs/01-app/03-api-reference/04-functions/cookies.md`: `const cookieStore = await cookies()`; read with `cookieStore.get(name)?.value`; write with `cookieStore.set(name, value, options)` inside a Route Handler.
- **No test suite** — do NOT add a `test` script. Verify every task with `npm run lint` plus manual driving (`npm run dev`, curl, or browser). This replaces the TDD test-first cycle in the standard plan template.
- **No `middleware.ts`** — the guest cookie is set on the Route Handler response via `cookieStore.set(...)`, which does not require middleware. Do not add one.
- **Env var names are non-standard** — read Supabase anon key as `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`; Gemini key as `GEMINI_API_KEY` with fallback `GEMENI_API_KEY` (misspelled). Match verbatim.
- **Cookie contract:** name `guest_gen_used`, value `"1"`, `httpOnly: true`, `path: "/"`, `maxAge: 2592000` (30 days), `sameSite: "lax"`, `secure: process.env.NODE_ENV === "production"`.
- **Response contract:** guest success → `{ result, id: null, guest: true }`; guest blocked → HTTP `401` `{ error, signupRequired: true }`; authed → unchanged `{ result, id }`.
- **Product rules:** exactly 1 free guest generation; refine, share, save, and history stay signup-only; storyboard mode IS allowed on the one free gen.

---

## File Structure

- `app/api/generate/route.ts` — **modify.** Restructure the auth stage: parse body first, resolve user (nullable), gate guests (reject refine + second gen), generate once (shared), then branch: guest → set cookie + return `guest:true` (no save); authed → save + return `id`.
- `app/components/shared/SignupWall.tsx` — **create.** Small, reusable inline card (existing visual language) with a headline, benefit bullets, and Sign up / Log in links.
- `app/(dashboard)/page.tsx` — **modify.** Detect guest on mount, mirror the `guest_gen_used` flag in `localStorage`, handle the `guest`/`signupRequired` response flags, hide the refine + share blocks for guests, and render `<SignupWall>` after a guest result or on a walled attempt.

---

### Task 1: API — allow one free guest generation

**Files:**
- Modify: `app/api/generate/route.ts` (full replacement below)

**Interfaces:**
- Consumes: `checkRateLimit(ip, limit, windowMs)` from `app/lib/rate-limit.ts`; `buildPrompt({ idea, format, previousResult, storyboard })` from `app/lib/prompts.ts`; `cookies()` from `next/headers`.
- Produces (response shapes the frontend in Task 2 relies on):
  - Guest success: `{ result: string, id: null, guest: true }` + `Set-Cookie: guest_gen_used=1`
  - Guest blocked (limit reached, or refine attempt): HTTP `401` `{ error: string, signupRequired: true }`
  - Authed success: `{ result: string, id: string | null }` (unchanged)

- [ ] **Step 1: Replace `app/api/generate/route.ts` with the guest-aware handler**

```ts
import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { checkRateLimit } from "../../lib/rate-limit";
import { buildPrompt } from "../../lib/prompts";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// Marks that an unauthenticated visitor has spent their single free
// generation. HttpOnly so page JS can't trivially clear it; ~30 days.
const GUEST_COOKIE = "guest_gen_used";
const GUEST_COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 days, in seconds

export async function POST(request: Request) {
  try {
    // 1. SECURITY LAYER: per-IP rate limiter (burst / automated-abuse backstop)
    const forwardedFor = request.headers.get("x-forwarded-for");
    const ip = forwardedFor ? forwardedFor.split(",")[0] : "unknown-ip";
    const rateLimit = checkRateLimit(ip, 3, 60000);

    if (!rateLimit.success) {
      return NextResponse.json(
        { error: "Too many requests. Please wait a minute." },
        { status: 429 }
      );
    }

    // 2. PAYLOAD
    const body = await request.json();
    const { idea, format, previousResult, storyboard } = body;

    if (!idea) {
      return NextResponse.json({ error: "Missing idea" }, { status: 400 });
    }

    // 3. AUTHENTICATION — guests are allowed ONE free generation.
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
        },
      }
    );

    const { data, error: authError } = await supabase.auth.getUser();
    const user = authError ? null : data?.user ?? null;

    // 4. GUEST GATING (only when there is no session)
    if (!user) {
      // Refining is a signup-only action.
      if (previousResult) {
        return NextResponse.json(
          { error: "Sign up to refine your prompt.", signupRequired: true },
          { status: 401 }
        );
      }
      // Already spent the one free generation? Reject BEFORE calling Gemini.
      if (cookieStore.get(GUEST_COOKIE)) {
        return NextResponse.json(
          {
            error: "You've used your free prompt. Sign up to keep generating.",
            signupRequired: true,
          },
          { status: 401 }
        );
      }
    }

    // 5. GENERATE VIA GEMINI (shared by guests and authed users)
    const apiKey = process.env.GEMINI_API_KEY || process.env.GEMENI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "Missing Gemini API key." }, { status: 500 });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const finalPrompt = buildPrompt({ idea, format, previousResult, storyboard });
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    const result = await model.generateContent(finalPrompt);
    const generatedText = result.response.text();

    // 6. GUEST: mark the free gen spent, skip persistence, return.
    if (!user) {
      cookieStore.set(GUEST_COOKIE, "1", {
        httpOnly: true,
        path: "/",
        maxAge: GUEST_COOKIE_MAX_AGE,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
      });
      return NextResponse.json({ result: generatedText, id: null, guest: true });
    }

    // 7. AUTHED: persist and return the saved row id.
    const { data: savedPrompt, error: dbError } = await supabase
      .from("prompts")
      .insert({
        user_id: user.id, // links the prompt to the logged-in user
        core_idea: idea,
        format: format,
        generated_result: generatedText,
      })
      .select("id")
      .single();

    if (dbError) {
      console.error("Database save failed:", dbError);
      // Logged, but we still return the prompt so the UI doesn't break.
    }

    return NextResponse.json({ result: generatedText, id: savedPrompt?.id ?? null });
  } catch (error) {
    console.error("API Error:", error);
    return NextResponse.json({ error: "Failed to generate prompt" }, { status: 500 });
  }
}
```

- [ ] **Step 2: Lint**

Run: `npm run lint`
Expected: no new errors for `app/api/generate/route.ts`. (`user` is narrowed to non-null after the Step-6 `if (!user) { return }`, so `user.id` in Step 7 type-checks.)

- [ ] **Step 3: Start the dev server**

Run: `npm run dev`
Expected: server ready on `http://localhost:3000` with no compile errors. Keep it running for the next step. (Requires `GEMINI_API_KEY` set in `.env.local` — the same key existing authed generation uses.)

- [ ] **Step 4: Verify the guest path with curl (run in the Bash tool for real `curl`)**

First guest call — no auth cookie:

Run:
```bash
curl -i -X POST http://localhost:3000/api/generate \
  -H "Content-Type: application/json" \
  -d '{"idea":"a cat surfing a giant wave","format":"tiktok"}'
```
Expected: `HTTP/1.1 200`, a `Set-Cookie: guest_gen_used=1; ...HttpOnly...` response header, and a JSON body containing `"guest":true` and `"id":null` with a non-empty `"result"`.

Second guest call — replay the cookie:

Run:
```bash
curl -i -X POST http://localhost:3000/api/generate \
  -H "Content-Type: application/json" \
  -b "guest_gen_used=1" \
  -d '{"idea":"a cat surfing a giant wave","format":"tiktok"}'
```
Expected: `HTTP/1.1 401` and body `{"error":"...","signupRequired":true}`. (No Gemini call should fire — the reject happens before Step 5.)

Guest refine attempt — no auth, with `previousResult`:

Run:
```bash
curl -i -X POST http://localhost:3000/api/generate \
  -H "Content-Type: application/json" \
  -d '{"idea":"make it darker","format":"tiktok","previousResult":"prev blueprint text"}'
```
Expected: `HTTP/1.1 401` and body `{"error":"Sign up to refine your prompt.","signupRequired":true}`.

- [ ] **Step 5: Commit**

```bash
git add app/api/generate/route.ts
git commit -m "feat: allow one free guest generation in the generate API

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 2: Frontend — signup wall + guest handling

**Files:**
- Create: `app/components/shared/SignupWall.tsx`
- Modify: `app/(dashboard)/page.tsx` (full replacement below)

**Interfaces:**
- Consumes: response flags from Task 1 (`guest: true`, `signupRequired: true`); `createClient()` from `app/lib/supabase.ts`.
- Produces: `SignupWall` default export — `({ title?: string; subtitle?: string }) => JSX.Element`.

- [ ] **Step 1: Create `app/components/shared/SignupWall.tsx`**

```tsx
import Link from "next/link";
import { Sparkles } from "lucide-react";

// Inline signup wall shown to guests once they've used their free generation
// (or when they try a signup-only action). Matches the app's card language.
export default function SignupWall({
  title = "Sign up to keep going",
  subtitle = "You've used your free prompt on this browser.",
}: {
  title?: string;
  subtitle?: string;
}) {
  return (
    <div className="rounded-xl border border-blue-900/50 bg-blue-950/20 p-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-500/20 text-blue-300">
          <Sparkles className="h-5 w-5" />
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-bold text-white">{title}</h3>
          <p className="mt-1 text-sm text-zinc-400">{subtitle}</p>
          <ul className="mt-3 space-y-1.5 text-sm text-zinc-300">
            <li>• Generate unlimited prompts</li>
            <li>• Refine and iterate on any blueprint</li>
            <li>• Save your full generation history</li>
          </ul>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link
              href="/login"
              className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-black transition-colors hover:bg-zinc-200"
            >
              Sign up free
            </Link>
            <Link
              href="/login"
              className="rounded-lg border border-zinc-700 px-4 py-2 text-sm font-semibold text-zinc-200 transition-colors hover:bg-zinc-800"
            >
              Log in
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Lint the new component**

Run: `npm run lint`
Expected: no errors for `app/components/shared/SignupWall.tsx`.

- [ ] **Step 3: Replace `app/(dashboard)/page.tsx` with the guest-aware generator**

```tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Share2 } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { createClient } from "../lib/supabase";
import SignupWall from "../components/shared/SignupWall";

// Mirror of the server's HttpOnly guest cookie, for instant UX (the cookie
// stays authoritative server-side).
const GUEST_USED_KEY = "guest_gen_used";

// Shared markdown styling so both the default blueprint and the storyboard
// (which uses h2 headings and horizontal rules between scenes) render cleanly.
const markdownComponents = {
  h2: ({ children }: { children?: React.ReactNode }) => (
    <h2 className="text-xl font-bold text-white mt-6 mb-2 first:mt-0">{children}</h2>
  ),
  h3: ({ children }: { children?: React.ReactNode }) => (
    <h3 className="text-lg font-bold text-white mt-5 mb-2 first:mt-0">{children}</h3>
  ),
  p: ({ children }: { children?: React.ReactNode }) => (
    <p className="text-zinc-300 leading-relaxed mb-4">{children}</p>
  ),
  strong: ({ children }: { children?: React.ReactNode }) => (
    <strong className="font-bold text-white">{children}</strong>
  ),
  ul: ({ children }: { children?: React.ReactNode }) => (
    <ul className="list-disc pl-5 mb-4 text-zinc-300 space-y-1">{children}</ul>
  ),
  li: ({ children }: { children?: React.ReactNode }) => (
    <li className="text-zinc-300">{children}</li>
  ),
  hr: () => <hr className="my-6 border-zinc-800" />,
};

export default function DashboardPage() {
  const [copied, setCopied] = useState(false);
  const [idea, setIdea] = useState("");
  const [format, setFormat] = useState("tiktok");
  const [storyboard, setStoryboard] = useState(false);
  const [loading, setLoading] = useState(false);
  const [output, setOutput] = useState("");
  // Id of the most recent saved prompt row, used to deep-link the "Share it" CTA.
  const [lastPromptId, setLastPromptId] = useState<string | null>(null);

  // Refine state — used once an initial result exists.
  const [refineInput, setRefineInput] = useState("");
  const [refining, setRefining] = useState(false);

  // Guest state — drives the signup wall for logged-out visitors.
  const [isGuest, setIsGuest] = useState(false);
  const [guestUsed, setGuestUsed] = useState(false);
  const [showWall, setShowWall] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      const guest = !data?.user;
      setIsGuest(guest);
      if (guest && localStorage.getItem(GUEST_USED_KEY)) {
        setGuestUsed(true);
      }
    });
  }, []);

  // Core call to the generate API. `instruction` is the idea for a fresh
  // generation, or the revision instruction when `previousResult` is passed.
  const runGenerate = async (
    instruction: string,
    previousResult?: string
  ): Promise<boolean> => {
    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          idea: instruction,
          format,
          storyboard,
          ...(previousResult ? { previousResult } : {}),
        }),
      });

      const data = await response.json();

      // Guest hit the wall (limit reached, or a signup-only action). Sync the
      // local flag in case the server cookie is ahead of localStorage.
      if (data.signupRequired) {
        setIsGuest(true);
        setGuestUsed(true);
        localStorage.setItem(GUEST_USED_KEY, "1");
        setShowWall(true);
        return false;
      }

      if (data.result) {
        setOutput(data.result);
        setLastPromptId(data.id ?? null);
        if (data.guest) {
          setGuestUsed(true);
          localStorage.setItem(GUEST_USED_KEY, "1");
        }
        return true;
      } else {
        setOutput("Error: " + data.error);
        return false;
      }
    } catch {
      setOutput("Failed to connect to the server.");
      return false;
    }
  };

  const handleGenerate = async () => {
    // Known-spent guest: show the wall without a wasted round trip.
    if (isGuest && guestUsed) {
      setShowWall(true);
      return;
    }
    if (!idea) return alert("Please enter an idea first.");

    setLoading(true);
    setOutput("");
    setShowWall(false);
    await runGenerate(idea);
    setLoading(false);
  };

  const handleRefine = async () => {
    if (!refineInput || !output) return;

    setRefining(true);
    const ok = await runGenerate(refineInput, output);
    setRefining(false);
    if (ok) setRefineInput("");
  };

  const handleCopy = () => {
    if (!output) return;
    navigator.clipboard.writeText(output);
    setCopied(true);

    setTimeout(() => {
      setCopied(false);
    }, 2000);
  };

  return (
    <div className="min-h-screen bg-zinc-950 p-6 md:p-10 text-white">

      {/* Top Section / Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight">Discover Prompts</h1>
        <p className="text-sm text-zinc-400">Explore and generate production-ready AI instructions.</p>
      </div>

      {/* Main Content Workspace Grid */}
      <div className="grid gap-6 max-w-4xl">

        {/* The Generator Input Card */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6 shadow-sm">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-1">Your Core Idea</label>
              <textarea
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-white focus:outline-none focus:ring-1 focus:ring-blue-500 transition-shadow"
                rows={3}
                placeholder="e.g. A tutorial on baking sourdough bread..."
                value={idea}
                onChange={(e) => setIdea(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-1">Target Format</label>
              <select
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-white focus:outline-none focus:ring-1 focus:ring-blue-500 transition-shadow"
                value={format}
                onChange={(e) => setFormat(e.target.value)}
              >
                <option value="tiktok">TikTok / Reels (Vertical Short)</option>
                <option value="youtube">YouTube (Horizontal Long)</option>
                <option value="commercial">Cinematic Commercial</option>
              </select>
            </div>

            {/* Storyboard toggle */}
            <label className="flex items-center gap-3 cursor-pointer select-none">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-zinc-700 bg-zinc-950 accent-blue-500"
                checked={storyboard}
                onChange={(e) => setStoryboard(e.target.checked)}
              />
              <span className="text-sm text-zinc-300">
                Storyboard mode
                <span className="text-zinc-500"> — break the idea into a shot-by-shot breakdown</span>
              </span>
            </label>

            <button
              onClick={handleGenerate}
              disabled={loading}
              className="w-full bg-white hover:bg-zinc-200 disabled:bg-zinc-800 disabled:text-zinc-500 text-black font-semibold py-3 px-4 rounded-lg transition-colors"
            >
              {loading ? "Architecting..." : "Generate Prompt"}
            </button>
          </div>
        </div>

        {/* The Result Output Card */}
        {output && (
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6 shadow-sm flex flex-col gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex justify-between items-center border-b border-zinc-800 pb-4">
              <span className="text-sm font-medium text-zinc-300">Generated Blueprint</span>
              <button
                onClick={handleCopy}
                className="text-xs bg-zinc-800 hover:bg-zinc-700 text-white font-medium py-1.5 px-3 rounded-md transition-colors border border-zinc-700"
              >
                {copied ? "✓ Copied!" : "Copy to Clipboard"}
              </button>
            </div>

            <div className="text-sm overflow-x-auto">
              <ReactMarkdown components={markdownComponents}>
                {output}
              </ReactMarkdown>
            </div>

            {/* Share + Refine are signup-only, so hide them for guests. */}
            {!isGuest && (
              <>
                {/* Share-to-gallery CTA — appears once a result exists. */}
                <Link
                  href={lastPromptId ? `/submit?promptId=${lastPromptId}` : "/submit"}
                  className="flex items-center justify-between gap-3 rounded-lg border border-blue-900/50 bg-blue-950/20 px-4 py-3 transition-colors hover:border-blue-800 hover:bg-blue-950/40"
                >
                  <span className="flex items-center gap-2 text-sm text-blue-200">
                    <Share2 className="h-4 w-4" />
                    Got a result from this prompt? Share it in the gallery
                  </span>
                  <span className="text-sm font-semibold text-blue-300">→</span>
                </Link>

                {/* Refine / follow-up */}
                <div className="border-t border-zinc-800 pt-4">
                  <label className="block text-sm font-medium text-zinc-400 mb-1">Refine this blueprint</label>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      className="flex-1 bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-white focus:outline-none focus:ring-1 focus:ring-blue-500 transition-shadow"
                      placeholder="e.g. make it darker, add rain"
                      value={refineInput}
                      onChange={(e) => setRefineInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleRefine();
                      }}
                      disabled={refining}
                    />
                    <button
                      onClick={handleRefine}
                      disabled={refining || !refineInput}
                      className="bg-blue-600 hover:bg-blue-500 disabled:bg-zinc-800 disabled:text-zinc-500 text-white font-semibold py-3 px-5 rounded-lg transition-colors whitespace-nowrap"
                    >
                      {refining ? "Refining..." : "Refine"}
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* Signup wall — shown to guests after their free result, or when they
            try a signup-only action. */}
        {isGuest && (output || showWall) && (
          <SignupWall
            subtitle={
              output
                ? "That's your free prompt — sign up to generate more, refine, and save it."
                : "You've used your free prompt on this browser."
            }
          />
        )}

      </div>
    </div>
  );
}
```

- [ ] **Step 4: Lint**

Run: `npm run lint`
Expected: no new errors for `app/(dashboard)/page.tsx`.

- [ ] **Step 5: Manually verify the guest flow in the browser**

With `npm run dev` running, open an **incognito** window (logged out) at `http://localhost:3000/`:

1. Enter an idea, click **Generate** → full blueprint renders; **no** Refine box, **no** Share CTA; the `SignupWall` card shows *"That's your free prompt…"*.
2. In DevTools → Application → Cookies, confirm `guest_gen_used` exists and is `HttpOnly`.
3. Click **Generate** again → the wall shows (no new result). In the Network tab, confirm either no `/api/generate` call fired (client short-circuit) or, if one did, it returned `401`.
4. Reload the page → the free-gen state persists (localStorage mirror); generating shows the wall.
5. Log in with a real account and repeat: Refine, Share, and history all work as before; generation is unlimited and results appear under `/history` (i.e. rows are still saved for authed users).

- [ ] **Step 6: Commit**

```bash
git add app/components/shared/SignupWall.tsx "app/(dashboard)/page.tsx"
git commit -m "feat: add signup wall for guest generation on the dashboard

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Self-Review

**Spec coverage** — every spec section maps to a task:
- 1 free full generation → Task 1 (guest branch generates once, no prior use) + Task 2 (result renders in full).
- Wall on 2nd gen / refine / share → Task 1 (401 `signupRequired` for cookie-present and `previousResult`) + Task 2 (hide refine/share, render `SignupWall`).
- Soft cookie + IP backstop → Task 1 (HttpOnly `guest_gen_used` via `cookieStore.set`; existing `checkRateLimit` untouched) + Task 2 (localStorage mirror).
- No DB save for guests → Task 1 (guest branch returns before the `prompts` insert).
- No carry-over after signup → nothing persists guest results; authed flow unchanged. ✅
- Inline card, existing visual language → Task 2 `SignupWall` (`rounded-xl border`, blue accent matching the existing Share CTA).
- Storyboard allowed for guests → Task 2 keeps the storyboard toggle visible for all; Task 1 passes `storyboard` through `buildPrompt` on the guest branch.
- Error-handling table (429/500/400 unchanged; guest-limit → 401) → Task 1 preserves those branches.

**Placeholder scan** — no TBD/TODO; every code step is complete file content or a full component.

**Type consistency** — response flags `guest` / `signupRequired` are produced in Task 1 and consumed by the same names in Task 2; `SignupWall` prop names (`title`, `subtitle`) match between definition and both call sites; `GUEST_USED_KEY` (frontend localStorage) and `GUEST_COOKIE` (server cookie) are deliberately distinct names for distinct stores, both valued `"1"`.
