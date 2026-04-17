import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

// Manual .env parsing
const envContent = readFileSync('.env', 'utf8');
const env = Object.fromEntries(
    envContent.split('\n')
        .filter(line => line && !line.startsWith('#'))
        .map(line => {
            const [key, ...value] = line.split('=');
            return [key.trim(), value.join('=').trim().replace(/^["']|["']$/g, '')];
        })
);

const supabaseUrl = env.VITE_SUPABASE_URL;
const supabaseKey = env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function testEmail(from, to, bcc = []) {
    console.log(`\nTesting email from ${from} to ${to}...`);
    try {
        const payload = {
            from: from,
            to: [to],
            subject: "Resend Diagnostic Test",
            html: "<strong>Testing email delivery and domain verification status.</strong>"
        };
        
        if (bcc && bcc.length > 0) {
            payload.bcc = bcc;
        }

        const { data, error } = await supabase.functions.invoke('notify-email', {
            body: payload
        });

        if (error) {
            console.error('Error Object:', error);
            // If error has a response body in the context
            if (error.context && error.context.body) {
                // The body is a ReadableStream in some versions of the client
                console.log('Attempting to read error body...');
            }
        }
        
        console.log('Raw Data received:', data);
    } catch (err) {
        console.error('Network/Client Error:', err.message);
    }
}

async function runTests() {
    // Test 1: Using Resend magic address which always succeeds if API key is valid
    await testEmail('Pão Caseiro <onboarding@resend.dev>', 'delivered@resend.dev');
    
    // Test 2: Original failing configuration
    await testEmail('Pão Caseiro <sistema@paocaseiro.co.mz>', 'arnaldoeur@gmail.com');
}

runTests();
