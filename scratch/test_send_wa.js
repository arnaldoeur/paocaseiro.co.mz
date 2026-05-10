
const PROXY_URL = 'https://paocaseiro.co.mz/whatsapp_proxy.php';
const INSTANCE_NAME = 'Pao caseiro';
const API_KEY = '84E61FAAB9AB-47FD-8F42-EAFE4DAB9C49';

async function testSend() {
    try {
        const endpoint = `/message/sendText/${encodeURIComponent(INSTANCE_NAME)}`;
        const url = `${PROXY_URL}?path=${encodeURIComponent(endpoint)}`;
        
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'apikey': API_KEY
            },
            body: JSON.stringify({
                number: '258846930960',
                text: 'Teste de sistema Pão Caseiro - ' + new Date().toISOString()
            })
        });
        console.log('Send Status:', response.status);
        const data = await response.json();
        console.log('Send Response:', JSON.stringify(data, null, 2));
    } catch (error) {
        console.error('Send Test Error:', error);
    }
}

testSend();
