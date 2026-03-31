import fetch from 'node-fetch';

const EVOLUTION_API_URL = 'https://wa.zyphtech.com';
const API_KEY = '24724DC5AA2F-4CBF-9013-9C645CF4E565';
const TEST_NUMBER = '258876666903'; 

async function testInstance(id_or_name) {
    console.log(`Testing with: "${id_or_name}"...`);
    try {
        const payload = {
            number: TEST_NUMBER,
            options: { delay: 1000, presence: 'composing' },
            text: `Test from Pão Caseiro AI using "${id_or_name}"`
        };

        const res = await fetch(`${EVOLUTION_API_URL}/message/sendText/${encodeURIComponent(id_or_name)}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'apikey': API_KEY },
            body: JSON.stringify(payload)
        });

        const data = await res.json();
        console.log(`[${id_or_name}] Status: ${res.status}`);
        console.log(`[${id_or_name}] Response:`, JSON.stringify(data, null, 2));
    } catch (e) {
        console.error(`[${id_or_name}] Error:`, e.message);
    }
}

async function run() {
    // 1. Try Name
    await testInstance('Zyph Tech, Lda');
    // 2. Try ID
    await testInstance('ca277228-fa3d-44e2-a42b-99b2130d4228');
}

run();
