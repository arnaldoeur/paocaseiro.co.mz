import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '../services/supabase';
import { Language, translations } from '../translations';
import { Calendar, User, ChevronRight, BookOpen, Clock, MapPin } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { sendNewsletterEmail } from '../services/email';

interface BlogPost {
    id: string;
    title: string;
    slug: string;
    excerpt: string;
    image_url: string;
    author: string;
    category: string;
    created_at: string;
}

export const Blog: React.FC<{ language: Language }> = ({ language }) => {
    const t = translations[language].blog;
    const [posts, setPosts] = useState<BlogPost[]>([]);
    const [loading, setLoading] = useState(true);
    const [categories, setCategories] = useState<string[]>([]);
    const [newsletterName, setNewsletterName] = useState('');
    const [newsletterEmail, setNewsletterEmail] = useState('');
    const [subscribing, setSubscribing] = useState(false);
    const [subscribedMsg, setSubscribedMsg] = useState('');
    const navigate = useNavigate();

    const handleSubscribe = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newsletterEmail || !newsletterName) return;
        setSubscribing(true);
        setSubscribedMsg('');
        try {
            const { error } = await supabase.from('newsletter_subscribers').insert([
                { name: newsletterName, email: newsletterEmail }
            ]);

            if (error && error.code !== '23505') { 
                throw error;
            }

            await sendNewsletterEmail(newsletterName, newsletterEmail);
            setSubscribedMsg('Subscrição efetuada com sucesso!');
            setNewsletterEmail('');
            setNewsletterName('');
        } catch (err) {
            setSubscribedMsg('Erro ao subscrever. Tente novamente.');
        } finally {
            setSubscribing(false);
        }
    };

    useEffect(() => {
        const fetchPosts = async () => {
            setLoading(true);
            try {
                const { data, error } = await supabase
                    .from('blog_posts')
                    .select('*')
                    .order('created_at', { ascending: false });

                if (error) throw error;

                if (data) {
                    setPosts(data);
                    const cats = Array.from(new Set(data.map((p: any) => p.category).filter(Boolean))) as string[];
                    setCategories(cats);
                }
            } catch (err) {
                console.error('Error fetching posts:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchPosts();
    }, []);

    return (
        <div className="pt-28 pb-20 min-h-screen bg-[#f7f1eb]">
            <div className="container mx-auto px-6 max-w-7xl">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center mb-16"
                >
                    <span className="text-[#d9a65a] font-bold tracking-widest uppercase text-sm mb-4 block">
                        {t.title}
                    </span>
                    <h1 className="text-4xl md:text-6xl font-black text-[#3b2f2f] mb-6 font-serif tracking-tight">
                        {t.subtitle}
                    </h1>
                </motion.div>

                {/* Presentation Block */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.1 }}
                    className="mb-16 bg-white rounded-[2.5rem] p-8 md:p-12 shadow-xl border border-[#3b2f2f]/5 relative overflow-hidden flex flex-col md:flex-row gap-12 items-center"
                >
                    <div className="absolute top-0 right-0 w-64 h-64 bg-[#d9a65a]/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3"></div>
                    
                    <div className="w-full md:w-1/2 relative z-10">
                        <span className="inline-block px-4 py-2 bg-[#d9a65a]/10 text-[#d9a65a] font-black text-xs uppercase tracking-widest rounded-xl mb-6">
                            Bastidores
                        </span>
                        <h2 className="text-3xl md:text-5xl font-black font-serif text-[#3b2f2f] mb-6 leading-tight">
                            {t.presentation?.title || 'À Descoberta da Pão Caseiro'}
                        </h2>
                        <p className="text-gray-600 leading-relaxed mb-8 text-lg">
                            {t.presentation?.desc || 'Acompanhe o nosso dia a dia, desde as madrugadas quentes à beira do forno até aos sorrisos na entrega do pão fresco. Somos mais do que uma padaria, somos parte da sua família.'}
                        </p>
                        <div className="flex items-center gap-4 text-sm font-bold text-[#3b2f2f] uppercase tracking-widest">
                            <MapPin className="text-[#d9a65a]" size={20} />
                            <a 
                                href="https://www.google.com/maps/search/?api=1&query=Padaria+Pão+Caseiro+Lichinga+Niassa" 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="hover:text-[#d9a65a] transition-colors"
                            >
                                {t.presentation?.location || 'Encontre-nos'} - Lichinga
                            </a>
                        </div>
                    </div>

                    <div className="w-full md:w-1/2">
                        <div className="w-full aspect-video rounded-[2rem] overflow-hidden shadow-2xl relative bg-[#3b2f2f] group">
                            <iframe
                                src="https://www.youtube-nocookie.com/embed/ApNnaPfh_o8?rel=0&modestbranding=1&showinfo=0"
                                className="w-full h-full"
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                allowFullScreen
                                title="Pão Caseiro - Bastidores"
                                style={{ border: 'none' }}
                            ></iframe>
                            <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent pointer-events-none group-hover:opacity-0 transition-opacity"></div>
                            <div className="absolute bottom-6 left-6 pointer-events-none text-white font-bold tracking-widest uppercase text-xs flex items-center gap-2 group-hover:opacity-0 transition-opacity">
                                <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>
                                Em direto da cozinha
                            </div>
                        </div>
                    </div>
                </motion.div>

                <div className="flex flex-col lg:flex-row gap-12">
                    {/* Left Column: Posts List */}
                    <div className="lg:w-2/3 flex flex-col gap-10">
                        {loading ? (
                            <div className="flex justify-center items-center h-64">
                                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#d9a65a]"></div>
                            </div>
                        ) : posts.length === 0 ? (
                            <div className="text-center py-20 bg-white rounded-[2rem] shadow-sm border border-[#3b2f2f]/5">
                                <BookOpen className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                                <p className="text-gray-500 font-bold">{t.empty || "Ainda não existem artigos publicados."}</p>
                            </div>
                        ) : (
                            posts.map((post, index) => (
                                <motion.article
                                    key={post.id}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: index * 0.1 }}
                                    onClick={() => navigate(`/blog/${post.slug}`)}
                                    className="bg-white rounded-[2rem] overflow-hidden shadow-sm border border-[#3b2f2f]/5 hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 flex flex-col sm:flex-row cursor-pointer group"
                                >
                                    {/* Image Side */}
                                    <div className="sm:w-2/5 aspect-[4/3] sm:aspect-auto relative overflow-hidden bg-gray-100 flex-shrink-0">
                                        {post.image_url ? (
                                            <img
                                                src={post.image_url}
                                                alt={language === 'en' && post.title_en ? post.title_en : post.title}
                                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
                                            />
                                        ) : (
                                            <img
                                                src="/images/about-bread.jpeg"
                                                alt={language === 'en' && post.title_en ? post.title_en : post.title}
                                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
                                            />
                                        )}
                                        {post.category && (
                                            <div className="absolute top-4 left-4 sm:hidden bg-white/95 backdrop-blur-sm px-3 py-1 text-xs font-black text-[#d9a65a] uppercase tracking-wider rounded-xl shadow-sm">
                                                {post.category}
                                            </div>
                                        )}
                                    </div>

                                    {/* Content Side */}
                                    <div className="p-8 sm:p-10 flex flex-col flex-1 justify-center">
                                        {post.category && (
                                            <span className="hidden sm:inline-block text-[#d9a65a] text-xs font-black uppercase tracking-widest mb-3">
                                                {post.category}
                                            </span>
                                        )}
                                        <h2 className="text-2xl sm:text-3xl font-black text-[#3b2f2f] mb-4 line-clamp-2 group-hover:text-[#d9a65a] transition-colors leading-tight font-serif">
                                            {language === 'en' && post.title_en ? post.title_en : post.title}
                                        </h2>
                                        <p className="text-gray-500 line-clamp-3 mb-6 text-sm leading-relaxed">
                                            {post.excerpt}
                                        </p>
                                        <div className="flex flex-wrap items-center justify-between gap-4 mt-auto pt-4 border-t border-gray-100">
                                            <div className="flex items-center gap-4 text-xs font-bold text-gray-400 tracking-wider">
                                                <div className="flex items-center gap-1.5">
                                                    <Calendar size={14} className="text-[#d9a65a]" />
                                                    {new Date(post.created_at).toLocaleDateString(language === 'pt' ? 'pt-PT' : 'en-US', { day: 'numeric', month: 'short', year: 'numeric' })}
                                                </div>
                                            </div>
                                            <div className="flex items-center text-[#d9a65a] font-bold text-sm tracking-wider group-hover:gap-2 transition-all">
                                                {t.readMore || 'Ler Mais'} <ChevronRight size={16} className="ml-1" />
                                            </div>
                                        </div>
                                    </div>
                                </motion.article>
                            ))
                        )}
                    </div>

                    {/* Right Column: Sidebar */}
                    <div className="lg:w-1/3">
                        <div className="sticky top-28 space-y-8">
                            {/* Categories Widget */}
                            <motion.div 
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                className="bg-white rounded-[2rem] p-8 shadow-sm border border-[#3b2f2f]/5"
                            >
                                <h3 className="text-xl font-black font-serif text-[#3b2f2f] mb-6 flex items-center gap-3">
                                    <span className="w-8 h-8 rounded-full bg-[#d9a65a]/10 flex items-center justify-center text-[#d9a65a]"><BookOpen size={16} /></span>
                                    {t.categories || 'Categorias'}
                                </h3>
                                {categories.length > 0 ? (
                                    <ul className="space-y-3">
                                        {categories.map((cat, i) => (
                                            <li key={i}>
                                                <a href="#" className="group flex items-center justify-between py-2 text-gray-500 hover:text-[#d9a65a] font-medium transition-colors border-b border-gray-50 pb-3">
                                                    <span>{cat}</span>
                                                    <ChevronRight size={16} className="opacity-0 group-hover:opacity-100 transform -translate-x-2 group-hover:translate-x-0 transition-all" />
                                                </a>
                                            </li>
                                        ))}
                                    </ul>
                                ) : (
                                    <p className="text-gray-400 text-sm italic">Nenhuma categoria disponível.</p>
                                )}
                            </motion.div>

                            {/* Newsletter / About Widget */}
                            <motion.div 
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.1 }}
                                className="bg-[#3b2f2f] rounded-[2rem] p-8 shadow-xl text-center relative overflow-hidden"
                            >
                                <div className="absolute inset-0 bg-[#d9a65a]/5 bg-[url('/pattern.png')] bg-repeat opacity-10"></div>
                                <div className="relative z-10">
                                    <img src="/logo_on_dark.png" alt="Pão Caseiro" className="h-12 mx-auto mb-6 opacity-90" />
                                    <p className="text-[#f7f1eb]/80 text-sm leading-relaxed mb-6">
                                        Subscreva a nossa newsletter para receber novidades, ofertas exclusivas e atualizações diretamente no seu email.
                                    </p>
                                    <form className="flex flex-col gap-3" onSubmit={handleSubscribe}>
                                        <input 
                                            type="text" 
                                            placeholder="O seu Nome" 
                                            value={newsletterName}
                                            onChange={(e) => setNewsletterName(e.target.value)}
                                            required
                                            className="px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/50 focus:outline-none focus:border-[#d9a65a] transition-colors text-sm" 
                                        />
                                        <input 
                                            type="email" 
                                            placeholder="O seu melhor email" 
                                            value={newsletterEmail}
                                            onChange={(e) => setNewsletterEmail(e.target.value)}
                                            required
                                            className="px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/50 focus:outline-none focus:border-[#d9a65a] transition-colors text-sm" 
                                        />
                                        <button 
                                            type="submit"
                                            disabled={subscribing}
                                            className="bg-[#d9a65a] text-[#3b2f2f] px-4 py-3 rounded-xl font-bold uppercase tracking-widest text-xs hover:bg-white transition-colors disabled:opacity-50"
                                        >
                                            {subscribing ? 'A enviar...' : 'Subscrever'}
                                        </button>
                                        {subscribedMsg && (
                                            <p className="text-sm mt-2 font-bold text-[#d9a65a]">{subscribedMsg}</p>
                                        )}
                                    </form>
                                </div>
                            </motion.div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
