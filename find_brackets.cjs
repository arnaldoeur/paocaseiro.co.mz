const fs = require('fs');
const code = fs.readFileSync('translations.ts', 'utf8').split('\n');
let b = 0, a = 0;
for (let i = 482; i <= 641; i++) {
  let line = code[i];
  for (let c of line) {
    if (c === '{') b++;
    if (c === '}') b--;
    if (c === '[') a++;
    if (c === ']') a--;
  }
  if (a < 0) console.log('Negative bracket balance at line', i+1, ':', line);
}
console.log('Final englishSections bracket balance:', a);
