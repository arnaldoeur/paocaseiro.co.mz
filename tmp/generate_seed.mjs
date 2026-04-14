import fs from 'fs';

const filePath = 'c:/Users/arnal/Downloads/paocaseiro.co.mz-20260317T132532Z-1-001/paocaseiro.co.mz/paocaseiro.co.mz/tmp/menu.json';
// Read as buffer and convert to string, stripping BOM if present
let raw = fs.readFileSync(filePath);
if (raw[0] === 0xEF && raw[1] === 0xBB && raw[2] === 0xBF) {
    raw = raw.slice(3);
}
const content = raw.toString('utf8').trim();

let menu;
try {
    menu = JSON.parse(content);
} catch (e) {
    console.error('Failed to parse JSON:', e.message);
    // If it's still broken, try a more aggressive cleanup
    const cleanContent = content.substring(content.indexOf('['), content.lastIndexOf(']') + 1);
    menu = JSON.parse(cleanContent);
}

console.log(`Preparing to seed ${menu.length} products...`);

// Group into chunks of 20 to avoid large SQL payload limits
const chunks = [];
for (let i = 0; i < menu.length; i += 20) {
    chunks.push(menu.slice(i, i + 20));
}

const generateSql = (products) => {
    const values = products.map(p => {
        // Essential fields mapping
        const id = p.id ? `'${p.id}'` : 'uuid_generate_v4()';
        const name = `'${(p.name || '').replace(/'/g, "''")}'`;
        const name_en = p.name_en ? `'${p.name_en.replace(/'/g, "''")}'` : 'NULL';
        const description = p.description ? `'${p.description.replace(/'/g, "''")}'` : 'NULL';
        const price = p.price || 0;
        const category = p.category ? `'${p.category.replace(/'/g, "''")}'` : "'Geral'";
        
        let image = p.image || '';
        // Map common images to local paths if they look like placeholder URLs
        if (image.includes('bqiegszufcqimlvucrpm')) {
            // Keep the filename but use the new bucket or just the relative path if it was originally local
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

const allSql = chunks.map(chunk => generateSql(chunk)).join('\n\n');
fs.writeFileSync('c:/Users/arnal/Downloads/paocaseiro.co.mz-20260317T132532Z-1-001/paocaseiro.co.mz/paocaseiro.co.mz/tmp/seed_products.sql', allSql);
console.log('SQL generated in tmp/seed_products.sql');
