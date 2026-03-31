import fetch from 'node-fetch';

const EVOLUTION_API_URL = 'https://wa.zyphtech.com';
const API_KEY = '24724DC5AA2F-4CBF-9013-9C645CF4E565';

async function listInstances() {
    console.log('Listing all instances...');
    try {
        const res = await fetch(`${EVOLUTION_API_URL}/instance/fetchInstances`, {
            method: 'GET',
            headers: { 'apikey': API_KEY }
        });

        const data = await res.json();
        console.log('Instances:', JSON.stringify(data, null, 2));
    } catch (e) {
        console.error('Error:', e.message);
    }
}

listInstances();
