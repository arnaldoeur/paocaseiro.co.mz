const fs = require('fs');
const path = './pages/admin/AdminDriveView.tsx';
let content = fs.readFileSync(path, 'utf8');

// Add import
if (!content.includes('logAudit')) {
    content = content.replace("import { supabase } from '../../services/supabase';", "import { supabase } from '../../services/supabase';\nimport { logAudit } from '../../services/audit';");
}

// 1. handleCreateFolder
content = content.replace(
    /setNewFolderName\(''\);\s*setIsCreateFolderModalOpen\(false\);\s*loadDriveContents\(\);/,
    "setNewFolderName('');\n            setIsCreateFolderModalOpen(false);\n            loadDriveContents();\n            await logAudit({ action: 'CREATE_FOLDER', entity_type: 'file', details: { folder_name: newFolderName.trim() } });"
);

// 2. handleFileUpload
content = content.replace(
    /uploaded_by: 'admin'\s*\}\);\s*\}\s*loadDriveContents\(\);/,
    "uploaded_by: 'admin'\n                });\n                await logAudit({ action: 'UPLOAD_FILE', entity_type: 'file', details: { file_name: file.name, size: file.size } });\n            }\n            \n            loadDriveContents();"
);

// 3. handleDeleteFile
content = content.replace(
    /if \(selectedFile\?\.id === fileId\) \{\s*setSelectedFile\(null\);\s*\}\s*loadDriveContents\(\);/,
    "if (selectedFile?.id === fileId) {\n                setSelectedFile(null);\n            }\n            \n            await logAudit({ action: 'DELETE_FILE', entity_type: 'file', entity_id: fileId, details: { path: storagePath } });\n            loadDriveContents();"
);

// 4. handleBulkDelete
content = content.replace(
    /setSelectedFileIds\(\[\]\);\s*setIsSelectMode\(false\);\s*loadDriveContents\(\);/,
    "setSelectedFileIds([]);\n            setIsSelectMode(false);\n            await logAudit({ action: 'BULK_DELETE_FILES', entity_type: 'file', details: { count: selectedFileIds.length } });\n            loadDriveContents();"
);

fs.writeFileSync(path, content);
console.log('Updated AdminDriveView.tsx with audit logs');
