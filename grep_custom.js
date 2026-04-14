
import fs from 'fs';

const content = fs.readFileSync('c:\\Users\\arnal\\Downloads\\paocaseiro.co.mz-20260317T132532Z-1-001\\paocaseiro.co.mz\\paocaseiro.co.mz\\pages\\Admin.tsx', 'utf8');
const lines = content.split('\n');

lines.forEach((line, i) => {
    if (line.includes("'notificacoes'") || line.includes('"notificacoes"') || line.includes('notificacoes')) {
        console.log(`Line ${i+1}: ${line.trim()}`);
    }
});
