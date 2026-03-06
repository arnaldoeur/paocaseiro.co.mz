import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { CheckCircle, MapPin, Phone, User, Store, ArrowLeft, Loader, Download, Printer } from 'lucide-react';
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
        <div className="min-h-screen bg-[#f7f1eb] print:bg-white print:min-h-0 print:block p-4 md:p-8 print:p-0 flex items-center justify-center print:justify-start font-sans">
            <style>
                {`
                    @media print {
                        body {
                            print-color-adjust: exact;
                            -webkit-print-color-adjust: exact;
                            background-color: white !important;
                        }
                        @page {
                            margin: 1cm;
                        }
                    }
                `}
            </style>
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-2xl print:rounded-none w-full max-w-lg print:max-w-full shadow-2xl print:shadow-none flex flex-col overflow-hidden"
            >
                {/* Header */}
                <div className="p-6 bg-[#3b2f2f] text-[#f7f1eb] text-center rounded-t-2xl print:rounded-none">
                    <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-2" />
                    <h1 className="text-2xl font-serif font-bold">Pão Caseiro</h1>
                    <p className="text-sm text-gray-400">Recibo do Pedido #{order.short_id}</p>
                </div>

                {/* Content */}
                <div className="p-8 bg-[#fffbf5] print:bg-white text-black">
                    <div className="border-b-2 border-[#d9a65a] pb-6 mb-6 text-center">
                        <img src="/paocaseiropng.png" alt="Pão Caseiro" className="h-16 mx-auto mb-2 object-contain" />
                        <p className="text-xs text-gray-500 uppercase tracking-widest font-bold">Padaria, Pastelaria e Café</p>
                    </div>

                    <div className="flex justify-between items-start mb-8 text-sm">
                        <div className="space-y-1">
                            <p className="text-gray-500 uppercase text-[10px] font-bold">CLIENTE</p>
                            <p className="font-bold text-[#3b2f2f] print:text-black">{order.customer_name}</p>
                            <p className="text-gray-600 print:text-black">{order.customer_phone}</p>
                        </div>
                        <div className="space-y-1 text-right">
                            <p className="text-gray-500 uppercase text-[10px] font-bold">DATA</p>
                            <p className="text-gray-600 print:text-black">{new Date(order.created_at).toLocaleDateString()}</p>
                            <p className="text-[10px] uppercase font-bold text-gray-400 mt-2">Status</p>
                            <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${order.status === 'completed' ? 'bg-green-100 text-green-700' :
                                order.status === 'pending' ? 'bg-orange-100 text-orange-700' : 'bg-red-100 text-red-700'
                                }`}>
                                {order.status}
                            </span>
                        </div>
                    </div>

                    <div className="bg-white p-4 rounded-xl border border-gray-100 mb-6 space-y-2 shadow-sm">
                        <div className="flex items-center gap-2 text-sm font-bold text-[#3b2f2f]">
                            {order.delivery_type === 'delivery' ? <MapPin className="w-4 h-4 text-[#d9a65a]" /> : <Store className="w-4 h-4 text-[#d9a65a]" />}
                            {order.delivery_type === 'delivery' ? 'Entrega ao Domicílio' : 'Levantamento na Loja'}
                        </div>
                        {order.delivery_address && (
                            <p className="text-xs text-gray-600 pl-6 italic">"{order.delivery_address}"</p>
                        )}
                    </div>

                    <table className="w-full text-sm mb-6">
                        <thead className="text-gray-500 border-b border-[#d9a65a]/20">
                            <tr>
                                <th className="text-left py-2 font-bold text-[10px] uppercase">Item</th>
                                <th className="text-center py-2 font-bold text-[10px] uppercase">Qtd</th>
                                <th className="text-right py-2 font-bold text-[10px] uppercase">Total</th>
                            </tr>
                        </thead>
                        <tbody className="text-[#3b2f2f]">
                            {order.items?.map((item, idx) => (
                                <tr key={idx} className="border-b border-gray-100 last:border-0">
                                    <td className="py-3 font-medium">{item.product_name}</td>
                                    <td className="py-3 text-center">{item.quantity}</td>
                                    <td className="py-3 text-right font-bold">{item.subtotal} MT</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    <div className="space-y-2 text-right pt-4 border-t-2 border-[#d9a65a]">
                        <div className="flex justify-between items-center text-xl font-bold text-[#3b2f2f] border-b pb-2 mb-2">
                            <span className="text-sm text-gray-500 uppercase tracking-widest">Subtotal Itens</span>
                            <span>{order.total_amount - (order.delivery_fee || 0) - (order.packaging_fee || 0)} MT</span>
                        </div>
                        {(order.delivery_fee || 0) > 0 && (
                            <div className="flex justify-between items-center text-sm text-blue-600 font-bold border-b pb-2 mb-2">
                                <span className="uppercase">Taxa de Entrega</span>
                                <span>+{order.delivery_fee} MT</span>
                            </div>
                        )}
                        {(order.packaging_fee || 0) > 0 && (
                            <div className="flex justify-between items-center text-sm text-orange-600 font-bold border-b pb-2 mb-2">
                                <span className="uppercase">Taxa de Embalagem</span>
                                <span>+{order.packaging_fee} MT</span>
                            </div>
                        )}
                        <div className="flex justify-between items-center text-xl font-bold text-[#3b2f2f] pt-2">
                            <span className="text-sm text-gray-500 uppercase tracking-widest">TOTAL</span>
                            <span>{order.total_amount} MT</span>
                        </div>
                        <div className="flex justify-between items-center text-green-600 font-bold">
                            <span className="text-xs uppercase">Pago</span>
                            <span>{order.amount_paid} MT</span>
                        </div>
                        {order.balance > 0 && (
                            <div className="flex justify-between items-center text-red-500 font-bold">
                                <span className="text-xs uppercase">Falta Pagar</span>
                                <span>{order.balance} MT</span>
                            </div>
                        )}
                    </div>

                    <div className="mt-8 pt-8 border-t border-dotted border-gray-300 text-center text-[10px] text-gray-400 space-y-1">
                        <p className="font-serif italic text-[#d9a65a] text-sm py-2">"O sabor que aquece o coração"</p>
                        <p>Lichinga, Av. Acordo de Lusaka | +258 87 9146 662</p>
                    </div>
                </div>

                {/* Footer Actions */}
                <div className="p-4 bg-gray-50 border-t flex flex-col md:flex-row gap-2 print:hidden">
                    <button onClick={() => window.print()} className="flex-1 bg-[#3b2f2f] text-[#d9a65a] py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-black transition-colors">
                        <Printer size={18} /> Imprimir Recibo
                    </button>
                    <Link to="/" className="flex-1 bg-white border border-gray-200 text-gray-600 py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-gray-100 transition-colors">
                        Pedir Mais
                    </Link>
                </div>
            </motion.div>
        </div>
    );
};
