-- Migration: 20260327000000_update_queue_rpcs.sql
-- Goal: Update generate_queue_ticket to support phone and category, and fix sequence logic

-- Ensure columns exist
ALTER TABLE public.queue_tickets ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'Geral';
ALTER TABLE public.queue_tickets ADD COLUMN IF NOT EXISTS customer_phone TEXT;

CREATE OR REPLACE FUNCTION public.generate_queue_ticket_v3(
    p_priority BOOLEAN DEFAULT false,
    p_phone TEXT DEFAULT NULL,
    p_category TEXT DEFAULT 'Geral'
)
RETURNS JSONB AS $$
DECLARE
    new_ticket RECORD;
    next_num INTEGER;
    mz_today DATE;
BEGIN
    -- Get current date in Maputo (UTC+2)
    mz_today := (CURRENT_TIMESTAMP AT TIME ZONE 'Africa/Maputo')::DATE;

    -- Calculate next sequence number for today in Maputo
    SELECT COALESCE(MAX(ticket_number::INTEGER), 0) + 1 INTO next_num
    FROM public.queue_tickets
    WHERE (created_at AT TIME ZONE 'Africa/Maputo')::DATE = mz_today;

    INSERT INTO public.queue_tickets (
        ticket_number, 
        is_priority, 
        status, 
        customer_phone, 
        category,
        created_at
    )
    VALUES (
        LPAD(next_num::TEXT, 2, '0'), 
        p_priority, 
        'waiting', 
        p_phone, 
        p_category,
        NOW()
    )
    RETURNING * INTO new_ticket;

    RETURN to_jsonb(new_ticket);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
