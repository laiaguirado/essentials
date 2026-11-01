create table if not exists public.user_data (
  user_id uuid not null references auth.users (id) on delete cascade,
  key text not null check (key in ('dailyTasks', 'dailyHabits', 'dailyReminders', 'expenses', 'expenseBudgets')),
  value jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, key)
);

alter table public.user_data
  drop constraint if exists user_data_key_check;

alter table public.user_data
  add constraint user_data_key_check
  check (key in ('dailyTasks', 'dailyHabits', 'dailyReminders', 'expenses', 'expenseBudgets'));

alter table public.user_data enable row level security;

grant select, insert, update, delete on public.user_data to authenticated;

create policy "Users can read their own data"
  on public.user_data for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can create their own data"
  on public.user_data for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Users can update their own data"
  on public.user_data for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users can delete their own data"
  on public.user_data for delete to authenticated
  using ((select auth.uid()) = user_id);
