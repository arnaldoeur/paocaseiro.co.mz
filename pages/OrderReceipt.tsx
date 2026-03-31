import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { CheckCircle, MapPin, Phone, User, Store, ArrowLeft, Loader, Download, Printer, ShoppingBag } from 'lucide-react';
import { motion } from 'framer-motion';
import { supabase } from '../services/supabase';

interface OrderItem {
    product_name: string;
    price: number;
    quantity: number;
    subtotal: number;
}

interface Order {
    id: string;
    short_id: string;
    created_at: string;
    customer_name: string;
    customer_phone: string;
    delivery_type: 'delivery' | 'pickup' | 'dine_in';
    delivery_address?: string;
    total_amount: number;
    amount_paid: number;
    balance: number;
    delivery_fee?: number;
    packaging_fee?: number;
    status: string;
    items?: OrderItem[];
}

export const OrderReceipt: React.FC = () => {
    const { orderId } = useParams<{ orderId: string }>();
    const [order, setOrder] = useState<Order | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchOrder = async () => {
            try {
                const { data, error } = await supabase
                    .from('orders')
                    .select('*, items:order_items(*)')
                    .eq('short_id', orderId)
                    .single();

                if (error) throw error;
                setOrder(data);
            } catch (err: any) {
                console.error("Error fetching order:", err);
                setError(err.message || "Pedido não encontrado");
            } finally {
                setLoading(false);
            }
        };

        if (orderId) fetchOrder();
    }, [orderId]);

    if (loading) {
        return (
            <div className="min-h-screen bg-[#f7f1eb] flex items-center justify-center">
                <Loader className="w-8 h-8 text-[#d9a65a] animate-spin" />
            </div>
        );
    }

    if (error || !order) {
        return (
            <div className="min-h-screen bg-[#f7f1eb] flex flex-col items-center justify-center p-6 text-center">
                <div className="bg-white p-8 rounded-2xl shadow-xl max-w-sm w-full">
                    <p className="text-red-500 font-bold mb-4">{error || "Pedido não encontrado"}</p>
                    <Link to="/" className="text-[#d9a65a] font-bold hover:underline flex items-center justify-center gap-2">
                        <ArrowLeft size={16} /> Voltar ao Início
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#fcf9f6] print:bg-white print:min-h-0 p-4 md:p-10 flex items-center justify-center font-sans relative overflow-hidden">
            {/* Background Decorative Elements */}
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-[#d9a65a]/5 rounded-full blur-[120px] pointer-events-none"></div>
            <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-[#3b2f2f]/5 rounded-full blur-[120px] pointer-events-none"></div>

            <style>
                {`
                    @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600;800&family=Playfair+Display:ital,wght@0,700;0,900;1,700&display=swap');
                    
                    body {
                        font-family: 'Outfit', sans-serif;
                    }
                    .font-serif {
                        font-family: 'Playfair Display', serif;
                    }
                    @media print {
                        body {
                            print-color-adjust: exact;
                            -webkit-print-color-adjust: exact;
                            background-color: white !important;
                        }
                        .no-print {
                            display: none !important;
                        }
                        .print-shadow-none {
                            border: 1px solid #eee !important;
                            box-shadow: none !important;
                        }
                    }
                    .glass-receipt {
                        background: rgba(255, 255, 255, 0.8);
                        backdrop-filter: blur(10px);
                        border: 1px solid rgba(217, 166, 90, 0.1);
                    }
                `}
            </style>

            <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white glass-receipt rounded-[2.5rem] print:rounded-none w-full max-w-xl print:max-w-full shadow-[0_32px_64px_-16px_rgba(59,47,47,0.1)] print:shadow-none flex flex-col overflow-hidden relative"
            >
                {/* Top Brand Bar */}
                <div className="h-2 bg-gradient-to-r from-[#3b2f2f] via-[#d9a65a] to-[#3b2f2f]"></div>

                {/* Navigation - No Print */}
                <div className="px-8 pt-8 flex justify-between items-center no-print">
                    <button
                        onClick={() => window.history.length > 1 ? window.history.back() : window.close()}
                        className="p-3 bg-white border border-gray-100 text-gray-400 hover:text-[#3b2f2f] hover:border-[#d9a65a] rounded-2xl transition-all shadow-sm group"
                        title="Voltar"
                    >
                        <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
                    </button>
                    
                    <div className="flex gap-2">
                        {/* Share Button */}
                        <button 
                            onClick={() => {
                                const text = `Olá! Aqui está o meu recibo do Pão Caseiro (Pedido #${order.short_id}).\n\nConsulte os detalhes em: ${window.location.href}`;
                                window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
                            }}
                            title="Partilhar no WhatsApp" 
                            className="p-3 bg-[#25D366]/10 text-[#25D366] border border-[#25D366]/20 hover:bg-[#25D366] hover:text-white rounded-2xl transition-all shadow-sm flex items-center gap-2 group"
                        >
                            <Phone size={18} />
                            <span className="text-[10px] font-black uppercase tracking-widest hidden sm:inline">Partilhar</span>
                        </button>

                        <button 
                            onClick={() => window.print()} 
                            title="Imprimir / Guardar PDF" 
                            className="p-3 bg-white border border-gray-100 text-gray-400 hover:text-[#d9a65a] hover:border-[#d9a65a] rounded-2xl transition-all shadow-sm flex items-center gap-2 group"
                        >
                            <Printer size={20} />
                            <span className="text-[10px] font-black uppercase tracking-widest hidden sm:inline">Baixar PDF</span>
                        </button>
                    </div>
                </div>

                {/* Header Section */}
                <div className="px-10 pt-6 pb-8 text-center">
                    <div className="mb-6 relative inline-block">
                        <div className="absolute inset-0 bg-[#d9a65a]/20 blur-xl rounded-full scale-150 opacity-50"></div>
                        <img src="/logo_on_dark.png" alt="Pão Caseiro" className="h-24 relative z-10 mx-auto object-contain" />
                    </div>
                    <h1 className="text-3xl font-serif font-black text-[#3b2f2f] uppercase tracking-tighter mb-1">Pão Caseiro</h1>
                    <p className="text-[10px] text-[#d9a65a] font-black uppercase tracking-[0.3em] mb-4">Padaria • Pastelaria • Café</p>

                    <div className="flex items-center justify-center gap-2 mb-2">
                        <span className="h-[1px] w-8 bg-gray-200"></span>
                        <div className="bg-green-50 text-green-600 px-4 py-1.5 rounded-full flex items-center gap-2 border border-green-100">
                            <CheckCircle size={14} className="animate-pulse" />
                            <span className="text-[10px] font-black uppercase tracking-widest">Pedido Confirmado</span>
                        </div>
                        <span className="h-[1px] w-8 bg-gray-200"></span>
                    </div>
                    <p className="text-sm font-bold text-gray-400 font-mono">Nº {order.short_id}</p>
                </div>

                {/* Main Content Area */}
                <div className="px-10 pb-10 space-y-8">

                    {/* Customer & Info Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-gray-50/50 p-5 rounded-3xl border border-gray-100/50">
                            <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mb-3">Cliente</p>
                            <div className="flex items-center gap-3">
                                <div className="bg-white p-2 rounded-xl shadow-sm border border-gray-100"><User size={18} className="text-[#3b2f2f]" /></div>
                                <div>
                                    <p className="text-sm font-black text-[#3b2f2f] uppercase leading-none mb-1">{order.customer_name}</p>
                                    <p className="text-xs text-gray-500 font-medium">{order.customer_phone}</p>
                                </div>
                            </div>
                        </div>
                        <div className="bg-gray-50/50 p-5 rounded-3xl border border-gray-100/50">
                            <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mb-3">Método & Data</p>
                            <div className="flex items-center gap-3">
                                <div className="bg-white p-2 rounded-xl shadow-sm border border-gray-100"><Store size={18} className="text-[#3b2f2f]" /></div>
                                <div>
                                    <p className="text-sm font-black text-[#3b2f2f] uppercase leading-none mb-1">{order.delivery_type === 'delivery' ? 'Entrega' : 'Levantamento'}</p>
                                    <p className="text-xs text-gray-500 font-medium">{new Date(order.created_at).toLocaleDateString('pt-BR')}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Delivery Address if applicable */}
                    {order.delivery_type === 'delivery' && order.delivery_address && (
                        <div className="bg-[#fcfbf9] p-6 rounded-[2rem] border border-[#d9a65a]/10 flex gap-4 items-start">
                            <div className="bg-[#d9a65a]/10 p-3 rounded-2xl text-[#d9a65a]">
                                <MapPin size={22} />
                            </div>
                            <div>
                                <p className="text-[10px] text-[#d9a65a] font-black uppercase tracking-widest mb-1">Destino de Entrega</p>
                                <p className="text-sm text-[#3b2f2f] font-medium italic leading-relaxed">"{order.delivery_address}"</p>
                            </div>
                        </div>
                    )}

                    {/* Items List */}
                    <div className="space-y-4">
                        <div className="flex justify-between items-end border-b border-gray-100 pb-2">
                            <h3 className="text-[10px] text-gray-400 font-black uppercase tracking-widest">Detalhes do Pedido</h3>
                            <span className="text-[10px] text-gray-300 font-bold">{order.items?.length || 0} Itens</span>
                        </div>

                        <div className="space-y-4">
                            {order.items?.map((item, idx) => (
                                <div key={idx} className="group transition-all">
                                    <div className="flex justify-between items-center mb-1">
                                        <div className="flex items-center gap-3">
                                            <span className="w-8 h-8 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-center text-[10px] font-black text-[#3b2f2f]">{item.quantity}</span>
                                            <p className="text-sm font-bold text-[#3b2f2f] uppercase tracking-tight">{item.product_name}</p>
                                        </div>
                                        <p className="text-sm font-black text-[#3b2f2f]">{item.subtotal.toLocaleString()} MT</p>
                                    </div>
                                    <div className="h-[1px] w-full bg-gradient-to-r from-transparent via-gray-50 to-transparent group-last:hidden"></div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Totals Summary */}
                    <div className="bg-[#3b2f2f] rounded-[2.5rem] p-8 text-white relative overflow-hidden shadow-xl shadow-gray-200">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-[#d9a65a]/10 rounded-full -mr-16 -mt-16 blur-2xl"></div>

                        <div className="space-y-3 relative z-10">
                            <div className="flex justify-between items-center text-xs text-white/50 font-bold uppercase tracking-[0.2em]">
                                <span>Subtotal</span>
                                <span>{order.total_amount - (order.delivery_fee || 0) - (order.packaging_fee || 0)} MT</span>
                            </div>

                            {(order.delivery_fee || 0) > 0 && (
                                <div className="flex justify-between items-center text-xs text-[#d9a65a] font-bold uppercase tracking-[0.2em]">
                                    <span>Taxa de Entrega</span>
                                    <span>+{order.delivery_fee} MT</span>
                                </div>
                            )}

                            {(order.packaging_fee || 0) > 0 && (
                                <div className="flex justify-between items-center text-xs text-[#d9a65a] font-bold uppercase tracking-[0.2em]">
                                    <span>Embalagem</span>
                                    <span>+{order.packaging_fee} MT</span>
                                </div>
                            )}

                            <div className="h-[1px] w-full bg-white/10 my-4"></div>

                            <div className="flex justify-between items-end">
                                <div>
                                    <p className="text-[10px] text-white/40 font-black uppercase tracking-widest mb-1">Total a Pagar</p>
                                    <p className="text-3xl font-serif font-black tracking-tighter">{order.total_amount.toLocaleString()} <span className="text-lg">MT</span></p>
                                </div>
                                <div className="text-right">
                                    <p className="text-[10px] text-[#d9a65a] font-black uppercase tracking-widest mb-1">Status Pagamento</p>
                                    <p className={`text-xs font-black uppercase tracking-widest px-3 py-1 rounded-full ${order.amount_paid >= order.total_amount ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                                        {order.amount_paid >= order.total_amount ? 'PAGO FULL' : 'PENDENTE'}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Footer Branding */}
                    <div className="pt-8 border-t border-dashed border-gray-200 text-center space-y-4">
                        <p className="text-sm font-serif italic text-[#d9a65a] font-medium leading-relaxed">"O sabor que aquece o coração"</p>
                        <div className="flex flex-col items-center gap-1">
                            <p className="text-[9px] text-[#3b2f2f] font-black uppercase tracking-[0.4em]">Pão Caseiro Lichinga</p>
                            <p className="text-[9px] text-gray-400 font-medium">Av. Acordo de Lusaka | +258 87 9146 662</p>
                        </div>

                        <div className="no-print pt-6">
                            <Link to="/" className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-[#d9a65a] transition-colors border border-gray-100 rounded-full px-6 py-2 bg-white shadow-sm">
                                <ShoppingBag size={12} /> Novo Pedido
                            </Link>
                        </div>
                    </div>
                </div>
            </motion.div>

            {/* Print Only Footer (Hidden in UI) */}
            <div className="hidden print:block fixed bottom-4 w-full text-center text-[8px] text-gray-300">
                Gerado digitalmente por Pão Caseiro Systems • {new Date().toLocaleString()}
            </div>
        </div>
    );
};

