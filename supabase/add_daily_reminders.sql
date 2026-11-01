alter table public.user_data
  drop constraint if exists user_data_key_check;

alter table public.user_data
  add constraint user_data_key_check
  check (key in ('dailyTasks', 'dailyHabits', 'dailyReminders', 'expenses', 'expenseBudgets'));
