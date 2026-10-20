-- Organizer profiles (public: name + contacts, no emails) and the organizer of each tournament.

create table public.organizers (
  id         uuid primary key default gen_random_uuid(),
  name       text not null check (length(trim(name)) > 0),
  name_en    text,
  phone      text,
  whatsapp   text,
  telegram   text,
  line_id    text,
  created_at timestamptz not null default now()
);

alter table public.staff add column organizer_id uuid references public.organizers on delete set null;
alter table public.tournaments add column organizer_id uuid references public.organizers on delete set null;

-- Profile linked to the signed-in staff member, if any.
create or replace function public.current_organizer_id()
returns uuid
language sql stable security definer set search_path = public
as $$ select organizer_id from public.staff where email = lower(auth.jwt() ->> 'email') $$;

-- Creates (once) and links the signed-in staff member's own profile; returns its id.
create or replace function public.ensure_my_organizer(p_name text)
returns uuid
language plpgsql security definer set search_path = public
as $$
declare
  v_email text := lower(auth.jwt() ->> 'email');
  v_id uuid;
begin
  if not public.is_staff() then
    raise exception 'not staff';
  end if;
  select organizer_id into v_id from public.staff where email = v_email;
  if v_id is null then
    insert into public.organizers (name) values (coalesce(nullif(trim(p_name), ''), split_part(v_email, '@', 1)))
      returning id into v_id;
    update public.staff set organizer_id = v_id where email = v_email;
  end if;
  return v_id;
end $$;

grant execute on function public.ensure_my_organizer(text) to authenticated;

alter table public.organizers enable row level security;

create policy "organizers: everyone reads" on public.organizers for select to anon, authenticated
  using (true);
-- The owner adds extra organizers (e.g. people without a login); staff create their own via ensure_my_organizer().
create policy "organizers: owner adds" on public.organizers for insert to authenticated
  with check (public.is_owner());
create policy "organizers: edit own or owner" on public.organizers for update to authenticated
  using (public.is_owner() or id = public.current_organizer_id())
  with check (public.is_owner() or id = public.current_organizer_id());
create policy "organizers: owner deletes" on public.organizers for delete to authenticated
  using (public.is_owner());
