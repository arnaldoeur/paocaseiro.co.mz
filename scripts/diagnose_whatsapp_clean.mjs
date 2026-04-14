import fetch from 'node-fetch';

const BASE_URL = 'https://wa.zyphtech.com';
const API_KEY = '24724DC5AA2F-4CBF-9013-9C645CF4E565';

async function diagnose() {
    try {
        const res = await fetch(`${BASE_URL}/instance/fetchInstances`, {
            headers: { 'apikey': API_KEY }
        });
        const instances = await res.json();
        console.log('INSTANCES_JSON_START');
        console.log(JSON.stringify(instances, null, 2));
        console.log('INSTANCES_JSON_END');
    } catch (e) {
        console.error('Diagnosis Failed:', e.message);
    }
}

diagnose();
