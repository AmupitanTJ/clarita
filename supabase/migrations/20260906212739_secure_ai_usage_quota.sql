create table if not exists public.ai_request_usage (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.ai_request_usage enable row level security;

revoke all on table public.ai_request_usage from public, anon, authenticated;
grant select on table public.ai_request_usage to authenticated;
grant insert (user_id) on table public.ai_request_usage to authenticated;

drop policy if exists ai_request_usage_select_own on public.ai_request_usage;
create policy ai_request_usage_select_own
on public.ai_request_usage
for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists ai_request_usage_insert_own on public.ai_request_usage;
create policy ai_request_usage_insert_own
on public.ai_request_usage
for insert
to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists permanent_accounts_only on public.ai_request_usage;
create policy permanent_accounts_only
on public.ai_request_usage
as restrictive
for all
to authenticated
using (((select auth.jwt())->>'is_anonymous')::boolean is false)
with check (((select auth.jwt())->>'is_anonymous')::boolean is false);

create index if not exists ai_request_usage_user_created_idx
on public.ai_request_usage (user_id, created_at desc);

revoke all on table public.conversations from anon;
revoke all on table public.conversation_messages from anon;
