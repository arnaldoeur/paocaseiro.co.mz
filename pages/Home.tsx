import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Play, Wheat, Coffee, Cake, Croissant,
    MapPin, ZoomIn, ChevronLeft, ChevronRight, X, Phone, Mail, ShoppingBag,
    Star, MessageSquare, Truck, Clock, Instagram, Facebook, ArrowRight, ChevronDown
} from 'lucide-react';
import { LandingLaunchPopup } from '../components/LandingLaunchPopup';
import { translations, Language } from '../translations';
import { useLocation, useNavigate, Link } from 'react-router-dom';

import { supabase } from '../services/supabase';
import { sendEmail } from '../services/email';
import { sendSMS } from '../services/sms';
import { notifyAdminSystemsAlert } from '../services/whatsapp';

// client imported from services/supabase

interface HomeProps {
    language: Language;
}

const SERVICES = [
    {
        icon: Wheat,
        title: 'Padaria e Pastelaria',
        desc: 'Pães rústicos, bolos tradicionais e salgados frescos, feitos com dedicação diária.',
        image: '/images/categories/Pao caseiro.png',
        categoryId: 'paes'
    },
    {
        icon: Cake,
        title: 'Confeitaria',
        desc: 'Doces finos, tortas artesanais e sobremesas personalizadas para momentos especiais.',
        image: '/images/categories/Fatias Xadrez.png',
        categoryId: 'doces-pastelaria'
    },
    {
        icon: Coffee,
        title: 'Café',
        desc: 'Bebidas quentes e frias, preparadas com grãos selecionados para um aroma incomparável.',
        image: '/images/categories/Cafe quente.png',
        categoryId: 'cafes'
    },
    {
        icon: ShoppingBag,
        title: 'Lanches e Takeaway',
        desc: 'Opções práticas e deliciosas para quem não abre mão da qualidade no dia a dia.',
        image: '/images/categories/cachoro quente completo.png',
        categoryId: 'lanches'
    }
];

const CLASSICS = [
    {
        title: 'Pastéis de Nata',
        desc: 'A clássica doçura portuguesa, estaladiços por fora e cremosos por dentro.',
        price: '',
        image: '/images/pastel_nata.png',
        categoryId: 'doces-pastelaria'
    },
    {
        title: 'Pão de Cereais',
        desc: 'Uma opção saudável, rica em fibra e com um sabor inconfundível.',
        price: '',
        image: '/images/products/pao-cereais.png',
        categoryId: 'paes'
    },
    {
        title: 'Pão Integral',
        desc: 'O nosso pão integral clássico, fresco a toda a hora.',
        price: '',
        image: '/images/products/pao-caseiro-fresh.png',
        categoryId: 'paes'
    },
    {
        title: 'Pão Caseiro',
        desc: 'Aquele pão rústico especial que toda a família adora.',
        price: '',
        image: '/images/products/pao-caseiro-marcos.png',
        categoryId: 'paes'
    },
    {
        title: 'Croissants',
        desc: 'Folhados, recheados ou simples, sempre com a máxima qualidade.',
        price: '',
        image: '/images/products/croissants-recheados.png',
        categoryId: 'folhados-salgados'
    },
    {
        title: 'Broa de Milho',
        desc: 'Broa densa e saborosa, feita com a melhor farinha de milho.',
        price: '',
        image: '/images/products/broa-milho.png',
        categoryId: 'paes'
    }
];

const DEFAULT_GALLERY_ITEMS = [
    { src: '/images/products/croissant-folhado.png', caption: 'Croissant Folhado' },
    { src: '/images/products/queques.png', caption: 'Queques Fofinhos' },
    { src: '/images/products/rissois-camarao.png', caption: 'Rissóis de Camarão' },
    { src: '/images/products/chamussas-mix.png', caption: 'Chamussas Crocantes' },
    { src: '/images/products/folhado-carne.png', caption: 'Folhado de Carne' },
    { src: '/images/products/pizza-mexicana.png', caption: 'Mini Pizza Mexicana' },
    { src: '/images/products/torta.png', caption: 'Torta Caseira' },
    { src: '/images/products/pudim.png', caption: 'Pudim de Ovos' },
];

