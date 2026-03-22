const fs = require('fs');
const path = './pages/Admin.tsx';
let content = fs.readFileSync(path, 'utf8');

// 8. User Admin avatar (Line 1080) -> fileName
content = content.replace(
    /setUserForm\(prev => \(\{ \.\.\.prev, photo: data\.publicUrl \}\)\);/,
    "setUserForm(prev => ({ ...prev, photo: data.publicUrl }));\n            await syncFileToDrive(file.name, fileName, file.size, file.type, 'Website Assets');"
);

fs.writeFileSync(path, content);
console.log('Updated Admin.tsx');
