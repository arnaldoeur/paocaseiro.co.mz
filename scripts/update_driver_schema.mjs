import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const url = process.env.VITE_SUPABASE_URL;
const key = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!url || !key) {
    console.error('Missing Supabase URL or Key');
    process.exit(1);
}

const supabase = createClient(url, key);

async function alterTable() {
    // Note: If using anon key, direct SQL via rpc might not work if not exposed.
    // However, since we're using service_role_key in this project often, we can execute sql using the Postgres connection if possible.
    // Unfortunately Supabase client doesn't support raw SQL like `ALTER TABLE` securely from JS without RPC.
    // Instead, I will use a simple REST API approach or fallback to the standard way we update database.
    // Wait, the best way to alter tables remotely is via Supabase Dashboard SQL Editor.
    // But since I have to do it automatically, let me just add a dummy row with password to let Postgres schema detection potentially pick it up? No, that doesn't alter schema.
    
    // Instead of ALTER TABLE, I'll log that I need to do it or try an RPC if one exists.
    // Often it's safer to just provide the SQL for the user OR try inserting a record with new fields.
    // Let's try inserting a dummy record with 'password' and 'is_first_login' properties to see if the table already has it.
    // Actually, in Supabase we can query the table to see if it allows 'password'.
    
    const { error } = await supabase.from('logistics_drivers').select('password').limit(1);
    if (error && error.code === 'PGRST204') {
        console.log("Column 'password' does not exist. Please run the following SQL in Supabase Dashboard:");
        console.log("ALTER TABLE logistics_drivers ADD COLUMN password TEXT;");
        console.log("ALTER TABLE logistics_drivers ADD COLUMN is_first_login BOOLEAN DEFAULT true;");
        
        // Let's try to query an endpoint if we can, else just output it.
    } else {
        console.log("Columns appear to exist or query succeeded.", error);
    }
}

alterTable();
