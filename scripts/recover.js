const https = require('https');
const API_KEY = '1298|OxFmkooNPDC14WPRIjomqAyJ0np4wp22Fm12j1pt76fd238e'; // from environment variables known to be correct here
const txId = 'MP2603108RL9VYQVHZ';

const options = {
    hostname: 'api.paysuite.co.mz',
    path: '/api/v1/payments/' + txId,
    method: 'GET',
    headers: {
        'Authorization': 'Bearer ' + API_KEY,
        'Accept': 'application/json'
    }
};

const req = https.request(options, (res) => {
    let data = '';
    res.on('data', (chunk) => { data += chunk; });
    res.on('end', () => {
        console.log('STATUS:', res.statusCode);
        console.log('BODY:', data);
    });
});
req.on('error', (e) => { console.error('ERR:', e); });
req.end();
