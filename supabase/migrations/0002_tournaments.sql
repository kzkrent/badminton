-- Stage 2: tournaments, participants, schedule.

create type public.tournament_status as enum ('draft', 'active', 'finished');
-- M = men's singles, F = women's singles, MF = mixed, MM = men's doubles, FF = women's doubles
create type public.discipline as enum ('M', 'F', 'MF', 'MM', 'FF');
create type public.match_format as enum ('two_games', 'best_of_three');

create table public.tournaments (
  id           uuid primary key default gen_random_uuid(),
  name_ru      text not null check (length(trim(name_ru)) > 0),
  name_en      text,
  type         text not null default 'league' check (type in ('league')),
  rounds       smallint not null default 1 check (rounds in (1, 2)),
  discipline   public.discipline not null,
  match_format public.match_format not null,
  game_target  smallint not null check (game_target in (15, 21)),
  balance      boolean not null default true,
  balance_cap  smallint check (balance_cap is null or balance_cap > game_target),
  starts_on    date,
  status       public.tournament_status not null default 'draft',
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  check (not balance or balance_cap is not null)
);

create trigger tournaments_touch before update on public.tournaments
  for each row execute function public.touch_updated_at();

create table public.participants (
  id            uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tournaments on delete cascade,
  player1_id    uuid not null references public.players on delete restrict,
  player2_id    uuid references public.players on delete restrict,
  team_name     text,
  created_at    timestamptz not null default now(),
  check (player2_id is null or player2_id <> player1_id)
);

create index participants_tournament_idx on public.participants (tournament_id);

create table public.matches (
  id            uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tournaments on delete cascade,
  tour          smallint not null check (tour > 0),
  position      smallint not null,
  home_id       uuid not null references public.participants on delete cascade,
  away_id       uuid not null references public.participants on delete cascade,
  -- [[home, away], ...] per game; null until played
  games         jsonb,
  walkover_winner_id uuid references public.participants on delete set null,
  updated_at    timestamptz not null default now(),
  check (home_id <> away_id)
);

create index matches_tournament_idx on public.matches (tournament_id, tour, position);

create trigger matches_touch before update on public.matches
  for each row execute function public.touch_updated_at();

-- ───────────── Access ─────────────

-- Drafts are visible to staff only.
create or replace function public.can_view_tournament(t_id uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.tournaments t
    where t.id = t_id and (t.status <> 'draft' or public.is_staff())
  )
$$;

-- Owner edits anything; admins edit until the tournament is finished.
create or replace function public.can_edit_tournament(t_id uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select public.is_owner() or (
    public.is_staff() and exists (
      select 1 from public.tournaments t where t.id = t_id and t.status <> 'finished'
    )
  )
$$;

alter table public.tournaments enable row level security;
alter table public.participants enable row level security;
alter table public.matches enable row level security;

create policy "tournaments: read" on public.tournaments for select to anon, authenticated
  using (status <> 'draft' or public.is_staff());
create policy "tournaments: staff creates" on public.tournaments for insert to authenticated
  with check (public.is_staff() and status = 'draft');
create policy "tournaments: edit" on public.tournaments for update to authenticated
  using (public.is_owner() or (public.is_staff() and status <> 'finished'))
  with check (public.is_staff());
create policy "tournaments: delete" on public.tournaments for delete to authenticated
  using (public.is_owner() or (public.is_staff() and status = 'draft'));

create policy "participants: read" on public.participants for select to anon, authenticated
  using (public.can_view_tournament(tournament_id));
create policy "participants: write" on public.participants for all to authenticated
  using (public.can_edit_tournament(tournament_id))
  with check (public.can_edit_tournament(tournament_id));

create policy "matches: read" on public.matches for select to anon, authenticated
  using (public.can_view_tournament(tournament_id));
create policy "matches: write" on public.matches for all to authenticated
  using (public.can_edit_tournament(tournament_id))
  with check (public.can_edit_tournament(tournament_id));
