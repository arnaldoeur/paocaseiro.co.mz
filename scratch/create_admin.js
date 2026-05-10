
// Script para criar/resetar o utilizador administrador via Bridge
const API_URL = 'http://localhost:8000/public/paocaseiro_db.php';
const AUTH_KEY = 'PaoCaseiro_Direct_MySQL_2026';

async function createAdmin() {
    console.log('🚀 A criar/resetar utilizador administrador...');

    const adminData = {
        action: 'save_team_member',
        member: {
            id: 'admin-nazir-001',
            name: 'Nazir Admin',
            username: 'Nazir',
            email: 'geral@paocaseiro.co.mz',
            phone: '258879146662',
            role: 'admin',
            password: '@Pcaseiro25', // O PHP vai fazer o hash automaticamente
            is_active: 1
        }
    };

    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${AUTH_KEY}`
            },
            body: JSON.stringify(adminData)
        });

        const data = await response.json();
        console.log('✅ Resposta do Servidor:', data);
        
        if (data.success) {
            console.log('\n✨ UTILIZADOR CRIADO COM SUCESSO!');
            console.log('-----------------------------------');
            console.log('Utilizador: Nazir');
            console.log('Password:    @Pcaseiro25');
            console.log('-----------------------------------');
            console.log('Tente fazer login agora no seu browser.');
        } else {
            console.log('❌ Erro ao criar utilizador:', data.error);
        }
    } catch (e) {
        console.error('❌ Falha crítica ao conectar à ponte local:', e.message);
        console.log('DICA: Verifique se o comando "php -S localhost:8000 -t ." está a rodar no terminal.');
    }
}

createAdmin();
