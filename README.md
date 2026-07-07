# Genify — AI Prompt Generator

A full-stack Next.js app that turns a short content idea into a structured,
production-ready AI video generation prompt (powered by Google Gemini +
Supabase). See [`CLAUDE.md`](./CLAUDE.md) for the full architecture overview.

## Getting Started

1. Copy the env template and fill in your keys:

   ```bash
   cp .env.example .env.local
   ```

2. Run the development server:

   ```bash
   npm install
   npm run dev
   ```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

> Requires Node.js **>= 20** (see `.nvmrc` / `engines`). The only automated
> check is `npm run lint` — there is no test suite; verify changes by running
> the app.

## Environment Variables

| Variable | Used for |
| --- | --- |
| `GEMINI_API_KEY` | Google Gemini API key (server-side) |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase publishable (anon) key — note: not `..._ANON_KEY` |
| `NEXT_PUBLIC_ADMIN_USER_ID` | Supabase auth UUID of the admin (gates `/admin`) |
| `NEXT_PUBLIC_SITE_URL` | Canonical origin for sitemap/robots/SEO (prod = your deployed URL) |

See [`.env.example`](./.env.example) for where to find each value.

## Deploying to Vercel

Follow the step-by-step go-live runbook in **[`docs/DEPLOY.md`](./docs/DEPLOY.md)**.
In short: push to GitHub → import into Vercel → set the 5 env vars above →
point Supabase's Auth **Site URL** + **Redirect URLs** at the deployed origin →
smoke-test signup, generation, and history.
