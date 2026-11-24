begin;

alter table public.expense_movements
  add column if not exists account text not null default 'general';

alter table public.expense_movements
  drop constraint if exists expense_movements_account_check;

alter table public.expense_movements
  add constraint expense_movements_account_check
  check (account in ('general', 'goals'));

insert into public.expense_movements (
  user_id, id, description, amount, category, type, movement_date, account
)
select
  user_id,
  'goal-opening-' || id || '-goals',
  'Saldo inicial de meta: ' || name || ' (Cuenta metas)',
  saved,
  'goal-opening',
  'income',
  current_date,
  'goals'
from public.expense_savings_goals
where saved > 0
on conflict (user_id, id) do nothing;

commit;
