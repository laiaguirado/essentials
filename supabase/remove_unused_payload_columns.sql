begin;

alter table public.daily_tasks drop column if exists payload;
alter table public.daily_reminders drop column if exists payload;
alter table public.expense_movements drop column if exists payload;
alter table public.expense_recurring_movements drop column if exists payload;
alter table public.expense_savings_goals drop column if exists payload;
alter table public.notes drop column if exists payload;

commit;
