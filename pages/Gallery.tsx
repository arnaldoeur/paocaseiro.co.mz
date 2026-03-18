import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingBag, Search, Plus, Loader, X, ZoomIn, ChevronLeft, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { Language } from '../translations';
import { formatProductName } from '../services/stringUtils';

// --- Static Data from Home ---
const CLASSICS = [
    {
        title: 'Trança Caramelizada com Coco',
        price: 0,
        image: '/images/arrofadas.png'
    },
    {
        title: 'Bolas de Berlim Tradicionais',
        price: 0,
        image: '/images/bola_berlim.png'
    },
    {
        title: 'Pastéis de Nata Artesanais',
        price: 0,
        image: '/images/pastel_nata.png'
    },
    {
        title: 'Mini Folhados Doces & Salgados',
        price: 0,
        image: '/images/mini_folhados.png'
    }
];

const STATIC_GALLERY = [
    { src: '/images/about-bread.jpeg', caption: 'Ambiente Acolhedor' },
    { src: '/images/broa_milho.png', caption: 'Pães Frescos Todas as Manhãs' },
    { src: '/images/pao_caseiro.png', caption: 'Processo 100% Artesanal' },
    { src: '/images/services/confeitaria.png', caption: 'Variedade de Doces' },
    { src: '/images/bola_berlim.png', caption: 'Qualidade em Cada Detalhe' },
    { src: '/images/arrofadas.png', caption: 'Ingredientes de Primeira' },
    { src: '/images/coxinhas.png', caption: 'Sortido de Doces & Salgados' },
    { src: '/images/pao_portugues.png', caption: 'Receitas com Tradição' },
    { src: '/images/logo-official.png', caption: 'Pão Caseiro em Lichinga' },
];

interface GalleryItem {
    id: string;
    name: string;
    price: number;
    inStock: boolean;
    image: string;
    type: 'product' | 'static';
}

