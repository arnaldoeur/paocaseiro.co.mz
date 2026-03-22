import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://bqiegszufcqimlvucrpm.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJxaWVnc3p1ZmNxaW1sdnVjcnBtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEyNzA4MzgsImV4cCI6MjA4Njg0NjgzOH0.AvypZPxytOhoftIFjmK_KclmF3yf_vps-xxzYw9q18k';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkRealOrder() {
    const { data: order } = await supabase.from('orders').select('*').order('created_at', { ascending: false }).limit(1);
    if (!order || !order[0]) return console.log("NO ORDERS");
    const selectedOrder = order[0];
    console.log("FOUND ORDER:", selectedOrder.id, selectedOrder.short_id);

    const receiptData = {
        order_id: selectedOrder.id,
        customer_id: selectedOrder.customer_id,
        customer_name: selectedOrder.customer?.name || 'Test',
        receipt_no: `REC-${selectedOrder.short_id}`,
        date: new Date().toISOString().split('T')[0],
        total_amount: selectedOrder.total,
        currency: 'MT',
        document_type: 'Receipt',
        items: selectedOrder.items,
        status: 'paid',
        created_at: new Date().toISOString()
    };

    const { data, error } = await supabase.from('receipts').insert([receiptData]).select().single();
    if (error) {
        console.error("EXACT ERROR OCURRED:", error);
    } else {
        console.log("SUCCESS WITH REAL ORDER_ID", data.id);
        await supabase.from('receipts').delete().eq('id', data.id);
    }
}

checkRealOrder();
