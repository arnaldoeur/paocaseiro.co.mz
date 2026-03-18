import fetch from 'node-fetch';

const API_KEY = '1298|OxFmkooNPDC14WPRIjomqAyJ0np4wp22Fm12j1pt76fd238e';
const URL = 'https://paysuite.tech/api/v1/payments';

async function testNumber(phone, desc) {
    const payload = {
        amount: "10.00",
        reference: `TEST${Date.now()}`,
        description: `Test ${desc}`,
        mobile: phone,
        msisdn: phone,
        phone: phone,
        customer_msisdn: phone,
        customer_phone: phone,
        first_name: 'Test',
        last_name: 'Alex',
        email: 'test@example.com',
        return_url: 'https://paocaseiro.co.mz',
        cancel_url: 'https://paocaseiro.co.mz'
    };

    console.log(`\n--- Testing ${desc} (${phone}) ---`);
    try {
        const res = await fetch(URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Accept: 'application/json',
                Authorization: `Bearer ${API_KEY}`
            },
            body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (data && data.checkout_url) {
            console.log(`Got checkout URL for ${desc}: ${data.checkout_url}`);
            
            // Fetch the checkout URL to see what payment methods it displays!
            const htmlRes = await fetch(data.checkout_url);
            const html = await htmlRes.text();
            
            console.log(`Includes M-Pesa? ${html.includes('mpesa') || html.includes('M-Pesa') || html.includes('Mpesa')}`);
            console.log(`Includes E-Mola? ${html.includes('emola') || html.includes('E-Mola')}`);
            console.log(`Includes mKesh? ${html.includes('mkesh') || html.includes('mKesh')}`);
            console.log(`Includes Card? ${html.includes('Cartão') || html.includes('Visa') || html.includes('Mastercard')}`);
        } else {
            console.log(`Failed for ${desc}:`, data);
        }
    } catch (e) {
        console.error(e.message);
    }
}

async function runTests() {
    await testNumber('258000000000', 'Generic Zeros');
    await testNumber('258841234567', 'Vodacom 84');
    await testNumber('258861234567', 'Movitel 86');
}

runTests();
