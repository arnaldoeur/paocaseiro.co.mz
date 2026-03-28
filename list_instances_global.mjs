import fetch from 'node-fetch';

const EVOLUTION_API_URL = 'https://wa.zyphtech.com';
const GLOBAL_KEY = '429683C4C977415CAAFCCE10F7D57E11'; // Key from previous session

async function listInstances() {
    console.log(`Listing instances via GLOBAL KEY on ${EVOLUTION_API_URL}...`);
    
    try {
        const response = await fetch(`${EVOLUTION_API_URL}/instance/fetchInstances`, {
            method: 'GET',
            headers: {
                'apikey': GLOBAL_KEY
            }
        });

        const data = await response.json();
        console.log('Response Status:', response.status);
        console.log('Response Data:', JSON.stringify(data, null, 2));
    } catch (error) {
        console.error('💥 CRITICAL ERROR:', error.message);
    }
}

listInstances();
