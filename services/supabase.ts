import { createClient } from '@supabase/supabase-js';

// Replace with your actual Supabase URL and Anon Key
// In production, these should be in .env.local
// Use environment variables for Supabase configuration
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

export const saveOrderToSupabase = async (orderData: any, items: any[]) => {
    try {
        // 1. Upsert Customer (Create or Update based on Phone)
        // We use 'phone' as the unique key to identify "returning customers"
        const { data: customer, error: customerError } = await supabase
            .from('customers')
            .upsert({
                phone: orderData.customer_phone,
                name: orderData.customer_name,
                address: orderData.customer_address,
                last_order_at: new Date().toISOString()
            }, { onConflict: 'phone' })
            .select()
            .single();

        if (customerError) throw customerError;

        // 2. Insert Order (Linked to Customer)
        const { data: order, error: orderError } = await supabase
            .from('orders')
            .insert([{
                ...orderData,
                customer_id: customer.id, // Link to the customer table
                customer_name_snapshot: orderData.customer_name, // Keep snapshot
                customer_phone_snapshot: orderData.customer_phone,
                customer_address_snapshot: orderData.customer_address
            }])
            .select()
            .single();

        if (orderError) throw orderError;

        // 3. Prepare Items with order_id
        const orderItems = items.map(item => ({
            order_id: order.id,
            product_name: item.name,
            quantity: item.quantity,
            price: item.price,
            subtotal: item.price * item.quantity
        }));

        // 4. Insert Items
        const { error: itemsError } = await supabase
            .from('order_items')
            .insert(orderItems);

        if (itemsError) throw itemsError;

        return { success: true, order, customer };
    } catch (error) {
        console.error('Supabase Error:', error);
        return { success: false, error };
    }
};

export const getProducts = async () => {
    try {
        // Fetch products with their variations
        const { data: products, error } = await supabase
            .from('products')
            .select(`
                *,
                variations:product_variations(*)
            `)
            .order('name');

        if (error) throw error;
        return { success: true, data: products };
    } catch (error) {
        console.error('Error fetching products:', error);
        return { success: false, error };
    }
};
