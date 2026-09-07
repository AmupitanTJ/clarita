revoke execute on function public.delete_my_clarita_account() from public;
revoke execute on function public.delete_my_clarita_account() from anon;
grant execute on function public.delete_my_clarita_account() to authenticated;
