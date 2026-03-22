import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://bqiegszufcqimlvucrpm.supabase.co';
const supabaseKey = 'sb_publishable_qRQDGEPxtpR2Je8qjvZgRg_ap-lADS1';
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data, error } = await supabase.storage.from('products').list('', { limit: 1000 });
  if (error) {
    console.error(error);
  } else {
    for (const f of data) {
      if (f.name !== '.emptyFolderPlaceholder') {
        const tsString = f.name.split('.')[0];
        const timestamp = parseInt(tsString);
        if (!isNaN(timestamp)) {
            const date = new Date(timestamp);
            try {
                console.log(`${f.name} - ${date.toISOString()}`);
            } catch(e) {}
        }
      }
    }
  }
}
run();
