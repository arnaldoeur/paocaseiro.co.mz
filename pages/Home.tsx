import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Play, Wheat, Coffee, Cake, Croissant,
    MapPin, ZoomIn, ChevronLeft, ChevronRight, X, Phone, Mail, ShoppingBag
} from 'lucide-react';
import { LandingLaunchPopup } from '../components/LandingLaunchPopup';
import { translations, Language } from '../translations';
import { useLocation, useNavigate } from 'react-router-dom';
import { createClient } from '@supabase/supabase-js';
import { sendEmail } from '../services/email';
import { sendSMS } from '../services/sms';
import { notifyAdminSystemsAlert } from '../services/whatsapp';

const supabase = createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_ANON_KEY);

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
            const { data } = await supabase.from('gallery_items').select('*').order('display_order', { ascending: true });
            if (data && data.length > 0) {
                setGalleryItems(data);
            }
        };
        fetchGallery();
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
                            onClick={() => scrollToSection('gallery')}
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
                        {t.hero.call}
                    </a>
                </motion.div>
            </section >

            {/* --- VIDEO SECTION --- */}
            < section className="relative min-h-screen bg-[#3b2f2f] flex items-center justify-center overflow-hidden" >
                {/* Video Container */}
                < div className={`absolute inset-0 transition-opacity duration-500 ${isPlayingWithSound ? 'opacity-100 z-20 bg-black' : 'opacity-60'}`} >
                    <video
                        ref={videoRef}
                        src="https://bqiegszufcqimlvucrpm.supabase.co/storage/v1/object/public/products/PAO%20CASEIRO%20VIDEO.mp4"
                        autoPlay
                        loop
                        muted
                        playsInline
                        className={`w-full h-full transition-all duration-500 ${isPlayingWithSound ? 'object-contain' : 'object-cover pointer-events-none'}`}
                        controls={isPlayingWithSound}
                    >
                        Seu navegador não suporta a reprodução de vídeo.
                    </video>
                </div >

                {!isPlayingWithSound && (
                    <div className="relative z-10 container mx-auto px-6 text-center text-[#f7f1eb] animate-in fade-in duration-500">
                        <h2 className="font-serif text-4xl md:text-6xl mb-6">{t.video.title}</h2>
                        <p className="text-lg md:text-xl font-light mb-12 max-w-2xl mx-auto text-[#f7f1eb]/80">
                            {t.video.subtitle}
                        </p>

                        <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={handlePlayWithSound}
                            className="w-24 h-24 bg-[#f7f1eb] rounded-full flex items-center justify-center text-[#3b2f2f] shadow-[0_0_30px_rgba(217,166,90,0.5)] mx-auto group hover:bg-[#d9a65a] transition-colors relative z-10 pointer-events-auto"
                        >
                            <Play className="w-10 h-10 ml-1 fill-current" />
                        </motion.button>
                        <p className="mt-4 uppercase tracking-widest text-xs font-bold relative z-10">{t.video.play}</p>
                    </div>
                )}

                {isPlayingWithSound && (
                    <button
                        onClick={handleCloseVideo}
                        title={language === 'pt' ? 'Mudo / Fundo' : 'Mute / Background'}
                        className="absolute top-24 md:top-8 right-6 md:right-8 text-white hover:text-[#d9a65a] transition-colors z-[30] bg-black/50 p-2 rounded-full backdrop-blur-md animate-in fade-in zoom-in duration-300"
                        aria-label="Voltar para plano de fundo"
                    >
                        <X className="w-8 h-8" />
                    </button>
                )}
            </section >

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
                                className="absolute top-0 left-0 w-[85%] h-[80%] object-cover object-bottom rounded-3xl shadow-xl z-10"
                            />

                            {/* Image 2 */}
                            <img
                                src="/images/about-bread.jpeg"
                                alt="Pão fresco"
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

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {SERVICES.map((service, idx) => (
                            <motion.div
                                key={idx}
                                whileHover={{ y: -10 }}
                                onClick={() => navigate(`/menu#${service.categoryId}`)}
                                className="group bg-[#4b3a2f] rounded-3xl border border-[#f7f1eb]/10 hover:border-[#d9a65a]/50 transition-colors shadow-lg flex flex-col overflow-hidden cursor-pointer"
                            >
                                <div className="p-8 flex flex-col items-center text-center flex-grow">
                                    <div className="mb-6 p-4 bg-[#3b2f2f] rounded-full group-hover:bg-[#d9a65a] group-hover:text-[#3b2f2f] transition-colors duration-300">
                                        <service.icon className="w-8 h-8" />
                                    </div>
                                    <h3 className="font-serif text-2xl mb-4 text-[#f7f1eb]">{t.services.items[idx].title}</h3>
                                    <p className="text-[#f7f1eb]/70 text-sm leading-relaxed mb-6 flex-grow">{t.services.items[idx].desc}</p>
                                </div>
                                <div className="w-full h-48 overflow-hidden mt-auto">
                                    <img src={service.image} alt={service.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
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

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-12 mb-12">
                        {CLASSICS.map((item, idx) => (
                            <motion.div
                                key={idx}
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true, margin: "-100px" }}
                                transition={{ delay: idx * 0.1 }}
                                onClick={() => navigate(`/menu#${item.categoryId}`)}
                                className="flex flex-col h-full bg-white rounded-2xl shadow-lg item-card overflow-hidden group cursor-pointer"
                            >
                                <div className="h-64 relative overflow-hidden flex flex-col items-center justify-center">
                                    <img src={item.image} alt={item.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                                </div>
                                <div className="p-6 flex flex-col flex-grow">
                                    <h3 className="font-serif text-2xl font-bold text-[#3b2f2f] mb-3 group-hover:text-[#d9a65a] transition-colors">
                                        {t.classics.items[idx].title}
                                    </h3>
                                    <div className="w-12 h-0.5 bg-[#d9a65a]/50 mb-4" />
                                    <p className="text-[#4b3a2f] leading-relaxed flex-grow">{t.classics.items[idx].desc}</p>
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

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {galleryItems.map((item, idx) => (
                            <motion.div
                                key={idx}
                                layoutId={`gallery-item-${idx}`}
                                initial={{ opacity: 0, scale: 0.95 }}
                                whileInView={{ opacity: 1, scale: 1 }}
                                viewport={{ once: true }}
                                onClick={() => setSelectedIndex(idx)}
                                className="relative group rounded-3xl overflow-hidden shadow-lg border border-[#3b2f2f]/10 cursor-pointer aspect-square bg-[#e5e5e5]"
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
            < section id="contact" className="min-h-screen bg-[#3b2f2f] text-[#f7f1eb] py-20 flex flex-col justify-center" >
                <div className="container mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-16">

                    {/* Contact Form */}
                    <div className="text-center lg:text-left">
                        <h2 className="font-serif text-4xl md:text-5xl text-[#d9a65a] mb-6">
                            {t.contact.title}
                        </h2>
                        <p className="text-[#f7f1eb]/80 mb-8 text-lg">
                            {t.contact.subtitle}
                        </p>

                        <form onSubmit={handleContactSubmit} className="space-y-6 max-w-lg mx-auto lg:mx-0">
                            <div>
                                <label className="block text-sm font-bold uppercase tracking-widest mb-2 text-[#d9a65a] text-center lg:text-left">{t.contact.form.name}</label>
                                <input
                                    type="text"
                                    required
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    className="w-full bg-[#4b3a2f] border border-[#f7f1eb]/10 rounded-xl p-4 text-[#f7f1eb] focus:outline-none focus:border-[#d9a65a] transition-colors text-center lg:text-left"
                                    placeholder={t.contact.form.namePlaceholder}
                                />
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-bold uppercase tracking-widest mb-2 text-[#d9a65a] text-center lg:text-left">{t.contact.form.phone}</label>
                                    <input
                                        type="tel"
                                        value={formData.phone}
                                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                        className="w-full bg-[#4b3a2f] border border-[#f7f1eb]/10 rounded-xl p-4 text-[#f7f1eb] focus:outline-none focus:border-[#d9a65a] transition-colors text-center lg:text-left"
                                        placeholder="+258 8x xxx xxxx"
                                        title={t.contact.form.phonePlaceholder || "+258 8x xxx xxxx"}
                                    />
                                </div>
                                <div>
                                    <label htmlFor="contact-email" className="block text-sm font-bold uppercase tracking-widest mb-2 text-[#d9a65a] text-center lg:text-left">{t.contact.form.email}</label>
                                    <input
                                        type="email"
                                        id="contact-email"
                                        required
                                        value={formData.email}
                                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                        className="w-full bg-[#4b3a2f] border border-[#f7f1eb]/10 rounded-xl p-4 text-[#f7f1eb] focus:outline-none focus:border-[#d9a65a] transition-colors text-center lg:text-left"
                                        placeholder="email@exemplo.com"
                                        title={t.contact.form.emailPlaceholder || "email@exemplo.com"}
                                    />
                                </div>
                            </div>
                            <div>
                                <label htmlFor="contact-message" className="block text-sm font-bold uppercase tracking-widest mb-2 text-[#d9a65a] text-center lg:text-left">{t.contact.form.message}</label>
                                <textarea
                                    id="contact-message"
                                    rows={4}
                                    required
                                    value={formData.message}
                                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                                    className="w-full bg-[#4b3a2f] border border-[#f7f1eb]/10 rounded-xl p-4 text-[#f7f1eb] focus:outline-none focus:border-[#d9a65a] transition-colors text-center lg:text-left"
                                    placeholder={t.contact.form.messagePlaceholder}
                                    title={t.contact.form.messagePlaceholder}
                                />
                            </div>

                            {submitStatus === 'success' && (
                                <div className="bg-green-500/20 border border-green-500 text-green-100 p-4 rounded-xl text-center">
                                    {t.contact.form.success}
                                </div>
                            )}

                            {submitStatus === 'error' && (
                                <div className="bg-red-500/20 border border-red-500 text-red-100 p-4 rounded-xl text-center">
                                    {t.contact.form.error}
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="bg-[#d9a65a] text-[#3b2f2f] px-10 py-4 rounded-xl font-bold uppercase tracking-widest hover:bg-[#f7f1eb] transition-all w-full md:w-auto disabled:opacity-50 disabled:cursor-not-allowed"
                                title={t.contact.form.send}
                            >
                                {isSubmitting ? '...' : t.contact.form.send}
                            </button>
                        </form>
                    </div>

                    {/* Visit Us */}
                    <div id="visit" className="bg-[#f7f1eb] text-[#3b2f2f] rounded-3xl p-8 md:p-12 shadow-2xl flex flex-col justify-between">
                        <div>
                            <h3 className="font-serif text-4xl mb-6">{t.contact.visit.title}</h3>
                            <p className="text-xl font-light mb-8">
                                {t.contact.visit.desc}
                            </p>

                            <div className="space-y-6">
                                <div className="flex items-start gap-4">
                                    <div className="bg-[#d9a65a]/20 p-3 rounded-full text-[#3b2f2f]">
                                        <MapPin className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-lg">{t.contact.visit.locationLabel}</h4>
                                        <p className="text-[#4b3a2f]">{t.contact.visit.location}</p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-4">
                                    <div className="bg-[#d9a65a]/20 p-3 rounded-full text-[#3b2f2f]">
                                        <Phone className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-lg">{t.contact.visit.phoneLabel}</h4>
                                        <p className="text-[#4b3a2f]">+258 87 9146 662</p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-4">
                                    <div className="bg-[#d9a65a]/20 p-3 rounded-full text-[#3b2f2f]">
                                        <Mail className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-lg">{t.contact.visit.emailLabel}</h4>
                                        <div className="flex flex-col">
                                            {t.contact.visit.emails.map((email: string, index: number) => (
                                                <a key={index} href={`mailto:${email}`} className="text-[#4b3a2f] hover:text-[#d9a65a] transition-colors text-sm md:text-base">
                                                    {email}
                                                </a>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Map */}
                        <div className="mt-8 h-64 bg-[#e5e5e5] rounded-xl overflow-hidden relative shadow-inner">
                            <iframe
                                src="https://www.google.com/maps?q=Padaria+P%C3%A3o+Caseiro,+Av.+Acordo+de+Lusaka,+Lichinga,+Niassa,+Mozambique&t=&z=15&ie=UTF8&iwloc=&output=embed"
                                width="100%"
                                height="100%"
                                className="border-0"
                                allowFullScreen
                                loading="lazy"
                                referrerPolicy="no-referrer-when-downgrade"
                                title="Localização Pão Caseiro"
                            />
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
