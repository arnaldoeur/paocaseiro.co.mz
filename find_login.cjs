const fs = require('fs');
const content = fs.readFileSync('c:/Users/arnal/Downloads/paocaseiro.co.mz-20260317T132532Z-1-001/paocaseiro.co.mz/paocaseiro.co.mz/pages/Admin.tsx', 'utf8');
const lines = content.split('\n');
lines.forEach((l, i) => {
    if (l.includes('setIsAuthenticated')) {
        console.log((i + 1) + ': ' + l.trim());
    }
});
