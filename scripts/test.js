const fs = require('fs');
const env = fs.readFileSync('.env', 'utf-8');
const url = env.match(/VITE_SUPABASE_URL=(.*)/)[1].trim();
const key = env.match(/VITE_SUPABASE_ANON_KEY=(.*)/)[1].trim();

fetch(`${url}/rest/v1/categories?select=name`, {
    headers: { 'apikey': key, 'Authorization': `Bearer ${key}` }
}).then(r => r.json()).then(console.log).catch(console.error);
