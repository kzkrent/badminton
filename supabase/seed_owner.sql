-- Run once after 0001_init.sql. Replace the email with the owner's login email.
insert into public.staff (email, role)
values (lower('owner@example.com'), 'owner')
on conflict (email) do update set role = 'owner';
