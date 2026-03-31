import { createClient } from '@supabase/supabase-js';
import { translations } from '../translations.ts';

const supabaseUrl = 'https://bqiegszufcqimlvucrpm.supabase.co';
const supabaseKey = 'sb_publishable_qRQDGEPxtpR2Je8qjvZgRg_ap-lADS1'; // Using the publishable key from SUPABASE_ACCESS.md
const supabase = createClient(supabaseUrl, supabaseKey);

const products = translations.pt.menu.sections.flatMap(section =>
    section.items.map(item => ({
        name: item.name,
        name_en: translations.en.menu.sections.find(s => s.title.includes(section.title))?.items.find(i => i.price === item.price)?.name || item.name, // Rough match for EN name
        description: item.desc,
        price: item.price,
        category: section.title,
        image: item.image,
        is_available: true,
        stock_quantity: 100,
        unit: 'un',
        currency: 'MZN'
    }))
);

async function restore() {
    console.log(`Attempting to restore ${products.length} products...`);

    // First, clear existing (optional, but requested "restore all")
    // Note: Deleting might fail if there are foreign key constraints from orders/etc.
    // Given the user said "lost products", maybe we just insert missing ones or upsert.

    for (const product of products) {
        const { data, error } = await supabase
            .from('products')
            .upsert(product, { onConflict: 'name' }); // Assuming name is unique enough for this restoration

        if (error) {
            console.error(`Error inserting ${product.name}:`, error.message);
        } else {
            console.log(`Restored: ${product.name}`);
        }
    }

    console.log('Restoration complete.');
}

restore();
