
const HOSTINGER_BRIDGE_URL = 'https://paocaseiro.co.mz/paocaseiro_db.php';
const HOSTINGER_API_KEY = 'PaoCaseiro_Direct_MySQL_2026';

async function checkLogs() {
    try {
        const response = await fetch(`${HOSTINGER_BRIDGE_URL}?action=get_sms_logs`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${HOSTINGER_API_KEY}`
            },
            body: JSON.stringify({ action: 'get_sms_logs', limit: 10 })
        });

        const data = await response.json();
        console.log('Last 10 logs:', JSON.stringify(data, null, 2));
    } catch (error) {
        console.error('Error fetching logs:', error);
    }
}

checkLogs();
