begin;

create table if not exists public.daily_tasks (
  user_id uuid not null references auth.users (id) on delete cascade,
  id text not null,
  text text not null default '',
  completed boolean not null default false,
  due_date date,
  payload jsonb not null default '{}'::jsonb,
  primary key (user_id, id)
);

create table if not exists public.daily_habits (
  user_id uuid not null references auth.users (id) on delete cascade,
  habit_key text not null,
  value jsonb not null,
  primary key (user_id, habit_key)
);

create table if not exists public.daily_reminders (
  user_id uuid not null references auth.users (id) on delete cascade,
  id text not null,
  task text not null default '',
  due_date date,
  category text not null default '',
  completed boolean not null default false,
  payload jsonb not null default '{}'::jsonb,
  primary key (user_id, id)
);

create table if not exists public.expense_movements (
  user_id uuid not null references auth.users (id) on delete cascade,
  id text not null,
  description text not null default '',
  amount numeric(14, 2) not null default 0,
  category text not null default 'general',
  type text not null default 'expense' check (type in ('expense', 'income')),
  movement_date date,
  payload jsonb not null default '{}'::jsonb,
  primary key (user_id, id)
);

create table if not exists public.expense_budgets (
  user_id uuid not null references auth.users (id) on delete cascade,
  month date not null,
  category text not null,
  amount numeric(14, 2) not null default 0 check (amount >= 0),
  primary key (user_id, month, category)
);

create table if not exists public.expense_recurring_movements (
  user_id uuid not null references auth.users (id) on delete cascade,
  id text not null,
  description text not null default '',
  amount numeric(14, 2) not null default 0,
  category text not null default 'general',
  type text not null default 'expense' check (type in ('expense', 'income')),
  frequency text not null default 'monthly',
  next_date date,
  day_of_month integer,
  payload jsonb not null default '{}'::jsonb,
  primary key (user_id, id)
);

create table if not exists public.expense_savings_goals (
  user_id uuid not null references auth.users (id) on delete cascade,
  id text not null,
  name text not null default '',
  target numeric(14, 2) not null default 0,
  saved numeric(14, 2) not null default 0,
  payload jsonb not null default '{}'::jsonb,
  primary key (user_id, id)
);

create table if not exists public.notes (
  user_id uuid not null references auth.users (id) on delete cascade,
  id text not null,
  title text not null default '',
  content text not null default '',
  updated_at timestamptz,
  payload jsonb not null default '{}'::jsonb,
  primary key (user_id, id)
);

create index if not exists daily_tasks_user_due_date_idx
  on public.daily_tasks (user_id, due_date);
create index if not exists daily_tasks_user_completed_due_date_idx
  on public.daily_tasks (user_id, completed, due_date);
create index if not exists daily_reminders_user_due_date_idx
  on public.daily_reminders (user_id, due_date);
create index if not exists daily_reminders_user_category_due_date_idx
  on public.daily_reminders (user_id, category, due_date);
create index if not exists expenses_user_date_idx
  on public.expense_movements (user_id, movement_date desc);
create index if not exists expenses_user_type_date_idx
  on public.expense_movements (user_id, type, movement_date desc);
create index if not exists expenses_user_category_date_idx
  on public.expense_movements (user_id, category, movement_date desc);
create index if not exists expense_budgets_user_month_idx
  on public.expense_budgets (user_id, month);
create index if not exists recurring_movements_user_next_date_idx
  on public.expense_recurring_movements (user_id, next_date);
create index if not exists notes_user_updated_at_idx
  on public.notes (user_id, updated_at desc);

do $$
declare
  table_name text;
  policy_name text;
  command_name text;
