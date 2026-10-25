-- Up to 8 advance from a group (the app also keeps it <= group size - 1).
alter table public.tournaments drop constraint if exists tournaments_advance_per_group_check;
alter table public.tournaments
  add constraint tournaments_advance_per_group_check check (advance_per_group between 1 and 8);
