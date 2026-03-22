const fs = require('fs');
let c = fs.readFileSync('pages/Admin.tsx', 'utf8');
c = c.replace(/} else if \(typeof publicUrlData !== 'undefined' && publicUrlData && publicUrlData\.publicUrl && publicUrlData\.publicUrl\.includes\('\/supabase-proxy'\)\) \{[\s\S]*?\}/g, '}');
fs.writeFileSync('pages/Admin.tsx', c);
