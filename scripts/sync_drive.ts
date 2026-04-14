import { supabase } from '../services/supabase';

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
        console.log('⚠️ Folder "Fotos de Produtos" not found, checking if we can create it...');
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
            fileName = decodeURIComponent(fileName.split('?')[0]); // decode URL encoding

            const { data: existing } = await supabase
                .from('drive_files')
                .select('id')
                .eq('name', fileName)
                .eq('folder_id', folderId)
                .maybeSingle();

            if (existing) {
                continue; 
            }

            // Provide a realistic size and type guess, or placeholder if impossible to fetch metadata here
            const ext = fileName.split('.').pop()?.toLowerCase();
            const typeMap: Record<string, string> = {
                'jpg': 'image/jpeg', 'jpeg': 'image/jpeg', 'png': 'image/png', 'webp': 'image/webp'
            };
            
            const fileType = typeMap[ext || 'jpg'] || 'image/jpeg';
            
            // To be accurate, we will store the path just as the filename for product-images bucket
            
            const { error: insertError } = await supabase
                .from('drive_files')
                .insert({
                    name: fileName,
                    path: fileName, 
                    size: 153600, // guess 150KB
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
