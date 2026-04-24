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

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing Supabase credentials in .env");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkCurrentSchema() {
    console.log(`Checking Supabase project: ${supabaseUrl}`);
    const { data, error } = await supabase.from('customers').select('*').limit(1);
    
    if (error) {
        console.error("Error fetching customers:", error);
    } else {
        console.log("CUSTOMERS columns:", Object.keys(data?.[0] || {}));
        console.log("Example customer data:", data?.[0]);
        
        // Check team_members with specific UUID
        const { data: userData, error: userError } = await supabase
            .from('team_members')
            .select('id')
            .eq('id', '9f4b4a2d-2303-44db-9695-3cd8c5e4be00')
            .single();
            
        console.log("Team Member query result:", userData, "Error:", userError);
    }
}

checkCurrentSchema();
