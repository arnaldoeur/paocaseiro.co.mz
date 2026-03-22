const fs = require('fs');
const path = './pages/Admin.tsx';
let content = fs.readFileSync(path, 'utf8');

if (!content.includes('syncFileToDrive')) {
    content = content.replace("import { supabase } from '../services/supabase';", "import { supabase } from '../services/supabase';\nimport { syncFileToDrive } from '../utils/driveSync';");
}


// Pattern to find `getPublicUrl` calls that end with `set[Something](data.publicUrl)`
// and inject `await syncFileToDrive` after it

// 1. handleDriverImageUpload (Line 791) -> fileName
content = content.replace(
    /setDriverForm\(\{ \.\.\.driverForm, avatar_url: data\.publicUrl \}\);/,
    "setDriverForm({ ...driverForm, avatar_url: data.publicUrl });\n        await syncFileToDrive(file.name, fileName, file.size, file.type, 'Website Assets');"
);

// 2. handleImageUpload (Line 1475) -> filePath
content = content.replace(
    /\/\/ Auto-sync with Drive module \(Fotos de Produtos\)[\s\S]*?catch \(syncErr\) \{\s*console\.error\("Failed to sync image with Drive:", syncErr\);\s*\}/,
    "await syncFileToDrive(file.name, filePath, file.size, file.type, 'Fotos de Produtos');"
);

// 3. Avatar upload (Line 3398) -> fileName
content = content.replace(
    /setMemberAvatar\(data\.publicUrl\);/,
    "setMemberAvatar(data.publicUrl);\n                                                                await syncFileToDrive(file.name, fileName, file.size, file.type, 'Website Assets');"
);

// 4. Company Logo (Line 5059) -> fileName
content = content.replace(
    /setCompanyInfo\(prev => \(\{ \.\.\.prev, logo: data\.publicUrl \}\)\);/,
    "setCompanyInfo(prev => ({ ...prev, logo: data.publicUrl }));\n                                                                        await syncFileToDrive(file.name, fileName, file.size, file.type, 'Website Assets');"
);

// 5. Blog Feat Image (Line 6410)
content = content.replace(
    /setNewPost\(\{ \.\.\.newPost, feature_image: data\.publicUrl \}\);/,
    "setNewPost({ ...newPost, feature_image: data.publicUrl });\n                await syncFileToDrive(file.name, fileName, file.size, file.type, 'Arquivos do Blog');"
);

// 6. Blog Media general (Line 6637) -> fileName
content = content.replace(
    /insertMediaToEditor\(data\.publicUrl, file\.type\);/,
    "insertMediaToEditor(data.publicUrl, file.type);\n            await syncFileToDrive(file.name, fileName, file.size, file.type, 'Arquivos do Blog');"
);

// 7. Gallery Image (Line 6996) -> fileName
content = content.replace(
    /const publicUrlData = supabase\.storage\.from\('products'\)\.getPublicUrl\(fileName\)\.data;/,
    "const publicUrlData = supabase.storage.from('products').getPublicUrl(fileName).data;\n                                        await syncFileToDrive(file.name, fileName, file.size, file.type, 'Website Assets');"
);

fs.writeFileSync(path, content);
console.log('Updated Admin.tsx');
