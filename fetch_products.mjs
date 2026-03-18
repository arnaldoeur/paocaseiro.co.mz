import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://bqiegszufcqimlvucrpm.supabase.co';
const supabaseKey = 'sb_publishable_qRQDGEPxtpR2Je8qjvZgRg_ap-lADS1';
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
    try {
        const { data, error } = await supabase.from('products').select('name, category, price, stock_quantity');
        if (error) {
            console.error('Error fetching:', error);
            return;
        }
        
        const categories = [...new Set(data.map(p => p.category))];
        console.log('--- DB Categories ---');
        console.dir(categories);
        console.log('\n--- DB Products ---');
        console.log(data);
    } catch (e) {
        console.error('Catch error:', e);
    }
}
check();
