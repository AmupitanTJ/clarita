-- Keep conversation management state on the owner-protected conversation row.
-- Existing SELECT/UPDATE policies restrict every operation to auth.uid() = user_id.

alter table public.conversations
  add column if not exists pinned_at timestamptz,
  add column if not exists archived_at timestamptz;

create index if not exists conversations_user_history_order_idx
  on public.conversations (user_id, archived_at, pinned_at desc, updated_at desc);

comment on column public.conversations.pinned_at is
  'When set, the conversation is pinned to the top of the owner history.';

comment on column public.conversations.archived_at is
  'When set, the conversation is hidden from the owner active history until restored.';
