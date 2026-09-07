create or replace function public.delete_my_clarita_account()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  requesting_user_id uuid := auth.uid();
begin
  if requesting_user_id is null
    or coalesce(((auth.jwt())->>'is_anonymous')::boolean, true) then
    raise exception 'A permanent authenticated account is required';
  end if;

  delete from public.response_feedback where user_id = requesting_user_id;
  delete from public.saved_passages where user_id = requesting_user_id;
  delete from public.private_notes where user_id = requesting_user_id;
  delete from public.ai_request_usage where user_id = requesting_user_id;
  delete from public.conversations where user_id = requesting_user_id;
  delete from public.profiles where user_id = requesting_user_id;
  delete from auth.users where id = requesting_user_id;
end;
$$;

revoke all on function public.delete_my_clarita_account() from public;
grant execute on function public.delete_my_clarita_account() to authenticated;