export const Gallery: React.FC<{ language: Language }> = ({ language }) => {
    const navigate = useNavigate();
    const { addToCart } = useCart();
    const [items, setItems] = useState<GalleryItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedIndex, setSelectedIndex] = useState<number | null>(null); // For Lightbox

    useEffect(() => {
        loadData();
    }, []);

    // Lightbox Navigation Keyboard Support
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (selectedIndex === null) return;
            if (e.key === 'ArrowRight') handleNext();
            if (e.key === 'ArrowLeft') handlePrev();
            if (e.key === 'Escape') setSelectedIndex(null);
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [selectedIndex]);

    const filteredItems = items.filter(p =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleNext = () => {
        if (selectedIndex === null) return;
        setSelectedIndex((selectedIndex + 1) % filteredItems.length);
    };

    const handlePrev = () => {
        if (selectedIndex === null) return;
        setSelectedIndex((selectedIndex - 1 + filteredItems.length) % filteredItems.length);
    };

    const loadData = async () => {
        let allItems: GalleryItem[] = [];

        // 1. Add Static Classics
        const classics: GalleryItem[] = CLASSICS.map((c, i) => ({
            id: `classic-${i}`,
            name: c.title,
            price: 0,
            inStock: true,
            image: c.image,
            type: 'static'
        }));
        allItems = [...allItems, ...classics];

        // 2. Add Static Gallery Items
        const statics: GalleryItem[] = STATIC_GALLERY.map((s, i) => ({
            id: `static-${i}`,
            name: s.caption,
            price: 0,
            inStock: true,
            image: s.src,
            type: 'static'
        }));
        allItems = [...allItems, ...statics];

        // 3. Fetch DB Products
        try {
            const { supabase } = await import('../services/supabase');
            const { data, error } = await supabase
                .from('products')
                .select('*')
                .order('name');

            if (data && !error) {
                const dbProducts: GalleryItem[] = data.map((p: any) => ({
                    id: p.id,
                    name: p.name,
                    price: parseFloat(p.price) || 0,
                    inStock: p.is_available,
                    image: p.image_url,
                    type: 'product'
                }));
                allItems = [...allItems, ...dbProducts];
            }
        } catch (err) {
            console.error('Error loading products:', err);
        }

        // Remove duplicates based on Image URL (if any) to avoid identical visuals
        const uniqueItems = Array.from(new Map(allItems.map(item => [item.image, item])).values());

        // Shuffle slightly? Or just sort by name? User said "Interactive Gallery".
        // Let's keep them mixed.
        setItems(uniqueItems);
        setLoading(false);
    };

    const handleAddToCart = (item: GalleryItem) => {
        if (item.price > 0) {
            addToCart({
                id: item.id,
                name: item.name,
                price: item.price,
                image: item.image,
                quantity: 1
            });
        }
    };


    return (
        <div className="min-h-screen pt-24 pb-20 px-4 md:px-8 bg-[#f7f1eb]">
            <div className="container mx-auto max-w-7xl">
                {/* Header */}
                <div className="text-center mb-12">
                    <h1 className="font-serif text-5xl text-[#3b2f2f] mb-4">Galeria de Produtos</h1>
                    <p className="text-[#4b3a2f] max-w-2xl mx-auto text-lg">
                        Explore nossa coleção completa de delícias.
                    </p>
                </div>

                {/* Search Bar */}
                <div className="mb-12 max-w-md mx-auto relative group">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#d9a65a] transition-colors" size={20} />
                    <input
                        type="text"
                        placeholder="Pesquisar..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-12 pr-4 py-4 rounded-full border border-[#3b2f2f]/10 bg-white focus:outline-none focus:border-[#d9a65a] focus:ring-1 focus:ring-[#d9a65a] shadow-sm transition-all"
                    />
                </div>

                {/* Content Grid */}
                {loading ? (
                    <div className="flex justify-center py-20">
                        <Loader className="w-10 h-10 animate-spin text-[#d9a65a]" />
                    </div>
                ) : filteredItems.length > 0 ? (
                    <div className="columns-1 md:columns-2 lg:columns-3 gap-8 space-y-8 p-4">
                        {filteredItems.map((item, idx) => (
                            <motion.div
                                key={item.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: idx * 0.05 }}
                                className="break-inside-avoid bg-white rounded-3xl overflow-hidden shadow-lg border border-[#3b2f2f]/5 hover:border-[#d9a65a]/30 group hover:shadow-2xl transition-all duration-300 relative"
                            >
                                <div
                                    className="relative cursor-pointer overflow-hidden"
                                    onClick={() => setSelectedIndex(idx)}
                                >
                                    <img
                                        src={item.image}
                                        alt={formatProductName(item.name)}
                                        className="w-full h-auto object-cover group-hover:scale-105 transition-transform duration-700"
                                        loading="lazy"
                                    />
                                    {/* Zoom Overlay */}
                                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100 pointer-events-none">
                                        <ZoomIn className="text-white drop-shadow-lg" size={32} />
                                    </div>

                                    {!item.inStock && item.type === 'product' && (
                                        <div className="absolute top-4 right-4 bg-[#3b2f2f] text-white px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider shadow-lg">
                                            Esgotado
                                        </div>
                                    )}
                                </div>

                                <div className="p-5">
                                    <h3 className="font-serif text-lg font-bold text-[#3b2f2f] leading-tight mb-2">
                                        {formatProductName(item.name)}
                                    </h3>

                                    {/* Visual Only - No Price/Cart per user request */}
                                </div>
                            </motion.div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-20 opacity-60">
                        <ShoppingBag className="w-16 h-16 mx-auto mb-4 text-[#d9a65a]" />
                        <p className="text-xl font-serif text-[#3b2f2f]">Nada encontrado.</p>
                    </div>
                )}

                {/* Footer CTAs */}
                <div className="mt-20 pt-12 border-t border-[#3b2f2f]/10">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
                        <div className="p-6 bg-white rounded-2xl shadow-sm border border-[#3b2f2f]/5 hover:shadow-md transition-all">
                            <h3 className="font-serif text-xl font-bold text-[#3b2f2f] mb-3">Gostou de algo? Quer pedir?</h3>
                            <p className="text-sm text-[#4b3a2f] mb-6">Explore o nosso Menu Digital e faça seu pedido agora.</p>
                            <button
                                onClick={() => navigate('/menu')}
                                className="bg-[#d9a65a] text-[#3b2f2f] px-6 py-2 rounded-full font-bold uppercase text-sm tracking-widest hover:bg-[#3b2f2f] hover:text-[#f7f1eb] transition-all"
                            >
                                Ver Menu Digital
                            </button>
                        </div>

                        <div className="p-6 bg-white rounded-2xl shadow-sm border border-[#3b2f2f]/5 hover:shadow-md transition-all">
                            <h3 className="font-serif text-xl font-bold text-[#3b2f2f] mb-3">Quer algo especial?</h3>
                            <p className="text-sm text-[#4b3a2f] mb-6">Não encontrou na lista? Fale connosco.</p>
                            <a
                                href="tel:+258879146662"
                                className="inline-block border-2 border-[#3b2f2f] text-[#3b2f2f] px-6 py-2 rounded-full font-bold uppercase text-sm tracking-widest hover:bg-[#3b2f2f] hover:text-[#f7f1eb] transition-all"
                            >
                                Ligar Agora
                            </a>
                        </div>

                        <div className="p-6 bg-white rounded-2xl shadow-sm border border-[#3b2f2f]/5 hover:shadow-md transition-all">
                            <h3 className="font-serif text-xl font-bold text-[#3b2f2f] mb-3">Grandes Encomendas?</h3>
                            <p className="text-sm text-[#4b3a2f] mb-6">Eventos ou empresas? Envie-nos um email.</p>
                            <a
                                href="mailto:geral@paocaseiro.co.mz"
                                className="inline-block border-2 border-[#3b2f2f] text-[#3b2f2f] px-6 py-2 rounded-full font-bold uppercase text-sm tracking-widest hover:bg-[#3b2f2f] hover:text-[#f7f1eb] transition-all"
                            >
                                Enviar Email
                            </a>
                        </div>
                    </div>
                </div>
            </div>

            {/* Lightbox */}
            <AnimatePresence>
                {selectedIndex !== null && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center p-4 md:p-12 backdrop-blur-md"
                        onClick={() => setSelectedIndex(null)}
                    >
                        {/* Close Button */}
                        <button
                            className="absolute top-6 right-6 text-white hover:text-[#d9a65a] transition-colors p-3 bg-white/10 hover:bg-white/20 rounded-full z-[110]"
                            onClick={() => setSelectedIndex(null)}
                            title={language === 'pt' ? 'Fechar' : 'Close'}
                        >
                            <X size={32} />
                        </button>

                        {/* Navigation Buttons */}
                        <button
                            className="absolute left-4 md:left-10 top-1/2 -translate-y-1/2 text-white hover:text-[#d9a65a] transition-all p-3 bg-white/5 hover:bg-white/15 rounded-full z-[110]"
                            onClick={(e) => { e.stopPropagation(); handlePrev(); }}
                            title={language === 'pt' ? 'Anterior' : 'Previous'}
                        >
                            <ChevronLeft size={48} />
                        </button>

                        <button
                            className="absolute right-4 md:right-10 top-1/2 -translate-y-1/2 text-white hover:text-[#d9a65a] transition-all p-3 bg-white/5 hover:bg-white/15 rounded-full z-[110]"
                            onClick={(e) => { e.stopPropagation(); handleNext(); }}
                            title={language === 'pt' ? 'Próximo' : 'Next'}
                        >
                            <ChevronRight size={48} />
                        </button>

                        <div className="relative max-w-5xl w-full flex flex-col items-center">
                            <motion.img
                                key={filteredItems[selectedIndex].image}
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                src={filteredItems[selectedIndex].image}
                                alt="Zoom"
                                className="max-w-full max-h-[80vh] object-contain rounded-lg shadow-2xl"
                                onClick={(e) => e.stopPropagation()}
                            />

                            {/* Caption Overlay */}
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="mt-6 text-center"
                            >
                                <h2 className="text-white font-serif text-2xl mb-1">
                                    {formatProductName(filteredItems[selectedIndex].name)}
                                </h2>
                                <p className="text-white/60 text-sm">
                                    {selectedIndex + 1} / {filteredItems.length}
                                </p>
                            </motion.div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};
