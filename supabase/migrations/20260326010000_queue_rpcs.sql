-- Migration: 20260326010000_queue_rpcs.sql
-- Goal: Create security definer functions to handle queue actions without RLS restrictions

-- 1. Generate a new ticket with automatic number and priority handling
CREATE OR REPLACE FUNCTION public.generate_queue_ticket(p_priority BOOLEAN DEFAULT false)
RETURNS JSONB AS $$
DECLARE
    new_ticket RECORD;
    next_num INTEGER;
BEGIN
    -- Calculate next sequence number for today
    SELECT COALESCE(MAX(ticket_number::INTEGER), 0) + 1 INTO next_num
    FROM public.queue_tickets
    WHERE created_at >= CURRENT_DATE;

    INSERT INTO public.queue_tickets (ticket_number, is_priority, status, created_at)
    VALUES (LPAD(next_num::TEXT, 2, '0'), p_priority, 'waiting', NOW())
    RETURNING * INTO new_ticket;

    RETURN to_jsonb(new_ticket);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Call a ticket (sets status to 'calling' and assigns a counter)
CREATE OR REPLACE FUNCTION public.call_queue_ticket(p_id UUID, p_counter TEXT)
RETURNS JSONB AS $$
DECLARE
    updated_record RECORD;
BEGIN
    UPDATE public.queue_tickets
    SET status = 'calling',
        counter = p_counter,
        called_at = NOW()
    WHERE id = p_id
    RETURNING * INTO updated_record;

    RETURN to_jsonb(updated_record);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Complete a ticket
CREATE OR REPLACE FUNCTION public.complete_queue_ticket(p_id UUID)
RETURNS JSONB AS $$
DECLARE
    updated_record RECORD;
BEGIN
    UPDATE public.queue_tickets
    SET status = 'completed'
    WHERE id = p_id
    RETURNING * INTO updated_record;

    RETURN to_jsonb(updated_record);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Skip a ticket (customer missed call)
CREATE OR REPLACE FUNCTION public.skip_queue_ticket(p_id UUID)
RETURNS JSONB AS $$
DECLARE
    updated_record RECORD;
BEGIN
    UPDATE public.queue_tickets
    SET status = 'skipped'
    WHERE id = p_id
    RETURNING * INTO updated_record;

    RETURN to_jsonb(updated_record);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Cancel a ticket
CREATE OR REPLACE FUNCTION public.cancel_queue_ticket(p_id UUID)
RETURNS JSONB AS $$
DECLARE
    updated_record RECORD;
BEGIN
    UPDATE public.queue_tickets
    SET status = 'cancelled'
    WHERE id = p_id
    RETURNING * INTO updated_record;

    RETURN to_jsonb(updated_record);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Generic update for any other details (ticket number, priority, etc)
CREATE OR REPLACE FUNCTION public.update_queue_ticket_details(p_id UUID, p_updates JSONB)
RETURNS JSONB AS $$
DECLARE
    updated_record RECORD;
BEGIN
    UPDATE public.queue_tickets
    SET 
        ticket_number = COALESCE((p_updates->>'ticket_number'), ticket_number),
        is_priority = COALESCE((p_updates->>'is_priority')::BOOLEAN, is_priority),
        counter = COALESCE((p_updates->>'counter'), counter),
        status = COALESCE((p_updates->>'status'), status)
    WHERE id = p_id
    RETURNING * INTO updated_record;

    RETURN to_jsonb(updated_record);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
