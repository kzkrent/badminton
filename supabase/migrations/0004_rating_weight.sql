-- Tournament weight for the Elo rating: K is multiplied by it (0 = not rated).
alter table public.tournaments
  add column rating_weight numeric(4, 2) not null default 1
  check (rating_weight >= 0 and rating_weight <= 3);

-- Only the owner may set a non-default weight or change it (admins can still edit other fields).
create or replace function public.guard_rating_weight()
returns trigger language plpgsql as $$
begin
  -- auth.uid() is null in the SQL editor / service context: allowed.
  if auth.uid() is not null and not public.is_owner() and (
    (tg_op = 'INSERT' and new.rating_weight <> 1) or
    (tg_op = 'UPDATE' and new.rating_weight is distinct from old.rating_weight)
  ) then
    raise exception 'only the owner can change rating_weight';
  end if;
  return new;
end $$;

create trigger tournaments_guard_rating_weight before insert or update on public.tournaments
  for each row execute function public.guard_rating_weight();
