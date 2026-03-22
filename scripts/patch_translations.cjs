const fs = require('fs');
const path = require('path');

const menuPath = path.join(__dirname, 'correct_menu.json');
const translationsPath = path.join(__dirname, '../translations.ts');

const menuObj = JSON.parse(fs.readFileSync(menuPath, 'utf8'));

const objToString = (obj) => {
    if (!obj || (Array.isArray(obj) && obj.length === 0)) return '[]';
    return JSON.stringify(obj).replace(/"([^(")"]+)":/g, "$1:");
};

let tsArrayString = '[\n';
for (const category of menuObj) {
    tsArrayString += `                {\n                    title: '${category.title}',\n                    items: [\n`;
    for (const item of category.items) {
        tsArrayString += `                        { name: '${item.name.replace(/'/g, "\\'")}', price: ${item.price}, image: '${item.image || '/paocaseiropng.png'}'`;
        if (item.isSpecial) tsArrayString += `, isSpecial: true`;
        if (item.variations && item.variations.length > 0) {
            tsArrayString += `, variations: ${objToString(item.variations)}`;
        }
        if (item.complements && item.complements.length > 0) {
            tsArrayString += `, complements: ${objToString(item.complements)}`;
        }
        tsArrayString += ` },\n`;
    }
    tsArrayString += `                    ]\n                },\n`;
}
tsArrayString += '            ]';

let content = fs.readFileSync(translationsPath, 'utf8');

// Replace the PT sections
const ptMenuStart = content.indexOf('menu:', content.indexOf('pt: {'));
const ptSectionsStart = content.indexOf('sections:', ptMenuStart);
let bracketCount = 0;
let ptSectionsEnd = -1;
for (let i = content.indexOf('[', ptSectionsStart); i < content.length; i++) {
    if (content[i] === '[') bracketCount++;
    if (content[i] === ']') {
        bracketCount--;
        if (bracketCount === 0) {
            ptSectionsEnd = i + 1;
            break;
        }
    }
}

content = content.substring(0, ptSectionsStart) + 'sections: ' + tsArrayString + content.substring(ptSectionsEnd);

// Replace the EN sections
const enMenuStart = content.indexOf('menu:', content.indexOf('en: {'));
const enSectionsStart = content.indexOf('sections:', enMenuStart);
bracketCount = 0;
let enSectionsEnd = -1;
for (let i = content.indexOf('[', enSectionsStart); i < content.length; i++) {
    if (content[i] === '[') bracketCount++;
    if (content[i] === ']') {
        bracketCount--;
        if (bracketCount === 0) {
            enSectionsEnd = i + 1;
            break;
        }
    }
}

content = content.substring(0, enSectionsStart) + 'sections: ' + tsArrayString + content.substring(enSectionsEnd);

fs.writeFileSync(translationsPath, content);
console.log('Successfully updated translations.ts with the corect structural menu fallback!');
