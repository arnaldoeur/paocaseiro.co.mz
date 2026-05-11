const fs = require('fs');
const path = require('path');

function walk(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        file = path.resolve(dir, file);
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory() && !file.includes('node_modules') && !file.includes('dist')) {
            results = results.concat(walk(file));
        } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
            results.push(file);
        }
    });
    return results;
}

const files = walk('.');
files.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    let original = content;
    
    content = content.replace(/hostingerService\.getPublicUrl\(['"`]assets\/ui\/logo\.png['"`]\)/g, "'/assets/ui/logo.png'");
    content = content.replace(/hostingerService\.getPublicUrl\(['"`]assets\/ui\/LOGO_PAO_CASEIRO_FUND0_\(SEM_FUNDO\)\.png['"`]\)/g, "'/assets/ui/LOGO_PAO_CASEIRO_FUND0_(SEM_FUNDO).png'");
    
    if (content !== original) {
        fs.writeFileSync(file, content, 'utf8');
        console.log('Updated ' + file);
    }
});