export const Home: React.FC<HomeProps> = ({ language }) => {
    const t = translations[language];

    if (!t) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#f7f1eb] text-[#3b2f2f]">
                <div className="text-center">
                    <h1 className="text-2xl font-bold mb-4">Erro ao carregar traduções</h1>
                    <p>Language: {language}</p>
                    <p>Please check console for details.</p>
                </div>
            </div>
        );
    }

    const [isPlayingWithSound, setIsPlayingWithSound] = useState(false);
    const videoRef = React.useRef<HTMLVideoElement>(null);
    const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
    const [galleryItems, setGalleryItems] = useState<{ src: string, caption: string }[]>(DEFAULT_GALLERY_ITEMS);

    useEffect(() => {
        const fetchGallery = async () => {
            const { data, error } = await supabase.from('gallery_items').select('*').order('display_order', { ascending: true });
            if (!error && data && data.length > 0) {
                setGalleryItems(data);
            }
        };
        fetchGallery();

        const channel = supabase.channel('gallery-changes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'gallery_items' }, () => {
                fetchGallery();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);


    const handlePlayWithSound = () => {
        setIsPlayingWithSound(true);
        if (videoRef.current) {
            videoRef.current.muted = false;
            videoRef.current.currentTime = 0;
            videoRef.current.play();
        }
    };

    const handleCloseVideo = () => {
        setIsPlayingWithSound(false);
        if (videoRef.current) {
            videoRef.current.muted = true;
            videoRef.current.play();
        }
    };
    const location = useLocation();
    const navigate = useNavigate();

    // Contact form state
    const [formData, setFormData] = useState({ name: '', phone: '', email: '', message: '' });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');

    const handleContactSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        setSubmitStatus('idle');

        try {
            // 1. Save to Supabase (Database Log)
            await supabase
                .from('contact_messages')
                .insert([{
                    name: formData.name,
                    phone: formData.phone,
                    email: formData.email,
                    message: formData.message,
                    status: 'unread'
                }]);

            // 2. Send Notifications to Admin
            const adminEmail = 'geral@paocaseiro.co.mz';
            const emailHtml = `
                <h2>Nova Mensagem de Contacto (Geral)</h2>
                <p><strong>Nome:</strong> ${formData.name}</p>
                <p><strong>Email:</strong> ${formData.email}</p>
                <p><strong>Telefone:</strong> ${formData.phone}</p>
                <br/>
                <p><strong>Mensagem:</strong></p>
                <p style="background:#f4f4f4; padding:15px; border-radius:8px;">${formData.message}</p>
            `;

            await sendEmail([adminEmail], `Nova Mensagem de Contacto: ${formData.name}`, emailHtml)
                .catch(e => console.error("Contact Email failed:", e));

            const adminPhone = '258879146662';
            const smsMessage = `PAO CASEIRO CONTACTO: Recebeu mensagem de ${formData.name} (${formData.phone}). Verifique o painel ou email.`;

            await sendSMS(adminPhone, smsMessage)
                .catch(e => console.error("Contact SMS failed:", e));
                
            await notifyAdminSystemsAlert(`Nova Mensagem de Contacto: ${formData.name}`, `Nome: ${formData.name}\nEmail: ${formData.email}\nTelefone: ${formData.phone}\n\nMensagem:\n${formData.message}`)
                .catch(e => console.error("Contact WhatsApp Alert failed:", e));

            setSubmitStatus('success');
            setFormData({ name: '', phone: '', email: '', message: '' });
            setTimeout(() => setSubmitStatus('idle'), 5000);
        } catch (error) {
            console.error('Error submitting form:', error);
            // Even if email fails, if DB worked we'd consider it partial success, but here we catch DB errors mostly
            setSubmitStatus('error');
        } finally {
            setIsSubmitting(false);
        }
    };

    // Scroll to section logic
    const scrollToSection = (id: string) => {
        const element = document.getElementById(id);
        if (element) {
            element.scrollIntoView({ behavior: 'smooth' });
        }
    };

    useEffect(() => {
        if (location.state && (location.state as any).scrollTo) {
            const id = (location.state as any).scrollTo;
            setTimeout(() => {
                scrollToSection(id);
            }, 100);
        }
    }, [location]);

    const Logo = ({ className = "h-12" }: { className?: string }) => (
        <img
            src="/logo_on_dark.png"
            alt="Pão Caseiro Logo"
            className={`object-contain ${className}`}
        />
    );

    // Lightbox Navigation Logic
    const handleNext = useCallback((e?: React.MouseEvent) => {
        e?.stopPropagation();
        if (selectedIndex !== null) {
            setSelectedIndex((prev) => (prev !== null && prev < galleryItems.length - 1 ? prev + 1 : 0));
        }
    }, [selectedIndex]);

    const handlePrev = useCallback((e?: React.MouseEvent) => {
        e?.stopPropagation();
        if (selectedIndex !== null) {
            setSelectedIndex((prev) => (prev !== null && prev > 0 ? prev - 1 : galleryItems.length - 1));
        }
    }, [selectedIndex]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (selectedIndex === null) return;
            if (e.key === 'ArrowRight') handleNext();
            if (e.key === 'ArrowLeft') handlePrev();
            if (e.key === 'Escape') setSelectedIndex(null);
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [selectedIndex, handleNext, handlePrev]);


    return (
        <>
            {/* --- HERO SECTION --- */}
            <section id="hero" className="relative min-h-screen flex items-center justify-center overflow-hidden pt-20">
                <div className="absolute inset-0 z-0">
                    {/* Hero Background Image instead of Video */}
                    <div className="w-full h-full bg-cover bg-center hero-bg-section" />
                    <div className="absolute inset-0 bg-black/50" />
                </div>

                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8 }}
                    style={{ willChange: "transform, opacity" }}
                    className="relative z-10 container mx-auto px-6 text-center text-[#f7f1eb]"
                >
                    <h1 className="font-serif text-5xl md:text-7xl lg:text-8xl mb-6 drop-shadow-md">
                        {t.hero.title}
                    </h1>
                    <p className="text-xl md:text-3xl font-light mb-8 max-w-3xl mx-auto leading-relaxed drop-shadow-sm">
                        {t.hero.subtitle}
                    </p>
                    <p className="text-base md:text-lg mb-12 max-w-2xl mx-auto opacity-90 leading-relaxed font-light">
                        {t.hero.description}
                    </p>

                    <div className="flex flex-col md:flex-row gap-4 justify-center items-center">
                        {/* [NEW] Primary Button: Ver Menu */}
                        <button
                            onClick={() => navigate('/menu')}
                            className="bg-[#d9a65a] text-[#3b2f2f] px-8 py-4 rounded-full font-bold uppercase tracking-widest hover:bg-[#f7f1eb] transition-all flex items-center gap-2 w-full md:w-auto justify-center shadow-lg"
                        >
                            {language === 'pt' ? 'Ver Menu' : 'View Menu'}
                        </button>
                        <button
                            onClick={() => navigate('/blog')}
                            className="border-2 border-[#f7f1eb] text-[#f7f1eb] px-8 py-4 rounded-full font-bold uppercase tracking-widest hover:bg-[#f7f1eb] hover:text-[#3b2f2f] transition-all w-full md:w-auto"
                        >
                            {t.hero.gallery}
                        </button>
                    </div>

                    <a
                        href="https://wa.me/258846930960?text=Olá%20Pão%20Caseiro!%20Gostaria%20de%20fazer%20uma%20encomenda."
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-8 text-sm md:text-base font-bold bg-[#3b2f2f]/60 backdrop-blur-sm inline-block px-6 py-2 rounded-full hover:bg-[#d9a65a] hover:text-[#3b2f2f] transition-colors mb-2"
                    >
                        {t.hero.call}: <span className="text-[#d9a65a]">+258 84 693 0960</span>
                    </a>
                </motion.div>

                {/* Scrolldown Indicator */}
                <motion.div
                    animate={{ y: [0, 10, 0] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="absolute bottom-10 left-1/2 -translate-x-1/2 z-10 text-white/50 cursor-pointer"
                    onClick={() => scrollToSection('about')}
                >
                    <ChevronDown className="w-8 h-8" />
                </motion.div>
            </section>

            {/* --- VIDEO SECTION --- */}
            <section className="relative min-h-screen bg-[#3b2f2f] flex items-center justify-center overflow-hidden">
                {/* YouTube Background - zero Supabase egress */}
                <div className="absolute inset-0 opacity-60 pointer-events-none">
                    <iframe
                        src="https://www.youtube-nocookie.com/embed/ApNnaPfh_o8?autoplay=1&mute=1&loop=1&playlist=ApNnaPfh_o8&controls=0&playsinline=1&rel=0&modestbranding=1&showinfo=0&iv_load_policy=3&disablekb=1"
                        className="absolute top-1/2 left-1/2 w-[300%] h-[300%] -translate-x-1/2 -translate-y-1/2"
                        allow="autoplay; encrypted-media"
                        allowFullScreen
                        title="Pão Caseiro vídeo"
                        style={{ border: 'none' }}
                    />
                </div>

                {/* Overlay Content */}
                <div className="relative z-10 container mx-auto px-6 text-center text-[#f7f1eb] animate-in fade-in duration-500">
                    <h2 className="font-serif text-4xl md:text-6xl mb-6">{t.video.title}</h2>
                    <p className="text-lg md:text-xl font-light mb-12 max-w-2xl mx-auto text-[#f7f1eb]/80">
                        {t.video.subtitle}
                    </p>

                    <motion.a
                        href="https://youtu.be/ApNnaPfh_o8"
                        target="_blank"
                        rel="noopener noreferrer"
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.95 }}
                        className="w-24 h-24 bg-[#f7f1eb] rounded-full flex items-center justify-center text-[#3b2f2f] shadow-[0_0_30px_rgba(217,166,90,0.5)] mx-auto group hover:bg-[#d9a65a] transition-colors relative z-10"
                        style={{ willChange: "transform" }}
                    >
                        <Play className="w-10 h-10 ml-1 fill-current" />
                    </motion.a>
                    <p className="mt-4 uppercase tracking-widest text-xs font-bold">{t.video.play}</p>
                </div>
            </section>


            {/* --- ABOUT SECTION --- */}
            < section id="about" className="min-h-screen flex items-center py-20 bg-[#f7f1eb]" >
                <div className="container mx-auto px-6">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
                        {/* Image Collage */}
                        <div className="relative order-2 lg:order-1 h-[600px]">
                            <div className="absolute top-[-20px] left-[-20px] w-2/3 h-2/3 border-2 border-[#d9a65a] rounded-3xl z-0" />

                            {/* Image 1 */}
                            <img
                                src="/images/about-process.jpeg"
                                alt="Processo artesanal"
                                loading="lazy"
                                className="absolute top-0 left-0 w-[85%] h-[80%] object-cover object-bottom rounded-3xl shadow-xl z-10"
                            />

                            {/* Image 2 */}
                            <img
                                src="/images/about-bread.jpeg"
                                alt="Pão fresco"
                                loading="lazy"
                                className="absolute bottom-0 right-0 w-[55%] h-[45%] object-cover object-bottom rounded-3xl shadow-2xl border-4 border-[#f7f1eb] z-20"
                            />

                            <div className="absolute top-10 right-0 bg-[#3b2f2f] text-[#f7f1eb] p-6 rounded-2xl shadow-lg max-w-[200px] z-30">
                                <p className="font-serif text-xl italic">"{t.about.quote}"</p>
                            </div>
                        </div>

                        {/* Content */}
                        <div className="order-1 lg:order-2 text-center lg:text-left">
                            <span className="text-[#d9a65a] font-bold tracking-widest uppercase text-sm mb-4 block">{t.about.label}</span>
                            <h2 className="font-serif text-5xl md:text-6xl text-[#3b2f2f] mb-8 leading-tight">
                                {t.about.title}
                            </h2>
                            <p className="text-lg text-[#4b3a2f] mb-8 leading-relaxed">
                                {t.about.description}
                            </p>

                            <div className="flex justify-center lg:justify-start">
                                <ul className="space-y-6 flex flex-col items-start max-w-md">
                                    {t.about.points.map((item, i) => (
                                        <li
                                            key={i}
                                            className="flex items-start gap-4 text-[#3b2f2f] font-medium text-left"
                                        >
                                            <motion.div
                                                initial={{ opacity: 0, x: 20 }}
                                                whileInView={{ opacity: 1, x: 0 }}
                                                viewport={{ once: true }}
                                                transition={{ delay: i * 0.2 }}
                                                className="flex items-center gap-4"
                                            >
                                                <span className="w-2 h-2 rounded-full bg-[#d9a65a] shrink-0 mt-1.5" />
                                                <span>{item}</span>
                                            </motion.div>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>
            </section >

            {/* --- SERVICES SECTION --- */}
            < section id="services" className="min-h-screen flex items-center py-20 bg-[#4b3a2f] text-[#f7f1eb] relative overflow-hidden bg-cover bg-center bg-no-repeat" style={{ backgroundImage: "url('/images/fundo-services.png')" }} >
                {/* Medium-dark overlay for better text readability against the image */}
                <div className="absolute inset-0 bg-[#4b3a2f]/80" />

                <div className="container mx-auto px-6 relative z-10">
                    <div className="text-center mb-16 max-w-3xl mx-auto">
                        <h2 className="font-serif text-5xl md:text-6xl mb-6 text-[#d9a65a]">{t.services.title}</h2>
                        <p className="text-[#f7f1eb]/80 text-lg md:text-xl font-light leading-relaxed mb-8 italic">
                            {t.services.description}
                        </p>
                        <div className="w-20 h-1 bg-[#d9a65a] mx-auto rounded-full" />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
                        {SERVICES.map((service, idx) => (
                            <motion.div
                                key={idx}
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: idx * 0.1 }}
                                whileHover={{ y: -12, scale: 1.02 }}
                                onClick={() => navigate(`/menu#${service.categoryId}`)}
                                style={{ willChange: "transform" }}
                                className="group bg-[#3b2f2f]/40 backdrop-blur-md rounded-[2.5rem] border border-[#f7f1eb]/10 hover:border-[#d9a65a]/50 transition-all duration-500 shadow-2xl flex flex-col overflow-hidden cursor-pointer"
                            >
                                <div className="p-8 pb-4 flex flex-col items-center text-center flex-grow">
                                    <div className="mb-8 p-5 bg-[#3b2f2f] rounded-2xl group-hover:bg-[#d9a65a] group-hover:text-[#3b2f2f] transition-all duration-500 shadow-xl">
                                        <service.icon className="w-10 h-10" />
                                    </div>
                                    <h3 className="font-serif text-2xl mb-4 text-[#f7f1eb] tracking-tight group-hover:text-[#d9a65a] transition-colors">{t.services.items[idx].title}</h3>
                                    <p className="text-[#f7f1eb]/60 text-sm leading-relaxed mb-6 font-light">{t.services.items[idx].desc}</p>
                                </div>
                                <div className="w-full h-56 overflow-hidden mt-auto relative">
                                    <div className="absolute inset-0 bg-gradient-to-t from-[#3b2f2f] to-transparent opacity-60 z-10" />
                                    <img 
                                        src={service.image} 
                                        alt={service.title} 
                                        loading="lazy" 
                                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000 ease-out will-change-transform" 
                                    />
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section >

            {/* --- CLASSICS SECTION --- */}
            < section id="classics" className="min-h-screen py-20 bg-[#f7f1eb] flex items-center" >
                <div className="container mx-auto px-6">
                    <div className="flex flex-col lg:flex-row justify-between items-center lg:items-end mb-16 gap-8 text-center lg:text-left">
                        <div className="max-w-2xl">
                            <h2 className="font-serif text-5xl md:text-7xl text-[#3b2f2f] mb-6 leading-[0.9]">
                                {t.classics.title}
                            </h2>
                            <p className="text-lg text-[#d9a65a] font-serif italic">{t.classics.subtitle}</p>
                        </div>
                        {/* Keeping the CTA to contact for now as per original, but user asked for "Ver Menu Completo" under highlights */}
                        <button
                            onClick={() => navigate('/menu')}
                            className="px-8 py-3 bg-[#3b2f2f] text-[#f7f1eb] rounded-full font-bold uppercase tracking-widest hover:bg-[#d9a65a] hover:text-[#3b2f2f] transition-all"
                        >
                            {language === 'pt' ? 'Ver Menu Completo' : 'View Full Menu'}
                        </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-10 lg:gap-16 mb-12">
                        {CLASSICS.map((item, idx) => (
                            <motion.div
                                key={idx}
                                initial={{ opacity: 0, y: 30 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true, margin: "-50px" }}
                                transition={{ delay: idx * 0.15, duration: 0.8 }}
                                style={{ willChange: "transform, opacity" }}
                                onClick={() => navigate(`/menu#${item.categoryId}`)}
                                className="group flex flex-col h-full bg-white rounded-[2.5rem] shadow-sm hover:shadow-2xl transition-all duration-500 overflow-hidden cursor-pointer border border-[#d9a65a]/5 relative"
                            >
                                <div className="h-80 relative overflow-hidden">
                                    <div className="absolute inset-0 bg-black/5 group-hover:bg-black/0 transition-colors duration-500 z-10" />
                                    <img 
                                        src={item.image} 
                                        alt={item.title} 
                                        loading="lazy" 
                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-1000 ease-out will-change-transform" 
                                    />
                                    <div className="absolute bottom-6 left-6 z-20">
                                        <div className="bg-[#3b2f2f]/90 backdrop-blur-md text-[#d9a65a] px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest shadow-xl">
                                            Highlight
                                        </div>
                                    </div>
                                </div>
                                <div className="p-8 lg:p-10 flex flex-col flex-grow bg-white relative">
                                    <div className="flex justify-between items-start mb-4">
                                        <h3 className="font-serif text-3xl md:text-4xl font-bold text-[#3b2f2f] group-hover:text-[#d9a65a] transition-colors duration-300">
                                            {t.classics.items[idx].title}
                                        </h3>
                                    </div>
                                    <div className="w-16 h-1 bg-[#d9a65a] mb-6 rounded-full origin-left group-hover:w-24 transition-all duration-500" />
                                    <p className="text-[#4b3a2f]/80 text-lg leading-relaxed flex-grow font-light">
                                        {t.classics.items[idx].desc}
                                    </p>
                                    <div className="mt-8 flex items-center gap-2 text-[#d9a65a] font-black text-sm uppercase tracking-[0.2em] transform translate-x-0 group-hover:translate-x-2 transition-transform duration-300">
                                        <span>Discover more</span>
                                        <ArrowRight className="w-4 h-4" />
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </div>

                </div>
            </section >

            {/* --- GALLERY SECTION --- */}
            < section id="gallery" className="min-h-screen py-20 bg-[#f7f1eb]" >
                <div className="container mx-auto px-6">
                    <div className="text-center mb-16">
                        <h2 className="font-serif text-5xl text-[#3b2f2f] mb-4">{t.gallery.title}</h2>
                        <p className="text-[#4b3a2f]">{t.gallery.subtitle}</p>
                    </div>

                    <div className="flex flex-wrap justify-center gap-6">
                        {galleryItems.map((item, idx) => (
                            <motion.div
                                key={idx}
                                layoutId={`gallery-item-${idx}`}
                                initial={{ opacity: 0, scale: 0.95 }}
                                whileInView={{ opacity: 1, scale: 1 }}
                                viewport={{ once: true }}
                                onClick={() => setSelectedIndex(idx)}
                                className="relative group rounded-3xl overflow-hidden shadow-lg border border-[#3b2f2f]/10 cursor-pointer bg-[#e5e5e5] w-full md:w-[calc(50%-12px)] lg:w-[calc(33.333%-16px)] aspect-square"
                            >
                                <img
                                    src={item.src}
                                    alt={item.caption}
                                    className="w-full h-full object-cover object-bottom transform transition-transform duration-700 group-hover:scale-110"
                                    loading="lazy"
                                />

                                {/* Hover Overlay */}
                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all duration-300 flex items-center justify-center">
                                    <div className="opacity-0 group-hover:opacity-100 transform translate-y-4 group-hover:translate-y-0 transition-all duration-300 text-white flex flex-col items-center gap-2">
                                        <div className="bg-[#d9a65a] p-3 rounded-full shadow-xl">
                                            <ZoomIn className="w-6 h-6 text-[#3b2f2f]" />
                                        </div>
                                        <span className="font-bold text-sm tracking-widest uppercase shadow-black drop-shadow-md">{t.gallery.zoom}</span>
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </div>

                    <div className="text-center mt-12">
                        <button
                            onClick={() => navigate('/gallery')}
                            className="px-8 py-3 border-2 border-[#3b2f2f] text-[#3b2f2f] rounded-full font-bold uppercase tracking-widest hover:bg-[#3b2f2f] hover:text-[#f7f1eb] transition-all"
                        >
                            {language === 'pt' ? 'Ver Galeria Completa' : 'View Full Gallery'}
                        </button>
                    </div>
                </div>
            </section >

            {/* --- CONTACT & VISIT SECTION --- */}
            <section id="contact" className="min-h-screen bg-[#3b2f2f] text-[#f7f1eb] py-20 flex flex-col justify-center relative overflow-hidden" >
                <div className="absolute top-0 right-0 w-96 h-96 bg-[#d9a65a]/10 blur-[120px] rounded-full -mr-48 -mt-48"></div>
                <div className="container mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-16 relative z-10">

                    {/* Contact Form */}
                    <div className="text-center lg:text-left">
                        <span className="text-[#d9a65a] font-bold tracking-widest uppercase text-xs mb-4 block">{t.contact.visit.title}</span>
                        <h2 className="font-serif text-4xl md:text-6xl text-white mb-6">
                            Estás com alguma <span className="text-[#d9a65a] italic">dúvida?</span>
                        </h2>
                        <p className="text-white/60 mb-10 text-lg max-w-lg mx-auto lg:mx-0">
                            Preencha o formulário e a nossa equipe entrará em contacto o mais breve possível.
                        </p>

                        <form onSubmit={handleContactSubmit} className="space-y-6 max-w-lg mx-auto lg:mx-0">
                            <div className="relative">
                                <label className="block text-[10px] font-black uppercase tracking-[0.2em] mb-2 text-[#d9a65a]/70 text-left pl-4">{t.contact.form.name}</label>
                                <input
                                    type="text"
                                    required
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white focus:outline-none focus:border-[#d9a65a] transition-all hover:bg-white/10"
                                    placeholder={t.contact.form.namePlaceholder}
                                />
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-[0.2em] mb-2 text-[#d9a65a]/70 text-left pl-4">{t.contact.form.phone}</label>
                                    <input
                                        type="tel"
                                        value={formData.phone}
                                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                        className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white focus:outline-none focus:border-[#d9a65a] transition-all hover:bg-white/10"
                                        placeholder="+258 8x xxx xxxx"
                                    />
                                </div>
                                <div>
                                    <label htmlFor="contact-email" className="block text-[10px] font-black uppercase tracking-[0.2em] mb-2 text-[#d9a65a]/70 text-left pl-4">{t.contact.form.email}</label>
                                    <input
                                        type="email"
                                        id="contact-email"
                                        required
                                        value={formData.email}
                                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                        className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white focus:outline-none focus:border-[#d9a65a] transition-all hover:bg-white/10"
                                        placeholder="email@exemplo.com"
                                    />
                                </div>
                            </div>
                            <div>
                                <label htmlFor="contact-message" className="block text-[10px] font-black uppercase tracking-[0.2em] mb-2 text-[#d9a65a]/70 text-left pl-4">{t.contact.form.message}</label>
                                <textarea
                                    id="contact-message"
                                    rows={4}
                                    required
                                    value={formData.message}
                                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                                    className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white focus:outline-none focus:border-[#d9a65a] transition-all hover:bg-white/10"
                                    placeholder={t.contact.form.messagePlaceholder}
                                />
                            </div>

                            {submitStatus === 'success' && (
                                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-green-500/10 border border-green-500/50 text-green-400 p-4 rounded-2xl text-center font-bold">
                                    {t.contact.form.success}
                                </motion.div>
                            )}

                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="bg-[#d9a65a] text-[#3b2f2f] px-12 py-5 rounded-2xl font-black uppercase tracking-widest hover:bg-[#f7f1eb] transition-all w-full md:w-auto disabled:opacity-50 disabled:cursor-not-allowed shadow-xl"
                            >
                                {isSubmitting ? 'Enviando...' : t.contact.form.send}
                            </button>
                        </form>
                    </div>

                    {/* Visit Us Card - Redesigned */}
                    <div id="visit" className="bg-[#f7f1eb] text-[#3b2f2f] rounded-[3rem] p-10 md:p-16 shadow-2xl flex flex-col justify-between border border-white">
                        <div>
                            <span className="bg-[#d9a65a]/10 text-[#d9a65a] px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest mb-6 inline-block">Localização</span>
                            <h3 className="font-serif text-4xl md:text-5xl mb-8 leading-tight">Visite a nossa <span className="text-[#d9a65a] italic">Padaria</span></h3>
                            
                            <div className="space-y-8">
                                <div className="flex items-center gap-6 group">
                                    <div className="bg-[#3b2f2f] p-4 rounded-2xl text-[#d9a65a] group-hover:bg-[#d9a65a] group-hover:text-[#3b2f2f] transition-all duration-300 shadow-lg">
                                        <MapPin className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black uppercase tracking-widest text-[#d9a65a] mb-1">Endereço</p>
                                        <p className="font-bold text-lg">{t.contact.visit.location}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-6 group">
                                    <div className="bg-[#3b2f2f] p-4 rounded-2xl text-[#d9a65a] group-hover:bg-[#d9a65a] group-hover:text-[#3b2f2f] transition-all duration-300 shadow-lg">
                                        <Phone className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black uppercase tracking-widest text-[#d9a65a] mb-1">WhatsApp</p>
                                        <p className="font-bold text-lg">+258 87 9146 662</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-6 group">
                                    <div className="bg-[#3b2f2f] p-4 rounded-2xl text-[#d9a65a] group-hover:bg-[#d9a65a] group-hover:text-[#3b2f2f] transition-all duration-300 shadow-lg">
                                        <Mail className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black uppercase tracking-widest text-[#d9a65a] mb-1">Email</p>
                                        <div className="flex flex-col">
                                            {t.contact.visit.emails.map((email: string, index: number) => (
                                                <a key={index} href={`mailto:${email}`} className="font-bold hover:text-[#d9a65a] transition-colors">
                                                    {email}
                                                </a>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Interactive Map Wrapper */}
                        <div className="mt-12 group">
                            <div className="h-64 bg-white rounded-3xl overflow-hidden relative shadow-xl border-4 border-white transition-all group-hover:shadow-2xl">
                                <iframe
                                    src="https://www.google.com/maps?q=Padaria+P%C3%A3o+Caseiro,+Av.+Acordo+de+Lusaka,+Lichinga,+Niassa,+Mozambique&t=&z=15&ie=UTF8&iwloc=&output=embed"
                                    width="100%"
                                    height="100%"
                                    className="border-0 grayscale contrast-125 opacity-80 group-hover:grayscale-0 group-hover:opacity-100 transition-all duration-700"
                                    allowFullScreen
                                    loading="lazy"
                                    title="Localização Pão Caseiro"
                                />
                                <div className="absolute inset-0 pointer-events-none border-[12px] border-white/10 group-hover:border-transparent transition-all"></div>
                            </div>
                        </div>
                    </div>
                </div>
            </section >




            <AnimatePresence>
                {
                    selectedIndex !== null && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center p-4 backdrop-blur-sm"
                            onClick={() => setSelectedIndex(null)}
                        >
                            {/* Close Button */}
                            <button
                                className="absolute top-6 right-6 text-white/80 hover:text-[#d9a65a] transition-colors z-[102] bg-white/10 p-2 rounded-full backdrop-blur-md"
                                onClick={() => setSelectedIndex(null)}
                                title={language === 'pt' ? 'Fechar' : 'Close'}
                            >
                                <X className="w-8 h-8" />
                            </button>

                            {/* Navigation Buttons */}
                            <button
                                className="absolute left-4 md:left-8 top-1/2 -translate-y-1/2 text-white/80 hover:text-[#d9a65a] hover:bg-white/10 p-2 rounded-full transition-all z-[102]"
                                onClick={handlePrev}
                                title={language === 'pt' ? 'Anterior' : 'Previous'}
                            >
                                <ChevronLeft className="w-10 h-10" />
                            </button>

                            <button
                                className="absolute right-4 md:right-8 top-1/2 -translate-y-1/2 text-white/80 hover:text-[#d9a65a] hover:bg-white/10 p-2 rounded-full transition-all z-[102]"
                                onClick={handleNext}
                                title={language === 'pt' ? 'Próximo' : 'Next'}
                            >
                                <ChevronRight className="w-10 h-10" />
                            </button>

                            <div className="relative z-[101] max-w-7xl max-h-[90vh] w-full flex items-center justify-center p-4">
                                <motion.img
                                    key={selectedIndex}
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.9 }}
                                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                                    src={galleryItems[selectedIndex].src}
                                    alt={galleryItems[selectedIndex].caption}
                                    className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl border-2 border-[#d9a65a]/30"
                                />
                                <div className="absolute bottom-[-3rem] left-0 right-0 text-center text-white/90">
                                    <p className="text-xl font-serif tracking-wide">{galleryItems[selectedIndex].caption}</p>
                                </div>
                            </div>
                        </motion.div>
                    )
                }
            </AnimatePresence >

            <LandingLaunchPopup language={language} />
        </>
    );
};
