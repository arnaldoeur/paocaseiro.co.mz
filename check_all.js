
import fs from 'fs';

const content = fs.readFileSync('c:\\Users\\arnal\\Downloads\\paocaseiro.co.mz-20260317T132532Z-1-001\\paocaseiro.co.mz\\paocaseiro.co.mz\\pages\\Admin.tsx', 'utf8');
const lines = content.split('\n');

const stacks = {
    brace: [],
    paren: [],
    bracket: []
};

let inString = null;
let inComment = false;
let inBlockComment = false;

for (let i = 0; i < lines.length; i++) {
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

        if (char === '{') stacks.brace.push({ line: i + 1, col: j + 1 });
        if (char === '}') stacks.brace.pop();
        if (char === '(') stacks.paren.push({ line: i + 1, col: j + 1 });
        if (char === ')') stacks.paren.pop();
        if (char === '[') stacks.bracket.push({ line: i + 1, col: j + 1 });
        if (char === ']') stacks.bracket.pop();
    }
}

console.log('Unclosed Braces:', stacks.brace.length);
stacks.brace.forEach(s => console.log(`  Line ${s.line}`));
console.log('Unclosed Parens:', stacks.paren.length);
stacks.paren.forEach(s => console.log(`  Line ${s.line}`));
console.log('Unclosed Brackets:', stacks.bracket.length);
stacks.bracket.forEach(s => console.log(`  Line ${s.line}`));
