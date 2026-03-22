const fs = require('fs');
let c = fs.readFileSync('pages/admin/AdminDriveView.tsx', 'utf8');

const targetUrlParsing = /const \{ data: \{ publicUrl \} \} = supabase\.storage\.from\('products'\)\.getPublicUrl\(file\.path \|\| file\.name\);\s+let displayUrl = publicUrl;/;

const replaceUrlParsing = `let displayUrl = '';
                                        const pathToCheck = file.path || file.name;
                                        if (pathToCheck.startsWith('http')) {
                                            displayUrl = pathToCheck;
                                        } else if (pathToCheck.startsWith('/')) {
                                            displayUrl = pathToCheck;
                                        } else {
                                            const { data: { publicUrl } } = supabase.storage.from('products').getPublicUrl(pathToCheck);
                                            displayUrl = publicUrl;
                                        }`;

c = c.replace(targetUrlParsing, replaceUrlParsing);

fs.writeFileSync('pages/admin/AdminDriveView.tsx', c);
console.log("Patched URL parsing successfully");
