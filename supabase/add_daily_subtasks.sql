begin;

create table if not exists public.daily_subtasks (
  user_id uuid not null,
  task_id text not null,
  id text not null,
  text text not null default '',
  completed boolean not null default false,
  primary key (user_id, task_id, id),
  foreign key (user_id, task_id)
    references public.daily_tasks (user_id, id)
    on delete cascade
);

alter table public.daily_subtasks enable row level security;
grant select, insert, update, delete on public.daily_subtasks to authenticated;

do $$
declare
  command_name text;
  policy_name text;
begin
  foreach command_name in array array['select', 'insert', 'update', 'delete']
  loop
    policy_name := 'daily_subtasks_users_' || command_name;
    if not exists (
      select 1
      from pg_policies
      where schemaname = 'public'
        and tablename = 'daily_subtasks'
        and policyname = policy_name
    ) then
      if command_name = 'select' or command_name = 'delete' then
        execute format(
          'create policy %I on public.daily_subtasks for %s to authenticated using ((select auth.uid()) = user_id)',
          policy_name,
          command_name
        );
      elsif command_name = 'insert' then
        execute format(
          'create policy %I on public.daily_subtasks for insert to authenticated with check ((select auth.uid()) = user_id)',
          policy_name
        );
      else
        execute format(
          'create policy %I on public.daily_subtasks for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id)',
          policy_name
        );
      end if;
    end if;
  end loop;
end
$$;

insert into public.daily_subtasks (user_id, task_id, id, text, completed)
select
  task.user_id,
  task.id,
  coalesce(subtask.value->>'id', task.id || ':' || subtask.ordinality::text),
  coalesce(subtask.value->>'text', ''),
  coalesce((subtask.value->>'completed')::boolean, false)
from public.daily_tasks task
cross join lateral jsonb_array_elements(
  case
    when jsonb_typeof(task.payload->'subtasks') = 'array' then task.payload->'subtasks'
    else '[]'::jsonb
  end
) with ordinality as subtask(value, ordinality)
on conflict (user_id, task_id, id) do nothing;

update public.daily_tasks
set payload = payload - 'subtasks'
where payload ? 'subtasks';

commit;
