
import fetch from 'node-fetch';

const EVOLUTION_API_URL = 'https://wa.zyphtech.com';
const INSTANCE_NAME = 'PAOCASEIRO25';
const API_KEY = '429683C4C977415CAAFCCE10F7D57E11';

async function testConnection() {
    try {
        console.log('--- Testing WhatsApp Evolution API Connection ---');
        const response = await fetch(`${EVOLUTION_API_URL}/instance/connectionState/${INSTANCE_NAME}`, {
            method: 'GET',
            headers: {
                'apikey': API_KEY
            }
        });
        
        const data = await response.json();
        console.log('Connection State:', JSON.stringify(data, null, 2));
        
        if (data.instance?.state === 'open') {
            console.log('✅ Instance is OPEN and CONNECTED.');
        } else {
            console.log('❌ Instance is NOT connected. State:', data.instance?.state);
        }
    } catch (error) {
        console.error('❌ Error connecting to WhatsApp API:', error.message);
    }
}

testConnection();
