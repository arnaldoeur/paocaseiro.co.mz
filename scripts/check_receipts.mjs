import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://bqiegszufcqimlvucrpm.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJxaWVnc3p1ZmNxaW1sdnVjcnBtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEyNzA4MzgsImV4cCI6MjA4Njg0NjgzOH0.AvypZPxytOhoftIFjmK_KclmF3yf_vps-xxzYw9q18k';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkReceipts() {
    const { data, error } = await supabase.from('receipts').select('*').limit(1);
    console.log("RECEIPTS SCHEMA:", error || Object.keys(data?.[0] || {}));
}

checkReceipts();
