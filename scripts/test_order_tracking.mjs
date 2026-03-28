import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function testStatusUpdate() {
    // 1. Find a recent order
    const { data: order, error } = await supabase
        .from('orders')
        .select('id, status, short_id')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

    if (error || !order) {
        console.error('No order found to test:', error);
        return;
    }

    console.log(`Found order: ${order.short_id} (${order.id}) with status: ${order.status}`);

    const statuses = ['pending', 'confirmed', 'kitchen', 'ready', 'delivering', 'delivered'];
    
    // 2. Cycle through statuses with delay
    for (const status of statuses) {
        console.log(`Updating to: ${status}...`);
        const { error: updateError } = await supabase
            .from('orders')
            .update({ status })
            .eq('id', order.id);

        if (updateError) {
            console.error(`Error updating to ${status}:`, updateError);
        } else {
            console.log(`Successfully updated to ${status}`);
        }
        
        await new Promise(resolve => setTimeout(resolve, 3000));
    }

    console.log('Verification cycle complete.');
}

testStatusUpdate();
