import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const env = fs.readFileSync('.env', 'utf-8').split('\n').reduce((acc, line) => {
    const [key, ...val] = line.split('=');
    if(key && key.trim()) acc[key.trim()] = val.join('=').trim().replace(/['"]/g, '');
    return acc;
}, {});

const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);
async function run() {
    const {data: folder} = await supabase.from('drive_folders').select('*').is('parent_id', null);
    console.log('Folders via ANON:', folder);
}
run();
