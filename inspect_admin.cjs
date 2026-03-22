const fs = require('fs');
const content = fs.readFileSync('c:/Users/arnal/Downloads/paocaseiro.co.mz-20260317T132532Z-1-001/paocaseiro.co.mz/paocaseiro.co.mz/pages/Admin.tsx', 'utf-8');
const lines = content.split('\n');

for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('loadTeamMembers')) {
        console.log(`=== loadTeamMembers ===`);
        console.log(lines.slice(Math.max(0, i), i + 10).join('\n'));
    }
}

let inSave = false;
let sStr = [];
for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('handleSaveMember =')) inSave = true;
    if (inSave) {
        sStr.push(lines[i]);
        if (lines[i].includes('} catch (err)') || sStr.length > 30) {
            inSave = false;
        }
    }
}
console.log('=== handleSaveMember ===');
console.log(sStr.join('\n'));
