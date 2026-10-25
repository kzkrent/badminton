-- Fill the playoff bracket with the best of the next places (SPEC 5.6).
alter table public.tournaments add column fill_bracket boolean not null default false;
