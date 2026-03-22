const fs = require('fs');
let c = fs.readFileSync('pages/admin/AdminDriveView.tsx', 'utf8');

const target1 = `<button onClick={(e) => { e.stopPropagation(); handleDeleteFile(file.id, file.path); }} className="p-1.5 bg-white/90 backdrop-blur text-red-500 rounded-lg hover:bg-red-500 hover:text-white shadow-sm transition-colors border">
                                                            <Trash2 size={14} />
                                                        </button>`;

const replace1 = `<button onClick={(e) => { e.stopPropagation(); handleRenameFile(file.id, file.name, e); }} className="p-1.5 bg-white/90 backdrop-blur text-gray-500 rounded-lg hover:bg-amber-500 hover:text-white shadow-sm transition-colors border" title="Renomear">
                                                            <Edit3 size={14} />
                                                        </button>
                                                        <button onClick={(e) => { e.stopPropagation(); handleDeleteFile(file.id, file.path); }} className="p-1.5 bg-white/90 backdrop-blur text-red-500 rounded-lg hover:bg-red-500 hover:text-white shadow-sm transition-colors border" title="Eliminar">
                                                            <Trash2 size={14} />
                                                        </button>`;
c = c.replace(target1, replace1);

const target2 = /\{isSelectMode && \([\s\S]*?<div className="absolute top-3 left-3 z-10">[\s\S]*?<div className=\{`w-5 h-5[\s\S]*?<\/svg>\}[\s\S]*?<\/div>[\s\S]*?<\/div>[\s\S]*?\)\}/;
const replace2 = `<div className={\`absolute top-3 left-3 z-10 transition-opacity \${isSelectMode || selectedFileIds.includes(file.id) || selectedFileIds.length > 0 ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}\`} onClick={(e) => e.stopPropagation()}>
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
                                                </div>`;
c = c.replace(target2, replace2);

const target3 = `<img src={displayUrl} alt={file.name} loading="lazy" className="w-full h-full object-cover" />`;
const replace3 = `<img src={displayUrl} alt={file.name} loading="lazy" className="w-full h-full object-cover" onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="%239ca3af" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>'; }} />`;
c = c.replace(target3, replace3);

const target4 = `<div className="flex flex-col gap-3">
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
                                </div>`;
const replace4 = `<div className="grid grid-cols-2 gap-3 mt-2">
                                    <button 
                                        onClick={() => handleDownload(selectedFile.displayUrl, selectedFile.name)}
                                        className="col-span-2 py-3 rounded-2xl bg-amber-500 text-white font-bold text-sm shadow-xl hover:bg-amber-600 active:scale-95 transition-all text-center flex justify-center items-center gap-2"
                                    >
                                        <Download size={18} /> Transferir / Baixar
                                    </button>
                                    <button 
                                        onClick={() => {
                                            navigator.clipboard.writeText(selectedFile.displayUrl);
                                            alert('URL do ficheiro copiado para a área de transferência!');
                                        }}
                                        className="col-span-1 py-3 rounded-xl bg-[#3b2f2f] text-[#d9a65a] font-bold text-xs shadow-md hover:brightness-110 active:scale-95 transition-all flex justify-center items-center gap-2 text-center"
                                    >
                                        Copiar Link Base
                                    </button>
                                    <button 
                                        onClick={() => handleRenameFile(selectedFile.id, selectedFile.name)}
                                        className="col-span-1 py-3 rounded-xl bg-gray-100 text-gray-700 font-bold text-xs shadow-sm hover:bg-gray-200 active:scale-95 transition-all flex justify-center items-center gap-2 border border-gray-200"
                                    >
                                        <Edit3 size={16} /> Renomear
                                    </button>
                                    {selectedFile.type?.startsWith('image/') && (
                                        <button 
                                            onClick={() => handleAddGallery(selectedFile.displayUrl, selectedFile.name)}
                                            className="col-span-2 py-3 rounded-xl bg-white border-2 border-amber-200 text-amber-700 font-bold text-sm hover:bg-amber-50 shadow-sm transition-colors text-center flex justify-center items-center gap-2"
                                        >
                                            <ImagePlus size={18} /> Adicionar Imagem à Galeria
                                        </button>
                                    )}
                                    <button 
                                        onClick={() => window.open(selectedFile.displayUrl, '_blank')}
                                        className="col-span-2 py-3 mt-1 rounded-xl bg-gray-50 border border-gray-200 text-gray-400 font-bold text-xs hover:text-gray-600 hover:bg-gray-100 transition-colors text-center"
                                    >
                                        Abrir Ficheiro Externamente
                                    </button>
                                </div>`;
c = c.replace(target4, replace4);

fs.writeFileSync('pages/admin/AdminDriveView.tsx', c);
