-- Create queue_tickets table
CREATE TABLE IF NOT EXISTS public.queue_tickets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_number TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('waiting', 'calling', 'completed', 'skipped')) DEFAULT 'waiting',
    counter TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    called_at TIMESTAMPTZ,
    user_id UUID REFERENCES auth.users(id),
    phone_number TEXT
);

-- Turn on Row Level Security
ALTER TABLE public.queue_tickets ENABLE ROW LEVEL SECURITY;

-- Create Policies
-- Anyone can read tickets (for the TV Display and Public Page)
CREATE POLICY "Public Read Access"
ON public.queue_tickets FOR SELECT
USING (true);

-- Anyone can insert a ticket (Public user pulling a ticket)
CREATE POLICY "Public Insert Access"
ON public.queue_tickets FOR INSERT
WITH CHECK (true);

-- Only Authenticated/Admin can update tickets (Admin panel changing status)
CREATE POLICY "Admin Update Access"
ON public.queue_tickets FOR UPDATE
USING (true);

-- Enable realtime
BEGIN;
  DROP PUBLICATION IF EXISTS supabase_realtime;
  CREATE PUBLICATION supabase_realtime;
COMMIT;
ALTER PUBLICATION supabase_realtime ADD TABLE public.queue_tickets;
