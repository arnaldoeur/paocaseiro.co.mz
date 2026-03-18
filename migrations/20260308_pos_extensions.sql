
-- POS Enhancements Migration
-- 1. Add barcode to products table
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='products' AND column_name='barcode') THEN
        ALTER TABLE products ADD COLUMN barcode TEXT UNIQUE;
    END IF;
END $$;

-- 2. Update orders table with payment details for cash handling
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='orders' AND column_name='amount_received') THEN
        ALTER TABLE orders ADD COLUMN amount_received NUMERIC DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='orders' AND column_name='change_given') THEN
        ALTER TABLE orders ADD COLUMN change_given NUMERIC DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='orders' AND column_name='session_id') THEN
        ALTER TABLE orders ADD COLUMN session_id UUID;
    END IF;
END $$;

-- 3. Create cash_sessions table for register management
CREATE TABLE IF NOT EXISTS cash_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    opened_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    closed_at TIMESTAMP WITH TIME ZONE,
    initial_balance NUMERIC DEFAULT 0,
    final_balance NUMERIC DEFAULT 0,
    status TEXT DEFAULT 'open', -- 'open', 'closed'
    user_id TEXT,
    notes TEXT
);

-- 4. Enable RLS and add basic policies
ALTER TABLE cash_sessions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable all access for all users" ON cash_sessions;
CREATE POLICY "Enable all access for all users" ON cash_sessions FOR ALL USING (true) WITH CHECK (true);
