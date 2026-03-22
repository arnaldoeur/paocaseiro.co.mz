const fs = require('fs');
const path = './pages/Admin.tsx';
let content = fs.readFileSync(path, 'utf8');

// 1. UPDATE_PRODUCT
content = content.replace(
    /const \{ error \} = await supabase\.from\('products'\)\.update\(productData\)\.eq\('id', currentProduct\.id\);\s*if \(error\) throw error;/,
    "const { error } = await supabase.from('products').update(productData).eq('id', currentProduct.id);\n                if (error) throw error;\n                await logAudit({ action: 'UPDATE_PRODUCT', entity_type: 'product', entity_id: currentProduct.id, details: { name: productData.name } });"
);

// 2. CREATE_PRODUCT
content = content.replace(
    /const \{ data, error \} = await supabase\.from\('products'\)\.insert\(productData\)\.select\(\)\.single\(\);\s*if \(error\) throw error;\s*if \(data\) productId = data\.id;/,
    "const { data, error } = await supabase.from('products').insert(productData).select().single();\n                if (error) throw error;\n                if (data) {\n                    productId = data.id;\n                    await logAudit({ action: 'CREATE_PRODUCT', entity_type: 'product', entity_id: productId, details: { name: productData.name } });\n                }"
);

// 3. UPDATE_PRODUCT_STATUS
content = content.replace(
    /const \{ error \} = await supabase\.from\('products'\)\.update\(\{ is_available: !p\.inStock \}\)\.eq\('id', p\.id\);\s*if \(error\) throw error;/,
    "const { error } = await supabase.from('products').update({ is_available: !p.inStock }).eq('id', p.id);\n            if (error) throw error;\n            await logAudit({ action: 'UPDATE_PRODUCT_STATUS', entity_type: 'product', entity_id: p.id, details: { is_available: !p.inStock } });"
);

// 4. DELETE_PRODUCT
content = content.replace(
    /const \{ error \} = await supabase\.from\('products'\)\.delete\(\)\.eq\('id', id\);\s*if \(error\) throw error;/,
    "const { error } = await supabase.from('products').delete().eq('id', id);\n                if (error) throw error;\n                await logAudit({ action: 'DELETE_PRODUCT', entity_type: 'product', entity_id: id });"
);

fs.writeFileSync(path, content);
console.log('Updated Admin.tsx with audit logs for products');
