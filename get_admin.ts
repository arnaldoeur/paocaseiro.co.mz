
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://odzzshgvgwiaeafyzqiv.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9kenpzaGd2Z3dpYWVhZnl6cWl2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg4Mzc4NTEsImV4cCI6MjA4NDQxMzg1MX0.hMb6jQm3Oqq27kqxxv16qho5qTMDh4OVpCQyCL_GR2o';

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
