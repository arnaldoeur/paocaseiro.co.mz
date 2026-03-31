import fetch from 'node-fetch';

const EVOLUTION_API_URL = 'https://wa.zyphtech.com';
const API_KEY = '24724DC5AA2F-4CBF-9013-9C645CF4E565';
const INSTANCE_ID = 'ca277228-fa3d-44e2-a42b-99b2130d4228';

async function checkState() {
    console.log(`Checking connection state for ${INSTANCE_ID}...`);
    try {
        const res = await fetch(`${EVOLUTION_API_URL}/instance/connectionState/${INSTANCE_ID}`, {
            method: 'GET',
            headers: { 'apikey': API_KEY }
        });

        const data = await res.json();
        console.log('Status Code:', res.status);
        console.log('Response:', JSON.stringify(data, null, 2));
    } catch (e) {
        console.error('Error:', e.message);
    }
}

checkState();
