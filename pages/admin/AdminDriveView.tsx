import React, { useState, useEffect } from 'react';
import { supabase } from '../../services/supabase';
import { logAudit } from '../../services/audit';
import { 
    Folder, 
    File, 
    Upload, 
    Trash2, 
    Search, 
    FolderPlus, 
    Image as ImageIcon, 
    FileText, 
    Video, 
    FileJson, 
    ChevronRight, 
    Home,
    AlertCircle,
    Info,
    MoreVertical,
    Download,
    Edit3,
    ImagePlus
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export const AdminDriveView: React.FC = () => {
    const [folders, setFolders] = useState<any[]>([]);
    const [files, setFiles] = useState<any[]>([]);
    const [currentPath, setCurrentPath] = useState<{id: string, name: string}[]>([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    
    const [searchQuery, setSearchQuery] = useState('');
    const [isCreateFolderModalOpen, setIsCreateFolderModalOpen] = useState(false);
    const [newFolderName, setNewFolderName] = useState('');
    
    // Preview Modal
    const [selectedFile, setSelectedFile] = useState<any>(null);

    // Bulk Actions
    const [isSelectMode, setIsSelectMode] = useState(false);
    const [selectedFileIds, setSelectedFileIds] = useState<string[]>([]);

    const currentFolderId = currentPath.length > 0 ? currentPath[currentPath.length - 1].id : null;

    useEffect(() => {
        loadDriveContents();
    }, [currentFolderId]);

    const loadDriveContents = async () => {
        setLoading(true);
        try {
            // Load folders
            let folderQuery = supabase.from('drive_folders').select('*').order('name', { ascending: true });
            
            if (currentFolderId) {
                folderQuery = folderQuery.eq('parent_id', currentFolderId);
            } else {
                folderQuery = folderQuery.is('parent_id', null);
            }
            
            const { data: folderData, error: folderError } = await folderQuery;
            if (folderError) throw folderError;

            // Load files
            let fileQuery = supabase.from('drive_files').select(`*`).order('created_at', { ascending: false });

            if (currentFolderId) {
                fileQuery = fileQuery.eq('folder_id', currentFolderId);
            } else {
                fileQuery = fileQuery.is('folder_id', null);
            }

            const { data: fileData, error: fileError } = await fileQuery;
            if (fileError) throw fileError;

            if (!currentFolderId && folderData && folderData.length === 0 && fileData && fileData.length === 0) {
                // Auto create initial folder based on user request
                const { data: newFolder } = await supabase.from('drive_folders').insert({
                    name: 'Pão Caseiro',
                    parent_id: null
                }).select().single();
                
                if (newFolder) {
                    setFolders([newFolder]);
                }
            } else {
                setFolders(folderData || []);
            }
            
            setFiles(fileData || []);
        } catch (error) {
            console.error("Error loading drive contents:", error);
            // Fallback for robust initialization if table missing
        } finally {
            setLoading(false);
        }
    };

    const handleCreateFolder = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newFolderName.trim()) return;

        try {
            const { error } = await supabase.from('drive_folders').insert({
                name: newFolderName.trim(),
                parent_id: currentFolderId
            });

            if (error) throw error;
            setNewFolderName('');
            setIsCreateFolderModalOpen(false);
            loadDriveContents();
            await logAudit({ action: 'CREATE_FOLDER', entity_type: 'file', details: { folder_name: newFolderName.trim() } });
        } catch (error: any) {
            alert('Erro ao criar pasta: ' + error.message);
        }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const uploaderFiles = e.target.files;
        if (!uploaderFiles || uploaderFiles.length === 0) return;
        
        setUploading(true);
        try {
            for (let i = 0; i < uploaderFiles.length; i++) {
                const file = uploaderFiles[i];
                const fileExt = file.name.split('.').pop();
                const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
                const pathName = `z_drive/${Date.now()}_${safeName}`;
                
                // Upload to Supabase Storage (assuming bucket "products")
                const { error: uploadError } = await supabase.storage.from('products').upload(pathName, file);
                
                if (uploadError) {
                    console.error("Upload Error:", uploadError);
                    continue;
                }
                
                // Get URL
                const { data: urlData } = supabase.storage.from('products').getPublicUrl(pathName);
                
                // Register in drive_files table
                await supabase.from('drive_files').insert({
                    name: file.name,
                    path: pathName,
                    size: file.size,
                    type: file.type || 'application/octet-stream',
                    folder_id: currentFolderId,
                    uploaded_by: 'admin'
                });
                await logAudit({ action: 'UPLOAD_FILE', entity_type: 'file', details: { file_name: file.name, size: file.size } });
            }
            
            loadDriveContents();
        } catch (error: any) {
            alert('Erro ao carregar ficheiro: ' + error.message);
        } finally {
            setUploading(false);
            if (e.target) e.target.value = ''; // Reset input
        }
    };

    const handleDeleteFile = async (fileId: string, storagePath: string) => {
        if (!confirm('Deseja eliminar este ficheiro permanentemente?')) return;
        
        try {
            // First DB Record
            const { error: dbError } = await supabase.from('drive_files').delete().eq('id', fileId);
            if (dbError) throw dbError;
            
            // Then Storage
            if (storagePath) {
                const { error: storageError } = await supabase.storage.from('products').remove([storagePath]);
                if (storageError) console.error("Storage delete error:", storageError);
            }
            
            // If the selected file in preview is the one being deleted, close it
            if (selectedFile?.id === fileId) {
                setSelectedFile(null);
            }
            
            await logAudit({ action: 'DELETE_FILE', entity_type: 'file', entity_id: fileId, details: { path: storagePath } });
            loadDriveContents();
        } catch (error: any) {
            alert('Erro ao eliminar este ficheiro: ' + error.message);
        }
    };

    const handleBulkDelete = async () => {
        if (selectedFileIds.length === 0) return;
        if (!confirm(`Deseja eliminar permanentemente os ${selectedFileIds.length} ficheiros selecionados?`)) return;
        
        try {
            const filesToDelete = files.filter(f => selectedFileIds.includes(f.id));
            const storagePaths = filesToDelete.map(f => f.path).filter(Boolean);

            // DB Records
            const { error: dbError } = await supabase.from('drive_files').delete().in('id', selectedFileIds);
            if (dbError) throw dbError;

            // Storage
            if (storagePaths.length > 0) {
                const { error: storageError } = await supabase.storage.from('products').remove(storagePaths);
                if (storageError) console.error("Bulk storage delete error:", storageError);
            }

            setSelectedFileIds([]);
            setIsSelectMode(false);
            await logAudit({ action: 'BULK_DELETE_FILES', entity_type: 'file', details: { count: selectedFileIds.length } });
            loadDriveContents();
        } catch (error: any) {
            alert('Erro ao eliminar ficheiros: ' + error.message);
        }
    };

    const toggleFileSelection = (fileId: string, e: React.MouseEvent) => {
        e.stopPropagation();
        setSelectedFileIds(prev => 
            prev.includes(fileId) ? prev.filter(id => id !== fileId) : [...prev, fileId]
        );
    };

    const handleDeleteFolder = async (folderId: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!confirm('Deseja eliminar esta pasta permanentemente? Quaisquer ficheiros associados serão perdidos e não podem ser recuperados.')) return;
        
        try {
            // Delete the folder record (requires CASCADE on foreign keys or empty folder enforcement in DB)
            const { error } = await supabase.from('drive_folders').delete().eq('id', folderId);
            if (error) throw error;
            
            loadDriveContents();
        } catch (error: any) {
            alert('Aviso: Certifique-se que a pasta está vazia antes de a eliminar. Erro detalhado: ' + error.message);
        }
    };

    const handleRenameFolder = async (folderId: string, currentName: string, e: React.MouseEvent) => {
        e.stopPropagation();
        const newName = prompt('Introduza o novo nome para esta pasta:', currentName);
        if (!newName || newName.trim() === currentName) return;
        
        try {
            const { error } = await supabase.from('drive_folders').update({ name: newName.trim() }).eq('id', folderId);
            if (error) throw error;
            loadDriveContents();
        } catch (error: any) {
            alert('Erro ao renomear pasta: ' + error.message);
        }
    };

    const handleRenameFile = async (fileId, currentName, e) => {
        if (e) e.stopPropagation();
        const newName = prompt('Introduza o novo nome para este ficheiro (não esqueça da extensão, ex: .png):', currentName);
        if (!newName || newName.trim() === currentName) return;
        try {
            const { error } = await supabase.from('drive_files').update({ name: newName.trim() }).eq('id', fileId);
            if (error) throw error;
            if (selectedFile?.id === fileId) setSelectedFile({...selectedFile, name: newName.trim()});
            loadDriveContents();
            await logAudit({ action: 'RENAME_FILE', entity_type: 'file', entity_id: fileId, details: { new_name: newName } });
        } catch (error) {
            alert('Erro ao renomear ficheiro: ' + error.message);
        }
    };

    const handleDownload = async (url, filename) => {
        try {
            const response = await fetch(url);
            const blob = await response.blob();
            const blobUrl = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = blobUrl;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(blobUrl);
            await logAudit({ action: 'DOWNLOAD_FILE', entity_type: 'file', details: { file_name: filename } });
        } catch(e) {
            window.open(url, '_blank');
        }
    };

    const handleAddGallery = async (fileUrl, fileName) => {
        try {
            const defaultTitle = fileName.split('.')[0].replace(/_/g, ' ');
            const title = prompt('Introduza um título para exibir na Galeria do site:', defaultTitle);
            if (!title) return;
            const { error } = await supabase.from('gallery_items').insert({
                title: title,
                image_url: fileUrl,
                category: 'Geral',
                active: true
            });
            if (error) throw error;
            alert('Imagem adicionada à Galeria com sucesso!');
            await logAudit({ action: 'ADD_TO_GALLERY', entity_type: 'file', details: { title } });
        } catch (e) {
            alert('Erro ao adicionar à Galeria: ' + e.message);
        }
    };

    const navigateToFolder = (folder: {id: string, name: string}) => {
        setCurrentPath([...currentPath, folder]);
    };

    const navigateToBreadcrumb = (index: number) => {
        if (index === -1) {
            setCurrentPath([]);
        } else {
            setCurrentPath(currentPath.slice(0, index + 1));
        }
    };

    const formatBytes = (bytes: number, decimals = 2) => {
        if (!bytes || bytes === 0) return '0 Bytes';
        const k = 1024;
        const dm = decimals < 0 ? 0 : decimals;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
    };

    const getFileIcon = (mimeType: string) => {
        if (!mimeType) return <File size={24} className="text-gray-400" />;
        if (mimeType.startsWith('image/')) return <ImageIcon size={24} className="text-blue-500" />;
        if (mimeType.startsWith('video/')) return <Video size={24} className="text-purple-500" />;
        if (mimeType.includes('pdf') || mimeType.includes('document')) return <FileText size={24} className="text-red-500" />;
        if (mimeType.includes('json') || mimeType.includes('javascript')) return <FileJson size={24} className="text-yellow-500" />;
        return <File size={24} className="text-gray-400" />;
    };

    const filteredFiles = files.filter(f => f.name.toLowerCase().includes(searchQuery.toLowerCase()));
    const filteredFolders = folders.filter(f => f.name.toLowerCase().includes(searchQuery.toLowerCase()));

    return (
        <div className="flex flex-col gap-6 h-full text-[#3b2f2f] animate-fade-in relative z-10 w-full min-h-[70vh]">
            
            {/* Header & Controls */}
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-serif font-bold text-[#3b2f2f] mb-2 flex items-center gap-3">
                        Pão Caseiro Drive
                    </h2>
                    
                    {/* Breadcrumbs */}
                    <div className="flex items-center gap-2 text-sm text-gray-500 font-medium">
                        <button 
                            onClick={() => navigateToBreadcrumb(-1)}
                            className="hover:text-amber-600 transition-colors flex items-center gap-1"
                        >
                            <Home size={16} /> Drive
                        </button>
                        
                        {currentPath.map((folder, idx) => (
                            <React.Fragment key={folder.id}>
                                <ChevronRight size={14} className="text-gray-300" />
                                <button
                                    onClick={() => navigateToBreadcrumb(idx)}
                                    className={`hover:text-amber-600 transition-colors ${idx === currentPath.length - 1 ? 'text-amber-700 font-bold' : ''}`}
                                >
                                    {folder.name}
                                </button>
                            </React.Fragment>
                        ))}
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                    <div className="relative flex-1 md:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                        <input
                            type="text"
                            placeholder="Buscar ficheiros ou pastas..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-amber-500 transition-colors text-sm"
                        />
                    </div>
                    <button 
                        onClick={() => setIsCreateFolderModalOpen(true)}
                        className="p-2.5 bg-gray-100 text-gray-700 hover:bg-amber-100 hover:text-amber-700 rounded-xl font-bold transition-colors flex items-center gap-2"
                        title="Nova Pasta"
                    >
                        <FolderPlus size={18} /> <span className="hidden sm:inline text-xs">Nova Pasta</span>
                    </button>
                    <button 
                        onClick={() => {
                            setIsSelectMode(!isSelectMode);
                            setSelectedFileIds([]);
                        }}
                        className={`p-2.5 rounded-xl font-bold transition-colors flex items-center gap-2 ${isSelectMode ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-700 hover:bg-amber-100 hover:text-amber-700'}`}
                        title="Selecionar Vários"
                    >
                        <span className="hidden sm:inline text-xs">{isSelectMode ? 'Cancelar Seleção' : 'Selecionar'}</span>
                    </button>
                    {isSelectMode && selectedFileIds.length > 0 && (
                        <button 
                            onClick={handleBulkDelete}
                            className="p-2.5 bg-red-100 text-red-700 hover:bg-red-200 rounded-xl font-bold transition-colors flex items-center gap-2"
                            title="Eliminar Selecionados"
                        >
                            <Trash2 size={18} /> <span className="hidden sm:inline text-xs">Eliminar ({selectedFileIds.length})</span>
                        </button>
                    )}
                    <div className="relative">
                        <input 
                            type="file" 
                            id="driveMultiUpload"
                            multiple
                            onChange={handleFileUpload}
                            disabled={uploading}
                            className="hidden"
                        />
                        <label 
                            htmlFor="driveMultiUpload" 
                            className={`p-2.5 bg-[#3b2f2f] text-[#d9a65a] rounded-xl font-bold transition-all shadow-md flex items-center gap-2 cursor-pointer hover:shadow-lg ${uploading ? 'opacity-50 pointer-events-none' : ''}`}
                        >
                            <Upload size={18} /> <span className="hidden sm:inline text-xs">{uploading ? 'A enviar...' : 'Carregar'}</span>
                        </label>
                    </div>
                </div>
            </div>

            {/* Grid Area */}
            <div className="flex-1 bg-white rounded-3xl p-6 shadow-sm border border-gray-100 min-h-[400px]">
                {loading ? (
                    <div className="h-full flex flex-col items-center justify-center text-gray-400 gap-4 py-20">
                        <div className="w-8 h-8 border-4 border-gray-200 border-t-amber-500 rounded-full animate-spin"></div>
                        <p className="font-medium text-sm">Carregando conteúdos...</p>
                    </div>
                ) : (
                    <>
                        {(filteredFolders.length > 0 || (searchQuery && filteredFolders.length > 0)) && (
                            <div className="mb-8">
                                <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-4">Pastas</h3>
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                                    {filteredFolders.map(folder => (
                                        <div
                                            key={folder.id}
                                            onDoubleClick={() => navigateToFolder(folder)}
                                            className="bg-gray-50 border border-gray-100 p-4 rounded-2xl flex items-center gap-3 hover:bg-amber-50 hover:border-amber-200 hover:shadow-md transition-all text-left flex-col justify-center sm:flex-row sm:justify-start group relative cursor-pointer"
                                        >
                                            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity z-10 flex gap-1">
                                                <button onClick={(e) => handleRenameFolder(folder.id, folder.name, e)} className="p-1.5 bg-white/90 backdrop-blur text-gray-500 rounded-lg hover:bg-amber-500 hover:text-white shadow-sm transition-colors border">
                                                    <span className="text-[10px] font-bold">A-z</span>
                                                </button>
                                                <button onClick={(e) => handleDeleteFolder(folder.id, e)} className="p-1.5 bg-white/90 backdrop-blur text-red-500 rounded-lg hover:bg-red-500 hover:text-white shadow-sm transition-colors border">
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                            <Folder className="text-amber-500 flex-shrink-0" fill="currentColor" size={28} />
                                            <span className="font-semibold text-sm text-gray-700 truncate w-full text-center sm:text-left select-none">{folder.name}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div>
                            <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-4">Ficheiros</h3>
                            {filteredFiles.length === 0 ? (
                                <div className="text-center py-16 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                                    <File size={48} className="text-gray-300 mx-auto mb-3" />
                                    <p className="text-gray-500 font-medium text-sm">A pasta está vazia.</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                                    {filteredFiles.map(file => {
                                        const isImage = file.type?.startsWith('image/');
                                        // Build public URL from path since the column 'url' doesn't exist.
                                        let displayUrl = '';
                                        const pathToCheck = file.path || file.name;
                                        if (pathToCheck.startsWith('http')) {
                                            displayUrl = pathToCheck;
                                        } else if (pathToCheck.startsWith('/')) {
                                            displayUrl = pathToCheck;
                                        } else {
                                            const { data: { publicUrl } } = supabase.storage.from('products').getPublicUrl(pathToCheck);
                                            displayUrl = publicUrl;
                                        }

                                        return (
                                            <div 
                                                key={file.id} 
                                                className={`bg-white border p-2 rounded-2xl flex flex-col group hover:shadow-xl hover:-translate-y-1 transition-all cursor-pointer relative ${selectedFileIds.includes(file.id) ? 'border-amber-500 shadow-md ring-2 ring-amber-500/20' : 'border-gray-100'}`}
                                                onClick={() => {
                                                    if (isSelectMode) {
                                                        setSelectedFileIds(prev => prev.includes(file.id) ? prev.filter(id => id !== file.id) : [...prev, file.id]);
                                                    } else {
                                                        setSelectedFile({...file, displayUrl});
                                                    }
                                                }}
                                            >
                                                {/* Actions */}
                                                {!isSelectMode && (
                                                    <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity z-10 flex gap-1">
                                                        <button onClick={(e) => { e.stopPropagation(); handleDeleteFile(file.id, file.path); }} className="p-1.5 bg-white/90 backdrop-blur text-red-500 rounded-lg hover:bg-red-500 hover:text-white shadow-sm transition-colors border">
                                                            <Trash2 size={14} />
                                                        </button>
                                                    </div>
                                                )}
                                                
                                                <div className={`absolute top-3 left-3 z-10 transition-opacity ${isSelectMode || selectedFileIds.includes(file.id) || selectedFileIds.length > 0 ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`} onClick={(e) => e.stopPropagation()}>
                                                    <div className="bg-white/80 backdrop-blur rounded p-1 shadow-sm border border-gray-200 hover:bg-white flex items-center justify-center">
                                                        <input 
                                                            type="checkbox" 
                                                            checked={selectedFileIds.includes(file.id)} 
                                                            onChange={(e) => {
                                                                if(!isSelectMode && e.target.checked) setIsSelectMode(true);
                                                                toggleFileSelection(file.id, e);
                                                            }} 
                                                            className="w-4 h-4 cursor-pointer accent-amber-500 rounded border-gray-300" 
                                                        />
                                                    </div>
                                                </div>

                                                <div className="w-full aspect-square bg-gray-50 rounded-xl mb-3 overflow-hidden border border-gray-100 flex items-center justify-center relative">
                                                    {isImage && displayUrl ? (
                                                        <img src={displayUrl} alt={file.name} loading="lazy" className="w-full h-full object-cover" onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="%239ca3af" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>'; }} />
                                                    ) : (
                                                        getFileIcon(file.type)
                                                    )}
                                                </div>
                                                <div className="px-1 flex flex-col">
                                                    <span className="font-semibold text-xs text-gray-800 truncate w-full" title={file.name}>{file.name}</span>
                                                    <span className="text-[10px] text-gray-400 mt-0.5">{formatBytes(file.size)}</span>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </>
                )}
            </div>

            {/* Modals */}
            <AnimatePresence>
                {isCreateFolderModalOpen && (
                    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                        <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="bg-white rounded-3xl w-full max-w-sm p-6 shadow-2xl relative">
                            <h3 className="text-xl font-bold text-[#3b2f2f] mb-4 font-serif">Nova Pasta</h3>
                            <form onSubmit={handleCreateFolder}>
                                <input
                                    type="text"
                                    autoFocus
                                    placeholder="Nome da pasta"
                                    value={newFolderName}
                                    onChange={e => setNewFolderName(e.target.value)}
                                    className="w-full p-4 bg-gray-50 border border-gray-200 rounded-2xl mb-6 outline-none focus:border-amber-500 transition-colors"
                                />
                                <div className="flex gap-3">
                                    <button type="button" onClick={() => setIsCreateFolderModalOpen(false)} className="flex-1 py-3 text-sm font-bold text-gray-500 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors">Cancelar</button>
                                    <button type="submit" disabled={!newFolderName.trim()} className="flex-1 py-3 text-sm font-bold text-white bg-amber-600 hover:bg-amber-700 disabled:opacity-50 rounded-xl transition-colors">Criar</button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}

                {selectedFile && (
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex justify-end">
                        <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} className="bg-[#fcfbf9] w-full max-w-md h-full shadow-2xl overflow-y-auto flex flex-col border-l border-gray-200">
                            {/* Drawer Header */}
                            <div className="flex items-center justify-between p-6 border-b border-gray-100 bg-white sticky top-0 z-10">
                                <h3 className="font-bold text-[#3b2f2f] text-lg truncate pr-4">Detalhes do Ficheiro</h3>
                                <button onClick={() => setSelectedFile(null)} className="p-2 bg-gray-100 text-gray-500 hover:bg-gray-200 rounded-full transition-colors">
                                    <ChevronRight size={20} />
                                </button>
                            </div>

                            {/* Drawer Body */}
                            <div className="p-6 flex flex-col gap-6">
                                {/* Preview Block */}
                                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-2 overflow-hidden flex items-center justify-center min-h-[200px]">
                                    {selectedFile.type?.startsWith('image/') ? (
                                        <img src={selectedFile.displayUrl} alt={selectedFile.name} className="max-w-full rounded-xl max-h-[300px] object-contain" />
                                    ) : selectedFile.type?.startsWith('video/') ? (
                                        <video src={selectedFile.displayUrl} controls className="w-full rounded-xl max-h-[300px]" />
                                    ) : (
                                        <div className="p-8"><File size={64} className="text-gray-300 mx-auto" /></div>
                                    )}
                                </div>

                                {/* Details Block */}
                                <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 flex flex-col gap-4">
                                    <div className="flex justify-between items-start pb-4 border-b border-gray-50">
                                        <div>
                                            <p className="text-[10px] text-gray-400 uppercase tracking-widest font-bold mb-1">Nome do Ficheiro</p>
                                            <p className="font-bold text-gray-800 text-sm break-all">{selectedFile.name}</p>
                                        </div>
                                    </div>
                                    
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <p className="text-[10px] text-gray-400 uppercase tracking-widest font-bold mb-1">Tamanho</p>
                                            <p className="font-mono text-sm text-gray-700">{formatBytes(selectedFile.size)}</p>
                                        </div>
                                        <div>
                                            <p className="text-[10px] text-gray-400 uppercase tracking-widest font-bold mb-1">Tipo</p>
                                            <p className="text-xs text-gray-700 break-all">{selectedFile.type}</p>
                                        </div>
                                        <div className="col-span-2">
                                            <p className="text-[10px] text-gray-400 uppercase tracking-widest font-bold mb-1">Data de Envio</p>
                                            <p className="text-xs text-gray-700">{new Date(selectedFile.created_at).toLocaleString('pt-PT')}</p>
                                        </div>
                                        {selectedFile.uploaded_by && (
                                            <div className="col-span-2">
                                                <p className="text-[10px] text-gray-400 uppercase tracking-widest font-bold mb-1">Enviado por</p>
                                                <p className="text-xs text-gray-700 font-semibold">{selectedFile.uploaded_by}</p>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Actions Block */}
                                <div className="flex flex-col gap-3">
                                    <button 
                                        onClick={() => {
                                            navigator.clipboard.writeText(selectedFile.displayUrl);
                                            alert('URL do ficheiro copiado para a área de transferência!');
                                        }}
                                        className="w-full py-4 rounded-2xl bg-[#3b2f2f] text-[#d9a65a] font-bold text-sm shadow-xl hover:brightness-110 active:scale-95 transition-all text-center flex justify-center items-center gap-2"
                                    >
                                        Copiar Link Público
                                    </button>
                                    <button 
                                        onClick={() => window.open(selectedFile.displayUrl, '_blank')}
                                        className="w-full py-3 rounded-2xl bg-white border border-gray-200 text-gray-700 font-bold text-sm hover:bg-gray-50 transition-colors text-center"
                                    >
                                        Abrir Ficheiro Externamente
                                    </button>
                                </div>

                                {/* Danger Zone */}
                                <div className="mt-4 bg-red-50 p-6 rounded-3xl border border-red-100 flex items-start gap-4">
                                    <AlertCircle size={24} className="text-red-500 flex-shrink-0" />
                                    <div>
                                        <p className="text-xs font-bold text-red-800 mb-1">Avisos</p>
                                        <p className="text-[10px] text-red-600 mb-4">A deleção deste ficheiro o tornará indisponível caso esteja sendo usado em artigos do blog, produtos ou outros locais públicos.</p>
                                        <button 
                                            onClick={() => {
                                                handleDeleteFile(selectedFile.id, selectedFile.path);
                                                setSelectedFile(null);
                                            }}
                                            className="text-xs font-bold text-red-600 bg-white border border-red-200 px-4 py-2 rounded-xl hover:bg-red-50 transition-colors"
                                        >
                                            Eliminar Definitivamente
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};
