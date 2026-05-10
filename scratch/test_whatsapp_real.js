
const API_URL = 'https://wa.zyphtech.com';
const INSTANCE_NAME = 'Pao caseiro';
const API_KEY = '84E61FAAB9AB-47FD-8F42-EAFE4DAB9C49';
const ADMIN_NUMBER = '258876666903';

async function testConnection() {
    console.log(`🚀 Iniciando teste de conexão para: ${ADMIN_NUMBER}`);
    
    const payload = {
        number: ADMIN_NUMBER,
        options: {
            delay: 1200,
            presence: "composing",
            linkPreview: false
        },
        text: "🍞 *TESTE DE SISTEMA - PÃO CASEIRO*\n\nEsta é uma mensagem de teste enviada via Evolution API.\n\n✅ Integração Concluída!\n✅ Instância: Pao caseiro\n✅ Destino: Admin"
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
            console.log('✅ SUCESSO: Mensagem enviada!');
            console.log('Resposta da API:', JSON.stringify(data, null, 2));
        } else {
            console.error('❌ ERRO NA API:', data.message || 'Erro desconhecido');
            console.log('Detalhes:', JSON.stringify(data, null, 2));
        }
    } catch (error) {
        console.error('❌ ERRO DE CONEXÃO:', error.message);
    }
}

testConnection();
