import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://bqiegszufcqimlvucrpm.supabase.co';
const supabaseKey = 'sb_publishable_qRQDGEPxtpR2Je8qjvZgRg_ap-lADS1'; 
const supabase = createClient(supabaseUrl, supabaseKey);

async function seedPresidentPost() {
    const payload = {
        title: "Presidente do Município visitou a Pão Caseiro",
        slug: "presidente-do-municipio-visitou-a-pao-caseiro-" + Date.now(),
        content: "<p>O presidente do município visitou a Pão Caseiro, comprou pão e levou para a sua família, tendo vindo acompanhado pela sua equipa.</p><p>As fotografias deste momento especial serão adicionadas ao artigo muito em breve.</p>",
        excerpt: "O Presidente do Município visitou a Pão Caseiro acompanhado pela sua equipa e levou o nosso pão quentinho para a sua família.",
        image_url: "",
        category: "Eventos",
        tags: ["Visita", "Município", "Pão Caseiro"],
        status: "published",
        author: "Pão Caseiro"
    };

    const { data, error } = await supabase.from('blog_posts').insert([payload]);

    if (error) {
        console.error("Error inserting post:", error);
    } else {
        console.log("Post seeded successfully!");
    }
}

seedPresidentPost();
