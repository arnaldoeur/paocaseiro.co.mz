const http = require('http');
const { exec } = require('child_process');

const port = 8000;

let isSpeaking = false;
const speechQueue = [];

const processQueue = () => {
    if (isSpeaking || speechQueue.length === 0) return;

    isSpeaking = true;
    const { text, count } = speechQueue.shift();
    
    // Windows PowerShell SAPI5 Command
    const fullText = Array(count).fill(text).join('. ');
    // Escaping single quotes for PowerShell
    const escapedText = fullText.replace(/'/g, "''");
    const psCommand = `powershell -Command "Add-Type -AssemblyName System.Speech; $synth = New-Object System.Speech.Synthesis.SpeechSynthesizer; $synth.Rate = -1; $synth.Speak('${escapedText}')"`;

    console.log(`[${new Date().toLocaleTimeString()}] Speaking: ${text} (${count}x)`);
    
    exec(psCommand, (error) => {
        if (error) console.error('PowerShell Speech Error:', error);
        isSpeaking = false;
        setTimeout(processQueue, 500);
    });
};

const server = http.createServer((req, res) => {
    // CORS headers for local access
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
    }

    if (req.method === 'POST' && req.url === '/api/announce') {
        let body = '';
        req.on('data', chunk => { body += chunk.toString(); });
        req.on('end', () => {
            try {
                const { number, desk } = JSON.parse(body);
                if (!number || !desk) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'Missing number or desk' }));
                    return;
                }

                const text = `Senha ${number}. Dirija-se ao ${desk}`;
                speechQueue.push({ text, count: 3 });
                processQueue();

                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ status: 'queued' }));
            } catch (e) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Invalid JSON' }));
            }
        });
    } else {
        res.writeHead(404);
        res.end();
    }
});

server.listen(port, () => {
    console.log('--------------------------------------------------');
    console.log(`ZYPH VOICE SERVER (NODE.JS) - ONLINE`);
    console.log(`Running at http://localhost:${port}/api/announce`);
    console.log('--------------------------------------------------');
    console.log('Waiting for queue calls...');
});
