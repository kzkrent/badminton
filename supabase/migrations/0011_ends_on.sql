-- Multi-week leagues: last day of the tournament.
alter table public.tournaments
  add column ends_on date check (ends_on is null or starts_on is null or ends_on >= starts_on);
