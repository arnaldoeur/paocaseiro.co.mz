import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ShoppingBag, Plus, Truck, Store, CreditCard, Info, AlertTriangle, Calendar, Clock } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { Language, translations } from '../translations';
import { ProductModal } from '../components/ProductModal';
import { ScheduleOrderModal } from '../components/ScheduleOrderModal';
import { UpsellModal } from '../components/UpsellModal';
import { formatProductName, getEnglishProductName, getEnglishProductDesc } from '../services/stringUtils';
import { ComingSoonOverlay } from '../components/ComingSoonOverlay';

// Launch Date in CAT (Mozambique Time): Monday, March 30th, 2026 at 00:00
const LAUNCH_DATE = new Date('2026-03-31T00:00:00+02:00');


interface MenuProps {
    language: Language;
}

// Placeholder Image Component
const PlaceholderImage = () => (
    <div className="w-full h-full bg-[#f0e6dc] flex flex-col items-center justify-center text-[#d9a65a]/50">
        <ShoppingBag className="w-12 h-12 mb-2" />
        <span className="text-xs font-bold tracking-widest uppercase">Pão Caseiro</span>
    </div>
);

// Helper to normalize strings for URLs/IDs
const generateSlug = (text: string) => {
    return text.toLowerCase()
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // remove accents
        .replace(/[^a-z0-9]+/g, '-') // replace non-alphanumerics with dash
        .replace(/^-+|-+$/g, ''); // trim dashes
};

