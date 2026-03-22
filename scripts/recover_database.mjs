import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const supabaseUrl = 'https://bqiegszufcqimlvucrpm.supabase.co';
const supabaseKey = 'sb_publishable_qRQDGEPxtpR2Je8qjvZgRg_ap-lADS1';
const supabase = createClient(supabaseUrl, supabaseKey);

async function recoverMenu() {
    console.log('--- Iniciando Recuperação do Banco de Dados ---');

    const { data: allProducts, error: fetchError } = await supabase.from('products').select('*');
    if (fetchError) {
        console.error('Erro ao aceder base de dados:', fetchError);
        return;
    }

    console.log(`Encontrados ${allProducts?.length || 0} produtos no total.`);

    // Read translations.ts.bak to get correct categories and images
    const bakPath = path.join(__dirname, '../translations.ts.bak');
    const bakContent = fs.readFileSync(bakPath, 'utf8');

    // Super simple regex parser for the backup file to extract items
    const itemsRegex = /\{\s*name:\s*'([^']+)',\s*price:\s*([\d.]+),\s*image:\s*'([^']+)'/g;
    let match;
    const backupItems = [];
    while ((match = itemsRegex.exec(bakContent)) !== null) {
        backupItems.push({
            name: match[1],
            price: parseFloat(match[2]),
            image: match[3]
        });
    }
    
    // We also need to map the section to get its category. Let's do a trickier extraction
    const categoriesMap = {};
    const sectionsSplit = bakContent.split(/title:\s*'([^']+)',\s*items:\s*\[/);
    // Ignore first part
    for (let i = 1; i < sectionsSplit.length; i += 2) {
        const categoryTitle = sectionsSplit[i];
        // Fix the & issue if any
        const cleanedTitle = categoryTitle.replace('&amp;', '&');
        const itemsBlock = sectionsSplit[i + 1];
        const blockMatchRegex = /name:\s*'([^']+)',\s*price:\s*([\d.]+),\s*image:\s*'([^']+)'/g;
        let blockMatch;
        while ((blockMatch = blockMatchRegex.exec(itemsBlock)) !== null) {
            categoriesMap[blockMatch[1].trim().toLowerCase()] = {
                category: cleanedTitle,
                price: parseFloat(blockMatch[2]),
                image: blockMatch[3]
            };
        }
    }


    const todayStr = new Date().toISOString().split('T')[0];

    for (const p of allProducts || []) {
        const createdDate = new Date(p.created_at).toISOString().split('T')[0];
        
        // If it was created today by our bad script, DELETE it!
        if (createdDate === todayStr) {
            console.log(`Deletando produto novo inserido indevidamente: ${p.name}`);
            await supabase.from('products').delete().eq('id', p.id);
            continue;
        }

        // If it is an old product, we need to recover it!
        // 1. Un-hide it!
        let updatePayload = {
            is_available: true,
            stock_quantity: 100
        };

        // 2. Restore its category and image if it's in the backup map!
        const backupData = categoriesMap[p.name.trim().toLowerCase()];
        if (backupData) {
            updatePayload.category = backupData.category;
            updatePayload.image = backupData.image;
            console.log(`Restaurando mapeamento de [${p.name}]: -> img: ${backupData.image}, cat: ${backupData.category}`);
        } else {
            // It's Bebidas or Extras or some other that wasn't in translations.ts.bak!
            // Its image and category were never overwritten, just hidden!
            console.log(`Reativando produto intocado [${p.name}] (provavelmente Bebida/Extra)`);
        }

        const { error } = await supabase.from('products').update(updatePayload).eq('id', p.id);
        if (error) {
            console.error(`Erro ao atualizar ${p.name}`);
        }
    }

    console.log('--- Recuperação do Banco de Dados Concluída ---');
}

recoverMenu();
