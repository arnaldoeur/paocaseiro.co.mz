const fs = require('fs');
const filepath = 'c:/Users/arnal/Downloads/paocaseiro.co.mz-20260317T132532Z-1-001/paocaseiro.co.mz/paocaseiro.co.mz/pages/Admin.tsx';
let content = fs.readFileSync(filepath, 'utf8');

// Replacement 1: Main Supabase Auth
content = content.replace(
    /if \(data\.avatar_url\) localStorage\.setItem\('admin_photo', data\.avatar_url\);\s*refreshAllData\(\);/,
    `if (data.avatar_url) localStorage.setItem('admin_photo', data.avatar_url);

                await logAudit('ADMIN_LOGIN', 'auth', data.id, { method: 'password' }, data.name);

                refreshAllData();`
);

// Replacement 2: Local Match (success)
content = content.replace(
    /localStorage\.setItem\('admin_photo', ''\);\s*refreshAllData\(\);/,
    `localStorage.setItem('admin_photo', '');
                    
                    await logAudit('ADMIN_LOGIN', 'auth', localMatch.id, { method: 'fallback_password' }, localMatch.name);
                    
                    refreshAllData();`
);

// Replacement 3: Network Error (Local Match)
const targetBlock = `localStorage.setItem('admin_id', localMatch.id);
                localStorage.setItem('admin_user', localMatch.name);
                refreshAllData();`;
                
const replaceBlock = `localStorage.setItem('admin_id', localMatch.id);
                localStorage.setItem('admin_user', localMatch.name);
                
                await logAudit('ADMIN_LOGIN', 'auth', localMatch.id, { method: 'fallback_network' }, localMatch.name);
                
                refreshAllData();`;

content = content.replace(targetBlock, replaceBlock);

fs.writeFileSync(filepath, content, 'utf8');
console.log('Successfully injected ADMIN_LOGIN audit logs into Admin.tsx');