export const Menu: React.FC<{ language: 'pt' | 'en' }> = ({ language }) => {
    const location = useLocation();
    
    // State
    const [menuSections, setMenuSections] = useState(translations[language].menu.sections);
    const [activeSections, setActiveSections] = useState<string[]>([]);
    
    // category translations mapping
    const categoryTranslations: Record<string, string> = {
        'Pães': 'Breads',
        'Folhados e Doces': 'Pastries & Sweets',
        'Brioches': 'Brioches',
        'Salgados': 'Savories',
        'Fatias e Bolos': 'Slices & Cakes',
        'Pizzas Grandes': 'Large Pizzas',
        'Pizzas Médias': 'Medium Pizzas',
        'Waffle': 'Waffles',
        'Bolos Inteiros/Encomenda': 'Whole Cakes / Pre-order',
        'Cafés': 'Coffee',
        'Chás': 'Tea',
        'Bebidas Quentes': 'Hot Drinks',
        'Bebidas Frias': 'Cold Drinks',
        'Refrescos': 'Soft Drinks',
        'Sucos': 'Juices'
    };
    const [quantities, setQuantities] = useState<{ [key: string]: number }>({});
    const [selectedProduct, setSelectedProduct] = useState<any | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
    const [isUpsellModalOpen, setIsUpsellModalOpen] = useState(false);
    
    // Launch States
    const [currentTime, setCurrentTime] = useState(new Date());
    const [hasDismissedOverlay, setHasDismissedOverlay] = useState(false);
    const [isSticky, setIsSticky] = useState(false);
    const [currentCategory, setCurrentCategory] = useState('');

    // Auto-update time
    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    // Scroll handling for sticky nav and category tracking
    useEffect(() => {
        const handleScroll = () => {
            const header = document.querySelector('header');
            if (header) {
                const headerBottom = header.getBoundingClientRect().bottom;
                // Navbar is h-20 (80px), so when header reaches it, make bar sticky
                setIsSticky(headerBottom <= 80);
            }

            // Scroll spy for active category
            const sections = menuSections.map(s => document.getElementById(generateSlug(s.title)));
            const scrollPosition = window.scrollY + 160; // Offset for Navbar (80) + StickyNav (64) + buffer

            for (let i = sections.length - 1; i >= 0; i--) {
                const section = sections[i];
                if (section && section.offsetTop <= scrollPosition) {
                    setCurrentCategory(menuSections[i].title);
                    break;
                }
            }
        };

        window.addEventListener('scroll', handleScroll);
        // Initial call
        handleScroll();
        return () => window.removeEventListener('scroll', handleScroll);
    }, [menuSections]);

    const scrollToSection = (title: string) => {
        const id = generateSlug(title);
        const element = document.getElementById(id);
        if (element) {
            // Offset for Navbar (80) + StickyNav (64) = 144
            const y = element.getBoundingClientRect().top + window.scrollY - 144;
            window.scrollTo({ top: y, behavior: 'smooth' });
            
            // Ensure section is expanded
            if (!activeSections.includes(title)) {
                setActiveSections(prev => [...prev, title]);
            }
        }
    };

    const isAfterLaunch = currentTime >= LAUNCH_DATE;
    const showOverlay = !isAfterLaunch && !hasDismissedOverlay;

    // Context
    const { addToCart } = useCart();

    // State for loading
    const [loading, setLoading] = useState(true);

    // Import getProducts
    // NOTE: Make sure to import getProducts at the top of the file in the next step or assume user adds it



    useEffect(() => {
        const fetchMenu = async () => {
            setLoading(true);
            try {
                // Fetch dynamically from db so Admin updates reflect immediately on client side
                const { supabase } = await import('../services/supabase');
                const { data, error } = await supabase.from('products').select('*');
                const success = !error;

                if (success && data && data.length > 0) {
                    console.log("Menu loaded from DB: ", data.length, " items.");

                    const grouped = data.reduce((acc: any, product: any) => {
                        // Use raw category or default to 'Outros'. Normalize Pizzaria to Pizzas.
                        let cat = product.category || 'Outros';
                        if (cat.trim().toLowerCase() === 'pizzaria') cat = 'Pizzas';
                        
                        if (!acc[cat]) acc[cat] = [];

                        acc[cat].push({
                            name: product.name,
                            price: product.price,
                            // Use image exactly as generated locally, or use full URL if provided
                            image: product.image 
                                ? (product.image.startsWith('http') || product.image.startsWith('/')) 
                                    ? product.image 
                                    : `/images/${product.image}`
                                : '',
                            desc: product.description,
                            description_en: product.description_en,
                            name_en: product.name_en,
                            prepTime: product.prep_time,
                            deliveryTime: product.delivery_time,
                            variations: product.variations || [],
                            complements: product.complements || [],
                            unit: product.unit || 'un',
                            stock: product.stock_quantity || 0,
                            isAvailable: product.is_available === false ? false : product.stock_quantity > 0
                        });
                        return acc;
                    }, {});

                    const newSections = Object.keys(grouped).map(title => ({
                        title: title,
                        items: grouped[title]
                    }));

                    // Sort newSections based on a preferred order
                    const categoryOrder = [
                        'Pães',
                        'Folhados e Doces',
                        'Folhados & Salgados',
                        'Brioches',
                        'Salgados',
                        'Fatias e Bolos',
                        'Bolos & Sobremesas',
                        'Bolos Inteiros/Encomenda',
                        'Pizzas',
                        'Pizzas Grandes',
                        'Pizzas Médias',
                        'Lanches',
                        'Waffle',
                        'Cafés',
                        'Chás',
                        'Bebidas',
                        'Extras'
                    ];

                    newSections.sort((a, b) => {
                        const indexA = categoryOrder.indexOf(a.title);
                        const indexB = categoryOrder.indexOf(b.title);
                        // If both are not in array, map to end
                        const posA = indexA === -1 ? 999 : indexA;
                        const posB = indexB === -1 ? 999 : indexB;
                        
                        if (posA === 999 && posB === 999) {
                            return a.title.localeCompare(b.title);
                        }
                        return posA - posB;
                    });

                    setMenuSections(newSections);
                    // Open first section by default
                    if (newSections.length > 0) {
                        try {
                            setActiveSections(newSections.map(s => s.title));
                        } catch (e) { }
                    }
                } else {
                    console.warn("Products DB empty or failed. Using local translation fallback.");
                    // Fallback to translations with stock fix
                    let fallback = getFallbackData();

                    // Apply same category order as live DB path
                    const categoryOrder = [
                        'Pães',
                        'Folhados e Doces',
                        'Brioches',
                        'Salgados',
                        'Fatias e Bolos',
                        'Pizzas Grandes',
                        'Pizzas Médias',
                        'Waffle',
                        'Bolos Inteiros/Encomenda',
                        'Cafés',
                        'Chás',
                        'Bebidas',
                        'Extras'
                    ];
                    fallback = [...fallback].sort((a, b) => {
                        const posA = categoryOrder.indexOf(a.title);
                        const posB = categoryOrder.indexOf(b.title);
                        return (posA === -1 ? 999 : posA) - (posB === -1 ? 999 : posB);
                    });

                    setMenuSections(fallback);
                    setActiveSections(fallback.map(s => s.title));
                }
            } catch (err) {
                console.error("Critical error loading menu:", err);
                // Last resort fallback
                setMenuSections(getFallbackData());
            } finally {
                setLoading(false);
            }
        };

        fetchMenu();

        // Real-time Products Listener
        let channel: any;
        (async () => {
            const { supabase } = await import('../services/supabase');
            channel = supabase
                .channel('menu-products-changes')
                .on(
                    'postgres_changes',
                    { event: '*', schema: 'public', table: 'products' },
                    () => {
                        console.log('Menu products changed, reloading...');
                        fetchMenu();
                    }
                )
                .subscribe();
        })();

        return () => {
            if (channel) {
                import('../services/supabase').then(({ supabase }) => {
                    supabase.removeChannel(channel);
                });
            }
        };
    }, [language]);

    // Helper to process fallback data
    const getFallbackData = () => {
        return translations[language].menu.sections.map(section => ({
            ...section,
            items: section.items.map((item: any) => ({
                ...item,
                isAvailable: true, // Force available for fallback
                stock: 100 // Dummy stock
            }))
        }));
    };


    const toggleSection = (title: string) => {
        setActiveSections(prev =>
            prev.includes(title)
                ? prev.filter(t => t !== title)
                : [...prev, title]
        );
    };

    // Scroll to section based on URL hash
    useEffect(() => {
        if (!loading && location.hash && menuSections.length > 0) {
            const hashId = location.hash.replace('#', '');
            
            // Allow partial matches to prevent broken links if naming slightly differs
            const matchingSection = menuSections.find(s => 
                generateSlug(s.title) === hashId ||
                generateSlug(s.title).includes(hashId) ||
                hashId.includes(generateSlug(s.title))
            );
            
            if (matchingSection) {
                // Ensure the category is expanded
                if (!activeSections.includes(matchingSection.title)) {
                    setActiveSections(prev => [...prev, matchingSection.title]);
                }
                
                // Polling for the DOM element to ensure React has painted it
                const actualId = generateSlug(matchingSection.title);
                let attempts = 0;
                const scrollInterval = setInterval(() => {
                    attempts++;
                    const element = document.getElementById(actualId);
                    if (element) {
                        clearInterval(scrollInterval);
                        // Custom scroll to handle fixed navbar offset (around 100px)
                        const y = element.getBoundingClientRect().top + window.scrollY - 144;
                        window.scrollTo({ top: y, behavior: 'smooth' });
                    } else if (attempts >= 10) {
                        clearInterval(scrollInterval);
                        console.error('Elemento não encontrado para scroll:', actualId);
                    }
                }, 100);
            }
        }
    }, [location.hash, loading, menuSections]);

    // Filter logic
    const filteredSections = menuSections.map(section => ({
        ...section,
        items: section.items.filter((item: any) =>
            (item.name?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
            (item.desc?.toLowerCase() || '').includes(searchQuery.toLowerCase())
        )
    })).filter(section => section.items.length > 0);

    const getQuantity = (itemName: string) => {
        return quantities[itemName] || 1;
    };

    const handleProductClick = (item: any) => {
        setSelectedProduct(item);
    };

    const handleCloseModal = () => {
        setSelectedProduct(null);
    };

    const handleAddToCartFromModal = (item: any, quantity: number, variation?: any) => {
        const finalItemName = variation ? `${language === 'en' && item.name_en ? item.name_en : item.name} (${variation.name})` : item.name;
        const finalPrice = variation ? variation.price : item.price;

        addToCart({
            name: finalItemName,
            price: finalPrice,
            image: item.image,
            quantity: quantity,
            name_en: item.name_en
        });

        handleCloseModal();
        setIsUpsellModalOpen(true);
    };

    // Fix for "Plus" button logic
    const addToOrder = (item: any) => {
        // If has variations or complements, must open modal to choose
        if ((item.variations && item.variations.length > 0) || (item.complements && item.complements.length > 0)) {
            handleProductClick(item);
        } else {
            // Add single item directly
            addToCart({
                name: item.name,
                price: item.price,
                image: item.image,
                quantity: 1,
                name_en: item.name_en
            });
            setIsUpsellModalOpen(true);
        }
    };

    const t = translations[language];

    // Custom SVG Pattern (Chef Hat & Heart) - Gold color, low opacity
    const foodPattern = `data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cpath d='M30 20c-2.2-2.2-5.8-2.2-8 0s-2.2 5.8 0 8l8 8 8-8c2.2-2.2 2.2-5.8 0-8s-5.8-2.2-8 0z' stroke='%23d9a65a' stroke-opacity='0.4' stroke-width='1.5'/%3E%3Cpath d='M10 45c0-4.4 3.6-8 8-8s8 3.6 8 8v4H10v-4z M14 37v-3 M22 37v-3' stroke='%23d9a65a' stroke-opacity='0.4' stroke-width='1.5'/%3E%3Ccircle cx='50' cy='10' r='5' stroke='%23d9a65a' stroke-opacity='0.4' stroke-width='1.5'/%3E%3C/g%3E%3C/svg%3E`;

    return (
        <div className={`min-h-screen bg-[#f7f1eb] pb-20 pt-20 relative ${showOverlay ? 'overflow-hidden max-h-screen' : ''}`}>
            <AnimatePresence>
                {showOverlay && (
                    <ComingSoonOverlay 
                        key="prelaunch" 
                        onClose={() => setHasDismissedOverlay(true)} 
                    />
                )}
            </AnimatePresence>

            <div className="absolute inset-0 z-0 opacity-10 food-pattern"></div>

            {/* Header */}
            <header className="bg-[#3b2f2f] text-white py-12 px-6 text-center relative overflow-hidden z-10">
                <div className="absolute inset-0 opacity-10 pointer-events-none food-pattern"></div>
                <div className="relative z-10">
                    <h1 className="text-4xl md:text-5xl font-serif font-bold mb-4 text-[#d9a65a]">
                        {t.menu.title}
                    </h1>
                    <p className="text-[#f7f1eb]/80 max-w-2xl mx-auto text-lg leading-relaxed mb-8">
                        {t.menu.subtitle}
                    </p>

                    <div className="max-w-xl mx-auto space-y-4">
                        <div className="relative">
                            <input
                                type="text"
                                placeholder={language === 'pt' ? "Procurar pão, bolos..." : "Search bread, cakes..."}
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full py-3 px-6 rounded-full text-[#3b2f2f] font-sans focus:outline-none focus:ring-2 focus:ring-[#d9a65a] shadow-lg bg-[#f7f1eb]"
                            />
                            <div className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400">
                                <ShoppingBag className="w-5 h-5 opacity-50" />
                            </div>
                        </div>

                        {!isAfterLaunch ? (
                             <div className="bg-[#d9a65a]/20 backdrop-blur-sm border border-[#d9a65a]/30 text-[#d9a65a] py-3 px-6 rounded-2xl flex items-center justify-center gap-3 animate-pulse">
                                <Info size={20} />
                                <span className="font-bold text-sm">
                                    {language === 'pt' 
                                        ? 'MODO DE ANTEVISÃO: Navegue livremente, mas as encomendas abrem apenas na Segunda-feira às 00:00.' 
                                        : 'PREVIEW MODE: Browse the menu freely. Ordering opens Monday at 00:00.'}
                                </span>
                            </div>
                        ) : (
                            <button
                                onClick={() => setIsScheduleModalOpen(true)}
                                className="text-[#d9a65a] text-sm font-bold flex items-center justify-center gap-2 mx-auto hover:underline bg-white/5 py-2 px-4 rounded-full border border-[#d9a65a]/20"
                            >
                                <Calendar size={16} />
                                {language === 'pt' ? 'Prefere agendar para outro dia? Clique aqui' : 'Prefer to schedule for another day? Click here'}
                            </button>
                        )}
                    </div>
                </div>
            </header>

            {/* Sticky Category Nav */}
            <div 
                className={`sticky top-20 z-[45] bg-[#f7f1eb]/95 backdrop-blur-md shadow-md border-b border-[#d9a65a]/20 transition-all duration-300 ${
                    isSticky ? 'opacity-100 translate-y-0 h-16' : 'opacity-0 -translate-y-full h-0 pointer-events-none'
                }`}
            >
                <div className="max-w-7xl mx-auto px-4 h-full flex items-center gap-3 overflow-x-auto no-scrollbar scroll-smooth">
                    {menuSections.map((section) => (
                        <button
                            key={section.title}
                            onClick={() => scrollToSection(section.title)}
                            className={`flex-shrink-0 px-4 py-2 rounded-full text-xs font-bold transition-all whitespace-nowrap shadow-sm ${
                                currentCategory === section.title 
                                ? 'bg-[#3b2f2f] text-[#d9a65a] scale-105' 
                                : 'bg-white text-[#3b2f2f] hover:bg-[#d9a65a]/10 border border-[#d9a65a]/10'
                            }`}
                        >
                            {language === 'pt' ? section.title : (categoryTranslations[section.title] || section.title)}
                        </button>
                    ))}
                </div>
            </div>

            {/* How It Works Section */}
            <div className="max-w-7xl mx-auto px-6 mt-8 mb-12 relative z-20">
                {/* Shop Status Banner */}
                {(() => {
                    const now = new Date();
                    const currentHour = now.getHours();
                    const currentMinute = now.getMinutes();
                    const currentTimeVal = currentHour * 60 + currentMinute;

                    const openTime = 6 * 60; // 06:00
                    const closeTime = 22 * 60; // 22:00

                    const isOpen = (currentTimeVal >= openTime && currentTimeVal < closeTime);

                    if (!isAfterLaunch) {
                        return (
                            <div className="bg-[#3b2f2f] border-l-4 border-[#d9a65a] p-6 mb-8 rounded-r shadow-md flex flex-col items-center text-center">
                                <Calendar className="w-8 h-8 text-[#d9a65a] mb-2" />
                                <div>
                                    <h3 className="font-bold text-[#d9a65a] text-xl mb-2">
                                        {language === 'pt' ? 'Preparando o nosso lançamento' : 'Preparing for our debut'}
                                    </h3>
                                    <p className="text-[#f7f1eb]/80 text-base md:text-lg max-w-2xl">
                                        {language === 'pt'
                                            ? 'Estamos quase prontos para lhe servir! Sinta-se à vontade para explorar as nossas delícias antecipadamente.'
                                            : 'We are almost ready to serve you! Feel free to explore our delights in advance.'}
                                    </p>
                                </div>
                            </div>
                        );
                    }

                    if (!isOpen) {
                        return (
                            <div className="bg-red-50 border-l-4 border-red-500 p-6 mb-8 rounded-r shadow-md flex flex-col items-center text-center animate-pulse">
                                <AlertTriangle className="w-8 h-8 text-red-500 mb-2" />
                                <div>
                                    <h3 className="font-bold text-red-700 text-lg mb-1">
                                        {language === 'pt' ? 'Estamos Fechados' : 'We are Closed'}
                                    </h3>
                                    <p className="text-red-600/90 text-sm md:text-base">
                                        {language === 'pt'
                                            ? 'O nosso horário de funcionamento é das 06:00 às 22:00. Pode navegar pelo menu, mas as encomendas só serão processadas durante o horário de expediente.'
                                            : 'Our opening hours are from 06:00 to 22:00. You can browse the menu, but orders will only be processed during business hours.'}
                                    </p>
                                    <button
                                        onClick={() => setIsScheduleModalOpen(true)}
                                        className="mt-4 px-6 py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded-full transition-colors flex items-center gap-2 mx-auto"
                                    >
                                        <Calendar size={18} />
                                        {language === 'pt' ? 'Agendar Encomenda' : 'Schedule Order'}
                                    </button>
                                </div>
                            </div>
                        );
                    }
                    return (
                        <div className="bg-green-50 border-l-4 border-green-500 p-6 mb-8 rounded-r shadow-md flex flex-col items-center text-center">
                            <Store className="w-8 h-8 text-green-600 mb-2" />
                            <div>
                                <h3 className="font-bold text-green-700 text-xl mb-2">
                                    {language === 'pt' ? 'Estamos Abertos!' : 'We are Open!'}
                                </h3>
                                <p className="text-green-600/90 text-base md:text-lg max-w-2xl">
                                    {language === 'pt'
                                        ? 'Faça a sua encomenda agora e desfrute das nossas delícias.'
                                        : 'Place your order now and enjoy our delights.'}
                                </p>
                            </div>
                        </div>
                    );
                })()}

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Delivery */}
                    <div className="bg-white/80 backdrop-blur-sm p-6 rounded-2xl shadow-lg border border-[#d9a65a]/20 hover:transform hover:-translate-y-1 transition-all duration-300">
                        <div className="w-12 h-12 bg-[#3b2f2f] rounded-full flex items-center justify-center text-[#d9a65a] mb-4 shadow-md">
                            <Truck className="w-6 h-6" />
                        </div>
                        <h3 className="text-xl font-bold text-[#3b2f2f] mb-2 font-serif">{language === 'pt' ? 'Entrega ao Domicílio' : 'Home Delivery'}</h3>
                        <p className="text-[#4b3a2f] text-sm leading-relaxed">
                            {language === 'pt'
                                ? 'Do nosso forno para a sua porta! Entregamos num raio de 30km. Faça o pedido online e relaxe.'
                                : 'From our oven to your door! We deliver within a 30km radius. Order online and relax.'}
                        </p>
                    </div>

                    {/* Takeaway / Eat-In */}
                    <div className="bg-white/80 backdrop-blur-sm p-6 rounded-2xl shadow-lg border border-[#d9a65a]/20 hover:transform hover:-translate-y-1 transition-all duration-300">
                        <div className="w-12 h-12 bg-[#d9a65a] rounded-full flex items-center justify-center text-[#3b2f2f] mb-4 shadow-md">
                            <Store className="w-6 h-6" />
                        </div>
                        <h3 className="text-xl font-bold text-[#3b2f2f] mb-2 font-serif">{language === 'pt' ? 'Comer no Local ou Levar' : 'Dine in or Takeaway'}</h3>
                        <p className="text-[#4b3a2f] text-sm leading-relaxed">
                            {language === 'pt'
                                ? 'Pode encomendar aqui e vir buscar, ou visitar-nos para um café e pastel de nata quentinho.'
                                : 'You can order here and pick up, or visit us for a coffee and a warm pastel de nata.'}
                        </p>
                    </div>

                    {/* Payments */}
                    <div className="bg-white/80 backdrop-blur-sm p-6 rounded-2xl shadow-lg border border-[#d9a65a]/20 hover:transform hover:-translate-y-1 transition-all duration-300">
                        <div className="w-12 h-12 bg-[#3b2f2f] rounded-full flex items-center justify-center text-[#d9a65a] mb-4 shadow-md">
                            <CreditCard className="w-6 h-6" />
                        </div>
                        <h3 className="text-xl font-bold text-[#3b2f2f] mb-2 font-serif">{language === 'pt' ? 'Pagamento Online Simples' : 'Simple Online Payment'}</h3>
                        <p className="text-[#4b3a2f] text-sm leading-relaxed">
                            {language === 'pt'
                                ? 'Aceitamos somente M-Pesa, e-Mola e M-Kesh. Pagamento seguro e rápido para sua comodidade.'
                                : 'We only accept M-Pesa, e-Mola, and M-Kesh. Secure and fast payment for your convenience.'}
                        </p>
                    </div>
                </div >
            </div >

            {/* Stock Disclaimer Banner */}
            < div className="max-w-7xl mx-auto px-6 mt-8 mb-4" >
                <div className="bg-[#fdf8f3] border-l-4 border-[#d9a65a] p-4 rounded-r shadow-sm flex items-center justify-center gap-3 animate-pulse mx-auto w-fit max-w-2xl">
                    <Info className="w-5 h-5 text-[#d9a65a] shrink-0" />
                    <p className="text-[#b4863e]/90 text-sm md:text-base font-medium">
                        {language === 'pt' ? (
                            <><span className="font-bold">Nota:</span> O stock indicado é exclusivo para o site. Mesmo se esgotado online, <span className="underline decoration-dotted cursor-help" title="Visite-nos na padaria!">visite-nos na padaria</span> pois ainda podemos ter!</>
                        ) : (
                            <><span className="font-bold">Note:</span> The indicated stock is exclusive to the website. Even if sold out online, <span className="underline decoration-dotted cursor-help" title="Visit us at the bakery!">visit us at the bakery</span> because we might still have it!</>
                        )}
                    </p>
                </div>
            </div >

            {/* Menu List */}
            < div className="max-w-7xl mx-auto px-6 -mt-0 relative z-20 space-y-6" >

                {loading && (
                    <div className="text-center py-20">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#d9a65a] mx-auto mb-4"></div>
                        <p className="text-[#d9a65a] font-serif text-xl">{language === 'pt' ? 'A carregar produtos fresquinhos...' : 'Loading fresh products...'}</p>
                    </div>
                )}

                {
                    !loading && filteredSections.map((section, index) => (
                        <div key={index} id={generateSlug(section.title)} className="bg-white rounded-2xl shadow-xl overflow-hidden border border-[#d9a65a]/10">
                            <button
                                onClick={() => toggleSection(section.title)}
                                className="w-full flex items-center justify-between p-6 bg-[#3b2f2f] hover:bg-[#4b3a2f] transition-colors relative overflow-hidden group"
                            >
                                <div className="absolute inset-0 opacity-10 food-pattern"></div>
                                <div className="flex items-center gap-4 relative z-10">
                                    <div className="p-3 bg-[#f7f1eb]/10 rounded-full text-[#d9a65a] backdrop-blur-sm">
                                        <ShoppingBag className="w-6 h-6" />
                                    </div>
                                    <h2 className="text-2xl font-serif font-bold text-[#f7f1eb] text-left">
                                        {language === 'pt' ? section.title : (categoryTranslations[section.title] || section.title)}
                                    </h2>
                                </div>
                                <div className={`transform transition-transform duration-300 relative z-10 ${activeSections.includes(section.title) ? 'rotate-180' : ''}`}>
                                    <ChevronDown className="w-6 h-6 text-[#d9a65a]" />
                                </div>
                            </button>

                            <div className={`transition-all duration-500 ease-in-out ${activeSections.includes(section.title) ? 'max-h-[8000px] opacity-100' : 'max-h-0 opacity-0'}`}>
                                <div className="p-4 md:p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {section.items.map((item: any, idx: number) => (
                                        <div
                                            key={idx}
                                            onClick={() => handleProductClick(item)}
                                            className="group relative flex flex-col sm:flex-row gap-4 p-4 rounded-3xl border border-gray-100 hover:border-[#d9a65a]/30 shadow-sm hover:shadow-2xl transition-all cursor-pointer bg-white overflow-hidden"
                                        >
                                            <div
                                                className="w-full sm:w-40 h-48 sm:h-32 shrink-0 rounded-2xl overflow-hidden relative flex items-center justify-center bg-gray-50/50 p-2"
                                            >
                                                <img
                                                    src={item.image}
                                                    alt={(language === 'en') ? formatProductName(item.name_en || getEnglishProductName(item.name)) : formatProductName(item.name)}
                                                    className={`w-full h-full object-contain object-center group-hover:scale-110 transition-transform duration-700 ${!item.isAvailable ? 'grayscale opacity-50' : ''}`}
                                                />
                                                
                                                {!item.isAvailable && (
                                                    <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] flex items-center justify-center">
                                                        <span className="text-[10px] font-black text-white uppercase tracking-widest border border-white/30 px-2 py-1 rounded-lg">
                                                            {language === 'pt' ? 'Indisponível' : 'Unavailable'}
                                                        </span>
                                                    </div>
                                                )}
                                                
                                                {item.isAvailable && item.stock <= 5 && (
                                                    <div className="absolute top-2 left-2 bg-red-500 text-white text-[8px] font-black uppercase px-2 py-1 rounded-md shadow-lg animate-pulse">
                                                        {language === 'pt' ? 'Últimas unidades' : 'Low Stock'}
                                                    </div>
                                                )}
                                            </div>

                                            <div className="flex-1 flex flex-col justify-between py-1 min-w-0">
                                                <div className="space-y-2">
                                                    <div className="flex justify-between items-start gap-2">
                                                        <h3 className="font-bold text-[#3b2f2f] text-lg sm:text-base leading-tight group-hover:text-[#d9a65a] transition-colors truncate">
                                                            {(language === 'en') ? formatProductName(item.name_en || getEnglishProductName(item.name)) : formatProductName(item.name)}
                                                        </h3>
                                                        <span className="font-black text-lg text-[#d9a65a] shrink-0">
                                                            {item.price === 0 && item.variations && item.variations.length > 0
                                                                ? `+${Math.min(...item.variations.map((v: any) => v.price))} MT`
                                                                : `${item.price} MT`}
                                                        </span>
                                                    </div>

                                                    <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed">
                                                        {language === 'en'
                                                            ? (item.description_en || getEnglishProductDesc(item.name) || item.desc)
                                                            : item.desc}
                                                    </p>

                                                    <div className="flex flex-wrap gap-2">
                                                        {item.prepTime && (
                                                            <div className="flex items-center gap-1.5 px-2 py-1 bg-[#f7f1eb] rounded-lg text-[9px] font-black text-[#d9a65a] uppercase tracking-tighter">
                                                                <Clock className="w-3 h-3" /> {item.prepTime}
                                                            </div>
                                                        )}
                                                        {item.isAvailable && (
                                                            <div className="flex items-center gap-1.5 px-2 py-1 bg-green-50 rounded-lg text-[9px] font-black text-green-600 uppercase tracking-tighter">
                                                                <ShoppingBag className="w-3 h-3" /> {item.stock} {language === 'pt' ? 'Disponíveis' : 'In Stock'}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>

                                                <div className="flex items-center justify-end mt-4 sm:mt-0 pt-2 border-t border-gray-50 sm:border-none">
                                                    {item.isAvailable ? (
                                                        isAfterLaunch ? (
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    addToOrder(item);
                                                                }}
                                                                className="flex items-center gap-2 bg-[#3b2f2f] text-[#d9a65a] px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-[#d9a65a] hover:text-[#3b2f2f] transition-all shadow-lg active:scale-95 group-hover:shadow-[#d9a65a]/20"
                                                            >
                                                                <Plus className="w-4 h-4" /> {language === 'pt' ? 'Adicionar' : 'Add'}
                                                            </button>
                                                        ) : (
                                                            <div className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-400 rounded-xl text-[10px] font-black uppercase tracking-widest border border-gray-200 cursor-help" title={language === 'pt' ? 'Encomendas abrem em breve' : 'Ordering opens soon'}>
                                                                <Clock className="w-3 h-3" /> {language === 'pt' ? 'Em breve' : 'Soon'}
                                                            </div>
                                                        )
                                                    ) : (
                                                        <div className="text-[10px] font-black text-red-400 uppercase tracking-[0.2em] py-2">
                                                            {language === 'pt' ? 'Esgotado' : 'Sold Out'}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    ))
                }
            </div >

            {/* Product Modal */}
            <AnimatePresence>
                {
                    selectedProduct && (
                        <ProductModal
                            isOpen={!!selectedProduct}
                            product={selectedProduct}
                            onClose={handleCloseModal}
                            onAddToCart={handleAddToCartFromModal}
                            language={language}
                            isAfterLaunch={isAfterLaunch}
                        />
                    )
                }
            </AnimatePresence >

            <ScheduleOrderModal
                isOpen={isScheduleModalOpen}
                onClose={() => setIsScheduleModalOpen(false)}
                language={language}
                menuSections={menuSections}
            />

            <UpsellModal 
                isOpen={isUpsellModalOpen}
                onClose={() => setIsUpsellModalOpen(false)}
                language={language}
                menuSections={menuSections}
            />
        </div >
    );
};
