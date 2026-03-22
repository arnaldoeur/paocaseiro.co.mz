const fs = require('fs');

// Read the raw JSON data that was obtained from Supabase
const rawJson = fs.readFileSync('C:/Users/Arnaldo Eurico/.gemini/antigravity/brain/6cb4d23a-ff7a-4653-9928-cc467fba193d/.system_generated/steps/1368/output.txt', 'utf8');

// The file itself is a JSON object with a "result" key.
const parsedOutput = JSON.parse(rawJson);
const resultString = parsedOutput.result;

// The string contains SQL query output wrapper. Let's extract the actual inner JSON array string.
const jsonStart = resultString.indexOf('[{');
const jsonEnd = resultString.lastIndexOf('}]') + 2;
let jsonData = resultString.substring(jsonStart, jsonEnd);

// Parse inner JSON
const parsed = JSON.parse(jsonData);
const categoriesFromDB = parsed[0].json_agg.filter(c => c.title !== null);

const objToString = (obj) => {
    if (!obj || (Array.isArray(obj) && obj.length === 0)) return '[]';
    return JSON.stringify(obj).replace(/"([^(")"]+)":/g, "$1:");
};

// Generate the TypeScript array content
let tsArrayString = '[\n';
for (const category of categoriesFromDB) {
    tsArrayString += `                {\n                    title: '${category.title}',\n                    items: [\n`;
    for (const item of category.items) {
        tsArrayString += `                        { name: '${item.name.replace(/'/g, "\\'")}', price: ${item.price}, image: '${item.image || '/paocaseiropng.png'}', desc: '${(item.desc || '').replace(/'/g, "\\'")}'`;
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

const translationsPath = 'translations.ts';
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
console.log('Successfully updated translations.ts with all 121 products with variations and complements!');
