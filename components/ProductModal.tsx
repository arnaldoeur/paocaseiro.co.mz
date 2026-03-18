import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Minus, Plus, ShoppingBag, ChevronRight } from 'lucide-react';
import { Language } from '../translations';
import { formatProductName } from '../services/stringUtils';

interface Variation {
    name: string;
    price: number;
}

interface Complement {
    name: string;
    price: number;
}

interface Product {
    name: string;
    description?: string;
    desc?: string;
    price: number;
    image?: string;
    variations?: Variation[];
    complements?: Complement[];
    isSpecial?: boolean;
}

interface ProductModalProps {
    isOpen: boolean;
    onClose: () => void;
    product: Product | null;
    language: Language;
    onAddToCart: (item: any) => void;
}

export const ProductModal: React.FC<ProductModalProps> = ({
    isOpen,
    onClose,
    product,
    language,
    onAddToCart,
}) => {
    const [quantity, setQuantity] = useState(1);
    const [selectedVariation, setSelectedVariation] = useState<Variation | null>(null);
    const [customMessage, setCustomMessage] = useState<string>('');

    // Reset state when product changes
    useEffect(() => {
        if (isOpen && product) {
            setQuantity(1);
            setCustomMessage('');
            if (product.variations && product.variations.length > 0) {
                // Determine default selection if needed, or leave null to force choice
                // Auto-select first variation to improve UX (button enabled by default)
                setSelectedVariation(product.variations[0]);
            } else {
                setSelectedVariation(null);
            }
        }
    }, [isOpen, product]);

    if (!product) return null;

    const basePrice = selectedVariation ? selectedVariation.price : product.price;
    const currentPrice = basePrice;
    const canAdd = (!product.variations || product.variations.length === 0) || selectedVariation;

    const handleAdd = () => {
        if (!canAdd) return;

        let finalName = selectedVariation
            ? `${product.name} (${selectedVariation.name})`
            : product.name;

        if (customMessage.trim()) {
            finalName += ` [Nota: ${customMessage.trim()}]`;
        }

        const finalItem = {
            ...product, // Keep original props
            name: finalName,
            price: currentPrice,
            quantity: quantity,
            // Ensure we don't pass the raw variations array to cart if not needed, 
            // but standardizing the cart item is good.
        };

        onAddToCart(finalItem);
        onClose();
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
                    >
                        {/* Modal Content */}
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.9, opacity: 0, y: 20 }}
                            onClick={(e) => e.stopPropagation()}
                            className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col md:flex-row max-h-[90vh]"
                        >
                            {/* Image Section (Left/Top) */}
                            <div className="md:w-1/2 h-64 md:h-auto relative flex items-center justify-center p-6 bg-white md:bg-gray-50/50 min-h-[300px] md:min-h-[500px]">
                                {product.image ? (
                                    <motion.img
                                        initial={{ scale: 0.9, opacity: 0 }}
                                        animate={{ scale: 1, opacity: 1 }}
                                        transition={{ duration: 0.4 }}
                                        src={`${product.image}?v=3`}
                                        alt={formatProductName(product.name)}
                                        className="w-full h-full object-contain max-h-[300px] md:max-h-[400px] drop-shadow-xl"
                                        onError={(e) => {
                                            e.currentTarget.onerror = null;
                                            e.currentTarget.src = '/images/pao_caseiro.png';
                                        }}
                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center bg-[#f0e6dc] text-[#d9a65a] rounded-2xl">
                                        <ShoppingBag className="w-20 h-20 opacity-50" />
                                    </div>
                                )}
                                <button
                                    onClick={onClose}
                                    className="absolute top-4 left-4 p-2 bg-white/80 backdrop-blur-md rounded-full text-[#3b2f2f] hover:bg-white transition-all md:hidden shadow-sm"
                                >
                                    <X className="w-6 h-6" />
                                </button>
                            </div>

                            {/* Details Section (Right/Bottom) */}
                            <div className="md:w-1/2 flex flex-col bg-white h-full max-h-[60vh] md:max-h-full">
                                {/* Scrollable Content */}
                                <div className="flex-1 overflow-y-auto p-6 md:p-10 pb-32">
                                    <div className="flex justify-between items-start mb-4">
                                        <h2 className="text-3xl md:text-4xl font-serif font-bold text-[#3b2f2f] leading-tight pr-8">
                                            {formatProductName(product.name)}
                                        </h2>
                                        <button
                                            onClick={onClose}
                                            className="hidden md:block p-2 text-gray-400 hover:text-gray-600 hover:rotate-90 transition-all duration-300 absolute top-6 right-6"
                                        >
                                            <X className="w-8 h-8" />
                                        </button>
                                    </div>

                                    <div className="mb-6">
                                        <p className="text-gray-500 text-lg leading-relaxed mb-6">
                                            {product.desc || product.description || 'Delicioso e fresco.'}
                                        </p>

                                        {/* Price Display */}
                                        <div className="text-3xl font-bold text-[#d9a65a]">
                                            {product.variations && product.variations.length > 0 && !selectedVariation ? (
                                                <span className="text-lg text-gray-400 font-normal">
                                                    {language === 'pt' ? 'A partir de ' : 'From '}
                                                    <span className="font-bold text-[#d9a65a] text-3xl">
                                                        {Math.min(...product.variations.map(v => v.price))} MT
                                                    </span>
                                                </span>
                                            ) : (
                                                `${currentPrice} MT`
                                            )}
                                        </div>
                                    </div>


                                    {/* Variations Selector */}
                                    {product.variations && product.variations.length > 0 && (
                                        <div className="mb-8">
                                            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide mb-3">
                                                {language === 'pt' ? 'Escolha o Sabor' : 'Choose Flavor'}
                                            </h3>
                                            <div className="space-y-3">
                                                {product.variations.map((variant) => (
                                                    <motion.button
                                                        whileHover={{ scale: 1.02, x: 4 }}
                                                        whileTap={{ scale: 0.98 }}
                                                        key={variant.name}
                                                        onClick={() => setSelectedVariation(variant)}
                                                        className={`
                                                            w-full text-left px-5 py-4 rounded-xl border-2 transition-all flex items-center justify-between group relative overflow-hidden shadow-sm hover:shadow-md
                                                            ${selectedVariation?.name === variant.name
                                                                ? 'border-[#d9a65a] bg-gradient-to-r from-[#fff9f2] to-white ring-1 ring-[#d9a65a]/50'
                                                                : 'border-gray-100 hover:border-[#d9a65a]/30'
                                                            }
                                                        `}
                                                    >
                                                        <span className={`font-medium text-lg ${selectedVariation?.name === variant.name ? 'text-[#3b2f2f]' : 'text-gray-600'}`}>
                                                            {variant.name}
                                                        </span>
                                                        <div className="flex items-center gap-3">
                                                            <span className="font-bold text-[#d9a65a]">
                                                                {variant.price} MT
                                                            </span>
                                                            <div className={`
                                                                w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors
                                                                ${selectedVariation?.name === variant.name ? 'border-[#d9a65a] bg-[#d9a65a]' : 'border-gray-300'}
                                                            `}>
                                                                {selectedVariation?.name === variant.name && (
                                                                    <motion.div
                                                                        initial={{ scale: 0 }}
                                                                        animate={{ scale: 1 }}
                                                                        className="w-2.5 h-2.5 rounded-full bg-white"
                                                                    />
                                                                )}
                                                            </div>
                                                        </div>
                                                    </motion.button>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Personalization / Custom Message */}
                                    <div className="mb-4">
                                        <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide mb-3 flex items-center gap-2">
                                            {language === 'pt' ? 'Mensagem Personalizada / Observações' : 'Custom Message / Instructions'}
                                        </h3>
                                        <textarea
                                            value={customMessage}
                                            onChange={(e) => setCustomMessage(e.target.value)}
                                            placeholder={language === 'pt' ? 'Ex: Tirar cebola, adicionar piripiri...' : 'E.g.: No onions, add spicy sauce...'}
                                            className="w-full h-24 p-4 rounded-xl border border-gray-200 focus:border-[#d9a65a] focus:ring-1 focus:ring-[#d9a65a] transition-all resize-none shadow-sm text-sm"
                                            maxLength={150}
                                        />
                                        <div className="text-right mt-1">
                                            <span className="text-xs text-gray-400">{customMessage.length}/150</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Footer Actions - Fixed at Bottom */}
                                <div className="absolute xl:relative xl:bottom-0 bottom-0 left-0 w-full p-6 border-t border-gray-100 bg-white">
                                    <div className="flex items-stretch gap-4 h-16">
                                        {/* Quantity */}
                                        <div className="flex items-center bg-[#f7f1eb] rounded-xl px-1 shadow-sm border border-[#e5dcd3]">
                                            <button
                                                onClick={() => setQuantity(q => Math.max(1, q - 1))}
                                                className="w-12 h-full flex items-center justify-center text-[#3b2f2f] hover:text-[#d9a65a] transition-colors text-2xl font-bold active:scale-95 transform"
                                            >
                                                <Minus className="w-5 h-5" />
                                            </button>
                                            <div className="w-12 h-8 flex items-center justify-center bg-white rounded-lg shadow-inner">
                                                <span className="text-center font-bold text-xl text-[#3b2f2f]">{quantity}</span>
                                            </div>
                                            <button
                                                onClick={() => setQuantity(q => q + 1)}
                                                className="w-12 h-full flex items-center justify-center text-[#3b2f2f] hover:text-[#d9a65a] transition-colors text-2xl font-bold active:scale-95 transform"
                                            >
                                                <Plus className="w-5 h-5" />
                                            </button>
                                        </div>

                                        {/* Add Button */}
                                        <motion.button
                                            whileHover={{ scale: canAdd ? 1.02 : 1 }}
                                            whileTap={{ scale: canAdd ? 0.98 : 1 }}
                                            onClick={handleAdd}
                                            disabled={!canAdd}
                                            className={`
                                                flex-1 rounded-xl font-bold uppercase tracking-wide flex flex-col items-center justify-center transition-all shadow-lg py-1
                                                ${canAdd
                                                    ? 'bg-[#3b2f2f] text-white hover:bg-[#2c2222]'
                                                    : 'bg-gray-100 text-gray-400 cursor-not-allowed shadow-none'
                                                }
                                            `}
                                        >
                                            <div className="flex items-center gap-2">
                                                <ShoppingBag className="w-5 h-5" />
                                                <span className="text-lg">
                                                    {language === 'pt' ? 'Adicionar' : 'Add to Order'}
                                                </span>
                                            </div>

                                            {canAdd && (
                                                <div className="text-[#d9a65a] text-base font-bold leading-none mt-1">
                                                    {(currentPrice * quantity)} MT
                                                </div>
                                            )}
                                        </motion.button>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
};

