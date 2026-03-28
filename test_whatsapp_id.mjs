import fetch from 'node-fetch';

const EVOLUTION_API_URL = 'https://wa.zyphtech.com';
const INSTANCE_ID = '8c1bacf4-c0a5-4204-9101-ee2ce96b1d19'; // Using the ID instead of name
const API_KEY = '24724DC5AA2F-4CBF-9013-9C645CF4E565';
const TEST_NUMBER = '258876666903'; 

async function testSend() {
    console.log(`Testing WhatsApp send using INSTANCE ID ${INSTANCE_ID}...`);
    
    try {
        const payload = {
            number: TEST_NUMBER,
            options: {
                delay: 1200,
                presence: 'composing'
            },
            text: "✅ Pão Caseiro: Teste via INSTANCE ID. O sistema está ONLINE! 🥖🚀"
        };

        const response = await fetch(`${EVOLUTION_API_URL}/message/sendText/${INSTANCE_ID}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'apikey': API_KEY
            },
            body: JSON.stringify(payload)
        });

        const data = await response.json();
        console.log('Response Status:', response.status);
        console.log('Response Data:', JSON.stringify(data, null, 2));
    } catch (error) {
        console.error('💥 CRITICAL ERROR:', error.message);
    }
}

testSend();
