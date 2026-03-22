import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://bqiegszufcqimlvucrpm.supabase.co';
const supabaseKey = 'sb_publishable_qRQDGEPxtpR2Je8qjvZgRg_ap-lADS1';
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
    const { data, error } = await supabase.from('products').select('*').eq('is_available', true);
    if (error) console.error(error);
    
    const categories = {};
    for (const p of data || []) {
        if (!categories[p.category]) categories[p.category] = [];
        categories[p.category].push(p.name);
    }
    
    for (const cat of Object.keys(categories)) {
        console.log(`\n=== Categoria: ${cat} ===`);
        console.log(categories[cat].join(', '));
    }
}
check();
