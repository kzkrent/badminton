-- Tournament photo gallery ("Как это было"). Staff upload at any status, including finished tournaments.

create table public.tournament_photos (
  id            uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tournaments on delete cascade,
  path          text not null,
  thumb_path    text not null,
  width         int,
  height        int,
  uploaded_by   text not null default lower(auth.jwt() ->> 'email'),
  created_at    timestamptz not null default now()
);

create index tournament_photos_tournament_idx on public.tournament_photos (tournament_id, created_at);

alter table public.tournament_photos enable row level security;

create policy "photos: read" on public.tournament_photos for select to anon, authenticated
  using (public.can_view_tournament(tournament_id));
create policy "photos: staff uploads" on public.tournament_photos for insert to authenticated
  with check (public.is_staff() and uploaded_by = lower(auth.jwt() ->> 'email'));
-- Owner deletes any photo; an admin deletes only their own.
create policy "photos: delete" on public.tournament_photos for delete to authenticated
  using (public.is_owner() or (public.is_staff() and uploaded_by = lower(auth.jwt() ->> 'email')));

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('tournament-photos', 'tournament-photos', true, 10485760, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

create policy "tournament-photos: staff uploads" on storage.objects for insert to authenticated
  with check (bucket_id = 'tournament-photos' and public.is_staff());
create policy "tournament-photos: delete" on storage.objects for delete to authenticated
  using (bucket_id = 'tournament-photos' and (public.is_owner() or (public.is_staff() and owner = auth.uid())));
-- The Storage API reads the object row before deleting it.
create policy "tournament-photos: staff reads" on storage.objects for select to authenticated
  using (bucket_id = 'tournament-photos' and public.is_staff());
