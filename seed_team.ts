
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://bqiegszufcqimlvucrpm.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJxaWVnc3p1ZmNxaW1sdnVjcnBtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEyNzA4MzgsImV4cCI6MjA4Njg0NjgzOH0.AvypZPxytOhoftIFjmK_KclmF3yf_vps-xxzYw9q18k';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function seedTeam() {
    console.log('Seeding team members...');

    const team = [
        {
            name: 'Admin Pão Caseiro',
            username: 'admin',
            password: 'adminpao2026',
            role: 'owner'
        },
        {
            name: 'Cozinha Principal',
            username: 'kitchen',
            password: 'pao2026kitchen',
            role: 'kitchen'
        }
    ];

    const { data: teamData, error: teamError } = await supabase
        .from('team_members')
        .upsert(team, { onConflict: 'username' });

    if (teamError) console.error('Error seeding team:', teamError);
    else console.log('Team members seeded successfully.');

    console.log('Seeding logistics drivers...');

    const drivers = [
        {
            name: 'Motorista Principal',
            phone: '846930960',
            status: 'active'
        }
    ];

    const { data: driverData, error: driverError } = await supabase
        .from('logistics_drivers')
        .upsert(drivers, { onConflict: 'phone' });

    if (driverError) console.error('Error seeding drivers:', driverError);
    else console.log('Drivers seeded successfully.');
}

seedTeam();
