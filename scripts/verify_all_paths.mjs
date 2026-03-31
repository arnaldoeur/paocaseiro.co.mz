import fetch from 'node-fetch';

const EVOLUTION_API_URL = 'https://wa.zyphtech.com';
const GLOBAL_KEY = '429683C4C977415CAAFCCE10F7D57E11';

async function verifyEverything() {
    console.log("--- VERIFYING ALL INSTANCES ---");
    
    try {
        const response = await fetch(`${EVOLUTION_API_URL}/instance/fetchInstances`, {
            method: 'GET',
            headers: { 'apikey': GLOBAL_KEY }
        });

        const instances = await response.json();
        console.log(`Found ${instances.length} instances.`);
        
        for (const inst of instances) {
            console.log(`\nName: [${inst.instanceName}]`);
            console.log(`ID: [${inst.instanceId}]`);
            console.log(`Status: ${inst.status}`);
            console.log(`Key: [${inst.apikey}]`);
            
            // Try to ping it
            const ping = await fetch(`${EVOLUTION_API_URL}/instance/connectionState/${inst.instanceName}`, {
                method: 'GET',
                headers: { 'apikey': GLOBAL_KEY }
            });
            console.log(`Ping ${inst.instanceName}: ${ping.status}`);
            
            // Try with /v2
            const pingV2 = await fetch(`${EVOLUTION_API_URL}/v2/instance/connectionState/${inst.instanceName}`, {
                method: 'GET',
                headers: { 'apikey': GLOBAL_KEY }
            });
            console.log(`Ping V2 ${inst.instanceName}: ${pingV2.status}`);

            // Try with ID
            const pingID = await fetch(`${EVOLUTION_API_URL}/instance/connectionState/${inst.instanceId}`, {
                method: 'GET',
                headers: { 'apikey': GLOBAL_KEY }
            });
            console.log(`Ping ID ${inst.instanceId}: ${pingID.status}`);
        }
    } catch (error) {
        console.error('Error:', error.message);
    }
}

verifyEverything();
