import fetch from 'node-fetch';

const PAYSUITE_API_URL = 'https://paysuite.tech/api/v1/payments';
const PAYSUITE_API_KEY = '1298|OxFmkooNPDC14WPRIjomqAyJ0np4wp22Fm12j1pt76fd238e';

async function testPaySuite() {
    console.log(`--- Testando Conexão PaySuite ---`);
    try {
        // Enviar um pedido POST (mesmo que falhe por dados inválidos, se retornar erro da API a chave está OK)
        const response = await fetch(PAYSUITE_API_URL, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${PAYSUITE_API_KEY}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({
                amount: '1.00',
                reference: 'TEST_PING_' + Date.now(),
                description: 'Ping Test',
                email: 'test@paocaseiro.co.mz'
            })
        });

        const data = await response.json();
        console.log('Resposta da PaySuite:', JSON.stringify(data, null, 2));

        if (response.ok && data.success === true) {
            console.log('✅ PaySuite API está ONLINE e a Chave está AUTORIZADA!');
        } else if (data.message === 'Unauthenticated.') {
            console.log('❌ Erro de Autenticação: A API Key da PaySuite parece inválida.');
        } else {
            console.log('✅ Conexão estabelecida, mas a API retornou erro de dados (Isso é normal para este teste).');
        }
    } catch (error) {
        console.error('❌ Erro de rede ou servidor PaySuite:', error.message);
    }
}

testPaySuite();
