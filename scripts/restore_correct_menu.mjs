import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const supabaseUrl = 'https://bqiegszufcqimlvucrpm.supabase.co';
const supabaseKey = 'sb_publishable_qRQDGEPxtpR2Je8qjvZgRg_ap-lADS1';
const supabase = createClient(supabaseUrl, supabaseKey);

async function restoreMenu() {
    console.log('--- Iniciando Restauração do Menu Correto ---');

    // Load correct menu
    const menuPath = path.join(__dirname, 'correct_menu.json');
    const menuObj = JSON.parse(fs.readFileSync(menuPath, 'utf8'));

    // Flatten correct products
    const correctProducts = [];
    for (const category of menuObj) {
        for (const item of category.items) {
            correctProducts.push({
                ...item,
                category: category.title
            });
        }
    }

    // 1. Fetch existing products
    const { data: existingProducts, error: fetchError } = await supabase.from('products').select('*');

    if (fetchError) {
        console.error('Erro ao aceder base de dados:', fetchError);
        return;
    }

    console.log(`Encontrados ${existingProducts?.length || 0} produtos existentes na BD.`);

    // 2. Hide ALL existing products first (so we don't accidentally leave wrong ones visible)
    console.log('Ocultando o menu atual obsoleto...');
    for (const p of existingProducts || []) {
        const { error } = await supabase
            .from('products')
            .update({ is_available: false, stock_quantity: 0 })
            .eq('id', p.id);
        if (error) {
            console.error(`Erro ao ocultar ${p.name}`);
        }
    }

    // 3. Insert or Update correct products
    console.log(`Pressionando ${correctProducts.length} produtos corretos na BD...`);
    for (const newProduct of correctProducts) {
        // Find existing match by name to preserve IDs, avoiding breaking old orders
        const existing = existingProducts?.find(
            (p) => p.name.trim().toLowerCase() === newProduct.name.trim().toLowerCase()
        );

        const productPayload = {
            name: newProduct.name,
            category: newProduct.category,
            price: newProduct.price,
            unit: 'Un', // assuming Unidades for all since it varies
            is_available: true,
            stock_quantity: 100,
            complements: newProduct.complements || [],
            variations: newProduct.variations || [],
            image: newProduct.image || '/paocaseiropng.png'
        };

        if (existing) {
            const { error: updateError } = await supabase
                .from('products')
                .update(productPayload)
                .eq('id', existing.id);

            if (updateError) {
                console.error(`Falha ao atualizar ${newProduct.name}:`, updateError.message);
            } else {
                console.log(`[ATUALIZADO] ${newProduct.name} - ${newProduct.category}`);
            }
        } else {
            const { error: insertError } = await supabase
                .from('products')
                .insert({
                    ...productPayload,
                    description: ''
                });

            if (insertError) {
                console.error(`Falha ao inserir ${newProduct.name}:`, insertError.message);
            } else {
                console.log(`[INSERIDO] ${newProduct.name} - ${newProduct.category}`);
            }
        }
    }

    console.log('--- Restauração do Menu Concluída ---');
    console.log('Podes agora ir ver o website que tem o menu correto!');
}

restoreMenu();
