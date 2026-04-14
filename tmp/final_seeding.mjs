import fs from 'fs';

const filePath = 'c:/Users/arnal/Downloads/paocaseiro.co.mz-20260317T132532Z-1-001/paocaseiro.co.mz/paocaseiro.co.mz/src/data/hardcoded_menu.ts';
const content = fs.readFileSync(filePath, 'utf8');

// Extraction logic
const startMatch = content.indexOf('[');
const endMatch = content.lastIndexOf(']');
const arrayText = content.substring(startMatch, endMatch + 1);

let menu;
try {
    // Using a safer alternative to eval for pure array literal extraction
    // Since it's a .ts file with JSON-like structure, we can try to evaluate it as a JS object
    menu = eval(arrayText);
} catch (e) {
    console.error('Failed to parse menu:', e.message);
    process.exit(1);
}

console.log(`Successfully parsed ${menu.length} products.`);

const chunks = [];
for (let i = 0; i < menu.length; i += 20) {
    chunks.push(menu.slice(i, i + 20));
}

const generateSql = (products) => {
    const values = products.map(p => {
        const id = p.id ? `'${p.id}'` : 'uuid_generate_v4()';
        const name = `'${(p.name || '').replace(/'/g, "''")}'`;
        const name_en = p.name_en ? `'${p.name_en.replace(/'/g, "''")}'` : 'NULL';
        const description = p.description ? `'${p.description.replace(/'/g, "''")}'` : 'NULL';
        const price = p.price || 0;
        const category = p.category ? `'${p.category.replace(/'/g, "''")}'` : "'Geral'";
        
        let image = p.image || '';
        if (image.includes('bqiegszufcqimlvucrpm')) {
            const parts = image.split('/');
            const filename = parts[parts.length - 1];
            image = `https://bbvowyztvzselxphbqmt.supabase.co/storage/v1/object/public/products/${filename}`;
        }
        const imageVal = image ? `'${image}'` : 'NULL';
        
        const is_available = p.is_available !== false;
        const is_special = p.is_special || false;
        const prep_time = p.prep_time ? `'${p.prep_time}'` : 'NULL';
        const delivery_time = p.delivery_time ? `'${p.delivery_time}'` : 'NULL';

        return `(${id}, ${name}, ${name_en}, ${description}, ${price}, ${category}, ${imageVal}, ${is_available}, ${is_special}, ${prep_time}, ${delivery_time})`;
    }).join(',\n');

    return `INSERT INTO public.products 
    (id, name, name_en, description, price, category, image, is_available, is_special, prep_time, delivery_time)
    VALUES 
    ${values}
    ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    name_en = EXCLUDED.name_en,
    description = EXCLUDED.description,
    price = EXCLUDED.price,
    category = EXCLUDED.category,
    image = EXCLUDED.image,
    is_available = EXCLUDED.is_available,
    is_special = EXCLUDED.is_special,
    prep_time = EXCLUDED.prep_time,
    delivery_time = EXCLUDED.delivery_time;`;
};

// Write the first chunk to a file just to verify and execute
fs.writeFileSync('tmp/final_seed.sql', chunks.map(c => generateSql(c)).join('\n\n'));
console.log('Final SQL generated in tmp/final_seed.sql');
