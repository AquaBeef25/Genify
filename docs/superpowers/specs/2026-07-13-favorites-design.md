# Design: Favorites (save/star prompts)

- **Date:** 2026-07-13
- **Status:** Approved (ready for implementation plan)
- **Author:** brainstormed with Claude Code
- **Growth lever:** Retention — gives a signed-in user a reason to come back to
  My Prompts instead of treating each generation as disposable. First half of a
  two-part retention loop; the second half (notifications for gallery likes /
  approvals) is a separate follow-on spec.

## Context & problem

`prompts` rows are generate-once, view-or-delete-forever — there's no way to
mark one as worth keeping track of. As My Prompts history grows, there's no
way to resurface the handful a user actually cares about without re-reading
every card. `prompts` also has no UPDATE policy at all today: the delete-policy
fix (`supabase/schema.sql` §5) added DELETE, but a user still cannot mutate a
row they own.

## Goal & success criteria

A signed-in user can star/unstar any prompt from My Prompts and filter the grid
down to only their starred prompts.

**Success:** clicking the star on a `PromptCard` persists immediately (survives
a refresh), and the `★ Favorites` filter chip shows only favorited prompts.

## Decisions (locked during brainstorming)

| Decision | Choice |
| --- | --- |
| Data model | One column: `prompts.is_favorite boolean not null default false`. No new table. |
| Toggle surface | `PromptCard` action row only (History). **Not** added to the Discover post-generation view — deferred. |
| Persistence | Direct Supabase client call from the browser (`supabase.from('prompts').update(...)`), matching the existing delete pattern — no new API route. |
| Filter UI | New `★ Favorites` chip appended to the existing `All/TikTok/YouTube/Commercial` row in `history/page.tsx`. It's a **filter**, not a sort — favorited prompts are not reordered to the top; list order stays newest-first. |
| RLS | New per-row UPDATE policy on `prompts`, not scoped to a single column (see rationale below). |

## Non-goals (YAGNI)

- **No favoriting from Discover** — only from My Prompts cards.
- **No reordering** — favorites narrows the grid via the filter chip, it doesn't pin starred prompts to the top.
- **No notifications** — that's the second, separate spec in the retention-loop backlog.
- **No column-level RLS restriction** — see rationale below.

## Schema change

```sql
alter table public.prompts
  add column if not exists is_favorite boolean not null default false;

drop policy if exists "Users can update their own prompts" on public.prompts;
create policy "Users can update their own prompts"
  on public.prompts for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
```

Add this block to `supabase/schema.sql` alongside the existing §5 DELETE-policy
fix (same table, same rationale pattern), and apply it to the live Supabase
project the same way that fix was applied.

**Why an unrestricted per-row UPDATE policy (not column-scoped to
`is_favorite`):** the user already fully owns this row — they can delete it
outright via the existing DELETE policy. A same-owner UPDATE of `core_idea` or
`generated_result` isn't a meaningfully bigger risk than deleting and
regenerating, and Postgres RLS policies aren't naturally column-scoped without
extra machinery (column privileges + a second role, or a trigger). That
complexity isn't justified here.

## Frontend changes

### `app/components/shared/PromptCard.tsx`
- Add a `Star` icon button (`lucide-react`, filled/accent-colored when
  `is_favorite`, outline otherwise) into the existing action row next to
  View / Share / Delete.
- New prop: `onToggleFavorite: (id: string, next: boolean) => void | Promise<void>`,
  called on click — mirrors the existing `onDelete` prop shape.
- `Prompt` type gains `is_favorite: boolean`.

### `app/(dashboard)/history/page.tsx`
- Add `handleToggleFavorite(id, next)`: optimistically flip local state, then
  `supabase.from('prompts').update({ is_favorite: next }).eq('id', id).select('id')`.
  If the update affects 0 rows or errors, revert the optimistic flip and
  `alert(...)` — same defensive shape as `handleDelete`'s 0-rows-affected check,
  since RLS denial fails silently rather than throwing.
- Add a `★ Favorites` entry to the `FORMAT_FILTERS`-style chip row as a second,
  independent filter (favorite-only toggle rendered alongside, not replacing,
  the format chips) — `filtered` gains an `matchesFavorite` clause alongside
  `matchesFormat`/`matchesQuery`.

## Error handling

Identical shape to the existing delete flow: check `data.length` after
`.update().select('id')`. Zero rows means RLS silently didn't apply the
change (e.g. stale session) — revert the optimistic UI update and alert the
user, rather than drifting from server state.

## Testing / verification (no test suite in this repo)

Per `AGENTS.md`/`CLAUDE.md`, `npm run lint` is the only automated check;
verification is driving the real flow:

1. Apply the schema change to the dev Supabase project.
2. `npm run dev` → generate a prompt → My Prompts → star it → refresh the page
   → still starred.
3. Click the `★ Favorites` chip → grid narrows to starred prompts only; other
   format chips still narrow further within that set.
4. Unstar → refresh → gone from the favorites filter.
5. `npm run lint` and `npm run build` stay clean.

## Rollout / sequencing

Schema change (migration + RLS policy) must land on the target Supabase
project before the UI is meaningfully testable — same "apply via MCP/SQL
editor" pattern used for the community-gallery schema and the prompts DELETE
policy. Code can be written in parallel; verification requires the migration
applied first.
