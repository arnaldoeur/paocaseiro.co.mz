import fetch from 'node-fetch';

const EVOLUTION_API_URL = 'https://wa.zyphtech.com';
const INSTANCE_NAME = 'PAOCASEIRO25';
const API_KEY = '429683C4C977415CAAFCCE10F7D57E11';

async function testWhatsAppInstance() {
    console.log(`--- Testando Instância WhatsApp: ${INSTANCE_NAME} ---`);
    try {
        const response = await fetch(`${EVOLUTION_API_URL}/instance/connectionState/${INSTANCE_NAME}`, {
            method: 'GET',
            headers: {
                'apikey': API_KEY
            }
        });

        const data = await response.json();
        console.log('Resposta da API:', JSON.stringify(data, null, 2));

        if (response.ok) {
            console.log('✅ Conexão com a Evolution API estabelecida com sucesso!');
            if (data.instance?.state === 'open') {
                console.log('✅ A instância está CONECTADA (WhatsApp Ativo).');
            } else {
                console.log(`⚠️ A instância está ${data.instance?.state || 'desconhecida'}.`);
            }
        } else {
            console.log('❌ Falha na autenticação ou instância não encontrada.');
        }
    } catch (error) {
        console.error('❌ Erro de rede ou servidor:', error.message);
    }
}

testWhatsAppInstance();
