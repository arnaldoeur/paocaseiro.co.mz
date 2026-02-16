import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Play, Wheat, Coffee, Cake, Croissant,
    MapPin, ZoomIn, ChevronLeft, ChevronRight, X, Phone, Mail
} from 'lucide-react';
import { translations, Language } from '../translations';
import { useLocation, useNavigate } from 'react-router-dom';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_ANON_KEY);

interface HomeProps {
    language: Language;
}

const SERVICES = [
    {
        icon: Wheat,
        title: 'Padaria',
        desc: 'Pães rústicos e doces de fornada diária.',
        image: '/images/fotos%20servicos%20pao%20caseiro/padaria_paocaseiro.png'
    },
    {
        icon: Croissant,
        title: 'Pastelaria',
        desc: 'Pastéis e salgados frescos.',
        image: '/images/fotos%20servicos%20pao%20caseiro/pastelaria.png'
    },
    {
        icon: Cake,
        title: 'Confeitaria',
        desc: 'Bolos e sobremesas personalizadas.',
        image: '/images/fotos%20servicos%20pao%20caseiro/confeitaria.png'
    },
    {
        icon: Coffee,
        title: 'Café',
        desc: 'Bebidas preparadas com carinho.',
        image: '/images/fotos%20servicos%20pao%20caseiro/cafe.png'
    }
];

const CLASSICS = [
    {
        title: 'Pão',
        desc: 'O nosso pão tradicional, fresco a toda a hora.',
        price: '',
        image: '/images/products/pao-caseiro-fresh.png'
    },
    {
        title: 'Pão Caseiro',
        desc: 'Aquele pão especial que é encomendado geralmente.',
        price: '',
        image: '/images/products/pao-portugues-fresh.png'
    },
    {
        title: 'Croissants',
        desc: 'Folhados, recheados ou simples, sempre frescos.',
        price: '',
        image: '/images/products/croissants-recheados.png'
    },
    {
        title: 'Broa de Milho',
        desc: 'Broa densa e saborosa, feita com farinha de milho.',
        price: '',
        image: '/images/products/broa-milho.png'
    }
];

