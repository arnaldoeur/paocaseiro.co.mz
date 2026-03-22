import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

const raw1 = require('./raw1.js');
const raw2 = require('./raw2.js');
const raw3 = require('./raw3.js');

const supabaseUrl = 'https://bqiegszufcqimlvucrpm.supabase.co';
const supabaseKey = 'sb_publishable_qRQDGEPxtpR2Je8qjvZgRg_ap-lADS1';
const supabase = createClient(supabaseUrl, supabaseKey);

async function restore() {
    const correctImagesMap = {};
    const allRaw = [...raw1, ...raw2, ...raw3];
    for (const item of allRaw) {
        correctImagesMap[item.id] = item.image;
    }

    // Update hardcoded_menu.ts
    const hardcodedPath = '../src/data/hardcoded_menu.ts';
    let fileContent = fs.readFileSync(hardcodedPath, 'utf8');
    fileContent = fileContent.replace('export default ', '').trim();
    if (fileContent.endsWith(';')) fileContent = fileContent.slice(0, -1);
    
    let hardcodedData = eval(`(${fileContent})`);
    
    let updatedCount = 0;
    for (let product of hardcodedData) {
        if (correctImagesMap[product.id]) {
            product.image = correctImagesMap[product.id];
        }
    }

    const newContent = `export default ${JSON.stringify(hardcodedData, null, 2)};\n`;
    fs.writeFileSync(hardcodedPath, newContent, 'utf8');
    console.log('Updated hardcoded_menu.ts with correct images!');

    // Update Supabase
    for (const item of allRaw) {
        const { error } = await supabase
            .from('products')
            .update({ image: item.image })
            .eq('id', item.id);
            
        if (error) {
            console.error(`Error updating product ${item.id}:`, error);
        } else {
            updatedCount++;
        }
    }
    console.log(`Updated ${updatedCount} products in Supabase with their original images.`);
}

restore().catch(console.error);
