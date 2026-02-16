import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ShoppingBag, Plus, Truck, Store, CreditCard, Info, AlertTriangle, Calendar } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { Language, translations } from '../translations';
import { ProductModal } from '../components/ProductModal';
import { ScheduleOrderModal } from '../components/ScheduleOrderModal';

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

    // Custom Products State
    const [menuSections, setMenuSections] = useState(translations[language].menu.sections);

    // Context
    const { addToCart } = useCart();

    // State for loading
    const [loading, setLoading] = useState(true);

    // Import getProducts
    // NOTE: Make sure to import getProducts at the top of the file in the next step or assume user adds it

    // Load Products from Supabase
    useEffect(() => {
        const fetchMenu = async () => {
            setLoading(true);
            try {
                const { success, data, error } = await import('../services/supabase').then(m => m.getProducts());

                if (success && data && data.length > 0) {
                    console.log("Menu loaded from DB: ", data.length, " items.");

                    const grouped = data.reduce((acc: any, product: any) => {
                        // Use raw category or default to 'Outros'
                        // Matches 'sections' if possible.
                        const cat = product.category || 'Outros';
                        if (!acc[cat]) acc[cat] = [];

                        acc[cat].push({
                            name: product.name,
                            price: product.price,
                            image: product.image_url || '/images/placeholder.png',
                            desc: product.description,
                            prepTime: product.prep_time,
                            deliveryTime: product.delivery_time,
                            variations: product.variations || [],
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

                    setMenuSections(newSections);
                    // Open first section by default
                    if (newSections.length > 0) {
                        try {
                            setActiveSections(newSections.map(s => s.title));
                        } catch (e) { }
                    }
                } else {
                    console.warn("Products DB empty or failed. Using local translation fallback.");
                    // Fallback to translations
                    // Fallback to translations with stock fix
                    const fallback = getFallbackData();
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
        const finalItemName = variation ? `${item.name} (${variation.name})` : item.name;
        const finalPrice = variation ? variation.price : item.price;

        addToCart({
            name: finalItemName,
            price: finalPrice,
            image: item.image,
            quantity: quantity,
            name_en: item.name_en
        });

        handleCloseModal();
    };

    // Fix for "Plus" button logic
    const addToOrder = (item: any) => {
        // If has variations, must open modal to choose
        if (item.variations && item.variations.length > 0) {
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
            // Optional: User feedback? Shake or Toast?
            // For now, implicit add is standard.
        }
    };

    const t = translations[language];

    // Custom SVG Pattern (Chef Hat & Heart) - Gold color, low opacity
    const foodPattern = `data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cpath d='M30 20c-2.2-2.2-5.8-2.2-8 0s-2.2 5.8 0 8l8 8 8-8c2.2-2.2 2.2-5.8 0-8s-5.8-2.2-8 0z' stroke='%23d9a65a' stroke-opacity='0.4' stroke-width='1.5'/%3E%3Cpath d='M10 45c0-4.4 3.6-8 8-8s8 3.6 8 8v4H10v-4z M14 37v-3 M22 37v-3' stroke='%23d9a65a' stroke-opacity='0.4' stroke-width='1.5'/%3E%3Ccircle cx='50' cy='10' r='5' stroke='%23d9a65a' stroke-opacity='0.4' stroke-width='1.5'/%3E%3C/g%3E%3C/svg%3E`;

    return (
        <div className="min-h-screen bg-[#f7f1eb] pb-20 pt-20 relative">
            <div className="absolute inset-0 z-0 opacity-10" style={{ backgroundImage: `url("${foodPattern}")` }}></div>

            {/* Header */}
            <header className="bg-[#3b2f2f] text-white py-12 px-6 text-center relative overflow-hidden z-10">
                <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: `url("${foodPattern}")` }}></div>
                <div className="relative z-10">
                    <h1 className="text-4xl md:text-5xl font-serif font-bold mb-4 text-[#d9a65a]">
                        {t.menu.title}
                    </h1>
                    <p className="text-[#f7f1eb]/80 max-w-2xl mx-auto text-lg leading-relaxed mb-8">
                        {t.menu.subtitle}
                    </p>

                    {/* Search Bar */}
                    <div className="max-w-xl mx-auto relative">
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

                    const openTime = 8 * 60; // 08:00
                    const closeTime = 21 * 60 + 30; // 21:30

                    const isOpen = currentTime >= openTime && currentTime < closeTime;

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
                                            ? 'O nosso horário de funcionamento é das 08:00 às 21:30. Pode navegar pelo menu, mas as encomendas só serão processadas durante o horário de expediente.'
                                            : 'Our opening hours are from 08:00 to 21:30. You can browse the menu, but orders will only be processed during business hours.'}
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
                        <h3 className="text-xl font-bold text-[#3b2f2f] mb-2 font-serif">Entrega ao Domicílio</h3>
                        <p className="text-[#4b3a2f] text-sm leading-relaxed">
                            Do nosso forno para a sua porta! Entregamos num raio de 30km. Faça o pedido online e relaxe.
                        </p>
                    </div>

                    {/* Takeaway / Eat-In */}
                    <div className="bg-white/80 backdrop-blur-sm p-6 rounded-2xl shadow-lg border border-[#d9a65a]/20 hover:transform hover:-translate-y-1 transition-all duration-300">
                        <div className="w-12 h-12 bg-[#d9a65a] rounded-full flex items-center justify-center text-[#3b2f2f] mb-4 shadow-md">
                            <Store className="w-6 h-6" />
                        </div>
                        <h3 className="text-xl font-bold text-[#3b2f2f] mb-2 font-serif">Comer no Local ou Levar</h3>
                        <p className="text-[#4b3a2f] text-sm leading-relaxed">
                            Pode encomendar aqui e vir buscar, ou visitar-nos para um café e pastel de nata quentinho.
                        </p>
                    </div>

                    {/* Payments */}
                    <div className="bg-white/80 backdrop-blur-sm p-6 rounded-2xl shadow-lg border border-[#d9a65a]/20 hover:transform hover:-translate-y-1 transition-all duration-300">
                        <div className="w-12 h-12 bg-[#3b2f2f] rounded-full flex items-center justify-center text-[#d9a65a] mb-4 shadow-md">
                            <CreditCard className="w-6 h-6" />
                        </div>
                        <h3 className="text-xl font-bold text-[#3b2f2f] mb-2 font-serif">Pagamento Simples</h3>
                        <p className="text-[#4b3a2f] text-sm leading-relaxed">
                            Aceitamos somente M-Pesa, e-Mola e M-Kesh. Pagamento seguro e rápido para sua comodidade.
                        </p>
                    </div>
                </div>
            </div>

            {/* Stock Disclaimer Banner */}
            <div className="max-w-7xl mx-auto px-6 mt-8 mb-4">
                <div className="bg-[#fdf8f3] border-l-4 border-[#d9a65a] p-4 rounded-r shadow-sm flex items-center justify-center gap-3 animate-pulse mx-auto w-fit max-w-2xl">
                    <Info className="w-5 h-5 text-[#d9a65a] shrink-0" />
                    <p className="text-[#b4863e]/90 text-sm md:text-base font-medium">
                        <span className="font-bold">Nota:</span> O stock indicado é exclusivo para o site. Mesmo se esgotado online, <span className="underline decoration-dotted cursor-help" title="Visite-nos na padaria!">visite-nos na padaria</span> pois ainda podemos ter!
                    </p>
                </div>
            </div>

            {/* Menu List */}
            <div className="max-w-7xl mx-auto px-6 -mt-0 relative z-20 space-y-6">

                {loading && (
                    <div className="text-center py-20">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#d9a65a] mx-auto mb-4"></div>
                        <p className="text-[#d9a65a] font-serif text-xl">A carregar produtos fresquinhos...</p>
                    </div>
                )}

                {!loading && filteredSections.map((section, index) => (
                    <div key={index} className="bg-white rounded-2xl shadow-xl overflow-hidden border border-[#d9a65a]/10">
                        <button
                            onClick={() => toggleSection(section.title)}
                            className="w-full flex items-center justify-between p-6 bg-[#3b2f2f] hover:bg-[#4b3a2f] transition-colors relative overflow-hidden group"
                        >
                            <div className="absolute inset-0 opacity-10" style={{ backgroundImage: `url("${foodPattern}")` }}></div>
                            <div className="flex items-center gap-4 relative z-10">
                                <div className="p-3 bg-[#f7f1eb]/10 rounded-full text-[#d9a65a] backdrop-blur-sm">
                                    <ShoppingBag className="w-6 h-6" />
                                </div>
                                <h2 className="text-2xl font-serif font-bold text-[#f7f1eb] text-left">
                                    {section.title}
                                </h2>
                            </div>
                            <div className={`transform transition-transform duration-300 relative z-10 ${activeSections.includes(section.title) ? 'rotate-180' : ''}`}>
                                <ChevronDown className="w-6 h-6 text-[#d9a65a]" />
                            </div>
                        </button>

                        <div className={`transition-all duration-500 ease-in-out ${activeSections.includes(section.title) ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'}`}>
                            <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {section.items.map((item: any, idx: number) => (
                                    <div
                                        key={idx}
                                        onClick={() => handleProductClick(item)}
                                        className="group flex gap-4 p-4 rounded-xl hover:bg-white border border-transparent hover:border-[#d9a65a]/20 hover:shadow-xl transition-all cursor-pointer bg-[#f9f9f9] items-stretch h-40"
                                    >
                                        <div
                                            className="w-32 h-32 shrink-0 rounded-xl overflow-hidden bg-white relative shadow-sm self-center"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleProductClick(item);
                                            }}
                                        >
                                            <img
                                                src={item.image}
                                                alt={(language === 'en' && item.name_en) ? item.name_en : item.name}
                                                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                                            />
                                        </div>
                                        <div className="flex-1 flex flex-col justify-between py-1 min-h-0">
                                            <div>
                                                <h3 className="font-bold text-[#3b2f2f] text-base leading-tight mb-1 group-hover:text-[#d9a65a] transition-colors line-clamp-1">
                                                    {(language === 'en' && item.name_en) ? item.name_en : item.name}
                                                </h3>
                                                <p className="text-xs text-gray-500 line-clamp-2 leading-tight mb-2">
                                                    {(language === 'en' && item.description_en) ? item.description_en : item.desc}
                                                </p>
                                                {(item.prepTime || item.deliveryTime) && (
                                                    <div className="flex gap-2 text-[10px] font-bold text-gray-400">
                                                        {item.prepTime && <span className="bg-orange-50 text-orange-600 px-1.5 py-0.5 rounded flex items-center gap-1">⏱ {item.prepTime}</span>}
                                                    </div>
                                                )}
                                            </div>
                                            <div className="flex items-center justify-between gap-2 mt-1">
                                                <span className="font-bold text-lg text-[#d9a65a]">
                                                    {item.price} MT
                                                    {item.unit && item.unit !== 'un' && <span className="text-sm font-normal text-gray-400 ml-1">/ {item.unit}</span>}
                                                </span>
                                                <div className="flex flex-col items-end">
                                                    {item.isAvailable ? (
                                                        <>
                                                            <span className="text-[10px] font-bold text-green-600 mb-1">{item.stock} disponíveis</span>
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    addToOrder(item);
                                                                }}
                                                                className="bg-[#d9a65a] text-white w-8 h-8 rounded-full flex items-center justify-center hover:bg-[#3b2f2f] transition-all shadow-lg"
                                                            >
                                                                <Plus size={18} />
                                                            </button>
                                                        </>
                                                    ) : (
                                                        <span className="text-xs font-bold text-red-500 border border-red-200 bg-red-50 px-2 py-1 rounded">Esgotado</span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Product Modal */}
            <AnimatePresence>
                {selectedProduct && (
                    <ProductModal
                        isOpen={!!selectedProduct}
                        product={selectedProduct}
                        onClose={handleCloseModal}
                        onAddToCart={handleAddToCartFromModal}
                        language={language}
                    />
                )}
            </AnimatePresence>

            <ScheduleOrderModal
                isOpen={isScheduleModalOpen}
                onClose={() => setIsScheduleModalOpen(false)}
                language={language}
                menuSections={menuSections}
            />
        </div>
    );
};
