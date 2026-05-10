
const http = require('http');

const PORT = 8000;

const server = http.createServer((req, res) => {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
    }

    if (req.url.includes('paocaseiro_db.php')) {
        let body = '';
        req.on('data', chunk => { body += chunk.toString(); });
        req.on('end', () => {
            try {
                const data = JSON.parse(body);
                const action = data.action;

                console.log('\n' + '='.repeat(50));
                console.log(`🚀 [MOCK BRIDGE] AÇÃO RECEBIDA: ${action.toUpperCase()}`);
                
                if (action === 'send_sms') {
                    console.log(`📱 PARA: ${data.number}`);
                    console.log(`💬 MSG: ${data.message}`);
                } 
                else if (action === 'send_email') {
                    console.log(`📧 PARA: ${data.to.join(', ')}`);
                    console.log(`📝 ASSUNTO: ${data.subject}`);
                    console.log(`📄 CONTEÚDO: (HTML recebido - ${data.html.length} caracteres)`);
                }
                else if (action === 'log_notification') {
                    console.log(`📝 LOG: [${data.type}] para ${data.recipient} -> Status: ${data.status}`);
                }
                else {
                    console.log('📦 DADOS:', JSON.stringify(data, null, 2));
                }
                console.log('='.repeat(50));

                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: true, message: 'Mock success' }));
            } catch (e) {
                res.writeHead(400);
                res.end(JSON.stringify({ error: 'Invalid JSON' }));
            }
        });
    } else {
        res.writeHead(404);
        res.end();
    }
});

server.listen(PORT, () => {
    console.log(`\n✅ SIMULADOR PÃO CASEIRO ATIVO!`);
    console.log(`📍 Ouvindo em: http://localhost:${PORT}/paocaseiro_db.php`);
    console.log(`💡 Aguardando notificações do sistema (SMS, E-mail, Logs)...\n`);
});
