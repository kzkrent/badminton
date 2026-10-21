-- Several photos per partner (e.g. their products), stored under partners/ in the tournament-photos bucket.
alter table public.partners add column photo_paths text[] not null default '{}';
