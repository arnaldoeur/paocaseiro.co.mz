-- Migration: 20260326020000_add_priority_column.sql
-- Goal: Add is_priority column to queue_tickets table

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='queue_tickets' AND column_name='is_priority') THEN
        ALTER TABLE public.queue_tickets ADD COLUMN is_priority BOOLEAN DEFAULT false;
    END IF;
END $$;
