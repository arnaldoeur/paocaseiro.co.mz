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
        
        // Check audit logs for errors
        const { data: audits, error: auditErr } = await supabase
            .from('audit_logs')
            .select('*')
            .eq('action', 'CUSTOMER_REGISTER_FAILED')
            .order('created_at', { ascending: false })
            .limit(5);
        
        if (auditErr) {
            console.error("Error fetching audit logs:", auditErr);
        } else {
            console.log("Recent registration failures:", JSON.stringify(audits, null, 2));
        }
    }
}

checkCurrentSchema();
