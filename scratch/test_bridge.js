
const API_URL = 'https://paocaseiro.co.mz/paocaseiro_db.php';
const API_KEY = 'PaoCaseiro_Direct_MySQL_2026';

async function testBridge() {
    const number = '258846930960';
    
    console.log('Testing WhatsApp via Bridge...');
    try {
        const waRes = await fetch(API_URL, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${API_KEY}`
            },
            body: JSON.stringify({
                action: 'send_whatsapp',
                number: number,
                text: 'Teste de WhatsApp via Bridge Pão Caseiro - ' + new Date().toLocaleTimeString()
            })
        });
        const waData = await waRes.json();
        console.log('WA Response:', JSON.stringify(waData, null, 2));
    } catch (e) {
        console.error('WA Test Failed:', e);
    }

    console.log('\nTesting SMS via Bridge...');
    try {
        const smsRes = await fetch(API_URL, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${API_KEY}`
            },
            body: JSON.stringify({
                action: 'send_sms',
                number: number,
                message: 'Teste de SMS via Bridge Pão Caseiro'
            })
        });
        const smsData = await smsRes.json();
        console.log('SMS Response:', JSON.stringify(smsData, null, 2));
    } catch (e) {
        console.error('SMS Test Failed:', e);
    }
}

testBridge();
