import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.resolve(__dirname, '../.env');

const envContent = fs.readFileSync(envPath, 'utf8');
const envVars = {};
envContent.split('\n').forEach(line => {
    const [key, value] = line.split('=');
    if (key && value) {
        envVars[key.trim()] = value.trim();
    }
});

const supabaseUrl = envVars.VITE_SUPABASE_URL;
const supabaseKey = envVars.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkColumns() {
    // Note: createClient with anon key might not have access to information_schema depending on RLS
    // but we can try to RPC if there's an RPC for it, or just try to select 1 column at a time.
    
    const columnsToTest = ['id', 'contact_no', 'name', 'email', 'date_of_birth', 'address', 'nuit', 'whatsapp', 'password', 'updated_at', 'created_at'];
    const existingColumns = [];

    for (const col of columnsToTest) {
        const { error } = await supabase.from('customers').select(col).limit(1);
        if (!error || (error.code !== 'PGRST106' && !error.message.includes('column'))) {
            existingColumns.push(col);
        } else {
            console.log(`Column ${col} is missing or inaccessible. Error: ${error.message}`);
        }
    }

    console.log("Existing columns in 'customers':", existingColumns);
}

checkColumns();
