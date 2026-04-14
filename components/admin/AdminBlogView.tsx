import React, { useState, useEffect, useRef } from 'react';
import { 
    Plus, FileText, Edit3, Trash2, CheckCircle, X, 
    Image as ImageIcon, Loader
} from 'lucide-react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../../services/supabase';
import { AdminNewsletterView } from './AdminNewsletterView';
import { AdminEmailPipelineView } from './AdminEmailPipelineView';

const QuillBase = ReactQuill as any;

export function AdminBlogView() {
    const [posts, setPosts] = useState<any[]>([]);
    const [comments, setComments] = useState<any[]>([]);
    const [mediaFiles, setMediaFiles] = useState<any[]>([]);
    const [galleryItems, setGalleryItems] = useState<any[]>([]);
    const [activeTab, setActiveTab] = useState<'posts'|'comments'|'repository'|'gallery'|'subscribers'|'newsletter'>('posts');
    const [isEditing, setIsEditing] = useState(false);
    const [currentPost, setCurrentPost] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [uploadingRepoMedia, setUploadingRepoMedia] = useState(false);
    const [isUploadingImage, setIsUploadingImage] = useState(false);
    const [teamMembers, setTeamMembers] = useState<any[]>([]);
    const quillRef = useRef<any>(null);
    
    // Form state
    const [title, setTitle] = useState('');
    const [excerpt, setExcerpt] = useState('');
    const [content, setContent] = useState('');
    const [imageUrl, setImageUrl] = useState('');
    const [category, setCategory] = useState('');
    const [tags, setTags] = useState('');
    const [author, setAuthor] = useState('Admin');
    const [seoTitle, setSeoTitle] = useState('');
    const [seoDescription, setSeoDescription] = useState('');
    const [status, setStatus] = useState<'draft'|'published'>('draft');

    const imageHandler = React.useCallback(() => {
        const input = document.createElement('input');
        input.setAttribute('type', 'file');
        input.setAttribute('accept', 'image/*');
        input.click();

        input.onchange = async () => {
            const file = input.files ? input.files[0] : null;
            if (!file) return;

            const fileExt = file.name.split('.').pop();
            const fileName = `blog_inline_${Date.now()}.${fileExt}`;
            
            try {
                const { error } = await supabase.storage.from('products').upload(fileName, file);
                if (error) throw error;
                
                const { data } = supabase.storage.from('products').getPublicUrl(fileName);
                
                const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://bqiegszufcqimlvucrpm.supabase.co';
                let finalUrl = data.publicUrl;
                if (finalUrl.includes('localhost') && finalUrl.includes('/supabase-proxy')) {
                    finalUrl = finalUrl.replace(/^http:\/\/(localhost|127\.0\.0\.1):\d+\/supabase-proxy/, supabaseUrl);
                }
                
                const quill = quillRef.current?.getEditor();
                if (quill) {
                    const range = quill.getSelection(true);
                    quill.insertEmbed(range?.index || 0, 'image', finalUrl);
                    quill.setSelection((range?.index || 0) + 1, 0); 
                }
            } catch (err: any) {
                alert('Erro ao carregar imagem para o texto: ' + err.message);
            }
        };
    }, []);

    const modules = React.useMemo(() => ({
        toolbar: {
            container: [
                [{ 'header': [1, 2, 3, false] }],
                ['bold', 'italic', 'underline', 'strike'],
                [{ 'list': 'ordered'}, { 'list': 'bullet' }],
                [{ 'color': [] }, { 'background': [] }],
                ['link', 'image', 'video'],
                ['clean']
            ],
            handlers: {
                image: imageHandler
            }
        }
    }), [imageHandler]);

    useEffect(() => {
        loadPosts();
        loadComments();
        loadMediaFiles();
        loadGalleryItems();

        const loadTeam = async () => {
            const { data } = await supabase.from('team_members').select('id, name, username, email, phone, role, avatar_url');
            if (data) setTeamMembers(data);
        };
        loadTeam();

        // Background AI Auto-Approval Loop
        const interval = setInterval(async () => {
            try {
                const fiveMinutesAgo = new Date(Date.now() - 5 * 60000).toISOString();
                const { data, error } = await supabase
                    .from('blog_comments')
                    .select('*')
                    .eq('status', 'pending')
                    .lt('created_at', fiveMinutesAgo);

                if (!error && data && data.length > 0) {
                    for (const comment of data) {
                        try {
                            const apiKey = import.meta.env.VITE_OPENROUTER_API_KEY || "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";
                            const aiResponse = await fetch("https://openrouter.ai/api/v1/chat/completions", {
                                method: "POST",
                                headers: {
                                    "Authorization": `Bearer ${apiKey}`,
                                    "Content-Type": "application/json"
                                },
                                body: JSON.stringify({
                                    model: "nvidia/nemotron-3-super-120b-a12b:free",
                                    messages: [
                                        { role: "system", content: "You are a strict, objective comment moderator for a bakery blog. Read the user's comment. Reply ONLY with the word 'APPROVE' if it's safe, relevant, or neutral. Reply ONLY with 'REJECT' if it contains spam, hate, severe profanity, or malicious links. Do NOT output anything else." },
                                        { role: "user", content: `Comment to moderate: "${comment.content}"` }
                                    ],
                                    temperature: 0.1
                                })
                            });
                            const aiData = await aiResponse.json();
                            const reply = aiData.choices?.[0]?.message?.content?.trim()?.toUpperCase() || "";
                            const isApproved = reply.includes("APPROVE");
                            
                            const newStatus = isApproved ? 'approved' : 'rejected';
                            await supabase.from('blog_comments').update({ status: newStatus }).eq('id', comment.id);
                        } catch (aiErr) {
                            console.error("AI auto-check error", aiErr);
                        }
                    }
                    loadComments();
                }
            } catch (err) {
                console.warn('AI Loop skipped.', err);
            }
        }, 60000);

        return () => clearInterval(interval);
    }, []);

    const loadPosts = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('blog_posts')
                .select('*')
                .order('created_at', { ascending: false });
            
            if (error) {
                if (error.code === 'PGRST116' || error.code === '42P01') {
                    setPosts([]);
                } else {
                    throw error;
                }
            } else if (data) {
                setPosts(data);
            }
        } catch (err: any) {
            console.error('Error loading posts:', err);
        } finally {
            setLoading(false);
        }
    };

    const loadComments = async () => {
        try {
            const { data, error } = await supabase
                .from('blog_comments')
                .select('*')
                .order('created_at', { ascending: false });
                
            if (error) {
                if (error.code === '42P01') {
                    setComments([]);
                } else {
                    throw error;
                }
            } else if (data) {
                setComments(data);
            }
        } catch (err) {
            console.error('Error loading comments:', err);
        }
    };

    const loadMediaFiles = async () => {
        try {
            const { data, error } = await supabase.storage.from('products').list('blog_media/');
            if (!error && data) {
                setMediaFiles(data.filter(f => f.name !== '.emptyFolderPlaceholder'));
            }
        } catch (err) {
            console.error('Error loading media files:', err);
        }
    };

    const loadGalleryItems = async () => {
        try {
            const { data, error } = await supabase
                .from('gallery_items')
                .select('*')
                .order('created_at', { ascending: false });
                
            if (!error && data) {
                setGalleryItems(data);
            }
        } catch (err) {
            console.error('Error loading gallery items:', err);
        }
    };

    const handleRepoImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        
        setUploadingRepoMedia(true);
        const fileName = `blog_media/${Date.now()}_${file.name.replace(/\s+/g, '_')}`;
        
        try {
            const { error } = await supabase.storage.from('products').upload(fileName, file);
            if (error) throw error;
            await loadMediaFiles();
            alert('Ficheiro guardado no repositório!');
        } catch (err: any) {
            alert('Erro ao carregar ficheiro: ' + err.message);
        } finally {
            setUploadingRepoMedia(false);
        }
    };

    const handleUpdateCommentStatus = async (id: string, newStatus: string) => {
        try {
            const { error } = await supabase
                .from('blog_comments')
                .update({ status: newStatus })
                .eq('id', id);
                
            if (error) throw error;
            loadComments();
        } catch (e: any) {
            alert(`Erro ao atualizar comentário: ${e.message}`);
        }
    };

    const handleDeleteComment = async (id: string) => {
        if(!window.confirm('Tem a certeza que deseja apagar este comentário permanentemente?')) return;
        const { error } = await supabase.from('blog_comments').delete().eq('id', id);
        if(!error) loadComments();
    };

    const handleEdit = (post: any) => {
        setCurrentPost(post);
        setTitle(post.title || '');
        setExcerpt(post.excerpt || '');
        setContent(post.content || '');
        setImageUrl(post.image_url || '');
        setCategory(post.category || '');
        setTags(post.tags ? post.tags.join(', ') : '');
        setAuthor(post.author || 'Admin');
        setSeoTitle(post.seo_title || '');
        setSeoDescription(post.seo_description || '');
        setStatus(post.status || 'draft');
        setIsEditing(true);
    };

    const handleNew = () => {
        setCurrentPost(null);
        setTitle('');
        setExcerpt('');
        setContent('');
        setImageUrl('');
        setCategory('');
        setTags('');
        setAuthor('Admin');
        setSeoTitle('');
        setSeoDescription('');
        setStatus('draft');
        setIsEditing(true);
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm('Tem a certeza que deseja apagar este artigo?')) return;
        const { error } = await supabase.from('blog_posts').delete().eq('id', id);
        if (error) alert('Erro ao apagar: ' + error.message);
        else loadPosts();
    };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        
        setIsUploadingImage(true);
        try {
            const fileExt = file.name.split('.').pop();
            const fileName = `blog_cover_${Date.now()}.${fileExt}`;
            
            const { error: uploadError } = await supabase.storage.from('products').upload(`blog_media/${fileName}`, file);
            if (uploadError) throw uploadError;
            
            const { data } = supabase.storage.from('products').getPublicUrl(`blog_media/${fileName}`);
            
            const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://bqiegszufcqimlvucrpm.supabase.co';
            let finalUrl = data.publicUrl;
            if (finalUrl.includes('localhost') && finalUrl.includes('/supabase-proxy')) {
                finalUrl = finalUrl.replace(/^http:\/\/(localhost|127\.0\.0\.1):\d+\/supabase-proxy/, supabaseUrl);
            }
            
            setImageUrl(finalUrl);
        } catch (err: any) {
            alert('Erro ao carregar imagem: ' + err.message);
        } finally {
            setIsUploadingImage(false);
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        
        const slugStr = currentPost ? currentPost.slug : title.toLowerCase()
            .normalize('NFD').replace(/[\u0300-\u036f]/g, "")
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/(^-|-$)+/g, '');

        const payload = {
            title,
            slug: slugStr,
            content,
            excerpt,
            image_url: imageUrl,
            category,
            tags: tags.split(',').map(t => t.trim()).filter(Boolean),
            status,
            author: author.trim() || 'Admin',
            seo_title: seoTitle.trim(),
            seo_description: seoDescription.trim(),
            updated_at: new Date().toISOString()
        };

        const { error } = await supabase
            .from('blog_posts')
            .upsert(currentPost ? { ...payload, id: currentPost.id } : payload);

        if (error) {
            alert('Erro ao guardar: ' + error.message);
        } else {
            setIsEditing(false);
            loadPosts();
        }
    };

    if (isEditing) {
        return (
            <div>
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold font-serif text-[#3b2f2f]">{currentPost ? 'Editar Post' : 'Novo Post'}</h2>
                    <button onClick={() => setIsEditing(false)} className="text-gray-500 hover:text-gray-800">Voltar</button>
                </div>
                <form onSubmit={handleSave} className="space-y-4 max-w-4xl">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="col-span-2">
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Título *</label>
                            <input required placeholder="Ex: Nova Receita de Pão" value={title} onChange={e=>setTitle(e.target.value)} className="w-full p-3 border rounded-xl shadow-sm outline-none focus:border-[#d9a65a]" />
                        </div>
                        <div className="col-span-2">
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Resumo (Excerpt)</label>
                            <textarea placeholder="Breve descrição do artigo..." value={excerpt} onChange={e=>setExcerpt(e.target.value)} className="w-full p-3 border rounded-xl h-20 shadow-sm outline-none focus:border-[#d9a65a]" />
                        </div>
                        <div className="col-span-2">
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Conteúdo do Artigo *</label>
                            <div className="bg-white rounded-xl overflow-hidden border shadow-sm">
                                <QuillBase 
                                    ref={quillRef}
                                    theme="snow" 
                                    value={content} 
                                    onChange={setContent} 
                                    modules={modules}
                                    className="h-64 mb-12"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Imagem de Capa</label>
                            <div className="w-full p-3 border rounded-xl flex flex-col gap-2 shadow-sm">
                                <input 
                                    type="file" 
                                    accept="image/*" 
                                    onChange={handleImageUpload} 
                                    disabled={isUploadingImage}
                                    className="text-sm file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-[#d9a65a]/10 file:text-[#d9a65a] hover:file:bg-[#d9a65a]/20 cursor-pointer"
                                />
                                {isUploadingImage && <span className="text-xs text-[#d9a65a]">A carregar imagem...</span>}
                                {imageUrl && !isUploadingImage && (
                                    <div className="mt-2 flex items-center justify-between bg-gray-50 p-2 rounded-xl border">
                                        <div className="flex items-center gap-2 overflow-hidden text-gray-400 text-xs">
                                            <div className="w-10 h-10 rounded overflow-hidden bg-gray-100 flex-shrink-0">
                                                <img src={imageUrl} alt="Capa" className="w-full h-full object-cover" />
                                            </div>
                                            <span className="truncate">{imageUrl}</span>
                                        </div>
                                        <button type="button" onClick={() => setImageUrl('')} className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Autor</label>
                            <input list="team-authors" value={author} onChange={e=>setAuthor(e.target.value)} className="w-full p-3 border rounded-xl shadow-sm outline-none focus:border-[#d9a65a]" />
                            <datalist id="team-authors">
                                <option value="Admin">Admin (Pão Caseiro)</option>
                                {teamMembers.map(m => (
                                    <option key={m.id} value={m.name}>{m.name} ({m.role})</option>
                                ))}
                            </datalist>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Categoria</label>
                            <input value={category} onChange={e=>setCategory(e.target.value)} className="w-full p-3 border rounded-xl shadow-sm outline-none focus:border-[#d9a65a]" />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Tags</label>
                            <input value={tags} onChange={e=>setTags(e.target.value)} className="w-full p-3 border rounded-xl shadow-sm outline-none focus:border-[#d9a65a]" />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Estado</label>
                            <select value={status} onChange={e=>setStatus(e.target.value as any)} className="w-full p-3 border rounded-xl shadow-sm outline-none focus:border-[#d9a65a]">
                                <option value="draft">Rascunho</option>
                                <option value="published">Publicado</option>
                            </select>
                        </div>
                    </div>
                    <button type="submit" className="mt-6 bg-[#3b2f2f] text-[#d9a65a] px-8 py-3 rounded-xl font-bold shadow-lg hover:bg-black transition-all">
                        Gravar Post
                    </button>
                </form>
            </div>
        );
    }

    return (
        <div className="w-full">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-2xl font-bold font-serif text-[#3b2f2f] mb-1">Blog CMS</h2>
                    <p className="text-gray-500 text-sm italic">Gerir as publicações do blog</p>
                </div>
                {(!isEditing && activeTab === 'posts') && (
                    <button onClick={handleNew} className="bg-[#d9a65a] text-white px-4 py-2 rounded-xl font-bold shadow-lg hover:shadow-xl transition-all flex items-center gap-2">
                        <Plus size={18} /> Novo Artigo
                    </button>
                )}
            </div>

            <div className="flex gap-6 mb-6 border-b border-gray-100 overflow-x-auto pb-1 thin-scrollbar">
                {(['posts', 'comments', 'repository', 'gallery', 'subscribers', 'newsletter'] as const).map(tab => (
                    <button 
                        key={tab}
                        onClick={() => setActiveTab(tab)} 
                        className={`pb-3 font-bold text-sm tracking-wide uppercase transition-colors whitespace-nowrap relative ${activeTab === tab ? 'text-[#d9a65a]' : 'text-gray-400 hover:text-[#3b2f2f]'}`}
                    >
                        {tab === 'posts' ? 'Artigos' : 
                         tab === 'comments' ? 'Comentários' : 
                         tab === 'repository' ? 'Repositório' : 
                         tab === 'gallery' ? 'Galeria' : 
                         tab === 'subscribers' ? 'Subscritores' : 'Campanhas Email'}
                        {activeTab === tab && (
                            <motion.div layoutId="tab-active" className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#d9a65a]" />
                        )}
                        {tab === 'comments' && comments.filter(c => c.status === 'pending').length > 0 && (
                            <span className="ml-1 bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full">
                                {comments.filter(c => c.status === 'pending').length}
                            </span>
                        )}
                    </button>
                ))}
            </div>

            <AnimatePresence mode="wait">
                <motion.div
                    key={activeTab}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                >
                    {loading ? (
                        <div className="py-20 text-center"><Loader className="animate-spin mx-auto text-[#d9a65a]" /></div>
                    ) : activeTab === 'posts' ? (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-gray-50/50 text-xs uppercase font-bold text-gray-500 border-b">
                                    <tr>
                                        <th className="p-4">Título</th>
                                        <th className="p-4">Categoria</th>
                                        <th className="p-4">Estado</th>
                                        <th className="p-4">Data</th>
                                        <th className="p-4 text-right">Ações</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {posts.map(post => (
                                        <tr key={post.id} className="hover:bg-gray-50/50 transition-colors">
                                            <td className="p-4 font-bold text-[#3b2f2f]">{post.title}</td>
                                            <td className="p-4 text-gray-500 text-sm">{post.category || '-'}</td>
                                            <td className="p-4">
                                                <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${post.status === 'published' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                                                    {post.status}
                                                </span>
                                            </td>
                                            <td className="p-4 text-gray-400 text-sm whitespace-nowrap">{new Date(post.created_at).toLocaleDateString()}</td>
                                            <td className="p-4 text-right">
                                                <div className="flex justify-end gap-2">
                                                    <button onClick={() => handleEdit(post)} className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors" title="Editar"><Edit3 size={18} /></button>
                                                    <button onClick={() => handleDelete(post.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors" title="Apagar"><Trash2 size={18} /></button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : activeTab === 'comments' ? (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-gray-50/50 text-xs uppercase font-bold text-gray-500 border-b">
                                    <tr>
                                        <th className="p-4">Autor</th>
                                        <th className="p-4">Comentário</th>
                                        <th className="p-4">Artigo</th>
                                        <th className="p-4">Estado</th>
                                        <th className="p-4 text-right">Ações</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {comments.map(comment => {
                                        const postTitle = posts.find(p => p.id === comment.post_id)?.title || 'Desconhecido';
                                        return (
                                            <tr key={comment.id} className="hover:bg-gray-50/50">
                                                <td className="p-4 font-bold text-[#3b2f2f]">{comment.author}</td>
                                                <td className="p-4 text-gray-600 text-sm max-w-xs overflow-hidden text-ellipsis whitespace-nowrap" title={comment.content}>{comment.content}</td>
                                                <td className="p-4 text-gray-500 text-xs truncate max-w-[150px]">{postTitle}</td>
                                                <td className="p-4">
                                                    <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${comment.status === 'approved' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                                                        {comment.status}
                                                    </span>
                                                </td>
                                                <td className="p-4 text-right">
                                                    <div className="flex justify-end gap-1">
                                                        {comment.status !== 'approved' && (
                                                            <button onClick={() => handleUpdateCommentStatus(comment.id, 'approved')} className="p-2 text-green-500 hover:bg-green-50 rounded-lg transition-colors" title="Aprovar"><CheckCircle size={18} /></button>
                                                        )}
                                                        <button onClick={() => handleDeleteComment(comment.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors" title="Apagar"><Trash2 size={18} /></button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    ) : activeTab === 'repository' ? (
                        <div>
                            <div className="flex justify-between items-center mb-6 bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
                                <div>
                                    <h3 className="font-bold text-[#3b2f2f] text-lg">Repositório de Mídia</h3>
                                    <p className="text-sm text-gray-500 italic">Central de ficheiros para o Blog</p>
                                </div>
                                <div className="relative">
                                    <input 
                                        type="file" 
                                        id="repo-upload"
                                        onChange={handleRepoImageUpload} 
                                        disabled={uploadingRepoMedia} 
                                        className="hidden"
                                    />
                                    <label htmlFor="repo-upload" className="bg-[#3b2f2f] text-[#d9a65a] px-6 py-2.5 rounded-xl font-bold text-sm cursor-pointer hover:bg-black transition-colors flex items-center gap-2">
                                        <Plus size={18} /> {uploadingRepoMedia ? 'A enviar...' : 'Carregar Ficheiro'}
                                    </label>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                                {mediaFiles.map((file, idx) => {
                                    const url = supabase.storage.from('products').getPublicUrl(`blog_media/${file.name}`).data.publicUrl;
                                    return (
                                        <div key={idx} className="bg-white p-3 rounded-2xl border border-gray-100 flex flex-col items-center group relative shadow-sm hover:shadow-md transition-all">
                                            <div className="w-full aspect-square bg-gray-50 rounded-xl mb-3 overflow-hidden border">
                                                <img src={url} className="w-full h-full object-cover group-hover:scale-110 transition-transform" alt={file.name} />
                                            </div>
                                            <span className="text-[10px] text-gray-400 truncate w-full px-1 text-center mb-2">{file.name}</span>
                                            <button 
                                                onClick={() => {
                                                    navigator.clipboard.writeText(url);
                                                    alert('URL copiada!');
                                                }}
                                                className="w-full py-1.5 bg-gray-50 hover:bg-[#d9a65a] hover:text-white rounded-lg text-[10px] font-bold uppercase transition-colors"
                                            >
                                                Copiar Link
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ) : activeTab === 'gallery' ? (
                        <div>
                            <div className="flex justify-between items-center mb-6 bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
                                <div>
                                    <h3 className="font-bold text-[#3b2f2f] text-lg">Galeria da Home</h3>
                                    <p className="text-sm text-gray-500 italic">Imagens em destaque na página inicial</p>
                                </div>
                                <div className="relative">
                                    <input 
                                        type="file" 
                                        id="gallery-upload"
                                        accept="image/*" 
                                        onChange={async (e) => {
                                            const file = e.target.files?.[0];
                                            if (!file) return;
                                            try {
                                                const fileExt = file.name.split('.').pop();
                                                const fileName = `gallery_${Date.now()}.${fileExt}`;
                                                const { error: uploadError } = await supabase.storage.from('products').upload(fileName, file);
                                                if (uploadError) throw uploadError;
                                                
                                                let url = supabase.storage.from('products').getPublicUrl(fileName).data.publicUrl;
                                                const caption = prompt('Legenda para a imagem:') || 'Nova Imagem';
                                                await supabase.from('gallery_items').insert({ src: url, caption, display_order: galleryItems.length });
                                                loadGalleryItems();
                                            } catch (err: any) {
                                                alert('Erro: ' + err.message);
                                            }
                                        }}
                                        className="hidden"
                                    />
                                    <label htmlFor="gallery-upload" className="bg-[#3b2f2f] text-[#d9a65a] px-6 py-2.5 rounded-xl font-bold text-sm cursor-pointer hover:bg-black transition-colors flex items-center gap-2">
                                        <Plus size={18} /> Adicionar à Galeria
                                    </label>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                                {galleryItems.map((item) => (
                                    <div key={item.id} className="bg-white p-3 rounded-2xl border border-gray-100 flex flex-col items-center group relative shadow-sm hover:shadow-md transition-all">
                                        <div className="w-full aspect-square bg-gray-50 rounded-xl mb-3 overflow-hidden border">
                                            <img src={item.src} className="w-full h-full object-cover group-hover:scale-110 transition-transform" alt={item.caption} />
                                        </div>
                                        <span className="text-[11px] font-bold text-[#3b2f2f] truncate w-full px-1 text-center">{item.caption}</span>
                                        <button 
                                            onClick={async () => {
                                                if (confirm('Remover esta imagem?')) {
                                                    await supabase.from('gallery_items').delete().eq('id', item.id);
                                                    loadGalleryItems();
                                                }
                                            }}
                                            className="absolute top-4 right-4 bg-red-500 text-white p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity shadow-lg hover:bg-red-600"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : activeTab === 'subscribers' ? (
                        <div className="p-2">
                            <AdminNewsletterView />
                        </div>
                    ) : activeTab === 'newsletter' ? (
                        <div className="p-2">
                            <AdminEmailPipelineView />
                        </div>
                    ) : null}
                </motion.div>
            </AnimatePresence>
        </div>
    );
}