begin
  foreach table_name in array array[
    'daily_tasks',
    'daily_habits',
    'daily_reminders',
    'expense_movements',
    'expense_budgets',
    'expense_recurring_movements',
    'expense_savings_goals',
    'notes'
  ]
  loop
    execute format('alter table public.%I enable row level security', table_name);
    execute format('grant select, insert, update, delete on public.%I to authenticated', table_name);

    foreach command_name in array array['select', 'insert', 'update', 'delete']
    loop
      policy_name := table_name || '_users_' || command_name;
      if not exists (
        select 1
        from pg_policies
        where schemaname = 'public'
          and tablename = table_name
          and policyname = policy_name
      ) then
        if command_name = 'select' or command_name = 'delete' then
          execute format(
            'create policy %I on public.%I for %s to authenticated using ((select auth.uid()) = user_id)',
            policy_name,
            table_name,
            command_name
          );
        elsif command_name = 'insert' then
          execute format(
            'create policy %I on public.%I for insert to authenticated with check ((select auth.uid()) = user_id)',
            policy_name,
            table_name
          );
        else
          execute format(
            'create policy %I on public.%I for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id)',
            policy_name,
            table_name
          );
        end if;
      end if;
    end loop;
  end loop;
end
$$;

insert into public.daily_tasks (user_id, id, text, completed, due_date, payload)
select
  source.user_id,
  coalesce(item.value->>'id', md5(item.value::text)),
  coalesce(item.value->>'text', ''),
  coalesce((item.value->>'completed')::boolean, false),
  case
    when item.value->>'date' ~ '^\d{1,2}/\d{1,2}/\d{4}$' then to_date(item.value->>'date', 'DD/MM/YYYY')
    when item.value->>'date' ~ '^\d{4}-\d{2}-\d{2}' then (item.value->>'date')::date
    else null
  end,
  item.value
from public.user_data source
cross join lateral jsonb_array_elements(
  case when jsonb_typeof(source.value) = 'array' then source.value else '[]'::jsonb end
) item(value)
where source.key = 'dailyTasks'
on conflict (user_id, id) do nothing;

insert into public.daily_habits (user_id, habit_key, value)
select source.user_id, habit.key, habit.value
from public.user_data source
cross join lateral jsonb_each(
  case when jsonb_typeof(source.value) = 'object' then source.value else '{}'::jsonb end
) habit(key, value)
where source.key = 'dailyHabits'
on conflict (user_id, habit_key) do nothing;

insert into public.daily_reminders (user_id, id, task, due_date, category, completed, payload)
select
  source.user_id,
  coalesce(item.value->>'id', md5(item.value::text)),
  coalesce(item.value->>'task', item.value->>'text', ''),
  case
    when item.value->>'date' ~ '^\d{1,2}/\d{1,2}/\d{4}$' then to_date(item.value->>'date', 'DD/MM/YYYY')
    when item.value->>'date' ~ '^\d{4}-\d{2}-\d{2}' then (item.value->>'date')::date
    else null
  end,
  coalesce(item.value->>'category', ''),
  coalesce((item.value->>'completed')::boolean, false),
  item.value
from public.user_data source
cross join lateral jsonb_array_elements(
  case when jsonb_typeof(source.value) = 'array' then source.value else '[]'::jsonb end
) item(value)
where source.key = 'dailyReminders'
on conflict (user_id, id) do nothing;

insert into public.expense_movements (user_id, id, description, amount, category, type, movement_date, payload)
select
  source.user_id,
  coalesce(item.value->>'id', md5(item.value::text)),
  coalesce(item.value->>'description', ''),
  coalesce(nullif(item.value->>'amount', '')::numeric, 0),
  case when item.value->>'category' = 'comida' then 'restaurantes' else coalesce(item.value->>'category', 'general') end,
  case when item.value->>'type' = 'income' then 'income' else 'expense' end,
  case
    when item.value->>'date' ~ '^\d{1,2}/\d{1,2}/\d{4}$' then to_date(item.value->>'date', 'DD/MM/YYYY')
    when item.value->>'date' ~ '^\d{4}-\d{2}-\d{2}' then (item.value->>'date')::date
    else null
  end,
  case
    when item.value->>'category' = 'comida' then jsonb_set(item.value, '{category}', '"restaurantes"'::jsonb)
    else item.value
  end
