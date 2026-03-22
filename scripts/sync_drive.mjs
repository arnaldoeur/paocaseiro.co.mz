import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://bqiegszufcqimlvucrpm.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJxaWVnc3p1ZmNxaW1sdnVjcnBtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEyNzA4MzgsImV4cCI6MjA4Njg0NjgzOH0.AvypZPxytOhoftIFjmK_KclmF3yf_vps-xxzYw9q18k';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function syncDrive() {
    console.log('🔄 Starting Drive sync for product images...');

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
                    path: product.image, // use full path assuming it's product-images bucket or absolute URL so that admin Drive can render it
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
