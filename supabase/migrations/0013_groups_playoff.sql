-- Groups + playoff tournaments.

alter type public.match_format add value if not exists 'best_of_five';

alter table public.tournaments drop constraint if exists tournaments_type_check;
alter table public.tournaments
  add constraint tournaments_type_check check (type in ('league', 'groups_playoff')),
  add column groups_count      smallint check (groups_count between 2 and 8),
  add column advance_per_group smallint check (advance_per_group between 1 and 4),
  add column group_seeding     text check (group_seeding in ('rating', 'random', 'manual')),
  add column third_place       boolean not null default true,
  -- {"final": {"match_format": "best_of_three", "game_target": 21, "balance": true, "balance_cap": 30}, "sf": {...}, ...}
  add column playoff_settings  jsonb;

alter table public.participants add column group_no smallint check (group_no between 1 and 8);

-- Playoff matches exist before both participants are known.
alter table public.matches
  alter column home_id drop not null,
  alter column away_id drop not null,
  add column stage    text not null default 'group' check (stage in ('group', 'playoff')),
  add column group_no smallint,
  -- playoff: tour = round (1 = first), slot = position in the round; in the last round slot 1 is the 3rd-place match
  add column slot     smallint;
