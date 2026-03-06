import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://bqiegszufcqimlvucrpm.supabase.co';
const supabaseKey = 'sb_publishable_qRQDGEPxtpR2Je8qjvZgRg_ap-lADS1'; // Using Anon Key, hope RLS allows admin actions or is disabled
const supabase = createClient(supabaseUrl, supabaseKey);

const officialProducts = [
    // Pães
    { reference: '2001935209078', name: 'ARROFADAS 80G', category: 'Pães', price: 15.00, unit: 'un' },
    { reference: '2001713258625', name: 'BAGUETE FRANCES', category: 'Pães', price: 70.00, unit: 'un' },
    { reference: '2006503714824', name: 'BROA DE MILHO', category: 'Pães', price: 20.00, unit: 'un' },
    { reference: '2007127212406', name: 'LINGUA DA SOGRA 80G', category: 'Pães', price: 15.00, unit: 'un' },
    { reference: '9556001288610', name: 'MANTEIGUINHA CLOVER 7G', category: 'Pães', price: 20.00, unit: 'un' },
    { reference: '2006580638266', name: 'MINI PAO DE FORMA 250G', category: 'Pães', price: 30.00, unit: 'un' },
    { reference: '2009371114208', name: 'MINI PAO DE FORMA INTERGRAL 250G', category: 'Pães', price: 40.00, unit: 'un' },
    { reference: '', name: 'PAO DE DEUS', category: 'Pães', price: 60.00, unit: 'un' },
    { reference: '2007027925871', name: 'PAO CASEIRO GRANDE', category: 'Pães', price: 40.00, unit: 'un' },
    { reference: '2006896939286', name: 'PAO CASERIO 100G', category: 'Pães', price: 10.00, unit: 'un' },
    { reference: '2001064635595', name: 'PAO CASSETE', category: 'Pães', price: 16.00, unit: 'un' },
    { reference: '2002584693119', name: 'PAO CROCODILO', category: 'Pães', price: 30.00, unit: 'un' },
    { reference: '9556001288609', name: 'PAO DE AGUA', category: 'Pães', price: 15.00, unit: 'un' },
    { reference: '2003986495820', name: 'PAO DE CENTEIO', category: 'Pães', price: 35.00, unit: 'un' },
    { reference: '2008043883756', name: 'PAO DE CEREAIS C/ SEMENTES', category: 'Pães', price: 40.00, unit: 'un' },
    { reference: '2008531019520', name: 'PAO DE FORMA 500G', category: 'Pães', price: 60.00, unit: 'un' },
    { reference: '2001339301217', name: 'PAO DE FORMA CEREAIS', category: 'Pães', price: 50.00, unit: 'un' },
    { reference: '2003274106933', name: 'PAO DE FORMA INTEGRAL 500G', category: 'Pães', price: 80.00, unit: 'un' },
    { reference: '2003669627531', name: 'PAO DE HUMBUGER/ CACHORO', category: 'Pães', price: 15.00, unit: 'un' },
    { reference: '2006704566703', name: 'PAO INTEGRAL PEQ', category: 'Pães', price: 10.00, unit: 'un' },
    { reference: '2004541167763', name: 'PAO NORMAL 50G', category: 'Pães', price: 5.00, unit: 'un' },
    { reference: '2004709755993', name: 'PAO NORMAL 80G', category: 'Pães', price: 8.00, unit: 'un' },
    { reference: '2003510388697', name: 'PAO PORTUGUES', category: 'Pães', price: 20.00, unit: 'un' },
    { reference: '2002363442624', name: 'PAOZINHO DE LEITE 100G', category: 'Pães', price: 15.00, unit: 'un' },
    { reference: '2005275489909', name: 'SACO DE TORRADA', category: 'Pães', price: 20.00, unit: 'un' },

    // Bolos -> Doces & Pastelaria (Pequenos) & Bolos & Sobremesas (Grandes)
    { reference: '9556001288555', name: 'BEIJINHOS DE COCO', category: 'Doces & Pastelaria', price: 120.00, unit: 'Grm' },
    { reference: '9556001288556', name: 'BISCOITOS AMANTEIGADOS', category: 'Doces & Pastelaria', price: 120.00, unit: 'Un' },
    { reference: '9002490100074', name: 'BOLA DE BERLIM', category: 'Doces & Pastelaria', price: 80.00, unit: 'Un' },
    { reference: '9002490100071', name: 'BOLO DE ARROZ', category: 'Bolos & Sobremesas', price: 65.00, unit: 'Un' },
    { reference: '9556001288577', name: 'BOLO T14', category: 'Bolos & Sobremesas', price: 750.00, unit: 'Un' },
    { reference: '9556001288599', name: 'BOLO T18', category: 'Bolos & Sobremesas', price: 1350.00, unit: 'Un' },
    { reference: '9556001288600', name: 'BOLO T22', category: 'Bolos & Sobremesas', price: 1850.00, unit: 'Un' },
    { reference: '9556001288601', name: 'BOLO T26', category: 'Bolos & Sobremesas', price: 2500.00, unit: 'Un' },
    { reference: '9556001288612', name: 'BRIOCHE DE FRUTAS', category: 'Doces & Pastelaria', price: 80.00, unit: 'Un' },
    { reference: '9556001288552', name: 'BROCHE RECHADO', category: 'Doces & Pastelaria', price: 80.00, unit: 'Un' },
    { reference: '9556001288611', name: 'CARACOL DE CANELA', category: 'Doces & Pastelaria', price: 80.00, unit: 'Un' },
    { reference: '9002490100085', name: 'CHARRUTO RECHEADO', category: 'Doces & Pastelaria', price: 80.00, unit: 'Un' },
    { reference: '9002490100083', name: 'CROISANT RECHEADO', category: 'Doces & Pastelaria', price: 80.00, unit: 'Un' },
    { reference: '9002490100084', name: 'CROISANT SIMPLES', category: 'Doces & Pastelaria', price: 60.00, unit: 'Un' },
    { reference: '9002490100079', name: 'CUPCAKE NORMAL', category: 'Doces & Pastelaria', price: 65.00, unit: 'Un' },
    { reference: '9002490100075', name: 'DONUTS', category: 'Doces & Pastelaria', price: 80.00, unit: 'Un' },
    { reference: '9556001288551', name: 'FATIAS NORMAL', category: 'Bolos & Sobremesas', price: 150.00, unit: 'Un' },
    { reference: '9556001288549', name: 'FOLHADO RECHEADO', category: 'Doces & Pastelaria', price: 80.00, unit: 'Un' },
    { reference: '9002490100078', name: 'GUARDANAPO RECHEADO C/ CREME', category: 'Doces & Pastelaria', price: 150.00, unit: 'Un' },
    { reference: '9556001288554', name: 'MINI FOLHADOS GRAMA', category: 'Doces & Pastelaria', price: 1.20, unit: 'Un' },
    { reference: '9556001288553', name: 'NEVADA', category: 'Doces & Pastelaria', price: 80.00, unit: 'Un' },
    { reference: '9002490100080', name: 'PALMIER RECHEADO', category: 'Doces & Pastelaria', price: 100.00, unit: 'Un' },
    { reference: '9002490100081', name: 'PALMIER SIMPLES', category: 'Doces & Pastelaria', price: 50.00, unit: 'Un' },
    { reference: '9002490100072', name: 'PASTEIS DE COCO', category: 'Doces & Pastelaria', price: 80.00, unit: 'Un' },
    { reference: '9002490100073', name: 'PASTEL DE NATA', category: 'Doces & Pastelaria', price: 80.00, unit: 'Un' },
    { reference: '9556001288550', name: 'TORTA', category: 'Bolos & Sobremesas', price: 150.00, unit: 'Un' },
    { reference: '', name: 'QUEQUES', category: 'Doces & Pastelaria', price: 65.00, unit: 'Un' },
    { reference: '', name: 'WAFFLE STICK', category: 'Doces & Pastelaria', price: 0.00, unit: 'Un' },

    // Salgados -> Folhados & Salgados
    { reference: '9556001288615', name: 'ALMOFADINHA', category: 'Folhados & Salgados', price: 50.00, unit: 'Un' },
    { reference: '9556001288566', name: 'CALZONE', category: 'Folhados & Salgados', price: 80.00, unit: 'Un' },
    { reference: '9556001288558', name: 'CHAMUSSAS DE CARNE', category: 'Folhados & Salgados', price: 50.00, unit: 'Un' },
    { reference: '9556001288559', name: 'CHAMUSSAS DE FRANGO', category: 'Folhados & Salgados', price: 50.00, unit: 'Un' },
    { reference: '9556001288562', name: 'CHAMUSSAS DE PEIXE', category: 'Folhados & Salgados', price: 40.00, unit: 'Un' },
    { reference: '9556001288560', name: 'CHAMUSSAS DE VEGETAIS', category: 'Folhados & Salgados', price: 40.00, unit: 'Un' },
    { reference: '9556001288564', name: 'COXINHAS', category: 'Folhados & Salgados', price: 50.00, unit: 'Un' },
    { reference: '9002490100077', name: 'EMPADA DE CARNE', category: 'Folhados & Salgados', price: 100.00, unit: 'Un' },
    { reference: '9002490100076', name: 'EMPADAS DE FRANGO', category: 'Folhados & Salgados', price: 100.00, unit: 'Un' },
    { reference: '9002490100095', name: 'FOLHADOS DE SALCHICHA', category: 'Folhados & Salgados', price: 70.00, unit: 'Un' },
    { reference: '9002490100096', name: 'KING PIE FRANGO/CARNE', category: 'Folhados & Salgados', price: 100.00, unit: 'Un' },
    { reference: '9556001288567', name: 'MINI SUBS', category: 'Folhados & Salgados', price: 60.00, unit: 'Un' },
    { reference: '9556001288565', name: 'PIE DE VEGETAIS', category: 'Folhados & Salgados', price: 100.00, unit: 'Un' },
    { reference: '9556001288557', name: 'RISSOIS', category: 'Folhados & Salgados', price: 50.00, unit: 'Un' },

    // Pizzas (Com variações de tamanho)
    { reference: '9002490100094', name: 'MINI PIZZA DIVERSOS UN', category: 'Pizzas', price: 50.00, unit: 'Un' },
    { reference: '', name: 'PIZZA MEXICANA', category: 'Pizzas', price: 0, unit: 'Un', variations: [{ name: 'Média', price: 500 }, { name: 'Grande', price: 700 }] },
    { reference: '', name: 'PIZZA DE FRANGO', category: 'Pizzas', price: 0, unit: 'Un', variations: [{ name: 'Média', price: 500 }, { name: 'Grande', price: 700 }] },
    { reference: '', name: 'PIZZA DE PEPERONI', category: 'Pizzas', price: 0, unit: 'Un', variations: [{ name: 'Média', price: 500 }, { name: 'Grande', price: 700 }] },
    { reference: '', name: 'PIZZA 4 ESTACÕES', category: 'Pizzas', price: 0, unit: 'Un', variations: [{ name: 'Média', price: 500 }, { name: 'Grande', price: 700 }] },
    { reference: '', name: 'PIZZA DE ATUM', category: 'Pizzas', price: 0, unit: 'Un', variations: [{ name: 'Média', price: 500 }, { name: 'Grande', price: 700 }] },

    // Chás
    { reference: '', name: 'Chá Simples', category: 'Chás', price: 70.00, unit: 'Un' },
    { reference: '', name: 'Chá Especial', category: 'Chás', price: 80.00, unit: 'Un' },
    { reference: '', name: 'Chá de Leite', category: 'Chás', price: 150.00, unit: 'Un' },

    // Cafés
    { reference: '', name: 'Café Espresso', category: 'Cafés', price: 100.00, unit: 'Un' },
    { reference: '', name: 'Café Especial', category: 'Cafés', price: 150.00, unit: 'Un' },
    { reference: '', name: 'Café Pingado', category: 'Cafés', price: 150.00, unit: 'Un' },
    { reference: '', name: 'Café Gelado', category: 'Cafés', price: 150.00, unit: 'Un' },
    { reference: '', name: 'Cappuccino', category: 'Cafés', price: 200.00, unit: 'Un' },
    { reference: '', name: 'Hot Chocolate', category: 'Cafés', price: 200.00, unit: 'Un' },

    // Lanches (Menu) - Com acompanhantes
    { reference: '', name: 'Cachorro quente', category: 'Lanches', price: 250.00, unit: 'Un', complements: [{ name: 'Batata frita', price: 100 }, { name: 'Refresco', price: 50 }] },
    { reference: '', name: 'Cachorro quente completo', category: 'Lanches', price: 300.00, unit: 'Un', complements: [{ name: 'Batata frita', price: 100 }, { name: 'Refresco', price: 50 }] },
    { reference: '', name: 'Hambúrguer simples', category: 'Lanches', price: 300.00, unit: 'Un', complements: [{ name: 'Batata frita', price: 100 }, { name: 'Refresco', price: 50 }, { name: 'Double cheese', price: 80 }] },
    { reference: '', name: 'Hambúrguer completo', category: 'Lanches', price: 350.00, unit: 'Un', complements: [{ name: 'Batata frita', price: 100 }, { name: 'Refresco', price: 50 }, { name: 'Double cheese', price: 80 }] },
    { reference: '', name: 'Shawarma de galinha', category: 'Lanches', price: 300.00, unit: 'Un', complements: [{ name: 'Batata frita', price: 100 }, { name: 'Refresco', price: 50 }] },
    { reference: '', name: 'Shawarma de carne', category: 'Lanches', price: 350.00, unit: 'Un', complements: [{ name: 'Batata frita', price: 100 }, { name: 'Refresco', price: 50 }] },

    // Bebidas
    { reference: '', name: 'Água da Namaacha 500ml', category: 'Bebidas', price: 50.00, unit: 'Un' },
    { reference: '', name: 'Matis (Vários Sabores)', category: 'Bebidas', price: 60.00, unit: 'Un' },
    { reference: '', name: 'Coca-Cola 300ml', category: 'Bebidas', price: 60.00, unit: 'Un' },
    { reference: '', name: 'Fanta Laranja 300ml', category: 'Bebidas', price: 60.00, unit: 'Un' },
    { reference: '', name: 'Sprite 300ml', category: 'Bebidas', price: 60.00, unit: 'Un' },
];

