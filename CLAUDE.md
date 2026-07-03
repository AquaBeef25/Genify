# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Critical constraints

- **Non-stock Next.js.** This project pins Next.js `16.2.9`, a modified build
  whose APIs/conventions may differ from your training data. Per `AGENTS.md`,
  read the relevant guide in `node_modules/next/dist/docs/` before writing or
  changing any framework-level code.
- **No test suite.** There is no test runner configured — `npm run lint`
  (ESLint) is the only automated check. Don't invent a `test` script; verify
  changes by running the app (`npm run dev`) and driving the affected route.
- **No `middleware.ts`.** Supabase session cookies are only *read* in
  `app/api/generate/route.ts` (the inline `createServerClient` supplies a
  `get`-only cookie adapter — no `set`/`remove`). Session refresh is therefore
  not wired up; if you touch auth, add a middleware to persist refreshed
  sessions rather than assuming one exists.
- **Env var naming is non-standard.** The Supabase anon key is read as
  `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (not the conventional `..._ANON_KEY`),
  and `route.ts` falls back to a misspelled `GEMENI_API_KEY`. Match existing
  names when reading env.

---

# AI Prompt Generator — "Prompt Architect"

A full-stack Next.js app that turns a short content idea into a structured,
production-ready **AI video generation prompt**. Users sign in, describe an
idea, pick a target format, and the app uses Google Gemini to generate a
directed "blueprint" (hook, visual style, and an optimized AI-video prompt).
Every generation is saved per-user so it can be reviewed later in a history
dashboard.

> **Note on the framework:** This project pins a modified/newer Next.js
> (`16.2.9`) whose APIs and conventions may differ from stock Next.js. Per
> `AGENTS.md`, consult the bundled guides in `node_modules/next/dist/docs/`
> before changing framework-level code.

---

## Tech Stack

| Layer | Technology |
| --- | --- |
| Framework | Next.js `16.2.9` (App Router) |
| UI | React `19.2.4`, Tailwind CSS `v4` |
| Icons | `lucide-react` |
| Markdown rendering | `react-markdown` |
| AI model | Google Gemini (`gemini-2.5-flash`) via `@google/generative-ai` |
| Auth & Database | Supabase (`@supabase/ssr`, `@supabase/supabase-js`) |
| Language | TypeScript `v5` |
| Linting | ESLint `v9` + `eslint-config-next` |

---

## How It Works (End-to-End)

1. **Auth** — A user signs up / signs in on `/login` using Supabase email +
   password auth.
2. **Generate** — On the dashboard (`/`), the user enters a *Core Idea* and
   picks a *Target Format* (TikTok/Reels, YouTube, or Cinematic Commercial),
   then hits **Generate Prompt**.
3. **API** — The client `POST`s to `/api/generate`, which:
   - Rate-limits by IP (3 requests / 60s),
   - Verifies the Supabase session,
   - Calls Gemini with a fixed scriptwriter system prompt,
   - Saves the result to the `prompts` table,
   - Returns the generated Markdown.
4. **Display** — The result is rendered as styled Markdown with a
   copy-to-clipboard button.
5. **History** — `/history` lists every prompt the logged-in user has
   generated, newest first.

---

## Project Structure

```
app/
├── layout.tsx                     # Root layout (html/body, global styles)
├── globals.css                    # Tailwind + global styles
│
├── (auth)/
│   └── login/page.tsx             # Sign in / Sign up (Supabase auth)
│
├── (dashboard)/
│   ├── layout.tsx                 # Sidebar + main content shell
│   ├── page.tsx                   # "Discover" — the prompt generator UI
│   └── history/
│       ├── page.tsx               # "My Prompts" — user's generation history
│       └── error.tsx              # Error boundary for the history route
│
├── api/
│   └── generate/route.ts          # POST endpoint: rate-limit → auth → Gemini → save
│
├── lib/
│   ├── supabase.ts                # Browser Supabase client factory
│   └── rate-limit.ts              # In-memory per-IP rate limiter
│
└── components/
    ├── layout/
    │   ├── sidebar.tsx            # App navigation + sign out
    │   └── FloatingPromptBar.tsx # (empty stub)
    └── shared/
        └── PromptCard.tsx        # (empty stub)
