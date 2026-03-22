const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://bqiegszufcqimlvucrpm.supabase.co';
const supabaseKey = 'sb_publishable_qRQDGEPxtpR2Je8qjvZgRg_ap-lADS1';
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
    console.log("Fetching images from Supabase bucket...");
    const { data: files, error: bucketError } = await supabase.storage.from('products').list('', { limit: 1000 });
    if (bucketError) throw bucketError;
    
    const validFiles = files
        .filter(f => !isNaN(parseInt(f.name.split('.')[0])))
        .map(f => ({ name: f.name, time: parseInt(f.name.split('.')[0]) }));

    console.log(`Found ${validFiles.length} valid images with timestamps.`);

    const hardcodedPath = require('path').join(__dirname, '../src/data/hardcoded_menu.ts');
    let content = fs.readFileSync(hardcodedPath, 'utf8');
    content = content.replace('export default ', '').trim();
    if (content.endsWith(';')) content = content.slice(0, -1);
    
    let products;
    try {
        products = eval(`(${content})`);
    } catch (e) {
        console.error("Eval error parsing hardcoded_menu", e);
        return;
    }

    let updatedImagesCount = 0;
    
    for (const p of products) {
        // Fix variations & complements
        if (typeof p.variations === 'string' && p.variations.startsWith('[')) {
            try { p.variations = JSON.parse(p.variations); } catch(e) { p.variations = []; }
        }
        if (typeof p.complements === 'string' && p.complements.startsWith('[')) {
            try { p.complements = JSON.parse(p.complements); } catch(e) { p.complements = []; }
        }

        let newImage = p.image;
        if (!p.image || p.image.includes('pao_caseiro.png')) {
            // Attempt to find a matching upload based on updated_at
            const pTime = new Date(p.updated_at).getTime();
            let bestFile = null;
            let minDiff = 120 * 1000; // 2 minutes max diff
            
            for (const f of validFiles) {
                const diff = Math.abs(f.time - pTime);
                if (diff < minDiff) {
                    minDiff = diff;
                    bestFile = f.name;
                }
            }
            if (bestFile) {
                newImage = `https://bqiegszufcqimlvucrpm.supabase.co/storage/v1/object/public/products/${bestFile}`;
                console.log(`Matched image for ${p.name}: ${bestFile} (Diff: ${minDiff / 1000}s)`);
            } else {
                newImage = ""; // Strip the confusing pao_caseiro fallback so default shopping bag shows
            }
        }
        
        let shouldUpdateDB = false;
        let updates = {};
        if (p.image !== newImage) {
            updates.image = newImage;
            p.image = newImage;
            shouldUpdateDB = true;
            updatedImagesCount++;
        }
        
        // Also ensure variations/complements are pushed correctly to the DB if we parsed them
        updates.variations = p.variations;
        updates.complements = p.complements;
        shouldUpdateDB = true; 

        if (shouldUpdateDB) {
            await supabase.from('products').update(updates).eq('id', p.id);
        }
    }
    
    fs.writeFileSync(hardcodedPath, `export default ${JSON.stringify(products, null, 2)};\n`, 'utf8');
    console.log(`Fixed variations and assigned ${updatedImagesCount} missing images.`);
}

run().catch(console.error);
