import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://bqiegszufcqimlvucrpm.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJxaWVnc3p1ZmNxaW1sdnVjcnBtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEyNzA4MzgsImV4cCI6MjA4Njg0NjgzOH0.AvypZPxytOhoftIFjmK_KclmF3yf_vps-xxzYw9q18k';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSchema() {
    // Check customers
    const { data: cData, error: cErr } = await supabase.from('customers').select('*').limit(1);
    console.log("CUSTOMERS SCHEMA:", cErr || Object.keys(cData?.[0] || {}));

    // Check products
    const { data: pData, error: pErr } = await supabase.from('products').select('*').limit(1);
    console.log("PRODUCTS SCHEMA:", pErr || Object.keys(pData?.[0] || {}));

    // Update pizza category
    const { error: pizzaErr } = await supabase.from('products').update({ category: 'Pizzaria' }).eq('name', 'Pizza de atum');
    console.log("UPDATE PIZZA:", pizzaErr ? pizzaErr : "Success");
}

checkSchema();
