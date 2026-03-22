import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

let envContents = '';
try {
    envContents = fs.readFileSync(resolve(__dirname, '../.env'), 'utf-8');
} catch (e) {
    try {
        envContents = fs.readFileSync(resolve(__dirname, '.env'), 'utf-8');
    } catch (e2) {
        console.error("Could not read .env file");
    }
}

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

const supabaseUrl = process.env.VITE_SUPABASE_URL || envVars['VITE_SUPABASE_URL'];
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || envVars['VITE_SUPABASE_SERVICE_ROLE_KEY'] || process.env.VITE_SUPABASE_ANON_KEY || envVars['VITE_SUPABASE_ANON_KEY'];

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase URL or Key');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function syncDrive() {
    console.log('🔄 Starting Drive sync for product images with SERVICE_ROLE...');

    const { data: folderData, error: folderError } = await supabase
        .from('drive_folders')
        .select('id')
        .eq('name', 'Fotos de Produtos')
        .maybeSingle();

    if (folderError) {
        console.error('❌ Error getting folder:', folderError);
        return;
    }

    const folderId = folderData?.id;
    if (!folderId) {
        console.log('⚠️ Folder "Fotos de Produtos" not found, check drive_folders table constraints.');
        return;
    }

    const { data: products, error: productsError } = await supabase
        .from('products')
        .select('id, name, image');

    if (productsError) {
        console.error('❌ Error getting products:', productsError);
        return;
    }

    console.log(`📦 Found ${products?.length || 0} products to check.`);

    let synced = 0;
    
    if (products) {
        for (const product of products) {
            if (!product.image || product.image.includes('placeholder')) continue;

            let fileName = product.image.split('/').pop() || product.image;
            fileName = decodeURIComponent(fileName.split('?')[0]); 

            const { data: existing } = await supabase
                .from('drive_files')
                .select('id')
                .eq('name', fileName)
                .eq('folder_id', folderId)
                .maybeSingle();

            if (existing) {
                continue; 
            }

            const ext = fileName.split('.').pop()?.toLowerCase();
            const typeMap = {
                'jpg': 'image/jpeg', 'jpeg': 'image/jpeg', 'png': 'image/png', 'webp': 'image/webp'
            };
            
            const fileType = typeMap[ext] || 'image/jpeg';
            
            const { error: insertError } = await supabase
                .from('drive_files')
                .insert({
                    name: fileName,
                    path: product.image,
                    size: 153600,
                    type: fileType,
                    folder_id: folderId,
                    uploaded_by: 'admin_sync'
                });

            if (insertError) {
                console.error(`❌ Failed to sync ${fileName}:`, insertError.message);
            } else {
                synced++;
                console.log(`✅ Synced ${product.name} image (${fileName}) to Drive`);
            }
        }
    }

    console.log(`🎉 Sync complete! Synced ${synced} new product images to Drive.`);
    process.exit(0);
}

syncDrive();
