import fetch from 'node-fetch';

const EVOLUTION_API_URL = 'https://wa.zyphtech.com';
const INSTANCE_ID = 'ca277228-fa3d-44e2-a42b-99b2130d4228';
const INSTANCE_NAME_ENCODED = encodeURIComponent('Zyph Tech, Lda');
const API_KEY = '24724DC5AA2F-4CBF-9013-9C645CF4E565';
const TEST_NUMBER = '258876666903'; 

async function finalTest() {
    console.log("--- STARTING FINAL VERIFICATION ---");
    
    // Test Option 1: Using Instance ID
    try {
        console.log(`\nTesting Option 1: Sending via ID (${INSTANCE_ID})...`);
        const res1 = await fetch(`${EVOLUTION_API_URL}/message/sendText/${INSTANCE_ID}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'apikey': API_KEY },
            body: JSON.stringify({ number: TEST_NUMBER, text: "✅ Pão Caseiro: Teste via INSTANCE ID (ca27..)" })
        });
        console.log(`Status ID: ${res1.status}`);
        const data1 = await res1.json();
        console.log(`Data ID: ${JSON.stringify(data1)}`);
    } catch (e) { console.error("ID Error:", e.message); }

    // Test Option 2: Using URL-Encoded Internal Name
    try {
        console.log(`\nTesting Option 2: Sending via Name (${INSTANCE_NAME_ENCODED})...`);
        const res2 = await fetch(`${EVOLUTION_API_URL}/message/sendText/${INSTANCE_NAME_ENCODED}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'apikey': API_KEY },
            body: JSON.stringify({ number: TEST_NUMBER, text: "✅ Pão Caseiro: Teste via NAME (Zyph Tech, Lda)" })
        });
        console.log(`Status Name: ${res2.status}`);
        const data2 = await res2.json();
        console.log(`Data Name: ${JSON.stringify(data2)}`);
    } catch (e) { console.error("Name Error:", e.message); }
}

finalTest();
