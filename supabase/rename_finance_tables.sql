begin;

do $$
begin
  if to_regclass('public.expenses') is not null then
    if to_regclass('public.expense_movements') is not null then
      raise exception 'Both public.expenses and public.expense_movements exist; resolve the duplicate tables before renaming.';
    end if;
    alter table public.expenses rename to expense_movements;
  elsif to_regclass('public.expense_movements') is null then
    raise exception 'Neither public.expenses nor public.expense_movements exists.';
  end if;

  if to_regclass('public.recurring_movements') is not null then
    if to_regclass('public.expense_recurring_movements') is not null then
      raise exception 'Both public.recurring_movements and public.expense_recurring_movements exist; resolve the duplicate tables before renaming.';
    end if;
    alter table public.recurring_movements rename to expense_recurring_movements;
  elsif to_regclass('public.expense_recurring_movements') is null then
    raise exception 'Neither public.recurring_movements nor public.expense_recurring_movements exists.';
  end if;

  if to_regclass('public.savings_goals') is not null then
    if to_regclass('public.expense_savings_goals') is not null then
      raise exception 'Both public.savings_goals and public.expense_savings_goals exist; resolve the duplicate tables before renaming.';
    end if;
    alter table public.savings_goals rename to expense_savings_goals;
  elsif to_regclass('public.expense_savings_goals') is null then
    raise exception 'Neither public.savings_goals nor public.expense_savings_goals exists.';
  end if;
end
$$;

commit;
