import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const envContents = fs.readFileSync(resolve(__dirname, '.env'), 'utf-8');
const envVars = Object.fromEntries(
  envContents.split('\n')
    .filter(line => line && !line.startsWith('#'))
    .map(line => {
      const idx = line.indexOf('=');
      if (idx === -1) return null;
      return [line.slice(0, idx).trim(), line.slice(idx + 1).trim()];
    })
    .filter(Boolean)
);

const supabaseUrl = process.env.VITE_SUPABASE_URL || envVars['VITE_SUPABASE_URL'] || 'https://bqiegszufcqimlvucrpm.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || envVars['VITE_SUPABASE_ANON_KEY'];

if (!supabaseKey) {
  console.error("No VITE_SUPABASE_ANON_KEY found in .env");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const extrasToSeed = [
  { name: 'Batata Frita', name_en: 'French Fries', price: 150, image: 'https://via.placeholder.com/150', is_available: true, stock_quantity: 100, category: 'Extras' },
  { name: 'Salada Mista', name_en: 'Mixed Salad', price: 120, image: 'https://via.placeholder.com/150', is_available: true, stock_quantity: 100, category: 'Extras' },
  { name: 'Queijo Extra', name_en: 'Extra Cheese', price: 50, image: 'https://via.placeholder.com/150', is_available: true, stock_quantity: 100, category: 'Extras' },
  { name: 'Água Mineral', name_en: 'Mineral Water', price: 40, image: 'https://via.placeholder.com/150', is_available: true, stock_quantity: 100, category: 'Extras' },
  { name: 'Molho de Tomate', name_en: 'Tomato Sauce', price: 30, image: 'https://via.placeholder.com/150', is_available: true, stock_quantity: 100, category: 'Extras' },
  { name: 'Maionese', name_en: 'Mayonnaise', price: 30, image: 'https://via.placeholder.com/150', is_available: true, stock_quantity: 100, category: 'Extras' },
];

async function seedExtras() {
  console.log("Seeding Extras to Supabase...");
  for (const extra of extrasToSeed) {
    const { data: existing, error: findError } = await supabase
      .from('products')
      .select('id')
      .eq('name', extra.name)
      .single();

    if (existing) {
      console.log(`Product ${extra.name} already exists, skipping...`);
      continue;
    }

    const { error: insertError } = await supabase
      .from('products')
      .insert([extra]);

    if (insertError) {
      console.error(`Error inserting ${extra.name}:`, insertError.message);
    } else {
      console.log(`Inserted ${extra.name} successfully.`);
    }
  }
  console.log("Seeding complete!");
}

seedExtras();
