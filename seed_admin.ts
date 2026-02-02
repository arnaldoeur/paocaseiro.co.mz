
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://odzzshgvgwiaeafyzqiv.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9kenpzaGd2Z3dpYWVhZnl6cWl2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg4Mzc4NTEsImV4cCI6MjA4NDQxMzg1MX0.hMb6jQm3Oqq27kqxxv16qho5qTMDh4OVpCQyCL_GR2o';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function seedAdmin() {
    try {
        // 1. Check if user exists (double check)
        const { data: existing } = await supabase
            .from('team_members')
            .select('*')
            .eq('username', 'Nazir')
            .single();

        if (existing) {
            console.log('User Nazir already exists:', existing);
            return;
        }

        // 2. Insert User
        const { data, error } = await supabase
            .from('team_members')
            .insert({
                name: 'Nazir',
                username: 'Nazir',
                password: 'admin123', // Default Password
                role: 'admin',
                phone: '840000000' // Placeholder
            })
            .select()
            .single();

        if (error) {
            console.error('Error seeding admin:', error);
        } else {
            console.log('SUCCESS: Admin created!');
            console.log('Username: Nazir');
            console.log('Password: admin123');
        }
    } catch (err) {
        console.error('Exception:', err);
    }
}

seedAdmin();
