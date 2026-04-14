const fs = require('fs');
const path = require('path');
const filePath = 'pages/Menu.tsx';
let content = fs.readFileSync(filePath, 'utf8');

// The category order to replace
const oldOrder = `                    const categoryOrder = [
                        'Pão',
                        'Pães',
                        'Doces & Pastelaria',
                        'Folhados & Salgados',
                        'Bolos & Sobremesas',
                        'Pizzas',
                        'Lanches',
                        'Cafés',
                        'Chás',
                        'Bebidas',
                        'Extras'
                    ];`;

const newOrder = `                    const categoryOrder = [
                        'Pães',
                        'Folhados e Doces',
                        'Brioches',
                        'Salgados',
                        'Fatias e Bolos',
                        'Pizzas Grandes',
                        'Pizzas Médias',
                        'Waffle',
                        'Bolos Inteiros/Encomenda',
                        'Cafés',
                        'Chás',
                        'Bebidas',
                        'Extras'
                    ];`;

// Replacing both instances
// We use a regex or split/join to handle any line-ending differences (\r\n vs \n)
function replaceOrder(text, oldArr, newArr) {
    const oldLines = oldArr.split(/\r?\n/).map(l => l.trim());
    const newLines = newArr.split(/\r?\n/);
    
    // Find the sequence of trim-matched lines
    let lines = text.split(/\r?\n/);
    for (let i = 0; i <= lines.length - oldLines.length; i++) {
        let match = true;
        for (let j = 0; j < oldLines.length; j++) {
            if (lines[i+j].trim() !== oldLines[j]) {
                match = false;
                break;
            }
        }
        if (match) {
            // Keep indentation of original first line for new block if possible, 
            // but here it's hardcoded with 20 spaces
            lines.splice(i, oldLines.length, ...newLines);
            i += newLines.length - 1;
        }
    }
    return lines.join('\r\n'); // Force CRLF as it seems to be the file standard
}

const updatedContent = replaceOrder(content, oldOrder, newOrder);
fs.writeFileSync(filePath, updatedContent);
console.log('Processed Menu.tsx successfully.');
