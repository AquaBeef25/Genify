# Genify — AI Prompt Generator

Turn a one-line content idea into a structured, production-ready **AI video
generation prompt**. Describe what you want, pick a target format, and Genify
uses Google Gemini to write a directed blueprint — the hook, the visual
direction, and a prompt you can paste straight into Veo, Sora, Kling or Runway.

Built with Next.js (App Router) + Supabase + Gemini.

## Features

- **Prompt generator** — a core idea plus a target format (TikTok/Reels,
  YouTube, or Cinematic Commercial) produces a Markdown blueprint: **The Hook
  (0–3s)**, **Visual Style & Directives**, and an **Optimized AI Video
  Generation Prompt**.
- **History** — every generation is saved per-user and browsable at
  `/history`, with search, format filters, favorites, and a full-blueprint
  modal.
- **Community gallery** — users submit YouTube/Vimeo links to videos they made
  from a Genify prompt (`/submit`); approved entries appear at `/gallery` with
  likes and a leaderboard.
- **Prompt library** — approved submissions also render as individual
  SEO-oriented pages under `/prompt`, each showing the prompt behind the
  result, with `sitemap.xml` and `robots.txt` generated from the same data.
- **Moderation** — submissions land as `pending` and are approved or rejected
  by the admin at `/admin`.
- **Auth** — Supabase email + password with a password-reset flow, plus Google
  OAuth. Every route except the auth pages requires a session.

## Tech Stack

| Layer | Technology |
| --- | --- |
| Framework | Next.js `16.2.9` (App Router) |
| UI | React `19.2.4`, Tailwind CSS v4, `lucide-react` |
| AI model | Google Gemini `gemini-2.5-flash` via `@google/generative-ai` |
| Auth & database | Supabase (`@supabase/ssr`, `@supabase/supabase-js`) |
| Language | TypeScript v5 |
| Linting | ESLint v9 + `eslint-config-next` |

> **Note:** this project pins a modified build of Next.js `16.2.9` whose APIs
> and conventions may differ from stock. The bundled guides in
> `node_modules/next/dist/docs/` are the source of truth for framework-level
> code. One consequence you'll meet immediately: the `middleware` file
> convention is named **`proxy`** here (see [`proxy.ts`](./proxy.ts)).

## Getting Started

