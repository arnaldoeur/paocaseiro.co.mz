import fetch from 'node-fetch';

const EVOLUTION_API_URL = 'https://wa.zyphtech.com';
const INSTANCE_NAME = 'ca277228-fa3d-44e2-a42b-99b2130d4228'; // Final Correct ID
const API_KEY = '24724DC5AA2F-4CBF-9013-9C645CF4E565';
const TEST_NUMBER = '258876666903'; 

async function testSend() {
    console.log(`Final Verification: Sending WhatsApp to ${TEST_NUMBER} using ID ${INSTANCE_NAME}...`);
    
    try {
        const payload = {
            number: TEST_NUMBER,
            options: {
                delay: 1200,
                presence: 'composing'
            },
            text: "✅ Pão Caseiro: VERIFICAÇÃO FINAL! O sistema de OTP está agora operacional através da instância ID oficial. 🥐🚀"
        };

        const response = await fetch(`${EVOLUTION_API_URL}/message/sendText/${INSTANCE_NAME}`, {
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

        if (response.ok) {
            console.log('✅ SUCCESS: Message sent successfully!');
        } else {
            console.log('❌ FAILED: Error response from API.');
        }
    } catch (error) {
        console.error('💥 CRITICAL ERROR:', error.message);
    }
}

testSend();
