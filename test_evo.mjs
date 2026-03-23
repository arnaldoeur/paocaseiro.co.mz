import fs from 'fs';

const EVOLUTION_API_URL = 'https://wa.zyphtech.com';
const INSTANCE_NAME = 'Zyph Tech, Lda';
const API_KEY = '429683C4C977415CAAFCCE10F7D57E11';

async function test() {
    const payload = {
        number: '1234567890',
        options: { delay: 1000, presence: 'composing' },
        mediatype: 'document',
        fileName: 'test.pdf',
        caption: 'test',
        media: 'JVBERi0xLjcKCjEgMCBvYmogICUKPDwKDS9UeXBlIC9DYXRhbG9nCg0vUGFnZXMgMiAwIFIKDT4+CmVuZG9iago='
    };

    console.log("Sending...", JSON.stringify(payload, null, 2));
    try {
        const res = await fetch(`${EVOLUTION_API_URL}/message/sendMedia/${encodeURIComponent(INSTANCE_NAME)}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'apikey': API_KEY
            },
            body: JSON.stringify(payload)
        });
        const text = await res.text();
        console.log("Response:", res.status, text);
    } catch (e) {
        console.error(e);
    }
}

test();
