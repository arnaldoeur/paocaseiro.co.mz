import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Phone, MessageSquare, Clock, ShieldAlert, ChevronRight, Package, ShoppingBag, Info, ExternalLink } from 'lucide-react';
import { supabase } from '../services/supabase';
import { Language } from '../translations';

interface MaintenanceMenuProps {
    language: Language;
}

export const MaintenanceMenu: React.FC<MaintenanceMenuProps> = ({ language }) => {
    const [products, setProducts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [companyInfo, setCompanyInfo] = useState<any>(null);

    useEffect(() => {
        const loadMaintenanceData = async () => {
            try {
                // Load products that are marked as visible in menu
                const { data: prodData } = await supabase
                    .from('products')
                    .select('*')
                    .eq('inStock', true)
                    .eq('show_in_menu', true)
                    .order('category', { ascending: true });

                if (prodData) setProducts(prodData);

                // Load company info for WhatsApp link
                const { data: settings } = await supabase.from('settings').select('*');
                if (settings) {
                    const settingsMap: any = {};
                    settings.forEach(s => settingsMap[s.key] = s.value);
                    setCompanyInfo({
                        name: settingsMap['branding_name'] || 'Pão Caseiro',
                        phone: settingsMap['branding_phone'] || '+258879146662',
                        logo: settingsMap['branding_logo'] || '/images/logo-official.png'
                    });
                }
            } catch (e) {
                console.error("Failed to load maintenance menu data:", e);
            } finally {
                setLoading(false);
            }
        };

        loadMaintenanceData();
    }, []);

    const handleWhatsAppOrder = () => {
        const phone = companyInfo?.phone?.replace(/\s+/g, '') || '258879146662';
        const text = encodeURIComponent(`Olá Pão Caseiro! Gostaria de fazer um pedido através do Menu de Emergência.`);
        window.open(`https://wa.me/${phone}?text=${text}`, '_blank');
    };

    const categories = ['Pão', 'Pastelaria', 'Bolos', 'Bebidas', 'Outros'];
    const filteredByCategory = (cat: string) => products.filter(p => (p.category || '').toLowerCase().includes(cat.toLowerCase()));

    if (loading) {
        return (
            <div className="min-h-screen bg-[#f7f1eb] flex items-center justify-center p-4">
                <div className="w-10 h-10 border-4 border-t-transparent border-[#d9a65a] rounded-full animate-spin"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#f7f1eb] text-[#3b2f2f] font-sans pb-32">
            {/* Minimalist Header */}
            <header className="bg-white/80 backdrop-blur-md sticky top-0 z-50 border-b border-[#d9a65a]/20 shadow-sm">
                <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
                    <img src={companyInfo?.logo || "/images/logo-official.png"} alt="Logo" className="h-10 w-auto" />
                    <div className="flex items-center gap-2 bg-red-50 text-red-600 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border border-red-100">
                        <ShieldAlert size={12} /> Contingência
                    </div>
                </div>
            </header>

            <main className="max-w-4xl mx-auto px-4 py-8">
                {/* Hero Section */}
                <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-[#3b2f2f] rounded-3xl p-8 mb-10 text-white relative overflow-hidden shadow-2xl"
                >
                    <div className="absolute top-0 right-0 w-64 h-64 bg-[#d9a65a]/10 rounded-full blur-3xl -mr-32 -mt-32" />
                    <div className="relative z-10">
                        <h1 className="text-3xl md:text-4xl font-serif font-bold mb-4">Menu de Emergência</h1>
                        <p className="text-gray-300 text-sm md:text-base leading-relaxed mb-6">
                            Estamos a realizar melhorias técnicas no nosso portal principal. Para garantir que o seu pão fresco chegue até si, ativamos este canal direto via WhatsApp.
                        </p>
                        <div className="flex flex-wrap gap-4">
                            <div className="flex items-center gap-2 text-xs font-bold text-[#d9a65a] uppercase tracking-wider">
                                <Clock size={16} /> Resposta Imediata
                            </div>
                            <div className="flex items-center gap-2 text-xs font-bold text-[#d9a65a] uppercase tracking-wider">
                                <ShoppingBag size={16} /> Encomendas Abertas
                            </div>
                        </div>
                    </div>
                </motion.div>

                {/* Simplified Menu List */}
                <div className="space-y-12">
                    {categories.map(cat => {
                        const items = filteredByCategory(cat);
                        if (items.length === 0) return null;

                        return (
                            <section key={cat}>
                                <div className="flex items-center gap-4 mb-6">
                                    <h2 className="text-2xl font-serif font-bold text-[#3b2f2f]">{cat}</h2>
                                    <div className="flex-1 h-px bg-gray-200" />
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {items.map(p => (
                                        <motion.div 
                                            key={p.id}
                                            whileHover={{ scale: 1.01 }}
                                            className="bg-white rounded-2xl p-4 flex items-center justify-between shadow-sm border border-gray-100 group"
                                        >
                                            <div className="flex items-center gap-4">
                                                {p.image ? (
                                                    <img src={p.image} alt={p.name} className="w-16 h-16 rounded-xl object-cover border border-gray-50" />
                                                ) : (
                                                    <div className="w-16 h-16 bg-gray-50 rounded-xl flex items-center justify-center text-gray-300">
                                                        <Package size={24} />
                                                    </div>
                                                )}
                                                <div>
                                                    <h3 className="font-bold text-[#3b2f2f] text-sm group-hover:text-[#d9a65a] transition-colors">
                                                        {p.name.charAt(0).toUpperCase() + p.name.slice(1).toLowerCase()}
                                                    </h3>
                                                    <span className="text-xs text-gray-400 block mb-1">{p.description || 'Disponível para encomenda'}</span>
                                                    <span className="text-sm font-black text-[#d9a65a]">
                                                        {p.price?.toLocaleString()} MT
                                                    </span>
                                                </div>
                                            </div>
                                            <button 
                                                onClick={handleWhatsAppOrder}
                                                className="p-3 bg-[#f7f1eb] text-[#3b2f2f] rounded-xl hover:bg-[#d9a65a] hover:text-white transition-all shadow-sm active:scale-95"
                                            >
                                                <ChevronRight size={20} />
                                            </button>
                                        </motion.div>
                                    ))}
                                </div>
                            </section>
                        );
                    })}
                </div>

                {/* Info Card */}
                <div className="mt-16 bg-amber-50 border border-amber-100 rounded-3xl p-8 text-center">
                    <div className="w-12 h-12 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Info size={24} />
                    </div>
                    <h3 className="text-lg font-bold text-amber-900 mb-2">Compromisso com a Qualidade</h3>
                    <p className="text-amber-800/80 text-sm leading-relaxed max-w-sm mx-auto">
                        Apesar da manutenção técnica, a nossa produção continua a todo vapor. Receba os mesmos produtos frescos, com a conveniência do WhatsApp.
                    </p>
                </div>
            </main>

            {/* Sticky Order Button */}
            <div className="fixed bottom-0 inset-x-0 p-6 z-[60] bg-gradient-to-t from-[#f7f1eb] via-[#f7f1eb] to-transparent">
                <div className="max-w-4xl mx-auto">
                    <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={handleWhatsAppOrder}
                        className="w-full bg-[#25D366] text-white py-4 rounded-2xl font-black text-lg uppercase tracking-widest shadow-[0_20px_50px_rgba(37,211,102,0.3)] flex items-center justify-center gap-3 group relative overflow-hidden"
                    >
                        <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
                        <MessageSquare size={24} fill="white" />
                        Finalizar Pedido no WhatsApp
                        <ExternalLink size={18} />
                    </motion.button>
                    <p className="text-center mt-4 text-[10px] text-gray-400 font-bold uppercase tracking-widest">
                        Atendimento Humano em Tempo Real
                    </p>
                </div>
            </div>
        </div>
    );
};
