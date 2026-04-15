import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: resolve(__dirname, '../.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing supabase credentials");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testGenerateReceipt() {
    // 1. Get an existing order
    const { data: orders, error: ordersError } = await supabase
        .from('orders')
        .select('*')
        .limit(1);
        
    if (ordersError || !orders || orders.length === 0) {
        console.error("Could not fetch order:", ordersError);
        return;
    }
    
    const order = orders[0];
    console.log("Testing with order:", order.short_id || order.id);

    // 2. Simulate generateReceipt args
    const orderId = order.id;
    const shortId = order.short_id || "TEST-01";
    const customerId = order.customer_id || null;
    const customerName = order.customer_name || "Venda Local (Balcão)";
    const items = order.items || [];
    const totalAmount = order.total_amount || 0;
    
    // Simulate what generateReceipt does internally for Supabase Insert
    const primaryNo = `REC-${shortId}`;
    const primaryData = {
        order_id: orderId,
        customer_id: customerId,
        customer_name: customerName,
        receipt_no: primaryNo,
        date: new Date().toISOString().split('T')[0],
        total_amount: totalAmount,
        currency: 'MT',
        document_type: 'Receipt',
        items: items,
        status: 'paid',
        created_at: new Date().toISOString()
    };
    
    console.log("Inserting receipt:", primaryData);
    const { data, error } = await supabase.from('receipts').insert([primaryData]).select().single();
    
    if (error) {
        console.error("\n❌ SUPABASE INSERT ERROR:");
        console.error(error);
    } else {
        console.log("\n✅ SUCCESS! Inserted data:", data);
        
        // Clean up test receipt if successful
        await supabase.from('receipts').delete().eq('id', data.id);
    }
}

testGenerateReceipt();
