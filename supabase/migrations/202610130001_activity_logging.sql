-- MANUAL ONLY: review and execute in production yourself. This file is not applied by the app.
-- Assumes the supplied b1_activity schema and b2_register.id = auth.users.id.
-- Invalid legacy IP values or NULL actions/timestamps will abort this transaction.
begin;

alter table public.b1_activity
  alter column ip_address type inet using nullif(ip_address::text, '')::inet,
  alter column created_at set default now(),
  alter column created_at set not null,
  alter column action set not null,
  alter column id set default gen_random_uuid();

create index if not exists b1_activity_created_at_idx on public.b1_activity (created_at desc);
create index if not exists b1_activity_user_id_idx on public.b1_activity (user_id);
create index if not exists b1_activity_register_id_idx on public.b1_activity (register_id);
create index if not exists b1_activity_action_idx on public.b1_activity (action);

-- Check the actor's department without relying on browser metadata or profile RLS.
create or replace function public.can_read_b1_activity()
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.b2_register r
    where r.id = (select auth.uid())
      and r.departement_id = '8113ab6f-d5cc-4c94-bbf6-e08047931fab'::uuid
  );
$$;
revoke all on function public.can_read_b1_activity() from public, anon;
grant execute on function public.can_read_b1_activity() to authenticated;

alter table public.b1_activity enable row level security;

-- Replace existing policies for this table: permissive policies otherwise combine with OR.
do $$
declare activity_policy record;
begin
  for activity_policy in select policyname from pg_policies
    where schemaname = 'public' and tablename = 'b1_activity'
  loop
    execute format('drop policy %I on public.b1_activity', activity_policy.policyname);
  end loop;
end $$;

create policy b1_activity_select_it on public.b1_activity
for select to authenticated using ((select public.can_read_b1_activity()));

revoke all on public.b1_activity from public, anon, authenticated;
grant select on public.b1_activity to authenticated;
grant select, insert on public.b1_activity to service_role;

-- The joins require existing SELECT grants/RLS on b2_register, d3_positions and d3_departments.
-- Their policies are intentionally not changed in this migration.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'b1_activity'
  ) then
    alter publication supabase_realtime add table public.b1_activity;
  end if;
end $$;

commit;
