-- Announcements: a public "announced" stage between draft and active, plus event details.
-- Existing policies already treat every status except 'draft' as public.
alter type public.tournament_status add value if not exists 'announced' after 'draft';

alter table public.tournaments
  add column venue_ru             text,
  add column venue_en             text,
  add column start_time           time,
  add column announcement_ru      text,
  add column announcement_en      text,
  add column registration_contact text;
