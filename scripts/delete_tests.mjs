import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL; 
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing credentials");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function deleteTestProducts() {
    console.log("Fetching all products...");
    const { data: products, error } = await supabase.from('products').select('*');
    if (error) {
        console.error("Error fetching products:", error);
        return;
    }

    const toDelete = products.filter(p => {
        const titleMatch = p.name && (p.name.toLowerCase().includes('test') || p.name.toLowerCase().includes('agent'));
        const catMatch = p.category && p.category.toLowerCase().includes('teste');
        return titleMatch || catMatch;
    });

    console.log(`Found ${toDelete.length} products to delete.`);
    for (let p of toDelete) {
        console.log(`- ${p.name} (Cat: ${p.category})`);
        
        const { error: delError } = await supabase.from('products').delete().eq('id', p.id);
        if (delError) {
            console.error(`Failed to delete ${p.name}:`, delError);
        } else {
            console.log(`Deleted ${p.name}`);
        }
    }
    console.log("Finished deleting test entries.");
}

deleteTestProducts();
