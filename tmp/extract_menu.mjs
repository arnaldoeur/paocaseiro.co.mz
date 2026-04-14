import fs from 'fs';
import path from 'path';

// This script extracts the menu from the .ts file by reading it as text 
// since we can't easily execute .ts here without extra dependencies.
// We'll use a regex approach to extract the array content.

const filePath = 'c:/Users/arnal/Downloads/paocaseiro.co.mz-20260317T132532Z-1-001/paocaseiro.co.mz/paocaseiro.co.mz/src/data/hardcoded_menu.ts';
const content = fs.readFileSync(filePath, 'utf8');

// The file exports default [ ... ];
// We'll find the start of the array and the end.
const startMatch = content.indexOf('[');
const endMatch = content.lastIndexOf(']');

if (startMatch === -1 || endMatch === -1) {
    console.error('Could not find array in file');
    process.exit(1);
}

const arrayText = content.substring(startMatch, endMatch + 1);

try {
    // Note: This might fail if there are functions or complex types, but it looks like pure JSON in the file.
    // Actually, looking at the file, it is valid JS/TS but we can try to parse it as JSON if we clean it up
    // or just use eval in a safe-ish way since we trust the source.
    const menu = eval(arrayText);
    console.log(JSON.stringify(menu, null, 2));
} catch (e) {
    console.error('Failed to parse menu text:', e.message);
    process.exit(1);
}
