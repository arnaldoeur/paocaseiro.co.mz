import fetch from 'node-fetch';

const BASE_URL = 'https://wa.zyphtech.com';
const API_KEY = '24724DC5AA2F-4CBF-9013-9C645CF4E565';
const TEST_NUMBER = '258879146662';

async function diagnose() {
    console.log('--- DIAGNOSING WHATSAPP ---');
    console.log(`Host: ${BASE_URL}`);
    console.log(`Key: ${API_KEY}`);

    try {
        console.log('\n1. Fetching instances...');
        const res = await fetch(`${BASE_URL}/instance/fetchInstances`, {
            headers: { 'apikey': API_KEY }
        });
        const instances = await res.json();
        console.log(`Found ${instances.length} instances.`);
        
        for (const inst of instances) {
            const name = inst.name || inst.instanceName;
            console.log(`\nTesting instance: "${name}" (ID: ${inst.id || inst.instanceId}, Status: ${inst.connectionStatus || inst.status})`);
            
            if (!name) {
                console.log('Skipping instance without name:', JSON.stringify(inst));
                continue;
            }

            // Try sendText to this instance
            const sendRes = await fetch(`${BASE_URL}/message/sendText/${encodeURIComponent(name)}`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json', 
                    'apikey': API_KEY 
                },
                body: JSON.stringify({
                    number: TEST_NUMBER,
                    text: `Diagnostic test for Pão Caseiro - Instance: ${name}`
                })
            });
            
            const result = await sendRes.json();
            console.log(`[${inst.instanceName}] Send Status: ${sendRes.status}`);
            console.log(`[${inst.instanceName}] Result:`, JSON.stringify(result, null, 2));
        }
    } catch (e) {
        console.error('Diagnosis Failed:', e.message);
    }
}

diagnose();
