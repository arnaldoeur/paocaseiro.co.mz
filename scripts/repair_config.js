import fs from 'fs';

// 1. Repair vite.config.ts
const vitePath = 'c:/Users/arnal/Downloads/paocaseiro.co.mz-20260317T132532Z-1-001/paocaseiro.co.mz/paocaseiro.co.mz/vite.config.ts';
if (fs.existsSync(vitePath)) {
    const lines = fs.readFileSync(vitePath, 'utf8').split('\n');
    // Remove lines 9 to 64 (inclusive)
    const filtered = lines.filter((_, i) => (i + 1) < 9 || (i + 1) > 64);
    fs.writeFileSync(vitePath, filtered.join('\n'));
    console.log('Cleaned up vite.config.ts');
}

// 2. Repair services/supabase.ts
const supabasePath = 'c:/Users/arnal/Downloads/paocaseiro.co.mz-20260317T132532Z-1-001/paocaseiro.co.mz/paocaseiro.co.mz/services/supabase.ts';
if (fs.existsSync(supabasePath)) {
    let content = fs.readFileSync(supabasePath, 'utf8');
    content = content.replace("|| 'proxy'", "|| 'direct'");
    content = content.replace("return 'proxy'", "return 'direct'");
    fs.writeFileSync(supabasePath, content);
    console.log('Updated services/supabase.ts to default to direct mode');
}
