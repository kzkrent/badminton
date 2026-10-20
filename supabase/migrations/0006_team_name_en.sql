-- English team name; the English site falls back to the Russian one (like player names).
alter table public.participants add column team_name_en text;
