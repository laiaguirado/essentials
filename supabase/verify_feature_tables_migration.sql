with expected as (
  select
    'dailyTasks' as data_key,
    coalesce(sum(case when jsonb_typeof(value) = 'array' then jsonb_array_length(value) else 0 end), 0)::bigint as row_count
  from public.user_data
  where key = 'dailyTasks'
  union all
  select
    'dailyHabits',
    (
      select count(*)::bigint
      from public.user_data source
      cross join lateral jsonb_each(
        case when jsonb_typeof(source.value) = 'object' then source.value else '{}'::jsonb end
      ) habit(key, value)
      where source.key = 'dailyHabits'
    )
  union all
  select
    'dailyReminders',
    coalesce(sum(case when jsonb_typeof(value) = 'array' then jsonb_array_length(value) else 0 end), 0)::bigint
  from public.user_data
  where key = 'dailyReminders'
  union all
  select
    'expenses',
    coalesce(sum(case when jsonb_typeof(value) = 'array' then jsonb_array_length(value) else 0 end), 0)::bigint
  from public.user_data
  where key = 'expenses'
  union all
  select
    'expenseBudgets',
    (
      select count(*)::bigint
      from public.user_data source
      cross join lateral jsonb_each(
        case
          when exists (
            select 1
            from jsonb_object_keys(
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
    )
  union all
  select
    'recurringMovements',
    coalesce(sum(case when jsonb_typeof(value) = 'array' then jsonb_array_length(value) else 0 end), 0)::bigint
  from public.user_data
  where key = 'recurringMovements'
  union all
  select
    'savingsGoals',
    coalesce(sum(case when jsonb_typeof(value) = 'array' then jsonb_array_length(value) else 0 end), 0)::bigint
  from public.user_data
  where key = 'savingsGoals'
  union all
  select
    'notes',
    coalesce(sum(case when jsonb_typeof(value) = 'array' then jsonb_array_length(value) else 0 end), 0)::bigint
  from public.user_data
  where key = 'notes'
),
migrated as (
  select 'dailyTasks' as data_key, count(*)::bigint as row_count from public.daily_tasks
  union all
  select 'dailyHabits', count(*)::bigint from public.daily_habits
  union all
  select 'dailyReminders', count(*)::bigint from public.daily_reminders
  union all
  select 'expenses', count(*)::bigint from public.expense_movements
  union all
  select 'expenseBudgets', count(*)::bigint from public.expense_budgets
  union all
  select 'recurringMovements', count(*)::bigint from public.expense_recurring_movements
  union all
  select 'savingsGoals', count(*)::bigint from public.expense_savings_goals
  union all
  select 'notes', count(*)::bigint from public.notes
)
select
  expected.data_key,
  expected.row_count as legacy_rows,
  migrated.row_count as new_table_rows,
  expected.row_count <= migrated.row_count as count_check_passed
from expected
join migrated using (data_key)
order by expected.data_key;
