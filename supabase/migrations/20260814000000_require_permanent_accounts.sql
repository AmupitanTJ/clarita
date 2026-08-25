-- Personal Clarita data is available only to permanent, non-anonymous accounts.
-- Ownership policies on each table continue to restrict rows to auth.uid().

drop policy if exists permanent_accounts_only on public.profiles;
create policy permanent_accounts_only
on public.profiles
as restrictive
for all
to authenticated
using (((select auth.jwt())->>'is_anonymous')::boolean is false)
with check (((select auth.jwt())->>'is_anonymous')::boolean is false);

drop policy if exists permanent_accounts_only on public.conversations;
create policy permanent_accounts_only
on public.conversations
as restrictive
for all
to authenticated
using (((select auth.jwt())->>'is_anonymous')::boolean is false)
with check (((select auth.jwt())->>'is_anonymous')::boolean is false);

drop policy if exists permanent_accounts_only on public.conversation_messages;
create policy permanent_accounts_only
on public.conversation_messages
as restrictive
for all
to authenticated
using (((select auth.jwt())->>'is_anonymous')::boolean is false)
with check (((select auth.jwt())->>'is_anonymous')::boolean is false);

drop policy if exists permanent_accounts_only on public.saved_passages;
create policy permanent_accounts_only
on public.saved_passages
as restrictive
for all
to authenticated
using (((select auth.jwt())->>'is_anonymous')::boolean is false)
with check (((select auth.jwt())->>'is_anonymous')::boolean is false);

drop policy if exists permanent_accounts_only on public.private_notes;
create policy permanent_accounts_only
on public.private_notes
as restrictive
for all
to authenticated
using (((select auth.jwt())->>'is_anonymous')::boolean is false)
with check (((select auth.jwt())->>'is_anonymous')::boolean is false);

drop policy if exists permanent_accounts_only on public.response_feedback;
create policy permanent_accounts_only
on public.response_feedback
as restrictive
for all
to authenticated
using (((select auth.jwt())->>'is_anonymous')::boolean is false)
with check (((select auth.jwt())->>'is_anonymous')::boolean is false);
