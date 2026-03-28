import fetch from 'node-fetch';

const EVOLUTION_API_URL = 'https://wa.zyphtech.com';
const API_KEY = '24724DC5AA2F-4CBF-9013-90645CF4E565';

async function listInstances() {
    console.log(`Listing instances on ${EVOLUTION_API_URL}...`);
    
    try {
        const response = await fetch(`${EVOLUTION_API_URL}/instance/fetchInstances`, {
            method: 'GET',
            headers: {
                'apikey': API_KEY
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
