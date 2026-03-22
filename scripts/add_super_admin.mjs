import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const envContents = fs.readFileSync(resolve(__dirname, '.env'), 'utf-8');
const envVars = Object.fromEntries(
  envContents.split('\n')
    .filter(line => line && !line.startsWith('#'))
    .map(line => {
      const idx = line.indexOf('=');
      if (idx === -1) return null;
      return [line.slice(0, idx).trim(), line.slice(idx + 1).trim()];
    })
    .filter(Boolean)
);

const supabaseUrl = process.env.VITE_SUPABASE_URL || envVars['VITE_SUPABASE_URL'];
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || envVars['VITE_SUPABASE_SERVICE_ROLE_KEY'] || envVars['VITE_SUPABASE_ANON_KEY'];

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase URL or Key');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function addSuperAdmin() {
    console.log("Adding super admin...");
    const { data: existing, error: findError } = await supabase
        .from('team_members')
        .select('*')
        .eq('username', 'it@paocaseiro.co.mz')
        .limit(1);

    if (findError) {
        console.error("Error finding user:", findError);
        return;
    }

    if (existing && existing.length > 0) {
        console.log("User already exists. Updating password...");
        const { error: updateError } = await supabase
            .from('team_members')
            .update({ password: '@pao2025', role: 'admin' })
            .eq('username', 'it@paocaseiro.co.mz');
        if (updateError) {
            console.error("Error updating user:", updateError);
        } else {
            console.log("User updated successfully!");
        }
    } else {
        console.log("User doesn't exist. Creating...");
        const { error: insertError } = await supabase
            .from('team_members')
            .insert([{
                name: 'IT Super Admin',
                username: 'it@paocaseiro.co.mz',
                password: '@pao2025',
                role: 'admin'
            }]);
        if (insertError) {
            console.error("Error creating user:", insertError);
        } else {
            console.log("User created successfully!");
        }
    }
}

addSuperAdmin();
