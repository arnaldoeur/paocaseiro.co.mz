
const HOSTINGER_BRIDGE_URL = 'https://paocaseiro.co.mz/paocaseiro_db.php';
const HOSTINGER_API_KEY = 'PaoCaseiro_Direct_MySQL_2026';

async function checkProducts() {
    try {
        const response = await fetch(`${HOSTINGER_BRIDGE_URL}?action=get_products`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${HOSTINGER_API_KEY}`
            },
            body: JSON.stringify({ action: 'get_products' })
        });

        const data = await response.json();
        console.log('Sample products:', JSON.stringify(data.slice(0, 5), null, 2));
    } catch (error) {
        console.error('Error fetching products:', error);
    }
}

checkProducts();
