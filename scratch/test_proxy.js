
const PROXY_URL = 'https://paocaseiro.co.mz/whatsapp_proxy.php';

async function testProxy() {
    try {
        const response = await fetch(PROXY_URL, {
            method: 'GET'
        });
        console.log('Proxy GET Status:', response.status);
        const text = await response.text();
        console.log('Proxy GET Body:', text);
    } catch (error) {
        console.error('Proxy Test Error:', error);
    }
}

testProxy();
