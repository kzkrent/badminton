-- Stage 4: live updates for viewers. Realtime respects RLS, so drafts stay hidden.
alter publication supabase_realtime add table public.matches, public.tournaments;
