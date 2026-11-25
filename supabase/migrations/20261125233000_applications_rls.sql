-- Applications: Row Level Security. Each authenticated user can only read and
-- write their own rows (auth.uid() = user_id). There are no policies for anon.
-- auth.uid() is wrapped in a subselect so Postgres evaluates it once per
-- statement instead of once per row (Supabase performance recommendation).

alter table public.applications enable row level security;

create policy "Users can view their own applications"
  on public.applications
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can create their own applications"
  on public.applications
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Users can update their own applications"
  on public.applications
  for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users can delete their own applications"
  on public.applications
  for delete
  to authenticated
  using ((select auth.uid()) = user_id);

-- Defense in depth: anonymous visitors never need this table. Without the
-- grants, a missing or wrong policy can't expose rows to anon, and TRUNCATE
-- (which bypasses RLS) is not available to them either.
revoke all on table public.applications from anon;
