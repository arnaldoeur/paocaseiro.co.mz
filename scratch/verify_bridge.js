
const API_URL = 'https://paocaseiro.co.mz/paocaseiro_db.php';
const API_KEY = 'PaoCaseiro_Direct_MySQL_2026';

async function test(action, payload = {}) {
    console.log(`Testing action: ${action}...`);
    try {
        const res = await fetch(API_URL, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${API_KEY}`
            },
            body: JSON.stringify({ action, ...payload })
        });
        const data = await res.json();
        console.log(`Response for ${action}:`, JSON.stringify(data, null, 2));
        return data;
    } catch (err) {
        console.error(`Error in ${action}:`, err);
    }
}

async function runTests() {
    // 1. Test basic connectivity
    await test('test');

    // 2. Test system settings (alias and filter)
    await test('system_settings', { key: 'email_status' });

    // 3. Test bulk save
    await test('bulk_save_products', { 
        products: [
            { id: 'test_1', name: 'Test Product 1', price: 10, stock_quantity: 50 },
            { id: 'test_2', name: 'Test Product 2', price: 20, stock_quantity: 100 }
        ]
    });

    // 4. Test team auth (should fail if no user, but shouldn't 500)
    await test('auth_team', { username: 'nonexistent', password: 'password' });
}

runTests();
