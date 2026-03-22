import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://bqiegszufcqimlvucrpm.supabase.co';
const supabaseKey = 'sb_publishable_qRQDGEPxtpR2Je8qjvZgRg_ap-lADS1';
const supabase = createClient(supabaseUrl, supabaseKey);

async function testRender() {
    const { data, error } = await supabase.from('products').select('*');
    if (error) { console.error(error); return; }
    
    const categoryOrder = [
        'Pão',
        'Pães',
        'Doces & Pastelaria',
        'Folhados & Salgados',
        'Bolos & Sobremesas',
        'Pizzas',
        'Lanches',
        'Cafés',
        'Chás',
        'Bebidas',
        'Extras'
    ];

    const grouped = data.reduce((acc, product) => {
        let cat = product.category || 'Outros';
        if (cat.trim().toLowerCase() === 'pizzaria') cat = 'Pizzas';
        if (!acc[cat]) acc[cat] = [];
        acc[cat].push(product.name);
        return acc;
    }, {});

    const newSections = Object.keys(grouped).map(title => ({
        title: title,
        items: grouped[title]
    }));

    newSections.sort((a, b) => {
        const indexA = categoryOrder.indexOf(a.title);
        const indexB = categoryOrder.indexOf(b.title);
        const posA = indexA === -1 ? 999 : indexA;
        const posB = indexB === -1 ? 999 : indexB;
        return posA - posB;
    });

    console.log(newSections.map(s => s.title));
}
testRender();
