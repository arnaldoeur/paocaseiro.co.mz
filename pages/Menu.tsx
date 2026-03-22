import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ShoppingBag, Plus, Truck, Store, CreditCard, Info, AlertTriangle, Calendar } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { Language, translations } from '../translations';
import { ProductModal } from '../components/ProductModal';
import { ScheduleOrderModal } from '../components/ScheduleOrderModal';
import { UpsellModal } from '../components/UpsellModal';
import { formatProductName, getEnglishProductName, getEnglishProductDesc } from '../services/stringUtils';


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

export const Menu: React.FC<{ language: 'pt' | 'en' }> = ({ language }) => {
    // State
    // Initialize with all sections open by default
    const [activeSections, setActiveSections] = useState<string[]>([]);
    const [quantities, setQuantities] = useState<{ [key: string]: number }>({});
    const [selectedProduct, setSelectedProduct] = useState<any | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
    const [isUpsellModalOpen, setIsUpsellModalOpen] = useState(false);

    // Custom Products State
    const [menuSections, setMenuSections] = useState(translations[language].menu.sections);

    // Context
    const { addToCart } = useCart();

    // State for loading
    const [loading, setLoading] = useState(true);

    // Import getProducts
    // NOTE: Make sure to import getProducts at the top of the file in the next step or assume user adds it

    // Load Products from Supabase
    const categoryTranslations: Record<string, string> = {
        'Pães': 'Breads',
        'Folhados & Salgados': 'Pastries & Savories',
        'Doces & Pastelaria': 'Sweets & Pastry',
        'Croissants': 'Croissants',
        'Bolos & Sobremesas': 'Cakes & Desserts',
        'Pizzas': 'Pizzas',
        'Pizzaria': 'Pizzas',
        'Lanches': 'Snacks & Bites',
        'Cafés': 'Coffee',
        'Chás': 'Tea',
        'Bebidas Quentes': 'Hot Drinks',
        'Bebidas Frias': 'Cold Drinks',
        'Refrescos': 'Soft Drinks',
        'Sucos': 'Juices'
    };


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
                            isAvailable: product.stock_quantity > 0
                        });
                        return acc;
                    }, {});

                    const newSections = Object.keys(grouped).map(title => ({
                        title: title,
                        items: grouped[title]
                    }));

                    // Sort newSections based on a preferred order
                    const categoryOrder = [
                        'Pão',
                        'Pães',
                        'Doces & Pastelaria',
                        'Folhados & Salgados',
                        'Bolos & Sobremesas',
                        'Pizzas',
                        'Lanches',
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
                        'Pão',
                        'Pães',
                        'Doces & Pastelaria',
                        'Folhados & Salgados',
                        'Bolos & Sobremesas',
                        'Pizzas',
                        'Lanches',
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

    // Filter logic
    const filteredSections = menuSections.map(section => ({
        ...section,
        items: section.items.filter((item: any) =>
            item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            item.desc.toLowerCase().includes(searchQuery.toLowerCase())
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
        <div className="min-h-screen bg-[#f7f1eb] pb-20 pt-20 relative">
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

                    {/* Search Bar & Schedule Quick Link */}
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

                        <button
                            onClick={() => setIsScheduleModalOpen(true)}
                            className="text-[#d9a65a] text-sm font-bold flex items-center justify-center gap-2 mx-auto hover:underline bg-white/5 py-2 px-4 rounded-full border border-[#d9a65a]/20"
                        >
                            <Calendar size={16} />
                            {language === 'pt' ? 'Prefere agendar para outro dia? Clique aqui' : 'Prefer to schedule for another day? Click here'}
                        </button>
                    </div>
                </div>
            </header>

            {/* How It Works Section */}
            <div className="max-w-7xl mx-auto px-6 mt-8 mb-12 relative z-20">
                {/* Shop Status Banner */}
                {(() => {
                    const now = new Date();
                    const currentHour = now.getHours();
                    const currentMinute = now.getMinutes();
                    const currentTime = currentHour * 60 + currentMinute;

                    const openTime = 6 * 60; // 06:00
                    const closeTime = 22 * 60; // 22:00

                    const isOpen = (currentTime >= openTime && currentTime < closeTime) || localStorage.getItem('pc_bypass_hours') === 'true' || true; // [BYPASS] Force open for testing

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
                        <div key={index} className="bg-white rounded-2xl shadow-xl overflow-hidden border border-[#d9a65a]/10">
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
                                <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {section.items.map((item: any, idx: number) => (
                                        <div
                                            key={idx}
                                            onClick={() => handleProductClick(item)}
                                            className="group flex gap-4 p-4 rounded-xl border border-gray-100 hover:border-[#d9a65a]/30 shadow-sm hover:shadow-xl transition-all cursor-pointer bg-white items-stretch h-40"
                                        >
                                            <div
                                                className="w-32 h-32 shrink-0 rounded-xl overflow-hidden relative self-center flex items-center justify-center p-2"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleProductClick(item);
                                                }}
                                            >
                                                <img
                                                    src={item.image}
                                                    alt={(language === 'en') ? formatProductName(item.name_en || getEnglishProductName(item.name)) : formatProductName(item.name)}
                                                    className="w-full h-full object-contain object-center group-hover:scale-105 transition-transform duration-500"
                                                />
                                            </div>
                                            <div className="flex-1 flex flex-col justify-between py-1 min-h-0">
                                                <div>
                                                    <h3 className="font-bold text-[#3b2f2f] text-base leading-tight mb-1 group-hover:text-[#d9a65a] transition-colors line-clamp-1">
                                                        {(language === 'en') ? formatProductName(item.name_en || getEnglishProductName(item.name)) : formatProductName(item.name)}
                                                    </h3>
                                                    <p className="text-xs text-gray-500 line-clamp-2 leading-tight mb-2">
                                                        {language === 'en'
                                                            ? (item.description_en || getEnglishProductDesc(item.name) || item.desc)
                                                            : item.desc}
                                                    </p>
                                                    {(item.prepTime || item.deliveryTime) && (
                                                        <div className="flex gap-2 text-[10px] font-bold text-gray-400">
                                                            {item.prepTime && <span className="bg-orange-50 text-orange-600 px-1.5 py-0.5 rounded flex items-center gap-1">⏱ {item.prepTime}</span>}
                                                        </div>
                                                    )}
                                                </div>
                                                {item.isAvailable ? (
                                                    <div className="flex items-center justify-center gap-2 mt-2 mb-1 w-full">
                                                        <div className="h-px bg-green-200/50 flex-1"></div>
                                                        <span className="text-[10px] font-bold text-green-600 uppercase tracking-wider">{item.stock} disponíveis</span>
                                                        <div className="h-px bg-green-200/50 flex-1"></div>
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center justify-center gap-2 mt-2 mb-1 w-full">
                                                        <div className="h-px bg-red-200/50 flex-1"></div>
                                                        <span className="text-[10px] font-bold text-red-500 uppercase tracking-wider">Esgotado</span>
                                                        <div className="h-px bg-red-200/50 flex-1"></div>
                                                    </div>
                                                )}

                                                <div className="flex items-center justify-between gap-2 mt-1">
                                                    <span className="font-bold text-lg text-[#d9a65a]">
                                                        {item.price === 0 && item.variations && item.variations.length > 0
                                                            ? `A partir de ${Math.min(...item.variations.map((v: any) => v.price))} MT`
                                                            : `${item.price} MT`}
                                                        {item.unit && item.unit !== 'un' && <span className="text-sm font-normal text-gray-400 ml-1">/ {item.unit}</span>}
                                                    </span>
                                                    {item.isAvailable && (
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                addToOrder(item);
                                                            }}
                                                            title={language === 'pt' ? 'Adicionar ao pedido' : 'Add to order'}
                                                            className="bg-[#d9a65a] text-white w-8 h-8 rounded-full flex items-center justify-center hover:bg-[#3b2f2f] transition-all shadow-lg"
                                                        >
                                                            <Plus size={18} />
                                                        </button>
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
