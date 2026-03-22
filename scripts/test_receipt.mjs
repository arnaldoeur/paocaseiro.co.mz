import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://bqiegszufcqimlvucrpm.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJxaWVnc3p1ZmNxaW1sdnVjcnBtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEyNzA4MzgsImV4cCI6MjA4Njg0NjgzOH0.AvypZPxytOhoftIFjmK_KclmF3yf_vps-xxzYw9q18k';
const supabase = createClient(supabaseUrl, supabaseKey);

async function testGenerateReceipt() {
    const orderId = 'dummy-uuid-here';
    const shortId = '12345';
    // Passing undefined because POS might pass customer_id undefined
    const customerId = undefined;
    const customerName = 'Cliente Balcão';
    const totalAmount = 100;
    const documentType = 'Receipt';
    const items = [{ name: 'Test', quantity: 1, price: 100 }];

    const receiptNo = documentType === 'Receipt' ? `REC-${shortId}` : `FAT-${shortId}`;
    const receiptData = {
        order_id: null,
        customer_id: customerId,
        customer_name: customerName,
        receipt_no: receiptNo,
        date: new Date().toISOString().split('T')[0],
        total_amount: totalAmount,
        currency: 'MT',
        document_type: documentType,
        items: items,
        status: 'paid',
        created_at: new Date().toISOString()
    };
    
    console.log("SENDING DATA", receiptData);
    const { data, error } = await supabase.from('receipts').insert([receiptData]).select().single();
    if (error) {
        console.error("ERROR:", error);
    } else {
        console.log("SUCCESS:", data);
        await supabase.from('receipts').delete().eq('id', data.id);
    }
}

testGenerateReceipt();
