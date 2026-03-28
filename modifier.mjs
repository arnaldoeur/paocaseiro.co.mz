import fs from 'fs';

const path = 'pages/Admin.tsx';
let content = fs.readFileSync(path, 'utf8');

// 1. Add Import
if (!content.includes('QueueManager')) {
    content = content.replace(
        "import { AdminAuditView } from './admin/AdminAuditView';",
        "import { AdminAuditView } from './admin/AdminAuditView';\nimport { QueueManager } from '../components/admin/QueueManager';"
    );
}

// 2. Add 'queue' to activeView types
content = content.replace(
    /('logistics' \| 'support' \| 'support_ai' \| 'billing' \| 'documents' \| 'messages' \| 'blog' \| 'newsletter')/,
    "$1 | 'queue'"
);

// 3. Add to Sidebar
const sidebarBtn = '<button onClick={() => handleNavClick(\\\'queue\\\')} className={(activeView === \\\'queue\\\' ? \\\'bg-[#d9a65a] text-[#2a2121]\\\' : \\\'text-gray-300 hover:bg-white/5\\\') + \\\' w-full text-left px-6 py-3 rounded-xl flex items-center gap-3 transition-all\\\'}><Users className="w-5 h-5" />Gestão de Senhas</button>\n';
if (!content.includes("handleNavClick('queue')")) {
    content = content.replace(
        "<button onClick={() => handleNavClick('settings')}",
        sidebarBtn.replace(/\\'/g, "'") + "                    <button onClick={() => handleNavClick('settings')}"
    );
}

// 4. Render component
const viewRender = "{activeView === 'queue' && <QueueManager />}\n          {activeView === 'settings' &&";
if (!content.includes("<QueueManager />")) {
    content = content.replace(
        "{activeView === 'settings' &&",
        viewRender
    );
}

fs.writeFileSync(path, content, 'utf8');
console.log("Done. Includes QueueManager:", content.includes('QueueManager'));
