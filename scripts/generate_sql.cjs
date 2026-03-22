const fs = require('fs');

const rawJson = fs.readFileSync('C:/Users/Arnaldo Eurico/.gemini/antigravity/brain/6cb4d23a-ff7a-4653-9928-cc467fba193d/.system_generated/steps/1324/output.txt', 'utf8');

const parsedOutput = JSON.parse(rawJson);
const resultString = parsedOutput.result;

const jsonStart = resultString.indexOf('[{');
const jsonEnd = resultString.lastIndexOf('}]') + 2;
let jsonData = resultString.substring(jsonStart, jsonEnd);

const productsData = JSON.parse(jsonData);
// Depending on query structure it might be nested
const products = productsData[0].json_agg ? productsData[0].json_agg : productsData;


function toTitleCase(str) {
    if (!str) return str;
    let lower = str.toLowerCase();
    return lower.charAt(0).toUpperCase() + lower.slice(1);
}

let sqlQueries = '';
let count = 0;

for (const p of products) {
    const cleanName = toTitleCase(p.name);
    if (cleanName !== p.name) {
        sqlQueries += `UPDATE products SET name = '${cleanName.replace(/'/g, "''")}' WHERE id = '${p.id}';\n`;
        count++;
    }
}

fs.writeFileSync('update_names.sql', sqlQueries);
console.log(`Generated ${count} UPDATE statements in update_names.sql`);
