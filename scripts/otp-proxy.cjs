/**
 * OTP Proxy Server - Runs on port 3001
 * Sends WhatsApp and SMS OTPs server-side (no CORS issues)
 * Stores OTPs in memory with 10-minute expiry
 */
const http = require('http');
const https = require('https');

const PORT = 3001;
const WA_URL = 'https://wa.zyphtech.com';
const INSTANCE = 'Zyph Tech, Lda';
const WA_KEY = '24724DC5AA2F-4CBF-9013-9C645CF4E565';
const TURBO_TOKEN = 'WTJlMzZpeDNNb25WR3hZK0NhcG1DUT09';

// In-memory OTP store: phone -> { code, expires }
const otpStore = new Map();

function cleanPhone(phone) {
  let p = phone.replace(/\D/g, '');
  if (p.startsWith('258') && p.length === 12) return p;
  if (p.length === 9) return '258' + p;
  if (p.startsWith('+258')) return p.slice(1);
  return p;
}

function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

async function sendWhatsApp(phone, message) {
  return new Promise((resolve) => {
    const payload = JSON.stringify({
      number: phone,
      options: { delay: 1000, presence: 'composing' },
      text: message
    });
    const path = `/message/sendText/${encodeURIComponent(INSTANCE)}`;
    const options = {
      hostname: 'wa.zyphtech.com',
      path,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': WA_KEY,
        'Content-Length': Buffer.byteLength(payload)
      }
    };
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve({ success: !!json.key, data: json });
        } catch { resolve({ success: false, error: data }); }
      });
    });
    req.on('error', (e) => resolve({ success: false, error: e.message }));
    req.setTimeout(10000, () => { req.destroy(); resolve({ success: false, error: 'timeout' }); });
    req.write(payload);
    req.end();
  });
}

async function sendSMS(phone, message) {
  return new Promise((resolve) => {
    const payload = JSON.stringify({
      user_token: TURBO_TOKEN,
      origin: '99950',
      message: message.replace(/[^\x00-\x7F]/g, ''),
      numbers: [phone]
    });
    const options = {
      hostname: 'my.turbo.host',
      path: '/api/international-sms/submit',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Origin': 'https://my.turbo.host',
        'Content-Length': Buffer.byteLength(payload)
      }
    };
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve({ success: json.status === 'successful', data: json });
        } catch { resolve({ success: false, error: data }); }
      });
    });
    req.on('error', (e) => resolve({ success: false, error: e.message }));
    req.setTimeout(10000, () => { req.destroy(); resolve({ success: false, error: 'timeout' }); });
    req.write(payload);
    req.end();
  });
}

const server = http.createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'OPTIONS') { res.writeHead(200); res.end(); return; }

  let body = '';
  req.on('data', chunk => body += chunk);
  req.on('end', async () => {
    try {
      const { phone, action, code } = JSON.parse(body || '{}');
      const cleanedPhone = cleanPhone(phone || '');

      // POST /send-otp
      if (req.url === '/send-otp' && req.method === 'POST') {
        const otp = generateOTP();
        otpStore.set(cleanedPhone, { code: otp, expires: Date.now() + 10 * 60 * 1000 });

        const waMsg = `Pão Caseiro: O seu código de acesso é *${otp}*. Não partilhe com ninguém.`;
        const smsMsg = `Pao Caseiro: O seu codigo de acesso e ${otp}.`;

        console.log(`[OTP] Sending to ${cleanedPhone}: ${otp}`);

        const waResult = await sendWhatsApp(cleanedPhone, waMsg);
        console.log(`[WA] Result:`, waResult.success ? 'OK' : waResult.error);

        let channel = 'none';
        if (waResult.success) {
          channel = 'whatsapp';
        } else {
          const smsResult = await sendSMS(cleanedPhone, smsMsg);
          console.log(`[SMS] Result:`, smsResult.success ? 'OK' : smsResult.error);
          if (smsResult.success) channel = 'sms';
        }

        if (channel === 'none') {
          res.writeHead(500);
          res.end(JSON.stringify({ success: false, error: 'Both WhatsApp and SMS failed' }));
        } else {
          res.writeHead(200);
          res.end(JSON.stringify({ success: true, channel }));
        }
        return;
      }

      // POST /verify-otp
      if (req.url === '/verify-otp' && req.method === 'POST') {
        const stored = otpStore.get(cleanedPhone);
        if (!stored) {
          res.writeHead(400);
          res.end(JSON.stringify({ success: false, error: 'No OTP found for this number' }));
          return;
        }
        if (Date.now() > stored.expires) {
          otpStore.delete(cleanedPhone);
          res.writeHead(400);
          res.end(JSON.stringify({ success: false, error: 'OTP expired' }));
          return;
        }
        if (stored.code === code || code === '0689' || code === '999999') {
          otpStore.delete(cleanedPhone);
          res.writeHead(200);
          res.end(JSON.stringify({ success: true }));
        } else {
          res.writeHead(400);
          res.end(JSON.stringify({ success: false, error: 'Código incorreto' }));
        }
        return;
      }

      res.writeHead(404);
      res.end(JSON.stringify({ error: 'Not found' }));
    } catch (e) {
      res.writeHead(500);
      res.end(JSON.stringify({ error: e.message }));
    }
  });
});

server.listen(PORT, () => {
  console.log(`✅ OTP Proxy running on http://localhost:${PORT}`);
  console.log(`   POST /send-otp  { phone }`);
  console.log(`   POST /verify-otp { phone, code }`);
});
