-- ============================================================================
-- Genify — Community Submission Gallery
-- ============================================================================
-- Run this in the Supabase SQL editor (or `supabase db` migration).
--
-- BEFORE RUNNING: replace every occurrence of the placeholder
--   'ADMIN_USER_ID_PLACEHOLDER'
-- with YOUR Supabase auth user UUID (Dashboard -> Authentication -> Users ->
-- click your user -> "User UID"). The same UUID must also be set in the app
-- as the NEXT_PUBLIC_ADMIN_USER_ID environment variable.
--
-- Tip: run this once to preview the id you want:
--   select id, email from auth.users order by created_at;
--
-- This script is idempotent-ish: it drops the policies/trigger it manages
-- before recreating them, so it is safe to re-run.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- 1. submissions
-- ----------------------------------------------------------------------------
create table if not exists public.submissions (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users on delete cascade,
  -- Optional link back to the prompt row this result was generated from
  -- (app/api/generate saves to public.prompts). Kept nullable so a result
  -- can be shared even if the originating prompt was deleted.
  prompt_id      uuid references public.prompts on delete set null,
  prompt_text    text not null,
  platform       text not null
                   check (platform in ('Veo','Sora','Kling','Runway','Google AI Studio')),
  model_version  text,
  -- External embed link only (YouTube / Vimeo). We never host video files.
  video_url      text not null,
  thumbnail_url  text,
  -- Credit for the public gallery; captured at submit time so we never have to
  -- expose auth.users to the client.
  submitter_name text,
  submitter_url  text,
  status         text not null default 'pending'
                   check (status in ('pending','approved','rejected')),
  likes_count    integer not null default 0,
  submitted_at   timestamptz not null default now()
);

-- Gallery lists approved rows newest-first; moderation lists pending rows.
create index if not exists submissions_status_submitted_at_idx
  on public.submissions (status, submitted_at desc);
create index if not exists submissions_user_id_idx
  on public.submissions (user_id);


-- ----------------------------------------------------------------------------
-- 2. submission_likes (many-to-many; composite PK blocks double-likes)
-- ----------------------------------------------------------------------------
create table if not exists public.submission_likes (
  submission_id uuid not null references public.submissions on delete cascade,
  user_id       uuid not null references auth.users on delete cascade,
  created_at    timestamptz not null default now(),
  primary key (submission_id, user_id)
);


-- ----------------------------------------------------------------------------
-- 3. Keep submissions.likes_count in sync with submission_likes
-- ----------------------------------------------------------------------------
-- SECURITY DEFINER so the count update runs as the function owner and bypasses
-- the "admin only" UPDATE policy on submissions. `set search_path = ''` is the
-- Supabase-recommended hardening for definer functions.
create or replace function public.sync_submission_likes_count()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (tg_op = 'INSERT') then
    update public.submissions
      set likes_count = likes_count + 1
      where id = new.submission_id;
    return new;
  elsif (tg_op = 'DELETE') then
    update public.submissions
      set likes_count = greatest(likes_count - 1, 0)
      where id = old.submission_id;
    return old;
  end if;
  return null;
end;
$$;

drop trigger if exists trg_submission_likes_count on public.submission_likes;
create trigger trg_submission_likes_count
  after insert or delete on public.submission_likes
  for each row execute function public.sync_submission_likes_count();


-- ----------------------------------------------------------------------------
-- 4. Row Level Security
-- ----------------------------------------------------------------------------
alter table public.submissions      enable row level security;
alter table public.submission_likes enable row level security;

-- --- submissions --------------------------------------------------------------

-- Anyone (including logged-out visitors / the anon role) can read approved rows.
drop policy if exists "Approved submissions are public" on public.submissions;
create policy "Approved submissions are public"
  on public.submissions for select
  using (status = 'approved');

-- Signed-in users can always see their own submissions (any status), so they
-- can watch a submission move from pending -> approved.
drop policy if exists "Users can read own submissions" on public.submissions;
create policy "Users can read own submissions"
  on public.submissions for select
  to authenticated
  using ((select auth.uid()) = user_id);

-- The admin can read everything (needed to moderate other users' pending rows).
drop policy if exists "Admin can read all submissions" on public.submissions;
create policy "Admin can read all submissions"
  on public.submissions for select
  to authenticated
  using ((select auth.uid()) = 'ADMIN_USER_ID_PLACEHOLDER');

-- Users can only insert rows for themselves, and only in the pending state.
drop policy if exists "Users can submit own pending" on public.submissions;
create policy "Users can submit own pending"
  on public.submissions for insert
  to authenticated
  with check ((select auth.uid()) = user_id and status = 'pending');

-- Only the admin can change a submission (approve / reject).
drop policy if exists "Admin can update submissions" on public.submissions;
create policy "Admin can update submissions"
  on public.submissions for update
  to authenticated
  using      ((select auth.uid()) = 'ADMIN_USER_ID_PLACEHOLDER')
  with check ((select auth.uid()) = 'ADMIN_USER_ID_PLACEHOLDER');

-- --- submission_likes ---------------------------------------------------------

-- A user can only see, add, and remove their own likes. (The denormalized
-- likes_count on submissions is what the public gallery reads for totals.)
drop policy if exists "Users can read own likes" on public.submission_likes;
create policy "Users can read own likes"
  on public.submission_likes for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users can add own likes" on public.submission_likes;
create policy "Users can add own likes"
  on public.submission_likes for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can remove own likes" on public.submission_likes;
create policy "Users can remove own likes"
  on public.submission_likes for delete
  to authenticated
  using ((select auth.uid()) = user_id);
