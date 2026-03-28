-- Fix RLS for queue_tickets to allow Admin Panel updates
-- The Admin Panel uses a custom team_members authentication and doesn't sign into Supabase Auth.
-- This patch allows 'anon' role to update tickets, restricted to valid status transitions if needed.

DROP POLICY IF EXISTS "Admin Update Access" ON public.queue_tickets;

CREATE POLICY "Admin Update Access"
ON public.queue_tickets FOR UPDATE
USING (true);

-- Ensure all users can select and insert too (already in primary, but reinforcing)
DROP POLICY IF EXISTS "Public Read Access" ON public.queue_tickets;
CREATE POLICY "Public Read Access" ON public.queue_tickets FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public Insert Access" ON public.queue_tickets;
CREATE POLICY "Public Insert Access" ON public.queue_tickets FOR INSERT WITH CHECK (true);
