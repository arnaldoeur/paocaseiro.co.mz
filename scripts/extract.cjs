const fs = require('fs');
const content = fs.readFileSync('c:/Users/arnal/Downloads/paocaseiro.co.mz-20260317T132532Z-1-001/paocaseiro.co.mz/paocaseiro.co.mz/assets/index-Dhqtwae8.js', 'utf8');

const startStr = '[{title:"Folhados e Doces",items:';
const startIndex = content.indexOf(startStr);

if (startIndex === -1) {
    console.error('Could not find start index');
    process.exit(1);
}

let bracketCount = 0;
let endIndex = -1;
let started = false;

for (let i = startIndex; i < content.length; i++) {
    if (content[i] === '[') {
        bracketCount++;
        started = true;
    }
    if (content[i] === ']') {
        bracketCount--;
        if (started && bracketCount === 0) {
            endIndex = i + 1;
            break;
        }
    }
}

let arrayStr = content.substring(startIndex, endIndex);

// Using a Function constructor allows evaluating an object literal securely in its own scope
const getObj = new Function('return ' + arrayStr + ';');
const menuObj = getObj();

fs.writeFileSync('c:/Users/arnal/Downloads/paocaseiro.co.mz-20260317T132532Z-1-001/paocaseiro.co.mz/paocaseiro.co.mz/scripts/correct_menu.json', JSON.stringify(menuObj, null, 2));
console.log('Successfully extracted ' + menuObj.length + ' categories to scripts/correct_menu.json.');
