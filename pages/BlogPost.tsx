import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { supabase } from '../services/supabase';
import { Language, translations } from '../translations';
import { Calendar, User, ArrowLeft, Share2, Tag, BookOpen, ChevronRight, Facebook, MessageCircle, Link as LinkIcon, Trash2, Edit3 } from 'lucide-react';
import { ClientLoginModal } from '../components/ClientLoginModal';

interface BlogPostFull {
    id: string;
    title: string;
    slug: string;
    content: string;
    excerpt?: string;
    image_url: string;
    author: string;
    category: string;
    tags: string[];
    created_at: string;
}

export const BlogPost: React.FC<{ language: Language }> = ({ language }) => {
    const { slug } = useParams<{ slug: string }>();
    const t = translations[language].blog;
    const [post, setPost] = useState<BlogPostFull | null>(null);
    const [loading, setLoading] = useState(true);
    
    // Comments state
    const [comments, setComments] = useState<any[]>([]);
    const [newCommentName, setNewCommentName] = useState('');
    const [newCommentContent, setNewCommentContent] = useState('');
    const [submittingComment, setSubmittingComment] = useState(false);
    const [commentMessage, setCommentMessage] = useState({ text: '', type: '' });
    
    // Auth State
    const [currentUser, setCurrentUser] = useState<any>(null);
    const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);

    const navigate = useNavigate();

    useEffect(() => {
        // Setup auth listener
        supabase.auth.getSession().then(({ data: { session } }) => {
            setCurrentUser(session?.user || null);
            if (session?.user) {
                setNewCommentName(session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || '');
            }
        });

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setCurrentUser(session?.user || null);
            if (session?.user) {
                setNewCommentName(session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || '');
            }
        });

        return () => subscription.unsubscribe();
    }, []);

    useEffect(() => {
        const fetchPostAndComments = async () => {
            if (!slug) return;
            
            // Fetch single post
            const { data: postData, error: postError } = await supabase
                .from('blog_posts')
                .select('*')
                .eq('slug', slug)
                .single();

            if (!postError && postData) {
                setPost(postData);
                
                // Fetch comments for this post
                const { data: commentsData } = await supabase
                    .from('blog_comments')
                    .select('*')
                    .eq('post_id', postData.id)
                    .order('created_at', { ascending: true });
                    
                if (commentsData) {
                    setComments(commentsData);
                }
            }

            setLoading(false);
        };
        fetchPostAndComments();
    }, [slug]);

    const handleShare = async () => {
        try {
            if (navigator.share) {
                await navigator.share({
                    title: post?.title,
                    url: window.location.href,
                });
            } else {
                navigator.clipboard.writeText(window.location.href);
                alert('Link copiado para a área de transferência!');
            }
        } catch (err) {
            console.error('Error sharing:', err);
        }
    };

    const handleCommentSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!post || !newCommentName.trim() || !newCommentContent.trim()) return;
        
        setSubmittingComment(true);
        setCommentMessage({ text: '', type: '' });
        
        const { data, error } = await supabase
            .from('blog_comments')
            .insert([{
                post_id: post.id,
                author: newCommentName.trim(),
                content: newCommentContent.trim(),
                user_id: currentUser?.id,
                status: 'pending' // requires status to be accepted by db or handled properly
            }])
            .select();
            
        setSubmittingComment(false);
        
        if (error) {
            setCommentMessage({ text: t.comments?.error || 'Erro ao enviar comentário.', type: 'error' });
        } else if (data) {
            setCommentMessage({ text: t.comments?.success || 'Comentário enviado!', type: 'success' });
            setComments([...comments, data[0]]);
            setNewCommentName('');
            setNewCommentContent('');
            
            // Clear message after 3 seconds
            setTimeout(() => setCommentMessage({ text: '', type: '' }), 3000);
        }
    };

    const handleDeleteComment = async (id: string) => {
        if (!window.confirm('Tem a certeza que deseja apagar este comentário?')) return;
        const { error } = await supabase.from('blog_comments').delete().eq('id', id);
        if (!error) {
            setComments(comments.filter(c => c.id !== id));
        } else {
            alert('Erro ao apagar comentário: ' + error.message);
        }
    };

    const visibleComments = comments.filter(c => c.status === 'approved' || c.user_id === currentUser?.id || !c.status);

    if (loading) {
        return (
            <div className="min-h-screen pt-28 pb-20 flex justify-center items-center bg-[#f7f1eb]">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#d9a65a]"></div>
            </div>
        );
    }

    if (!post) {
        return (
            <div className="min-h-screen pt-28 pb-20 flex flex-col items-center justify-center text-center px-6 bg-[#f7f1eb]">
                <h1 className="text-4xl font-black font-serif text-[#3b2f2f] mb-4">Post não encontrado</h1>
                <p className="text-gray-500 mb-8 font-medium">O artigo que tentou acessar não existe ou foi removido.</p>
                <button
                    onClick={() => navigate('/blog')}
                    className="flex items-center gap-2 bg-[#d9a65a] text-[#3b2f2f] px-8 py-4 rounded-xl font-bold hover:shadow-xl hover:-translate-y-1 transition-all uppercase tracking-widest text-sm"
                >
                    <ArrowLeft size={20} />
                    {t.backToBlog || 'Voltar ao Blog'}
                </button>
            </div>
        );
    }

    return (
        <article className="pt-28 pb-20 min-h-screen bg-[#f7f1eb]">
            <div className="container mx-auto px-6 max-w-4xl">
                <button
                    onClick={() => navigate('/blog')}
                    className="flex items-center gap-2 text-gray-400 hover:text-[#d9a65a] font-bold text-sm uppercase tracking-widest transition-colors mb-10"
                >
                    <ArrowLeft size={16} /> {t.backToBlog || 'Voltar'}
                </button>

                {/* Main Article Content */}
                <motion.div 
                    initial={{ opacity: 0, y: 20 }} 
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white rounded-[2.5rem] p-8 md:p-16 shadow-sm border border-[#3b2f2f]/5 relative overflow-hidden mb-12"
                >
                    {post.category && (
                        <div className="inline-block bg-[#d9a65a]/10 text-[#d9a65a] px-4 py-1.5 rounded-xl text-xs font-black uppercase tracking-widest mb-8">
                            {post.category}
                        </div>
                    )}

                    <h1 className="text-4xl md:text-5xl lg:text-6xl font-black text-[#3b2f2f] mb-8 font-serif leading-tight">
                        {post.title}
                    </h1>

                    <div className="flex flex-wrap items-center gap-6 text-xs md:text-sm font-bold text-gray-400 uppercase tracking-widest mb-12 py-6 border-y border-gray-100">
                        <div className="flex items-center gap-2">
                            <User size={16} className="text-[#d9a65a]" />
                            <span className="text-gray-500">{t.author || 'Por'} <span className="text-[#3b2f2f]">{post.author || 'Pão Caseiro'}</span></span>
                        </div>
                        <div className="flex items-center gap-2">
                            <Calendar size={16} className="text-[#d9a65a]" />
                            <span className="text-gray-500">
                                {post.created_at ? new Date(post.created_at).toLocaleDateString(language === 'pt' ? 'pt-PT' : 'en-US', { day: 'numeric', month: 'long', year: 'numeric' }) : ''}
                            </span>
                        </div>
                        <div className="flex-1" />
                        <div className="flex items-center gap-2">
                            <a
                                href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.href)}`}
                                target="_blank" rel="noopener noreferrer"
                                className="w-10 h-10 flex items-center justify-center rounded-xl bg-[#d9a65a]/10 text-[#d9a65a] hover:bg-[#d9a65a] hover:text-white transition-colors"
                                title="Partilhar no Facebook"
                            >
                                <Facebook size={18} />
                            </a>
                            <a
                                href={`https://wa.me/?text=${encodeURIComponent(post.title + ' ' + window.location.href)}`}
                                target="_blank" rel="noopener noreferrer"
                                className="w-10 h-10 flex items-center justify-center rounded-xl bg-[#d9a65a]/10 text-[#d9a65a] hover:bg-[#d9a65a] hover:text-white transition-colors"
                                title="Partilhar no WhatsApp"
                            >
                                <MessageCircle size={18} />
                            </a>
                            <button
                                onClick={() => { navigator.clipboard.writeText(window.location.href); alert('Link copiado!'); }}
                                className="w-10 h-10 flex items-center justify-center rounded-xl bg-[#d9a65a]/10 text-[#d9a65a] hover:bg-[#d9a65a] hover:text-white transition-colors"
                                title="Copiar Link"
                            >
                                <LinkIcon size={18} />
                            </button>
                        </div>
                    </div>

                    <div className="w-full aspect-[21/9] rounded-3xl overflow-hidden shadow-sm mb-16 bg-gray-50">
                        {post.image_url ? (
                            <img
                                src={post.image_url}
                                alt={post.title}
                                className="w-full h-full object-cover hover:scale-105 transition-transform duration-700 ease-out"
                            />
                        ) : (
                            <img
                                src="/images/about-bread.jpeg"
                                alt={post.title}
                                className="w-full h-full object-cover hover:scale-105 transition-transform duration-700 ease-out"
                            />
                        )}
                    </div>

                    {post.content ? (
                        <div
                            className="prose prose-lg md:prose-xl prose-headings:font-serif prose-headings:text-[#3b2f2f] prose-a:text-[#d9a65a] prose-p:text-gray-600 prose-img:rounded-3xl max-w-none mb-16 leading-relaxed"
                            dangerouslySetInnerHTML={{ __html: post.content }}
                        />
                    ) : post.excerpt ? (
                        <div
                            className="prose prose-lg md:prose-xl prose-headings:font-serif prose-headings:text-[#3b2f2f] prose-a:text-[#d9a65a] prose-p:text-gray-600 prose-img:rounded-3xl max-w-none mb-16 leading-relaxed"
                            dangerouslySetInnerHTML={{ __html: `<p>${post.excerpt}</p>` }}
                        />
                    ) : (
                        <div className="prose prose-lg md:prose-xl max-w-none mb-16 leading-relaxed text-gray-400 italic">
                            O conteúdo deste artigo ainda não foi adicionado ou não está disponível.
                        </div>
                    )}

                    {/* Tags Section */}
                    {post.tags && post.tags.length > 0 && (
                        <div className="flex items-center gap-4 pt-8 border-t border-gray-100">
                            <Tag size={18} className="text-[#d9a65a]" />
                            <div className="flex flex-wrap gap-2">
                                {post.tags.map(tag => (
                                    <span key={tag} className="bg-[#f7f1eb] text-[#3b2f2f] px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest">
                                        #{tag}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}
                </motion.div>

                {/* Comments Section */}
                <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="bg-white rounded-[2.5rem] p-8 md:p-12 shadow-sm border border-[#3b2f2f]/5"
                >
                    <h3 className="text-2xl font-black font-serif text-[#3b2f2f] mb-8">
                        {t.comments?.title || 'Comentários'} ({comments.length})
                    </h3>

                    {/* Comments List */}
                    <div className="mb-12 space-y-8">
                        {visibleComments.length === 0 ? (
                            <p className="text-gray-500 italic bg-gray-50 p-6 rounded-2xl text-center">
                                {t.comments?.empty || 'Ainda não há comentários. Seja o primeiro a comentar!'}
                            </p>
                        ) : (
                            visibleComments.map((comment) => (
                                <div key={comment.id} className="bg-gray-50 p-6 rounded-2xl">
                                    <div className="flex items-center gap-3 mb-3">
                                        <div className="w-10 h-10 rounded-full bg-[#d9a65a]/20 flex items-center justify-center text-[#d9a65a] font-black font-serif">
                                            {comment.author.charAt(0).toUpperCase()}
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-[#3b2f2f]">{comment.author}</h4>
                                            <span className="text-xs text-gray-400 font-medium">
                                                {new Date(comment.created_at).toLocaleDateString(language === 'pt' ? 'pt-PT' : 'en-US', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute:'2-digit' })}
                                            </span>
                                        </div>
                                    </div>
                                    <p className="text-gray-600 pl-13 leading-relaxed">
                                        {comment.content}
                                    </p>
                                    
                                    {/* Action Buttons for own comments */}
                                    {currentUser && comment.user_id === currentUser.id && (
                                        <div className="flex gap-2 mt-3 justify-end border-t pt-3">
                                            <span className="text-xs text-orange-500 mr-auto flex items-center font-bold">
                                                {comment.status === 'pending' ? 'Pendente de aprovação' : ''}
                                            </span>
                                            <button onClick={() => handleDeleteComment(comment.id)} className="text-xs text-red-500 font-bold hover:underline flex items-center gap-1">
                                                <Trash2 size={14} /> Apagar
                                            </button>
                                        </div>
                                    )}
                                </div>
                            ))
                        )}
                    </div>

                    {/* Add Comment Form */}
                    <div className="bg-[#f7f1eb] p-6 md:p-8 rounded-[2rem]">
                        <h4 className="text-lg font-bold text-[#3b2f2f] mb-6 tracking-widest uppercase text-sm">
                            {t.comments?.formTitle || 'Deixe um comentário'}
                        </h4>
                        
                        {!currentUser ? (
                            <div className="text-center py-6">
                                <p className="text-gray-500 mb-4">Tem de iniciar sessão para poder comentar.</p>
                                <button 
                                    onClick={() => setIsLoginModalOpen(true)}
                                    className="bg-[#3b2f2f] text-white px-8 py-3 rounded-xl font-bold uppercase tracking-widest text-xs hover:bg-[#d9a65a] transition-all"
                                >
                                    Fazer Login
                                </button>
                            </div>
                        ) : (
                            <>
                                {commentMessage.text && (
                                    <div className={`mb-6 p-4 rounded-xl text-sm font-bold ${commentMessage.type === 'error' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                                        {commentMessage.text}
                                    </div>
                                )}
                                
                                <form onSubmit={handleCommentSubmit} className="flex flex-col gap-4">
                                    <input 
                                        type="text"
                                        required
                                        readOnly
                                        value={newCommentName}
                                        onChange={(e) => setNewCommentName(e.target.value)}
                                        placeholder={t.comments?.namePlaceholder || 'O seu nome (obrigatório)'}
                                        className="w-full px-5 py-4 rounded-xl bg-gray-100 border-transparent focus:outline-none text-gray-500 cursor-not-allowed hidden"
                                    />
                                    <div className="text-sm font-bold text-gray-500 mb-2">Comentando como: <span className="text-[#d9a65a]">{newCommentName}</span></div>
                                    <textarea 
                                        required
                                        rows={4}
                                        value={newCommentContent}
                                        onChange={(e) => setNewCommentContent(e.target.value)}
                                        placeholder={t.comments?.commentPlaceholder || 'O seu comentário...'}
                                        className="w-full px-5 py-4 rounded-xl bg-white border-transparent focus:border-[#d9a65a] focus:ring-2 focus:ring-[#d9a65a]/20 outline-none transition-all resize-none placeholder-gray-400 text-gray-700 shadow-sm"
                                    ></textarea>
                                    <div className="flex justify-end mt-2">
                                        <button 
                                            type="submit"
                                            disabled={submittingComment || !newCommentContent.trim()}
                                            className="bg-[#3b2f2f] text-white px-8 py-4 rounded-xl font-bold uppercase tracking-widest text-xs hover:bg-[#d9a65a] hover:-translate-y-1 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-[#3b2f2f] disabled:hover:translate-y-0"
                                        >
                                            {submittingComment ? (t.comments?.submitting || 'A enviar...') : (t.comments?.submit || 'Comentar')}
                                        </button>
                                    </div>
                                </form>
                            </>
                        )}
                    </div>
                </motion.div>
            </div>
            
            <ClientLoginModal
                isOpen={isLoginModalOpen}
                onClose={() => setIsLoginModalOpen(false)}
                language={language}
            />
        </article>
    );
};
