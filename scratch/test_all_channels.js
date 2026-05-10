
const TURBO_HOST_API_URL = 'https://my.turbo.host/api/international-sms/submit';
const TURBO_HOST_TOKEN = 'WTJlMzZpeDNNb25WR3hZK0NhcG1DUT09'; 

const NUMBERS = ['258879146662', '258846930960', '258876666903'];

async function sendSMSDirect(number, text) {
    console.log(`[SMS TurboHost] Enviando para ${number} usando formato ARRAY e ORIGIN...`);
    try {
        const payload = {
            "user_token": TURBO_HOST_TOKEN,
            "origin": "NOTICE",
            "numbers": [number.replace('+', '')], // OBRIGATÓRIO SER ARRAY
            "message": text
        };

        const response = await fetch(TURBO_HOST_API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const json = await response.json();
        console.log(`Resposta (${number}):`, json);
    } catch (e) {
        console.error(`Falha (${number}):`, e.message);
    }
}

async function run() {
    console.log('🏁 TESTE DEFINITIVO TURBOHOST');
    for (const n of NUMBERS) {
        await sendSMSDirect(n, 'Pao Caseiro: Teste final com formato oficial da API TurboHost.');
    }
    console.log('🏁 FIM DO TESTE');
}
run();
