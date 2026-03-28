import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://bqiegszufcqimlvucrpm.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseKey) {
    console.error("Missing SUPABASE_SERVICE_ROLE_KEY");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testCategories() {
    const categories = ['Padaria', 'Confeitaria', 'Café', 'Lanches', 'Geral'];
    
    for (const cat of categories) {
        console.log(`Testing category: ${cat}`);
        const { data: ticket, error } = await supabase.rpc('generate_queue_ticket', {
            p_priority: false,
            p_category: cat
        });
        
        if (error) {
            console.error(`Error generating ${cat} ticket:`, error);
        } else {
            console.log(`Success: ${ticket.ticket_number} for ${cat}`);
        }

        // Test priority
        const { data: pTicket, error: pError } = await supabase.rpc('generate_queue_ticket', {
            p_priority: true,
            p_category: cat
        });
        
        if (pError) {
            console.error(`Error generating priority ${cat} ticket:`, pError);
        } else {
            console.log(`Success Priority: ${pTicket.ticket_number} for ${cat}`);
        }
    }
}

testCategories();
