-- "Наши партнеры": league sponsors, managed by the owner. Logos live in the
-- tournament-photos bucket under partners/.

create table public.partners (
  id             uuid primary key default gen_random_uuid(),
  name           text not null check (length(trim(name)) > 0),
  name_en        text,
  url            text,
  description_ru text,
  description_en text,
  logo_path      text,
  sort           int not null default 0,
  created_at     timestamptz not null default now()
);

alter table public.partners enable row level security;

create policy "partners: everyone reads" on public.partners for select to anon, authenticated
  using (true);
create policy "partners: owner writes" on public.partners for all to authenticated
  using (public.is_owner()) with check (public.is_owner());
