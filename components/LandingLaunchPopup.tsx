import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Calendar, Gift, Bell, ArrowRight, UserPlus } from 'lucide-react';

interface LandingLaunchPopupProps {
    language: 'pt' | 'en';
}

// Global Launch Constant
const LAUNCH_DATE = new Date('2026-03-30T00:00:00+02:00');

export const LandingLaunchPopup: React.FC<LandingLaunchPopupProps> = ({ language }) => {
    const [isOpen, setIsOpen] = useState(false);

    useEffect(() => {
        const isAfterLaunch = new Date() >= LAUNCH_DATE;
        const hasSeen = sessionStorage.getItem('pc_launch_popup_seen');
        
        if (!isAfterLaunch && !hasSeen) {
            const timer = setTimeout(() => setIsOpen(true), 1500); // 1.5s delay
            return () => clearTimeout(timer);
        }
    }, []);

    const closePopup = () => {
        setIsOpen(false);
        sessionStorage.setItem('pc_launch_popup_seen', 'true');
    };

    const handleRegister = () => {
        closePopup();
        window.dispatchEvent(new Event('open_pc_login'));
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    {/* Backdrop */}
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={closePopup}
                        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                    />

                    {/* Content */}
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0, y: 20 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.9, opacity: 0, y: 20 }}
                        className="bg-white rounded-[2rem] shadow-2xl w-full max-w-lg overflow-hidden relative"
                    >
                        {/* Header Image/Gradient */}
                        <div className="h-32 bg-gradient-to-r from-[#3b2f2f] to-[#4b3a2f] relative flex items-center justify-center">
                            <div className="absolute inset-0 opacity-20" style={{ backgroundImage: "url('/images/pattern-bread.png')", backgroundSize: '100px' }} />
                            <div className="w-20 h-20 bg-[#d9a65a] rounded-2xl flex items-center justify-center shadow-lg transform rotate-3 relative z-10">
                                <Calendar className="w-10 h-10 text-[#3b2f2f]" />
                            </div>
                            <button 
                                onClick={closePopup}
                                className="absolute top-4 right-4 p-2 text-white/50 hover:text-white transition-colors"
                            >
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        <div className="p-8 text-center">
                            <h2 className="font-serif text-3xl text-[#3b2f2f] mb-4">
                                {language === 'pt' ? 'O Pão Caseiro está a chegar!' : 'Pão Caseiro is coming!'}
                            </h2>
                            <p className="text-gray-600 mb-8 max-w-[300px] mx-auto text-sm leading-relaxed">
                                {language === 'pt' 
                                    ? 'A nossa plataforma oficial de encomendas online e entrega abre na Segunda-feira, 30 de Março às 00:00.' 
                                    : 'Our official online ordering and delivery platform opens Monday, March 30th at 00:00.'}
                            </p>

                            <div className="space-y-4 mb-8">
                                <div className="flex items-center gap-4 bg-[#f7f1eb] p-4 rounded-2xl">
                                    <div className="w-10 h-10 bg-[#d9a65a]/20 rounded-full flex items-center justify-center text-[#d9a65a]">
                                        <Gift className="w-5 h-5" />
                                    </div>
                                    <div className="text-left">
                                        <p className="text-xs font-bold text-[#3b2f2f] uppercase tracking-wide">
                                            {language === 'pt' ? 'Ganhe Descontos' : 'Get Discounts'}
                                        </p>
                                        <p className="text-[10px] text-gray-500">
                                            {language === 'pt' ? 'Registe-se hoje e ganhe cupões exclusivos.' : 'Sign up today and get exclusive coupons.'}
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-4 bg-[#f7f1eb] p-4 rounded-2xl">
                                    <div className="w-10 h-10 bg-[#d9a65a]/20 rounded-full flex items-center justify-center text-[#d9a65a]">
                                        <Bell className="w-5 h-5" />
                                    </div>
                                    <div className="text-left">
                                        <p className="text-xs font-bold text-[#3b2f2f] uppercase tracking-wide">
                                            {language === 'pt' ? 'Seja Notificado' : 'Stay Notified'}
                                        </p>
                                        <p className="text-[10px] text-gray-500">
                                            {language === 'pt' ? 'Receba um SMS assim que o serviço abrir.' : 'Get an SMS as soon as we open.'}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <button 
                                onClick={handleRegister}
                                className="w-full bg-[#3b2f2f] text-[#d9a65a] py-4 rounded-2xl font-bold uppercase tracking-widest hover:bg-[#d9a65a] hover:text-[#3b2f2f] transition-all flex items-center justify-center gap-2 group shadow-xl"
                            >
                                <UserPlus size={18} />
                                <span>{language === 'pt' ? 'Criar Conta Agora' : 'Create Account Now'}</span>
                                <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                            </button>

                            <button 
                                onClick={closePopup}
                                className="mt-4 text-xs text-gray-400 hover:text-gray-600 underline font-medium"
                            >
                                {language === 'pt' ? 'Quero apenas ver o site por agora' : 'I just want to browse for now'}
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};
