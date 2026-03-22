require('dotenv').config({ path: '.env.local' });
const API_KEY = process.env.VITE_PAYSUITE_API_KEY || '1298|OxFmkooNPDC14WPRIjomqAyJ0np4wp22Fm12j1pt76fd238e';

async function testApi() {
    const txId = 'MP2603108RL9VYQVHZ';
    const API_URL = 'https://paysuite.tech/api/v1/payments/' + txId;

    console.log('Fetching', API_URL);
    try {
        const res = await fetch(API_URL, {
            method: 'GET',
            headers: {
                'Authorization': 'Bearer ' + API_KEY,
                'Accept': 'application/json'
            }
        });

        const data = await res.json();
        console.log('Result:', JSON.stringify(data, null, 2));
    } catch (e) {
        console.log('Error:', e);
    }
}
testApi();
