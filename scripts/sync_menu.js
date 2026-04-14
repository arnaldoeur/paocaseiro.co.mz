import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const menuPath = path.join(__dirname, '..', 'src', 'data', 'hardcoded_menu.ts');
const outputPath = path.join(__dirname, 'sync_menu.sql');

try {
    let content = fs.readFileSync(menuPath, 'utf8');
    
    // The file is a TS file that exports an array.
    // We can extract the part between `export default [` and the last `];`
    const startIndex = content.indexOf('[');
    const endIndex = content.lastIndexOf(']') + 1;
    
    if (startIndex === -1 || endIndex === 0) {
        throw new Error('Could not find array in hardcoded_menu.ts');
    }

    const arrayContent = content.substring(startIndex, endIndex);

    // Using a more robust way to parse the JS array content.
    // Since it's a TS file, it's essentially JS.
    // We wrap it in a function and return it.
    const products = new Function(`return ${arrayContent}`)();

    let sql = `-- Menu Sync Generated at ${new Date().toISOString()}\n`;
    sql += `TRUNCATE public.products CASCADE;\n\n`;

    products.forEach(p => {
        const columns = [
            'id', 'name', 'name_en', 'description', 'description_en', 
            'price', 'category', 'image', 'is_available', 'is_special',
            'prep_time', 'delivery_time', 'sku', 'currency', 'vat_rate',
            'tax_regime', 'brand', 'stock_quantity', 'unit', 'reference',
            'barcode', 'purchase_price', 'other_cost', 'margin_percentage',
            'created_at', 'updated_at'
        ];

        const values = columns.map(col => {
            let val = p[col];
            if (val === undefined || val === null) return 'NULL';
            if (typeof val === 'string') {
                return `'${val.replace(/'/g, "''")}'`;
            }
            if (typeof val === 'boolean') return val ? 'true' : 'false';
            return val;
        });

        sql += `INSERT INTO public.products (${columns.join(', ')}) \nVALUES (${values.join(', ')});\n\n`;
    });

    fs.writeFileSync(outputPath, sql);
    console.log(`Successfully generated ${products.length} product inserts in ${outputPath}`);

} catch (err) {
    console.error('Error generating sync SQL:', err);
    process.exit(1);
}
