# Design: Try-Before-Signup (Guest Generation)

- **Date:** 2026-07-04
- **Status:** Approved (ready for implementation plan)
- **Author:** brainstormed with Claude Code
- **Growth lever:** Activation — remove the biggest funnel leak (signup required before any value)

## Context & problem

The app forces a Supabase login before a visitor can generate anything:
`app/api/generate/route.ts` returns `401` for any request without a session.
The generator UI at `/` is itself reachable while logged out (the
`(dashboard)/layout.tsx` has no auth gate), so today a stranger sees the
generator, types an idea, clicks **Generate**, and is rejected — the worst
possible moment to ask for a commitment. This is the largest leak in the
discover → **activate** → retain → refer funnel.

## Goal & success criteria

A logged-out visitor can generate **one** full prompt — experiencing the real
"aha" — then hits a signup wall for anything further.

**Success:** a measurable increase in signups originating from the generator
page, with **no** meaningful increase in Gemini abuse cost.

## Decisions (locked during brainstorming)

| Decision | Choice |
| --- | --- |
| Free allowance | **1 full generation**, then wall |
| What's walled | 2nd generation, **refine**, **share/save**, **history** |
| Enforcement | **Soft cookie + IP backstop** (accept incognito bypass) |
| Carry-over after signup | **No** — free result is a sample, not persisted |
| Wall UX | **Inline card** (not a modal), in existing visual language |
| Storyboard on free gen | **Allowed** — more impressive, stronger hook |

## Non-goals (YAGNI)

- No carry-over of the guest result into the account after signup.
- No Redis / persistent per-IP store — reuse the existing in-memory limiter.
- No more than one free generation.
- No teaser/blur of the result.
- No refine for guests (refine is signup-only; storyboard **is** allowed on the
  single free gen).

## Behavior

### Happy path (guest, first generation)

1. Guest lands on `/` (already reachable — no auth gate).
2. Enters idea + format (+ optional storyboard), clicks **Generate**.
3. Server sees no session and no "free gen used" marker → runs Gemini, returns
   the full result, and **skips the DB save** (guests have no `user_id`). Marks
   the free gen as spent via a response cookie.
4. Result renders in full — the same markdown card as today.
5. Below the result, in place of Refine/Share, a **signup CTA card** appears:
   *"That's your free prompt — sign up to generate unlimited, refine, and save
   your history."*

### Walled path (guest, any further action)

- Generate again, refine, or share → the wall. On a second generate attempt the
  server returns **before** calling Gemini, so no cost is wasted.

## Enforcement — soft cookie + IP backstop

- **Source of truth:** an HTTP-only `guest_gen_used` cookie, set by the server
  on the response after the free generation (~30-day `Max-Age`). Set directly on
  the `NextResponse` — independent of Supabase's `get`-only cookie adapter, so
  **no middleware is required** (respects the CLAUDE.md constraint that session
  refresh is not wired up).
- **Instant UX:** the frontend also flips a `localStorage` flag so the wall can
  render without a round-trip, but the **cookie is authoritative** server-side.
- **Abuse backstop:** the existing `checkRateLimit(ip, 3, 60000)` already caps
  burst/automated abuse. Reused as-is (accepting its per-instance, in-memory
  reset caveat).
- **Accepted bypass:** clearing cookies / incognito grants another free gen.
  That is a real human using the product — acceptable for growth. Automated
  abuse stays bounded by the IP limiter + Gemini's own quotas.

## API changes — `app/api/generate/route.ts`

Restructure the auth stage (currently a hard `401` when there is no user):

- **Authed user** → unchanged: rate-limit → generate → save row → return
  `{ result, id }`.
- **No user:**
  1. `previousResult` present (a refine attempt) → `401 { error, signupRequired: true }`.
     Refine is signup-only.
  2. `guest_gen_used` cookie present → `401 { error, signupRequired: true }`,
     returned **before** calling Gemini.
  3. Otherwise → generate via Gemini, **skip the DB insert**, return
     `{ result, id: null, guest: true }`, and attach
     `Set-Cookie: guest_gen_used=1; HttpOnly; Path=/; Max-Age=<~30d>; SameSite=Lax`.

Rate limiting stays first and unchanged. The `guest` and `signupRequired` flags
are the only additions to the response shape.

## Frontend changes — `app/(dashboard)/page.tsx`

- On mount, resolve auth state via `supabase.auth.getUser()` → `isGuest`.
- `runGenerate` handles two new response signals:
  - `guest: true` → flip the `localStorage` "free gen used" flag.
  - `signupRequired: true` → render the **wall** instead of `output`.
- For guests:
  - **Hide** the Refine block and the Share-to-gallery CTA (both are
    signup-only; Share already depends on a saved `promptId` guests never get).
  - After the free result, show the **signup CTA card**.
  - On a walled attempt, swap in the **wall card**.

## Wall UX

An **inline card** (not a modal) in the existing visual language
(`rounded-xl border border-zinc-800 bg-zinc-900/50`): a headline, 2–3 benefit
bullets (unlimited generation · refine · saved history), and two actions —
**Sign up free** (primary → `/login`) and **Log in** (secondary → `/login`).

## Error handling

| Case | Server response | UI |
| --- | --- | --- |
| Guest over free limit / guest refine | `401 { signupRequired: true }` | Show wall, not an error toast |
| Burst abuse | existing `429` | "Too many requests" message |
| Gemini failure | existing `500` | existing error text |
| Missing idea | existing `400` | existing alert |

## Framework note

Setting cookies on a route-handler response is framework-level. Per `AGENTS.md`,
before writing that code consult `node_modules/next/dist/docs/` for this modified
Next `16.2.9` build's response-cookie API (it may differ from stock
`NextResponse.cookies.set`).

## Verification (no test suite — manual, per CLAUDE.md)

Run `npm run dev`, then in a **fresh incognito** window (logged out):

1. Generate once → full result renders, **no** refine/share, signup CTA shows.
2. Generate again → **wall** appears; confirm **no** Gemini call fired (check
   server logs / network).
3. Confirm the `guest_gen_used` cookie exists (devtools → Application → Cookies).
4. Log in → confirm the full flow (refine, share, save, history) is unchanged.
5. Confirm **no** guest row landed in the `prompts` table.
6. `npm run lint`.
