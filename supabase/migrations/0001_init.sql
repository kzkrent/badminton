-- Stage 1: staff roles, players database, player photos.
-- Run in Supabase Dashboard → SQL Editor (or `supabase db push`).

-- ───────────── Staff (owner / admins) ─────────────

create type public.staff_role as enum ('owner', 'admin');

create table public.staff (
  email      text primary key check (email = lower(email)),
  role       public.staff_role not null,
  created_at timestamptz not null default now()
);

-- Role of the signed-in user, or null for viewers.
create or replace function public.current_staff_role()
returns public.staff_role
language sql stable security definer set search_path = public
as $$
  select role from public.staff where email = lower(auth.jwt() ->> 'email')
$$;

create or replace function public.is_staff()
returns boolean
language sql stable
as $$ select public.current_staff_role() is not null $$;

create or replace function public.is_owner()
returns boolean
language sql stable
as $$ select public.current_staff_role() = 'owner' $$;

-- Used by the login form: magic links are sent only to staff emails.
create or replace function public.can_sign_in(p_email text)
returns boolean
language sql stable security definer set search_path = public
as $$ select exists (select 1 from public.staff where email = lower(trim(p_email))) $$;

grant execute on function public.can_sign_in(text) to anon, authenticated;

alter table public.staff enable row level security;

create policy "staff: staff can read"
  on public.staff for select to authenticated
  using (public.is_staff());

-- Owners are assigned only via SQL; the owner manages admins from the UI.
create policy "staff: owner adds admins"
  on public.staff for insert to authenticated
  with check (public.is_owner() and role = 'admin');

create policy "staff: owner removes admins"
  on public.staff for delete to authenticated
  using (public.is_owner() and role = 'admin');

-- ───────────── Players ─────────────

create table public.players (
  id            uuid primary key default gen_random_uuid(),
  first_name_ru text not null check (length(trim(first_name_ru)) > 0),
  last_name_ru  text,
  first_name_en text,
  last_name_en  text,
  birth_date    date,
  gender        char(1) not null check (gender in ('M', 'F')),
  photo_path    text,
  club          text,
  rating        numeric(8, 2),
  achievements  text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index players_last_name_ru_idx on public.players (last_name_ru, first_name_ru);

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

create trigger players_touch before update on public.players
  for each row execute function public.touch_updated_at();

alter table public.players enable row level security;

create policy "players: everyone reads"
  on public.players for select to anon, authenticated
  using (true);

create policy "players: staff creates"
  on public.players for insert to authenticated
  with check (public.is_staff());

create policy "players: owner edits"
  on public.players for update to authenticated
  using (public.is_owner()) with check (public.is_owner());

create policy "players: owner deletes"
  on public.players for delete to authenticated
  using (public.is_owner());

-- ───────────── Player photos (public bucket) ─────────────

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('player-photos', 'player-photos', true, 5242880,
        array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

create policy "player-photos: staff uploads"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'player-photos' and public.is_staff());

create policy "player-photos: owner updates"
  on storage.objects for update to authenticated
  using (bucket_id = 'player-photos' and public.is_owner());

create policy "player-photos: owner deletes"
  on storage.objects for delete to authenticated
  using (bucket_id = 'player-photos' and public.is_owner());
