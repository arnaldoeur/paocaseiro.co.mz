
import fs from 'fs';

const content = fs.readFileSync('c:\\Users\\arnal\\Downloads\\paocaseiro.co.mz-20260317T132532Z-1-001\\paocaseiro.co.mz\\paocaseiro.co.mz\\pages\\Admin.tsx', 'utf8');
const lines = content.split('\n');

let divStack = [];
let inString = null;
let inComment = false;
let inBlockComment = false;

for (let i = 2714; i < 2978; i++) {
    const line = lines[i];
    inComment = false;
    for (let j = 0; j < line.length; j++) {
        const char = line[j];
        const nextChar = line[j+1];

        if (inBlockComment) {
            if (char === '*' && nextChar === '/') { inBlockComment = false; j++; }
            continue;
        }
        if (inString) {
            if (char === '\\') { j++; continue; }
            if (char === inString) inString = null;
            continue;
        }
        if (char === '/' && nextChar === '/') break;
        if (char === '/' && nextChar === '*') { inBlockComment = true; j++; continue; }
        if (char === "'" || char === '"' || char === '`') { inString = char; continue; }

        const rest = line.slice(j);
        const openMatch = rest.match(/^<div(\s|>|$)/);
        if (openMatch) {
            const tagEnd = rest.indexOf('>');
            if (tagEnd !== -1) {
                const tagFull = rest.slice(0, tagEnd + 1);
                if (!tagFull.endsWith('/>')) {
                    divStack.push({ line: i + 1, col: j + 1, content: tagFull });
                }
                j += tagEnd;
            }
            continue;
        }

        const closeMatch = rest.match(/^<\/div>/);
        if (closeMatch) {
            if (divStack.length === 0) {
                console.log(`EXTRA DIV CLOSURE at line ${i+1}`);
            } else {
                divStack.pop();
            }
            j += 5;
            continue;
        }
    }
}
console.log('Final unclosed divs in block:', divStack.length);
divStack.forEach(s => console.log(`  Line ${s.line}: ${s.content}`));
