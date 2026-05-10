
const API_URL = 'https://paocaseiro.co.mz/paocaseiro_db.php';
const API_KEY = 'PaoCaseiro_Direct_MySQL_2026';

const mappings = {
    'Pão Caseiro Fresh': 'pao-caseiro-fresh.png',
    'Pão Caseiro Marcos': 'pao-caseiro-marcos.png',
    'Pão Cereais': 'pao-cereais.png',
    'Pão de Deus': 'pao-deus.png',
    'Pão Forma Integral': 'pao-forma-integral.png',
    'Pão Português Fresh': 'pao-portugues-fresh.png',
    'Pão Português': 'pao-portugues.png',
    'Pizza Mexicana': 'pizza-mexicana.png',
    'Pudim': 'pudim.png',
    'Queques': 'queques.png',
    'Rissóis Camarão': 'rissois-camarao.png',
    'Torta': 'torta.png',
    'Waffle Stick': 'waffle-stick.png',
    'Broa Milho': 'broa-milho.png',
    'Chamussas Mix': 'chamussas-mix.png',
    'Croissant Folhado': 'croissant-folhado.png',
    'Croissants Recheados': 'croissants-recheados.png',
    'Folhado Carne': 'folhado-carne.png'
};

async function updateImages() {
    try {
        console.log('Fetching products...');
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'get_products', api_key: API_KEY })
        });
        const products = await response.json();
        console.log(`Found ${products.length} products.`);

        for (const product of products) {
            const localImage = mappings[product.name];
            if (localImage) {
                console.log(`Updating ${product.name} with ${localImage}...`);
                const updateRes = await fetch(API_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        action: 'save_product',
                        api_key: API_KEY,
                        product: {
                            ...product,
                            image: localImage
                        }
                    })
                });
                const res = await updateRes.json();
                console.log(`Result for ${product.name}:`, res.success ? 'Success' : 'Failed');
            } else {
                // If it's a Supabase URL, we might want to flag it or just leave it
                if (product.image && product.image.includes('supabase')) {
                    console.warn(`No mapping found for ${product.name} (currently ${product.image})`);
                }
            }
        }
    } catch (error) {
        console.error('Update Error:', error);
    }
}

updateImages();
