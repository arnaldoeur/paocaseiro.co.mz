-- Add is_priority and customer_phone columns to queue_tickets
ALTER TABLE public.queue_tickets ADD COLUMN IF NOT EXISTS is_priority BOOLEAN DEFAULT FALSE;
ALTER TABLE public.queue_tickets ADD COLUMN IF NOT EXISTS customer_phone TEXT;

-- Update generate_queue_ticket function to handle priority and phone
CREATE OR REPLACE FUNCTION generate_queue_ticket(
    p_priority BOOLEAN DEFAULT FALSE,
    p_phone TEXT DEFAULT NULL
)
RETURNS json AS $$
DECLARE
    v_prefix TEXT;
    v_count INTEGER;
    v_ticket_number TEXT;
    v_result RECORD;
BEGIN
    v_prefix := CASE WHEN p_priority THEN 'P' ELSE 'N' END;
    
    -- Count tickets from today with the same priority
    SELECT count(*) + 1 INTO v_count
    FROM queue_tickets
    WHERE (created_at AT TIME ZONE 'UTC') >= (CURRENT_DATE AT TIME ZONE 'UTC')
    AND is_priority = p_priority;
    
    v_ticket_number := v_prefix || LPAD(v_count::TEXT, 2, '0');
    
    INSERT INTO queue_tickets (ticket_number, is_priority, status, customer_phone)
    VALUES (v_ticket_number, p_priority, 'waiting', p_phone)
    RETURNING * INTO v_result;
    
    RETURN row_to_json(v_result);
END;
$$ LANGUAGE plpgsql;
