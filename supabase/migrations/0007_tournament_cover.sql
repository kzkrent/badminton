-- Tournament cover image (stored in the tournament-photos bucket under <tournament id>/cover-*.jpg).
alter table public.tournaments add column cover_path text;
