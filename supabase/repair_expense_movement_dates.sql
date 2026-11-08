begin;

update public.expense_movements
set movement_date = case
  when payload->>'date' ~ '^\d{1,2}/\d{1,2}/\d{4}$'
    then to_date(payload->>'date', 'DD/MM/YYYY')
  when payload->>'date' ~ '^\d{4}-\d{2}-\d{2}$'
    then (payload->>'date')::date
  else movement_date
end
where movement_date is null
  and (
    payload->>'date' ~ '^\d{1,2}/\d{1,2}/\d{4}$'
    or payload->>'date' ~ '^\d{4}-\d{2}-\d{2}$'
  );

commit;

select count(*) as expenses_still_without_date
from public.expense_movements
where movement_date is null;
