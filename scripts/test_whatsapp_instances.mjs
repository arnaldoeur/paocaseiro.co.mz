import fetch from 'node-fetch';

const EVOLUTION_API_URL = 'https://wa.zyphtech.com';
const API_KEY = '24724DC5AA2F-4CBF-9013-9C645CF4E565';
const TEST_NUMBER = '258876666903'; 

async function testInstance(name) {
    console.log(`Testing instance: "${name}"...`);
    try {
        const payload = {
            number: TEST_NUMBER,
            options: { delay: 1000, presence: 'composing' },
            text: `Test from Pão Caseiro AI to instance "${name}"`
        };

        const res = await fetch(`${EVOLUTION_API_URL}/message/sendText/${encodeURIComponent(name)}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'apikey': API_KEY },
            body: JSON.stringify(payload)
        });

        const data = await res.json();
        console.log(`[${name}] Status: ${res.status}`);
        console.log(`[${name}] Response:`, JSON.stringify(data, null, 2));
    } catch (e) {
        console.error(`[${name}] Error:`, e.message);
    }
}

async function run() {
    await testInstance('Zyph Tech, Lda');
    await testInstance('Zyph');
    await testInstance('Pão Caseiro');
}

run();