const GALLERY_ITEMS = [
    { src: '/images/products/waffle-stick.png', caption: 'Waffle Stick' },
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

    const [isVideoPlaying, setIsVideoPlaying] = useState(false);
    const [isHeroMuted, setIsHeroMuted] = useState(true);
    const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
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

            // 2. Send Email via FormSubmit (Frontend Email Service)
            const emailResponse = await fetch("https://formsubmit.co/ajax/info@paocaseiro.co.mz", {
                method: "POST",
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify({
                    name: formData.name,
                    email: formData.email, // FormSubmit replies to this
                    phone: formData.phone,
                    message: formData.message,
                    _cc: "gestor@paocaseiro.org",
                    _subject: `Nova Mensagem do Site: ${formData.name}`,
                    _template: "table"
                })
            });

            if (!emailResponse.ok) console.warn("Email dispatch failed, but DB saved.");

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
            src="/paocaseiropng.png"
            alt="Pão Caseiro Logo"
            className={`object-contain ${className}`}
        />
    );

    // Lightbox Navigation Logic
    const handleNext = useCallback((e?: React.MouseEvent) => {
        e?.stopPropagation();
        if (selectedIndex !== null) {
            setSelectedIndex((prev) => (prev !== null && prev < GALLERY_ITEMS.length - 1 ? prev + 1 : 0));
        }
    }, [selectedIndex]);

    const handlePrev = useCallback((e?: React.MouseEvent) => {
        e?.stopPropagation();
        if (selectedIndex !== null) {
            setSelectedIndex((prev) => (prev !== null && prev > 0 ? prev - 1 : GALLERY_ITEMS.length - 1));
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
                    {/* Video Background */}
                    <video
                        autoPlay
                        loop
                        muted
                        playsInline
                        poster="/hero-bg-2.png"
                        className="w-full h-full object-cover"
                    >
                        <source src="/video-bg.mp4" type="video/mp4" />
                    </video>
                    <div className="absolute inset-0 bg-black/40" />
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
                            Ver Menu
                        </button>
                        <button
                            onClick={() => scrollToSection('gallery')}
                            className="border-2 border-[#f7f1eb] text-[#f7f1eb] px-8 py-4 rounded-full font-bold uppercase tracking-widest hover:bg-[#f7f1eb] hover:text-[#3b2f2f] transition-all w-full md:w-auto"
                        >
                            {t.hero.gallery}
                        </button>
                    </div>

                    <a
                        href="tel:+258846930960"
                        className="mt-8 text-sm md:text-base font-bold bg-[#3b2f2f]/60 backdrop-blur-sm inline-block px-6 py-2 rounded-full hover:bg-[#d9a65a] hover:text-[#3b2f2f] transition-colors"
                    >
                        {t.hero.call}
                    </a>
                </motion.div>
            </section >

            {/* --- VIDEO SECTION --- */}
            < section className="relative min-h-[80vh] bg-[#3b2f2f] flex items-center justify-center overflow-hidden" >
                {/* Placeholder Video Container */}
                < div className="absolute inset-0 opacity-60" >
                    {/* Background Thumbnail */}
                    < img
                        src="/images/video-placeholder.jpg"
                        className="w-full h-full object-cover"
                        alt="Background Video Thumbnail"
                    />
                </div >

                <div className="relative z-10 container mx-auto px-6 text-center text-[#f7f1eb]">
                    <h2 className="font-serif text-4xl md:text-6xl mb-6">{t.video.title}</h2>
                    <p className="text-lg md:text-xl font-light mb-12 max-w-2xl mx-auto text-[#f7f1eb]/80">
                        {t.video.subtitle}
                    </p>

                    <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setIsVideoPlaying(true)}
                        className="w-24 h-24 bg-[#f7f1eb] rounded-full flex items-center justify-center text-[#3b2f2f] shadow-[0_0_30px_rgba(217,166,90,0.5)] mx-auto group hover:bg-[#d9a65a] transition-colors"
                    >
                        <Play className="w-10 h-10 ml-1 fill-current" />
                    </motion.button>
                    <p className="mt-4 uppercase tracking-widest text-xs font-bold">{t.video.play}</p>
                </div>

                {/* Video Modal */}
                {
                    isVideoPlaying && (
                        <div className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-4 backdrop-blur-sm">
                            <button
                                onClick={() => setIsVideoPlaying(false)}
                                className="absolute top-8 right-8 text-white hover:text-[#d9a65a] transition-colors z-[110]"
                            >
                                <X className="w-10 h-10" />
                            </button>
                            <div className="w-full max-w-5xl aspect-video bg-black rounded-lg overflow-hidden border border-[#d9a65a]/30 shadow-[0_0_50px_rgba(217,166,90,0.2)]">
                                <video
                                    src="https://backup.aegraphics.in/wp-content/uploads/2025/12/ANICOR-FINAL.mp4"
                                    controls
                                    autoPlay
                                    playsInline
                                    className="w-full h-full object-contain"
                                >
                                    Seu navegador não suporta a reprodução de vídeo.
                                </video>
                            </div>
                        </div>
                    )
                }
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

                            <ul className="space-y-6">
                                {t.about.points.map((item, i) => (
                                    <motion.li
                                        key={i}
                                        initial={{ opacity: 0, x: 20 }}
                                        whileInView={{ opacity: 1, x: 0 }}
                                        viewport={{ once: true }}
                                        transition={{ delay: i * 0.2 }}
                                        className="flex items-start justify-center lg:justify-start gap-4 text-[#3b2f2f] font-medium"
                                    >
                                        <span className="w-2 h-2 rounded-full bg-[#d9a65a] mt-2 shrink-0" />
                                        {item}
                                    </motion.li>
                                ))}
                            </ul>
                        </div>
                    </div>
                </div>
            </section >

            {/* --- SERVICES SECTION --- */}
            < section id="services" className="min-h-screen flex items-center py-20 bg-[#3b2f2f] text-[#f7f1eb] relative overflow-hidden" >
                {/* Subtle Watermark */}
                < div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-10 pointer-events-none w-[80vw]" >
                    <Logo className="w-full h-auto" />
                </div >

                <div className="container mx-auto px-6 relative z-10">
                    <div className="text-center mb-16">
                        <h2 className="font-serif text-5xl md:text-6xl mb-4 text-[#d9a65a]">{t.services.title}</h2>
                        <div className="w-20 h-1 bg-[#d9a65a] mx-auto rounded-full" />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {SERVICES.map((service, idx) => (
                            <motion.div
                                key={idx}
                                whileHover={{ y: -10 }}
                                className="group bg-[#4b3a2f] rounded-3xl border border-[#f7f1eb]/10 hover:border-[#d9a65a]/50 transition-colors shadow-lg flex flex-col overflow-hidden"
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
                            Ver Menu Completo
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
                                className="flex flex-col h-full bg-white rounded-2xl shadow-lg item-card overflow-hidden group"
                            >
                                <div className="w-full h-64 overflow-hidden">
                                    <img src={item.image} alt={item.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
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
                        {GALLERY_ITEMS.map((item, idx) => (
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
                            Ver Galeria Completa
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
                                        placeholder="846 930 960"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold uppercase tracking-widest mb-2 text-[#d9a65a] text-center lg:text-left">{t.contact.form.email}</label>
                                    <input
                                        type="email"
                                        required
                                        value={formData.email}
                                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                        className="w-full bg-[#4b3a2f] border border-[#f7f1eb]/10 rounded-xl p-4 text-[#f7f1eb] focus:outline-none focus:border-[#d9a65a] transition-colors text-center lg:text-left"
                                        placeholder="email@exemplo.com"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-bold uppercase tracking-widest mb-2 text-[#d9a65a] text-center lg:text-left">{t.contact.form.message}</label>
                                <textarea
                                    rows={4}
                                    required
                                    value={formData.message}
                                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                                    className="w-full bg-[#4b3a2f] border border-[#f7f1eb]/10 rounded-xl p-4 text-[#f7f1eb] focus:outline-none focus:border-[#d9a65a] transition-colors text-center lg:text-left"
                                    placeholder={t.contact.form.messagePlaceholder}
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
                                        <p className="text-[#4b3a2f]">846 930 960</p>
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
                                style={{ border: 0 }}
                                allowFullScreen
                                loading="lazy"
                                referrerPolicy="no-referrer-when-downgrade"
                                title="Localização Pão Caseiro"
                            />
                        </div>
                    </div>
                </div>
            </section >

            {/* Lightbox Modal */}
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
                            >
                                <X className="w-8 h-8" />
                            </button>

                            {/* Navigation Buttons */}
                            <button
                                className="absolute left-4 md:left-8 top-1/2 -translate-y-1/2 text-white/80 hover:text-[#d9a65a] hover:bg-white/10 p-2 rounded-full transition-all z-[102]"
                                onClick={handlePrev}
                            >
                                <ChevronLeft className="w-10 h-10" />
                            </button>

                            <button
                                className="absolute right-4 md:right-8 top-1/2 -translate-y-1/2 text-white/80 hover:text-[#d9a65a] hover:bg-white/10 p-2 rounded-full transition-all z-[102]"
                                onClick={handleNext}
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
                                    src={GALLERY_ITEMS[selectedIndex].src}
                                    alt={GALLERY_ITEMS[selectedIndex].caption}
                                    className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl border-2 border-[#d9a65a]/30"
                                />
                                <div className="absolute bottom-[-3rem] left-0 right-0 text-center text-white/90">
                                    <p className="text-xl font-serif tracking-wide">{GALLERY_ITEMS[selectedIndex].caption}</p>
                                </div>
                            </div>
                        </motion.div>
                    )
                }
            </AnimatePresence >
        </>
    );
};