from public.user_data source
cross join lateral jsonb_array_elements(
  case when jsonb_typeof(source.value) = 'array' then source.value else '[]'::jsonb end
) item(value)
where source.key = 'expenses'
on conflict (user_id, id) do nothing;

insert into public.expense_budgets (user_id, month, category, amount)
select
  source.user_id,
  to_date(month_entry.key || '-01', 'YYYY-MM-DD'),
  case when category_entry.key = 'comida' then 'restaurantes' else category_entry.key end,
  coalesce(nullif(category_entry.value #>> '{}', '')::numeric, 0)
from public.user_data source
cross join lateral jsonb_each(
  case
    when exists (
      select 1 from jsonb_object_keys(
        case when jsonb_typeof(source.value) = 'object' then source.value else '{}'::jsonb end
      ) as keys(key)
      where keys.key ~ '^\d{4}-\d{2}$'
    ) then case when jsonb_typeof(source.value) = 'object' then source.value else '{}'::jsonb end
    else jsonb_build_object(to_char(current_date, 'YYYY-MM'), source.value)
  end
) month_entry(key, value)
cross join lateral jsonb_each(
  case when jsonb_typeof(month_entry.value) = 'object' then month_entry.value else '{}'::jsonb end
) category_entry(key, value)
where source.key = 'expenseBudgets'
on conflict (user_id, month, category) do nothing;

insert into public.expense_recurring_movements (
  user_id, id, description, amount, category, type, frequency, next_date, day_of_month, payload
)
select
  source.user_id,
  coalesce(item.value->>'id', md5(item.value::text)),
  coalesce(item.value->>'description', ''),
  coalesce(nullif(item.value->>'amount', '')::numeric, 0),
  coalesce(item.value->>'category', 'general'),
  case when item.value->>'type' = 'income' then 'income' else 'expense' end,
  coalesce(item.value->>'frequency', 'monthly'),
  case
    when item.value->>'nextDate' ~ '^\d{1,2}/\d{1,2}/\d{4}$' then to_date(item.value->>'nextDate', 'DD/MM/YYYY')
    when item.value->>'nextDate' ~ '^\d{4}-\d{2}-\d{2}' then (item.value->>'nextDate')::date
    else null
  end,
  nullif(item.value->>'dayOfMonth', '')::integer,
  item.value
from public.user_data source
cross join lateral jsonb_array_elements(
  case when jsonb_typeof(source.value) = 'array' then source.value else '[]'::jsonb end
) item(value)
where source.key = 'recurringMovements'
on conflict (user_id, id) do nothing;

insert into public.expense_savings_goals (user_id, id, name, target, saved, payload)
select
  source.user_id,
  coalesce(item.value->>'id', md5(item.value::text)),
  coalesce(item.value->>'name', ''),
  coalesce(nullif(item.value->>'target', '')::numeric, 0),
  coalesce(nullif(item.value->>'saved', '')::numeric, 0),
  item.value
from public.user_data source
cross join lateral jsonb_array_elements(
  case when jsonb_typeof(source.value) = 'array' then source.value else '[]'::jsonb end
) item(value)
where source.key = 'savingsGoals'
on conflict (user_id, id) do nothing;

insert into public.notes (user_id, id, title, content, updated_at, payload)
select
  source.user_id,
  coalesce(item.value->>'id', md5(item.value::text)),
  coalesce(item.value->>'title', ''),
  coalesce(item.value->>'content', ''),
  nullif(item.value->>'updatedAt', '')::timestamptz,
  item.value
from public.user_data source
cross join lateral jsonb_array_elements(
  case when jsonb_typeof(source.value) = 'array' then source.value else '[]'::jsonb end
) item(value)
where source.key = 'notes'
on conflict (user_id, id) do nothing;

commit;