```

> Routes are grouped with Next.js **route groups**: `(auth)` and `(dashboard)`
> organize files without affecting the URL path. So `(dashboard)/page.tsx`
> serves `/`, and `(dashboard)/history/page.tsx` serves `/history`.

---

## Key Modules

### `app/api/generate/route.ts` — Generation endpoint
The core backend. A `POST` handler that runs six stages in order:

1. **Rate limiting** — Reads the client IP from `x-forwarded-for` and calls
   `checkRateLimit(ip, 3, 60000)`. Over-limit requests get `429`.
2. **Authentication** — Builds a server Supabase client from cookies and calls
   `supabase.auth.getUser()`. No valid user → `401`.
3. **Payload** — Expects `{ idea, format }` in the JSON body. Missing `idea`
   → `400`.
4. **Generation** — Reads the Gemini API key, composes a fixed scriptwriter
   system prompt + the user's idea/format, and calls the `gemini-2.5-flash`
   model.
5. **Persistence** — Inserts a row into the `prompts` table linked to the
   user. A DB failure is logged but **does not** block the response.
6. **Response** — Returns `{ result: generatedText }`.

The system prompt instructs Gemini to output a fixed Markdown structure:
**The Hook (0–3s)**, **Visual Style & Directives**, and an **Optimized AI
Video Generation Prompt**.

### `app/lib/rate-limit.ts` — In-memory rate limiter
`checkRateLimit(ip, limit, windowMs)` tracks request counts per IP in a
module-level `Map`. Returns `{ success, requestsLeft }`; resets the counter
once a time window elapses.

> **Caveat:** Because state lives in process memory, the limit is per-server-
> instance and is lost on restart — fine for a single-instance dev/demo, but a
> shared store (e.g. Redis) would be needed for multi-instance production.

### `app/lib/supabase.ts` — Client factory
`createClient()` wraps `createBrowserClient` so React components get a fresh
browser-side Supabase client for auth and DB reads.

### `app/(dashboard)/page.tsx` — Generator UI ("Discover")
Client component with local state for `idea`, `format`, `loading`, `output`,
and `copied`. Submits to `/api/generate`, renders the returned Markdown with
custom `react-markdown` components, and offers copy-to-clipboard.

### `app/(dashboard)/history/page.tsx` — History ("My Prompts")
Client component that fetches the current user, then queries the `prompts`
table filtered by `user_id` and ordered by `created_at` descending. Renders a
responsive grid of cards showing the format badge, date, original idea, and
generated output. Redirects to `/login` if unauthenticated.

### `app/(auth)/login/page.tsx` — Auth
Email/password form with **Sign In** (`signInWithPassword` → redirect to `/`)
and **Sign Up** (`signUp` → prompt to confirm via email).

### `app/components/layout/sidebar.tsx` — Navigation
Persistent left sidebar with links (Discover, My Prompts, Billing, Settings)
and a **Sign Out** action. Highlights the active route via `usePathname`.

> `Billing` and `Settings` routes are linked in the nav but not yet
> implemented. `FloatingPromptBar.tsx` and `PromptCard.tsx` are empty
> placeholder files.

---

## Database

A Supabase Postgres table named **`prompts`** with (at least) these columns,
inferred from usage:

| Column | Purpose |
| --- | --- |
| `id` | Primary key |
| `user_id` | Owner (links row to the Supabase auth user) |
| `core_idea` | The user's original idea text |
| `format` | Target format (`tiktok` / `youtube` / `commercial`) |
| `generated_result` | The Gemini-generated Markdown |
| `created_at` | Timestamp (used for ordering history) |

---

## Environment Variables

| Variable | Used for |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL (client & server) |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase publishable/anon key |
| `GEMINI_API_KEY` | Google Gemini API key (server-side) |

> A fallback env var `GEMENI_API_KEY` (note the typo) is also read in
> `route.ts`. Prefer setting `GEMINI_API_KEY`.

---

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start the Next.js dev server |
| `npm run build` | Production build |
| `npm run start` | Run the production build |
| `npm run lint` | Run ESLint |

---

## Security & Behavior Notes

- **Auth is enforced server-side** for generation — the API rejects
  unauthenticated requests before calling Gemini.
- **Rate limiting is best-effort** and per-instance (see caveat above).
- **DB save failures are non-fatal** — the user still receives their generated
  prompt even if persistence fails.
- **Route groups** keep auth and dashboard concerns separated without changing
  URLs.
