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
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || envVars['VITE_SUPABASE_ANON_KEY'];

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
    // We can just try an insert that will fail, or select just 1 row
    const { data, error } = await supabase.from('blog_comments').select('*').limit(1);
    console.log("COLUMNS in blog_comments:", Object.keys(data?.[0] || {}));
    
    // Attempt update to test RLS
    if (data && data.length > 0) {
        const id = data[0].id;
        console.log("Attempting to test update on ID:", id);
        const { error: updateError } = await supabase.from('blog_comments').update({ status: 'approved' }).eq('id', id);
        console.log("Update Error:", updateError);
        
        // Let's create an admin function to disable RLS or just check if it worked
        const { data: checkAfter } = await supabase.from('blog_comments').select('status').eq('id', id).single();
        console.log("Status after attempt:", checkAfter?.status);
    }
}
main();
