
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://bqiegszufcqimlvucrpm.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJxaWVnc3p1ZmNxaW1sdnVjcnBtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEyNzA4MzgsImV4cCI6MjA4Njg0NjgzOH0.AvypZPxytOhoftIFjmK_KclmF3yf_vps-xxzYw9q18k';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function getAdmin() {
    try {
        const { data, error } = await supabase
            .from('team_members')
            .select('*')
            .eq('username', 'Nazir');

        if (error) {
            console.error('Error fetching admin:', error);
        } else {
            console.log('Admin Data:', JSON.stringify(data, null, 2));
        }
    } catch (err) {
        console.error('Exception:', err);
    }
}

getAdmin();
