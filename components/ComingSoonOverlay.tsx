import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { Clock, ShoppingBag, Sparkles, Heart, X, CheckCircle2, MapPin } from 'lucide-react';

interface ComingSoonOverlayProps {
    onClose: () => void;
}

export const ComingSoonOverlay: React.FC<ComingSoonOverlayProps> = ({ onClose }) => {
    useEffect(() => {
        // Lock body scroll
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = 'auto';
        };
    }, []);

    return (
        <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 z-[9999] flex items-center justify-center p-6 sm:p-10 overflow-hidden"
        >
            {/* Background with heavy blur and dark overlay */}
            <div className="absolute inset-0 bg-[#3b2f2f]/80 backdrop-blur-xl"></div>
            
            {/* Animated Decorative Elements */}
            <motion.div 
                animate={{ 
                    scale: [1, 1.2, 1],
                    rotate: [0, 90, 180, 270, 360],
                    opacity: [0.1, 0.2, 0.1]
                }}
                transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-[#d9a65a]/20 rounded-full blur-[120px] pointer-events-none"
            ></motion.div>
            
            <motion.div 
                animate={{ 
                    scale: [1, 1.3, 1],
                    opacity: [0.1, 0.3, 0.1]
                }}
                transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
                className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] bg-[#3b2f2f]/40 rounded-full blur-[150px] pointer-events-none"
            ></motion.div>

            {/* Content Card */}
            <motion.div 
                initial={{ y: 50, opacity: 0, scale: 0.9 }}
                animate={{ y: 0, opacity: 1, scale: 1 }}
                transition={{ delay: 0.2, type: "spring", stiffness: 100 }}
                className="relative max-w-2xl w-full bg-white/5 border border-white/10 backdrop-blur-md rounded-[3rem] p-8 md:p-14 text-center shadow-[0_32px_64px_-16px_rgba(0,0,0,0.5)] overflow-hidden"
            >
                {/* Close Button */}
                <button 
                    onClick={onClose}
                    className="absolute top-8 right-8 p-2 bg-white/10 hover:bg-white/20 text-white rounded-full transition-colors z-50"
                    title="Fechar"
                >
                    <X size={24} />
                </button>

                {/* Brand Logo / Icon */}
                <div className="mb-8 relative">
                    <motion.div 
                        animate={{ scale: [1, 1.05, 1] }}
                        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                        className="w-32 h-32 bg-white rounded-full mx-auto flex items-center justify-center shadow-2xl shadow-black/10 relative z-10 overflow-hidden border-4 border-[#d9a65a]/20"
                    >
                        <img 
                            src="/logo_on_light.png" 
                            alt="Pão Caseiro Logo" 
                            className="w-full h-full object-contain p-2"
                        />
                    </motion.div>
                    <div className="absolute inset-0 bg-[#d9a65a]/20 blur-3xl rounded-full scale-110 opacity-30"></div>
                </div>

                {/* Main Heading */}
                <h2 className="text-3xl md:text-5xl font-serif font-black text-[#d9a65a] uppercase tracking-tighter mb-4 leading-tight">
                    Brevemente na <br /> Cidade de Lichinga
                </h2>

                <div className="h-1 w-24 bg-gradient-to-r from-transparent via-[#d9a65a] to-transparent mx-auto mb-6"></div>

                {/* Launch Message */}
                <div className="space-y-4 mb-8">
                    <p className="text-[#f7f1eb] text-base md:text-lg font-medium leading-relaxed italic">
                        "O sistema completo de encomendas e pagamentos será lançado nesta"
                    </p>
                    <div className="bg-[#d9a65a] text-[#3b2f2f] px-6 py-3 rounded-2xl inline-flex items-center gap-3 shadow-xl transform -rotate-1">
                        <Clock size={20} className="animate-pulse" />
                        <span className="text-lg md:text-xl font-black uppercase tracking-widest">Segunda-Feira • 00:00</span>
                    </div>
                </div>

                {/* Features Summary */}
                <div className="grid grid-cols-2 gap-3 mb-10 max-w-lg mx-auto">
                    {[
                        "Encomendas Online",
                        "Pagamentos Digitais",
                        "Rastreio em Tempo Real",
                        "Recibos Instantâneos"
                    ].map((feature, i) => (
                        <div key={i} className="flex items-center gap-2 text-[#f7f1eb]/80 text-left bg-white/5 p-3 rounded-xl border border-white/5">
                            <CheckCircle2 size={16} className="text-[#d9a65a] shrink-0" />
                            <span className="text-[10px] font-bold uppercase tracking-wider">{feature}</span>
                        </div>
                    ))}
                </div>

                <p className="text-[#f7f1eb]/60 text-xs md:text-sm leading-relaxed max-w-sm mx-auto mb-8">
                    Prepare-se para uma experiência gastronómica digital completa. Até lá, as compras estão temporariamente suspensas.
                </p>

                {/* Footer Location */}
                <div className="pt-8 border-t border-white/10 flex flex-col items-center gap-4">
                    <div className="flex items-center gap-3 text-[#d9a65a]">
                        <MapPin size={18} className="animate-pulse" />
                        <span className="text-[10px] font-black uppercase tracking-[0.3em] text-[#f7f1eb]">Av. Acordo de Lusaka, Cidade de Lichinga</span>
                    </div>
                </div>
                
                {/* Decorative Pattern Layer */}
                <div className="absolute inset-0 opacity-[0.03] pointer-events-none mix-blend-overlay">
                    <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
                        <defs>
                            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="1"/>
                            </pattern>
                        </defs>
                        <rect width="100%" height="100%" fill="url(#grid)" />
                    </svg>
                </div>
            </motion.div>
        </motion.div>
    );
};
