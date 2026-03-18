import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://bqiegszufcqimlvucrpm.supabase.co';
const supabaseKey = 'sb_publishable_qRQDGEPxtpR2Je8qjvZgRg_ap-lADS1'; 
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkPost() {
    const { data, error } = await supabase.from('blog_posts').select('title, image_url, content').order('created_at', { ascending: false }).limit(2);
    if(error) console.error(error);
    else console.log(JSON.stringify(data, null, 2));
}

checkPost();
