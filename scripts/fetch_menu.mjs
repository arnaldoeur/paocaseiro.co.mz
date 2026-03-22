import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const supabaseUrl = 'https://bqiegszufcqimlvucrpm.supabase.co';
const supabaseKey = 'sb_publishable_qRQDGEPxtpR2Je8qjvZgRg_ap-lADS1';
const supabase = createClient(supabaseUrl, supabaseKey);

async function downloadData() {
    console.log("Fetching products...");
    const { data: products, error: prodErr } = await supabase.from('products').select('*');
    if (prodErr) throw prodErr;

    console.log("Fetching variations...");
    const { data: variations, error: varErr } = await supabase.from('product_variations').select('*');
    if (varErr) {
        console.warn("Could not fetch product_variations from table, ignoring...");
    }

    const { data: complements, error: compErr } = await supabase.from('product_complements').select('*');
    if (compErr) {
        console.warn("Could not fetch product_complements from table, ignoring...");
    }

    const finalData = products.map(p => {
        // Find variations if available
        let pVariations = [];
        if (variations) {
            pVariations = variations.filter(v => v.product_id === p.id);
        }
        
        let pComplements = [];
        if (complements) {
            pComplements = complements.filter(c => c.product_id === p.id);
        }

        // Also parse the string 'variations' if it exists and pVariations is empty
        if (pVariations.length === 0 && p.variations && typeof p.variations === 'string' && p.variations.length > 2) {
             try {
                 pVariations = JSON.parse(p.variations);
             } catch(e) {}
        }
        
        if (pComplements.length === 0 && p.complements && typeof p.complements === 'string' && p.complements.length > 2) {
             try {
                 pComplements = JSON.parse(p.complements);
             } catch(e) {}
        }

        return {
            ...p,
            variations: pVariations,
            complements: pComplements
        };
    });

    const targetDir = path.join(process.cwd(), 'src', 'data');
    if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
    }
    
    const targetFile = path.join(targetDir, 'hardcoded_menu.json');
    fs.writeFileSync(targetFile, JSON.stringify(finalData, null, 2));
    console.log("Saved menu data to", targetFile);
}

downloadData().catch(console.error);
