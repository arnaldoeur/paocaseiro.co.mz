require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function simulateOrder() {
    try {
        const orderData = {
            short_id: 'TEST-A1B2',
            payment_ref: 'MP2603108RL9VYQVHZ',
            transaction_id: 'TXN-123456789',
            customer_phone: '+258840000000',
            customer_name: 'John Doe',
            customer_email: 'john@example.com',
            delivery_type: 'pickup',
            delivery_address: 'LOCAL',
            total_amount: 100,
            amount_paid: 100,
            balance: 0,
            status: 'pending'
        };

        console.log('Testing customer upsert...');
        const { data: customer, error: customerError } = await supabase
            .from('customers')
            .upsert({
                contact_no: orderData.customer_phone,
                name: orderData.customer_name,
                email: orderData.customer_email,
                address: orderData.delivery_address,
                last_order_at: new Date().toISOString()
            }, { onConflict: 'contact_no' })
            .select()
            .single();

        if (customerError) {
            console.log('--- CUSTOMER UPSERT ERROR ---');
            console.log(customerError);
            return;
        }

        console.log('Customer Upsert Success:', customer.id);

        console.log('Testing order insert...');
        const { data: order, error: orderError } = await supabase
            .from('orders')
            .insert([{
                short_id: orderData.short_id,
                payment_ref: orderData.payment_ref,
                transaction_id: orderData.transaction_id,
                delivery_type: orderData.delivery_type,
                delivery_address: orderData.delivery_address,
                total_amount: orderData.total_amount,
                amount_paid: orderData.amount_paid,
                balance: orderData.balance,
                status: orderData.status,
                customer_id: customer.id,
                customer_name: orderData.customer_name,
                customer_phone: orderData.customer_phone,
                customer_address: orderData.delivery_address
            }])
            .select()
            .single();

        if (orderError) {
            console.log('--- ORDER INSERT ERROR ---');
            console.log(orderError);
            return;
        }

        console.log('Order Insert Success:', order.id);
    } catch (err) {
        console.log('--- CATCH ERROR ---');
        console.log(err);
    }
}
simulateOrder();