**Prerequisites:** Node.js **>= 20** (see `.nvmrc`), a
[Supabase](https://supabase.com) project, and a
[Google Gemini API key](https://aistudio.google.com/apikey).

### 1. Install

```bash
npm install
```

### 2. Configure environment

```bash
cp .env.example .env.local
```

Fill in the values — [`.env.example`](./.env.example) documents where to find
each one in the Supabase and AI Studio dashboards.

### 3. Set up the database

The app reads and writes three tables in Supabase. **Skip this and generation
will appear to work but nothing will save, and the gallery will fail outright.**

The base `prompts` table is not scripted — create it in the Supabase dashboard
(SQL editor) first:

| Column | Type | Notes |
| --- | --- | --- |
| `id` | `uuid` | primary key, default `gen_random_uuid()` |
| `user_id` | `uuid` | references `auth.users(id)` |
| `core_idea` | `text` | the user's original idea |
| `format` | `text` | `tiktok` / `youtube` / `commercial` |
| `generated_result` | `text` | the Gemini-generated Markdown |
| `created_at` | `timestamptz` | default `now()`, orders history |

Enable RLS on it with `select` and `insert` policies scoped to
`auth.uid() = user_id`.

Then run [`supabase/schema.sql`](./supabase/schema.sql) in the SQL editor. It
adds the gallery tables (`submissions`, `submission_likes`), the like-count
trigger, all RLS policies, and the `prompts` DELETE/UPDATE policies plus the
`is_favorite` column that My Prompts needs. **Before running it, replace every
`ADMIN_USER_ID_PLACEHOLDER` with your own Supabase auth user UUID** (Dashboard
→ Authentication → Users → your user → "User UID") — the same UUID goes in
`NEXT_PUBLIC_ADMIN_USER_ID`. The script is safe to re-run.

### 4. Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). You'll be redirected to
`/login` — create an account, then generate your first prompt.

## Environment Variables

| Variable | Used for |
| --- | --- |
| `GEMINI_API_KEY` | Google Gemini API key (server-side) |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase publishable (anon) key — note: **not** `..._ANON_KEY` |
| `NEXT_PUBLIC_ADMIN_USER_ID` | Supabase auth UUID of the admin (gates `/admin`) |
| `NEXT_PUBLIC_SITE_URL` | Canonical origin for sitemap/robots/SEO (prod = your deployed URL) |

The names are intentionally non-standard — match them exactly.

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start the dev server |
| `npm run build` | Production build |
| `npm run start` | Serve the production build |
| `npm run lint` | Run ESLint |

> `npm run lint` is the **only** automated check — there is no test suite.
> Verify changes by running the app and driving the affected route.

## Project Structure

Routes are organized with route groups, which shape the files without changing
URLs: `(dashboard)/page.tsx` serves `/`, `(auth)/login/page.tsx` serves
`/login`.

```
app/
├── (auth)/            # login, forgot-password, reset-password
├── (dashboard)/       # / (generator), /history, /gallery, /submit, /admin
├── (public)/          # /prompt, /prompt/[slugId] — SEO prompt library
├── api/
│   ├── generate/      # POST: rate-limit → auth → Gemini → save
│   └── submissions/   # POST: rate-limit → auth → validate URL → insert pending
├── auth/callback/     # OAuth code exchange
├── components/
│   ├── ui/            # design-system primitives (Button, Card, Field, …)
│   ├── layout/        # AppShell, sidebar, Brand
│   ├── gallery/       # SubmissionCard, SubmissionModal, Leaderboard
│   └── shared/        # PromptCard, markdown, SignupWall
├── lib/               # supabase clients, rate-limit, embed, library, prompts
├── sitemap.ts         # generated from approved submissions
└── robots.ts
proxy.ts               # auth gate — runs before every route (Next 16 "middleware")
supabase/schema.sql    # gallery tables, triggers, RLS policies
docs/DEPLOY.md         # go-live runbook
```

## How Generation Works

`POST /api/generate` runs in order:

1. **Rate limit** — 3 requests / 60s per IP (5/60s for submissions).
2. **Auth** — a Supabase server client checks the session; no user → `401`.
3. **Generate** — a fixed scriptwriter system prompt + the user's idea and
   format go to `gemini-2.5-flash`.
4. **Save** — the result is inserted into `prompts`. A DB failure is logged but
   **does not** block the response — the user still gets their prompt.

The rate limiter ([`app/lib/rate-limit.ts`](./app/lib/rate-limit.ts)) keeps
counts in process memory, so limits are per-instance and reset on restart.
Fine for a single-instance deploy; a shared store (e.g. Redis) would be needed
to scale out.

## Security Notes

- **RLS is the real access control.** `/admin` is only cosmetically gated by
  `NEXT_PUBLIC_ADMIN_USER_ID`; the actual guard is the admin-only UPDATE policy
  on `submissions`. Submissions are always inserted as `pending`.
- **Auth is enforced server-side.** `/api/generate` rejects unauthenticated
  requests before ever calling Gemini.
- **Submission URLs are validated twice** — client-side for UX, and
  server-side via [`app/lib/embed.ts`](./app/lib/embed.ts) (`parseVideoUrl`),
  which is the single source of truth for allowed hosts (YouTube/Vimeo only).
- **New public routes must be allow-listed** in `proxy.ts`'s
  `publicAuthRoutes`, or logged-out visitors get redirected to `/login`.

## Deploying

Follow the runbook in **[`docs/DEPLOY.md`](./docs/DEPLOY.md)**. In short: push
to GitHub → import into Vercel → set the 5 env vars → point Supabase Auth's
**Site URL** + **Redirect URLs** at the deployed origin → smoke-test signup,
generation, and history.

---

Working on this with an AI agent? [`CLAUDE.md`](./CLAUDE.md) and
[`AGENTS.md`](./AGENTS.md) carry the architecture deep-dive and repo
conventions.
