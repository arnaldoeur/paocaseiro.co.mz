
// Script para testar envio de Email via Bridge Hostinger (Resend)
// Script para testar envio de Email via Bridge Hostinger (Resend)
const API_URL = 'https://paocaseiro.co.mz/paocaseiro_db.php';
const AUTH_KEY = 'PaoCaseiro_Direct_MySQL_2026';

async function sendTestEmail(toEmail, subject, name) {
    console.log(`[Email] Solicitando envio para ${toEmail}...`);
    
    // Template HTML Branded (mesmo do sistema)
    const html = `
        <div style="text-align: center;">
            <h2 style="color: #3b2f2f;">Teste de Integração Resend</h2>
            <p style="font-size: 16px;">Olá <strong>${name}</strong>,</p>
            <p>Este é um e-mail de teste disparado pelo sistema de suporte para validar as credenciais da <strong>Resend</strong>.</p>
            <div style="margin: 30px 0; background: #fdfaf7; padding: 20px; border: 1px solid #d9a65a; border-radius: 12px;">
                <p style="margin: 0; color: #3b2f2f; font-weight: bold;">Status: ✅ Integração Ativa</p>
                <p style="margin: 5px 0 0; color: #666; font-size: 12px;">Data: ${new Date().toLocaleString('pt-PT')}</p>
            </div>
            <p style="color: #666; font-size: 14px;">Se recebeu este e-mail, a configuração no PHP e na Resend está correta.</p>
        </div>
    `;

    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${AUTH_KEY}`
            },
            body: JSON.stringify({
                action: 'send_email',
                to: [toEmail],
                subject: subject,
                html: html
            })
        });

        const data = await response.json();
        console.log(`[Email] Resposta do Servidor:`, data);
        
        if (data.id || data.success) {
            console.log(`✅ SUCESSO! E-mail enviado com ID: ${data.id || 'OK'}`);
        } else {
            console.log(`❌ ERRO: Verifique os logs no portal da Resend.`);
        }
    } catch (e) {
        console.error(`[Email] Falha crítica:`, e.message);
    }
}

async function run() {
    console.log('🏁 INICIANDO TESTE DE E-MAIL (RESEND)');
    
    // Enviar para o admin principal
    await sendTestEmail('geral@paocaseiro.co.mz', 'Teste de Sistema - Pão Caseiro', 'Administrador');
    
    console.log('🏁 FIM DO TESTE');
}

run();
