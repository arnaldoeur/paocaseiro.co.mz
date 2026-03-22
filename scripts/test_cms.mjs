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

const supabaseUrl = process.env.VITE_SUPABASE_URL || envVars['VITE_SUPABASE_URL'] || 'https://bqiegszufcqimlvucrpm.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || envVars['VITE_SUPABASE_ANON_KEY'];

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
    const { data: posts } = await supabase.from('blog_posts').select('*').limit(2);
    console.log("POSTS SCHEMA keys:", Object.keys(posts?.[0] || {}));
    
    const { data: comments } = await supabase.from('blog_comments').select('*');
    console.log("COMMENTS:", comments);
}
main();
