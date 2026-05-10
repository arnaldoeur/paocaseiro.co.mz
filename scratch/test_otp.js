
const API_URL = 'https://wa.zyphtech.com';
const INSTANCE_NAME = 'Pao caseiro';
const API_KEY = '84E61FAAB9AB-47FD-8F42-EAFE4DAB9C49';
const ADMIN_NUMBER = '258876666903';

async function testOTP() {
    console.log(`🚀 Iniciando teste de OTP para: ${ADMIN_NUMBER}`);
    
    const otpCode = Math.floor(100000 + Math.random() * 900000);
    const payload = {
        number: ADMIN_NUMBER,
        text: `🔐 *CÓDIGO DE ACESSO - PÃO CASEIRO*\n\nSeu código de verificação é: *${otpCode}*\n\nEste código expira em 5 minutos. Não o compartilhe com ninguém.`
    };

    try {
        const response = await fetch(`${API_URL}/message/sendText/${encodeURIComponent(INSTANCE_NAME)}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'apikey': API_KEY
            },
            body: JSON.stringify(payload)
        });

        const data = await response.json();
        
        if (response.ok) {
            console.log('✅ SUCESSO: OTP enviado!');
            console.log('Código enviado:', otpCode);
        } else {
            console.error('❌ ERRO NA API:', data.message || 'Erro desconhecido');
        }
    } catch (error) {
        console.error('❌ ERRO DE CONEXÃO:', error.message);
    }
}

testOTP();
