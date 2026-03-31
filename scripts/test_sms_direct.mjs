import fetch from 'node-fetch';

const TEST_NUMBER = '258876666903';
const URL = 'https://paocaseiro.co.mz/api/turbo/submit'; // Testing production endpoint or proxy?
const PAYLOAD = {
    user_token: 'WTJlMzZpeDNNb25WR3hZK0NhcG1DUT09',
    origin: '99950',
    message: 'Teste de SMS Pao Caseiro - Verificacao Final',
    numbers: [TEST_NUMBER]
};

async function testSMS() {
    console.log('Testing SMS...');
    try {
        const res = await fetch('https://my.turbo.host/api/international-sms/submit', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Origin': 'https://my.turbo.host'
            },
            body: JSON.stringify(PAYLOAD)
        });

        const data = await res.json();
        console.log('Status:', res.status);
        console.log('Response:', data);
    } catch (e) {
        console.error('Error:', e.message);
    }
}

testSMS();
