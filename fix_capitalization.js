import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing supabase credentials in env");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

function toTitleCase(str) {
    if (!str) return str;
    // Lowercase the whole string
    let lower = str.toLowerCase();

    // Title case only the first letter
    return lower.charAt(0).toUpperCase() + lower.slice(1);
}

async function fixCapitalization() {
    const { data: products, error } = await supabase.from('products').select('id, name');

    if (error) {
        console.error("Error fetching products", error);
        return;
    }

    console.log(`Found ${products.length} products to check...`);

    let updatedCount = 0;
    for (const product of products) {
        const cleanName = toTitleCase(product.name);
        if (cleanName !== product.name) {
            console.log(`Updating "${product.name}" -> "${cleanName}"`);
            const { error: updateErr } = await supabase
                .from('products')
                .update({ name: cleanName })
                .eq('id', product.id);

            if (updateErr) {
                console.error(`Failed to update ${product.id}`, updateErr);
            } else {
                updatedCount++;
            }
        }
    }

    console.log(`Finished updating ${updatedCount} products to Title case.`);
}

fixCapitalization();