async function syncProducts() {
    console.log('--- Iniciando Sincronização do Catálogo de Produtos ---');

    // 1. Check if we really have contact
    const { data: existingProducts, error: fetchError } = await supabase.from('products').select('*');

    if (fetchError) {
        console.error('Erro ao aceder base de dados:', fetchError);
        return;
    }

    console.log(`Encontrados ${existingProducts?.length || 0} produtos existentes.`);

    for (const newProduct of officialProducts) {
        const existing = existingProducts?.find(
            (p) => p.name.trim().toLowerCase() === newProduct.name.trim().toLowerCase()
        );

        const productPayload = {
            name: newProduct.name,
            category: newProduct.category,
            price: newProduct.price,
            unit: newProduct.unit,
            reference: newProduct.reference || null,
            is_available: true,
            stock_quantity: 100, // Set an initial stock to be visible
            complements: newProduct.complements || [],
            variations: newProduct.variations || []
        };

        let imageUrl = '/paocaseiropng.png'; // default placeholder
        if (newProduct.name.includes('PAO CASERIO') || newProduct.name.includes('PAO CASEIRO')) {
            imageUrl = '/pao_caseiro.png';
        }

        if (existing) {
            if (!existing.image || existing.image === '/images/placeholder.png' || existing.image === '/paocaseiropng.png' || newProduct.name.includes('CASEIRO')) {
                productPayload.image = imageUrl;
            }

            const { error: updateError } = await supabase
                .from('products')
                .update(productPayload)
                .eq('id', existing.id);

            if (updateError) {
                console.error(`Falha ao atualizar ${newProduct.name}:`, updateError.message);
            } else {
                console.log(`[UPDATE] ${newProduct.name}`);
            }
        } else {
            // Create new
            const { error: insertError } = await supabase
                .from('products')
                .insert({
                    ...productPayload,
                    description: '',
                    image: imageUrl
                });

            if (insertError) {
                console.error(`Falha ao inserir ${newProduct.name}:`, insertError.message);
            } else {
                console.log(`[INSERT] ${newProduct.name}`);
            }
        }
    }

    // Set items not in the official list to unavailable to hide them cleanly without deleting orders
    const officialNames = officialProducts.map(p => p.name.trim().toLowerCase());
    const obsoleteProducts = existingProducts?.filter(
        (p) => !officialNames.includes(p.name.trim().toLowerCase())
    );

    if (obsoleteProducts && obsoleteProducts.length > 0) {
        console.log(`Escondendo ${obsoleteProducts.length} produtos obsoletos...`);
        for (const p of obsoleteProducts) {
            const { error } = await supabase
                .from('products')
                .update({ is_available: false, stock_quantity: 0 })
                .eq('id', p.id);

            if (error) console.error(`Falha ao esconder ${p.name}`);
            else console.log(`[HIDDEN] ${p.name}`);
        }
    }

    console.log('--- Sincronização Concluída ---');
}

syncProducts();
