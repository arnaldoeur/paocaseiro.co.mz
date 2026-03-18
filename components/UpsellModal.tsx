import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Plus, Sparkles, Coffee, ArrowLeft, Utensils } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { Language } from '../translations';
import { formatProductName } from '../services/stringUtils';

interface UpsellModalProps {
    isOpen: boolean;
    onClose: () => void;
    language: Language;
    menuSections: any[];
}

export const UpsellModal: React.FC<UpsellModalProps> = ({ isOpen, onClose, language, menuSections }) => {
    const { addToCart } = useCart();
    
    type Step = 'category' | 'items';
    type CategoryType = 'bebidas' | 'salgados' | 'doces' | 'extras' | null;

    const [step, setStep] = useState<Step>('category');
    const [selectedType, setSelectedType] = useState<CategoryType>(null);
    const [upsellItems, setUpsellItems] = useState<any[]>([]);

    // Reset when opened
    useEffect(() => {
        if (isOpen) {
            setStep('category');
            setSelectedType(null);
            setUpsellItems([]);
        }
    }, [isOpen]);

    // Calculate items when category is selected
    useEffect(() => {
        if (step === 'items' && selectedType && menuSections) {
            let items: any[] = [];
            
            const findCategories = (keywords: string[]) => {
                return menuSections.filter(s => keywords.some(k => s.title.toLowerCase().includes(k)));
            };

            let targetCategories: any[] = [];
            if (selectedType === 'bebidas') {
                targetCategories = findCategories(['bebida', 'café', 'chá', 'sumo']);
            } else if (selectedType === 'salgados') {
                targetCategories = findCategories(['salgado', 'lanche', 'folhado', 'pizza']);
            } else if (selectedType === 'doces') {
                targetCategories = findCategories(['doce', 'bolo', 'sobremesa', 'pastelaria']);
            } else if (selectedType === 'extras') {
                targetCategories = findCategories(['extra', 'adicional', 'acompanhamento', 'batata', 'salada', 'molho', 'sauce', 'queijo', 'agua', 'água', 'maionese']);
            }

            targetCategories.forEach(cat => {
                if (cat && cat.items) {
                    items = [...items, ...cat.items.filter((i:any) => i.isAvailable)];
                }
            });

            // Make unique by name
            const uniqueItems = Array.from(new Set(items.map(a => a.name))).map(name => items.find(a => a.name === name));
            setUpsellItems(uniqueItems);
        }
    }, [step, selectedType, menuSections]);

    if (!isOpen) return null;

    const handleAdd = (item: any) => {
        addToCart({
            name: item.name,
            price: item.price,
            image: item.image,
            quantity: 1,
            name_en: item.name_en
        });
        onClose(); // Close modal after adding
    };

    const handleCategoryClick = (type: CategoryType) => {
        setSelectedType(type);
        setStep('items');
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[110] flex items-center justify-center p-4 pt-20"
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.9, opacity: 0, y: 20 }}
                            onClick={(e) => e.stopPropagation()}
                            className="bg-[#f7f1eb] rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden border border-[#d9a65a]/20 flex flex-col max-h-[85vh]"
                        >
                            {/* Header */}
                            <div className="bg-[#3b2f2f] p-6 text-center relative shrink-0">
                                {step === 'items' && (
                                    <button 
                                        onClick={() => setStep('category')}
                                        className="absolute top-4 left-4 p-2 text-white/70 hover:text-white transition-colors"
                                    >
                                        <ArrowLeft className="w-6 h-6" />
                                    </button>
                                )}
                                
                                <h2 className="text-2xl font-serif font-bold text-[#d9a65a] mb-2 px-8">
                                    {language === 'pt' ? 'Adicionado com sucesso!' : 'Successfully added!'}
                                </h2>
                                <p className="text-white text-sm">
                                    {language === 'pt' ? 'Deseja acompanhar o seu pedido com mais alguma coisa?' : 'Would you like anything else to go with your order?'}
                                </p>
                                <button
                                    onClick={onClose}
                                    className="absolute top-4 right-4 p-2 text-white/70 hover:text-red-400 transition-colors"
                                    title="Fechar"
                                >
                                    <X className="w-6 h-6" />
                                </button>
                            </div>

                            {/* Content */}
                            <div className="flex-1 overflow-y-auto p-6 bg-[#f7f1eb]">
                                <AnimatePresence mode="wait">
                                    {step === 'category' ? (
                                        <motion.div
                                            key="category-step"
                                            initial={{ opacity: 0, x: -20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            exit={{ opacity: 0, x: -20 }}
                                            className="flex flex-col gap-4"
                                        >
                                            <button
                                                onClick={() => handleCategoryClick('bebidas')}
                                                className="bg-white p-5 rounded-2xl shadow-sm border border-[#d9a65a]/20 hover:border-[#d9a65a] hover:shadow-md transition-all flex items-center justify-between group"
                                            >
                                                <div className="flex items-center gap-4">
                                                    <div className="w-12 h-12 bg-[#3b2f2f]/5 rounded-full flex items-center justify-center text-[#3b2f2f] group-hover:scale-110 transition-transform">
                                                        <Coffee className="w-6 h-6" />
                                                    </div>
                                                    <span className="font-bold text-lg text-[#3b2f2f]">{language === 'pt' ? 'Bebidas & Refrigerantes' : 'Drinks & Sodas'}</span>
                                                </div>
                                                <Plus className="text-[#d9a65a] w-6 h-6 opacity-50 group-hover:opacity-100" />
                                            </button>

                                            <button
                                                onClick={() => handleCategoryClick('salgados')}
                                                className="bg-white p-5 rounded-2xl shadow-sm border border-[#d9a65a]/20 hover:border-[#d9a65a] hover:shadow-md transition-all flex items-center justify-between group"
                                            >
                                                <div className="flex items-center gap-4">
                                                    <div className="w-12 h-12 bg-[#3b2f2f]/5 rounded-full flex items-center justify-center text-[#3b2f2f] group-hover:scale-110 transition-transform">
                                                        <Utensils className="w-6 h-6" />
                                                    </div>
                                                    <span className="font-bold text-lg text-[#3b2f2f]">{language === 'pt' ? 'Salgados & Lanches' : 'Savory & Snacks'}</span>
                                                </div>
                                                <Plus className="text-[#d9a65a] w-6 h-6 opacity-50 group-hover:opacity-100" />
                                            </button>

                                            <button
                                                onClick={() => handleCategoryClick('doces')}
                                                className="bg-white p-5 rounded-2xl shadow-sm border border-[#d9a65a]/20 hover:border-[#d9a65a] hover:shadow-md transition-all flex items-center justify-between group"
                                            >
                                                <div className="flex items-center gap-4">
                                                    <div className="w-12 h-12 bg-[#3b2f2f]/5 rounded-full flex items-center justify-center text-[#3b2f2f] group-hover:scale-110 transition-transform">
                                                        <Sparkles className="w-6 h-6" />
                                                    </div>
                                                    <span className="font-bold text-lg text-[#3b2f2f]">{language === 'pt' ? 'Doces & Sobremesas' : 'Sweets & Desserts'}</span>
                                                </div>
                                                <Plus className="text-[#d9a65a] w-6 h-6 opacity-50 group-hover:opacity-100" />
                                            </button>

                                            <button
                                                onClick={() => handleCategoryClick('extras')}
                                                className="bg-white p-5 rounded-2xl shadow-sm border border-[#d9a65a]/20 hover:border-[#d9a65a] hover:shadow-md transition-all flex items-center justify-between group"
                                            >
                                                <div className="flex items-center gap-4">
                                                    <div className="w-12 h-12 bg-[#3b2f2f]/5 rounded-full flex items-center justify-center text-[#3b2f2f] group-hover:scale-110 transition-transform">
                                                        <Plus className="w-6 h-6" />
                                                    </div>
                                                    <span className="font-bold text-lg text-[#3b2f2f]">{language === 'pt' ? 'Extras & Acompanhamentos' : 'Extras & Sides'}</span>
                                                </div>
                                                <Plus className="text-[#d9a65a] w-6 h-6 opacity-50 group-hover:opacity-100" />
                                            </button>
                                        </motion.div>
                                    ) : (
                                        <motion.div
                                            key="items-step"
                                            initial={{ opacity: 0, x: 20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            exit={{ opacity: 0, x: 20 }}
                                            className="space-y-4"
                                        >
                                            {upsellItems.length > 0 ? (
                                                upsellItems.map((item, idx) => (
                                                    <div key={idx} className="flex gap-4 p-3 bg-white rounded-xl shadow-sm border border-gray-100 hover:border-[#d9a65a]/40 transition-all items-center">
                                                        <div className="w-16 h-16 rounded-lg overflow-hidden bg-gray-50 shrink-0">
                                                            <img 
                                                                src={item?.image || '/images/pao_caseiro.png'} 
                                                                alt={formatProductName(item?.name)} 
                                                                className="w-full h-full object-cover"
                                                                onError={(e) => {
                                                                    e.currentTarget.onerror = null;
                                                                    e.currentTarget.src = '/images/pao_caseiro.png';
                                                                }}
                                                            />
                                                        </div>
                                                        <div className="flex-1">
                                                            <h3 className="font-bold text-[#3b2f2f] text-sm md:text-base line-clamp-1">
                                                                {(language === 'en' && item?.name_en) ? formatProductName(item?.name_en) : formatProductName(item?.name)}
                                                            </h3>
                                                            <p className="font-bold text-[#d9a65a] text-sm mt-1">{item?.price} MT</p>
                                                        </div>
                                                        <button
                                                            onClick={() => handleAdd(item)}
                                                            className="w-10 h-10 rounded-full bg-[#d9a65a] text-white flex items-center justify-center hover:bg-[#3b2f2f] transition-colors shadow-md shrink-0"
                                                        >
                                                            <Plus className="w-5 h-5" />
                                                        </button>
                                                    </div>
                                                ))
                                            ) : (
                                                <div className="text-center py-10 opacity-60">
                                                    <Utensils className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                                                    <p>{language === 'pt' ? 'Nenhuma opção disponível nesta categoria neste momento.' : 'No options available in this category right now.'}</p>
                                                </div>
                                            )}
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>

                            {/* Footer */}
                            <div className="p-4 bg-white border-t border-gray-100 shrink-0">
                                <button
                                    onClick={onClose}
                                    className="w-full py-4 rounded-xl font-bold uppercase tracking-widest text-[#3b2f2f] hover:bg-[#f7f1eb] transition-all border-2 border-gray-200 hover:border-[#d9a65a]/50 text-sm"
                                >
                                    {language === 'pt' ? (step === 'category' ? 'Não, obrigado, só isto' : 'Fechar Menu Extras') : (step === 'category' ? 'No thanks, just this' : 'Close Extras')}
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
};
