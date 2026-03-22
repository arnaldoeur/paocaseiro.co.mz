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
    // get a post
    const { data: posts } = await supabase.from('blog_posts').select('id, title').limit(1);
    if (!posts || posts.length === 0) return console.log("No posts found");
    
    const post = posts[0];
    console.log("Using post:", post.id);
    
    // try to insert
    const payload = {
        post_id: post.id,
        author: 'Test_Bot',
        content: 'Testing if post_id is saved',
        status: 'pending'
    };
    
    console.log("Payload:", payload);
    const { data: inserted, error: insertError } = await supabase.from('blog_comments').insert([payload]).select();
    console.log("Inserted:", inserted);
    console.log("Insert Error:", insertError);
}
main();
