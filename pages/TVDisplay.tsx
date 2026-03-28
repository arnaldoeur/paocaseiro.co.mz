import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../services/supabase';
import { motion, AnimatePresence } from 'framer-motion';

export const TVDisplay: React.FC = () => {
    const [orders, setOrders] = useState<any[]>([]);

    useEffect(() => {
        const fetchOrders = async () => {
            const { data } = await supabase
                .from('orders')
                .select('id, short_id, status, created_at')
                .in('status', ['kitchen', 'processing', 'ready'])
                .order('created_at', { ascending: true });
            
            if (data) setOrders(data);
        };

        fetchOrders();

        const channel = supabase
            .channel('tv-display-orders')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'orders'
                },
                (payload) => {
                    const newOrder = payload.new as any;
                    const oldOrder = payload.old as any;
                    
                    if (payload.eventType === 'INSERT') {
                        if (['kitchen', 'processing', 'ready'].includes(newOrder.status)) {
                            setOrders(prev => [...prev, newOrder]);
                        }
                    } else if (payload.eventType === 'UPDATE') {
                        if (['kitchen', 'processing', 'ready'].includes(newOrder.status)) {
                            // Either insert or update
                            setOrders(prev => {
                                const exists = prev.find(o => o.id === newOrder.id);
                                if (exists) return prev.map(o => o.id === newOrder.id ? newOrder : o);
                                return [...prev, newOrder];
                            });
                        } else {
                            // Remove if it changed to e.g., 'completed', 'delivering', 'cancelled'
                            setOrders(prev => prev.filter(o => o.id !== newOrder.id));
                        }
                    } else if (payload.eventType === 'DELETE') {
                        setOrders(prev => prev.filter(o => o.id !== oldOrder.id));
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    // Filter for today's orders (24h Reset)
    const today = new Date().toISOString().split('T')[0];
    const todayOrders = useMemo(() => 
        orders.filter(o => o.created_at?.startsWith(today))
    , [orders, today]);

    const preparing = useMemo(() => 
        todayOrders.filter(o => o.status === 'preparing')
    , [todayOrders]);

    const ready = useMemo(() => 
        todayOrders.filter(o => o.status === 'ready')
    , [todayOrders]);

    return (
        <div className="min-h-screen bg-[#3b2f2f] text-white font-sans overflow-hidden flex flex-col">
            {/* Header */}
            <header className="bg-[#2a2121] py-6 px-10 shadow-xl flex justify-between items-center z-10">
                <div className="flex items-center gap-4">
                    <img src="/logo.png" alt="Pão Caseiro" className="h-12 w-auto object-contain" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                    <h1 className="font-serif text-4xl text-[#d9a65a] font-bold tracking-widest uppercase">Pão Caseiro</h1>
                </div>
                <div className="text-[#d9a65a] text-2xl font-bold font-mono tracking-widest">
                    Status Board
                </div>
            </header>

            {/* Split Screen Container */}
            <div className="flex-1 flex gap-8 p-8 relative">
                {/* Background Decorators */}
                <div className="absolute top-0 left-0 w-96 h-96 bg-[#d9a65a]/5 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
                <div className="absolute bottom-0 right-0 w-96 h-96 bg-[#d9a65a]/5 rounded-full blur-3xl translate-x-1/2 translate-y-1/2" />

                {/* Left Column: A Preparar */}
                <div className="flex-1 bg-[#2a2121]/80 backdrop-blur-sm rounded-3xl border border-white/5 shadow-2xl overflow-hidden flex flex-col">
                    <div className="bg-amber-500/20 py-6 text-center border-b border-amber-500/30">
                        <h2 className="text-4xl font-bold text-amber-500 uppercase tracking-widest">A Preparar</h2>
                    </div>
                    <div className="flex-1 overflow-y-auto custom-scrollbar pr-4">
                        <div className="grid grid-cols-1 gap-4">
                            {preparing.map((order: any) => (
                                <motion.div
                                    key={order.id}
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    className="bg-white/5 border border-white/10 rounded-2xl p-6 flex justify-between items-center transition-all hover:bg-white/10"
                                >
                                    <span className="text-5xl font-black text-amber-500 font-mono">
                                        #{order.order_number}
                                    </span>
                                </motion.div>
                            ))}
                        </div>
                        {preparing.length === 0 && (
                            <div className="col-span-full h-full flex items-center justify-center opacity-30 mt-20">
                                <p className="text-3xl font-bold uppercase tracking-widest">Nenhum Pedido</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Column: Pronto para Levantamento */}
                <div className="flex-1 bg-[#2a2121]/80 backdrop-blur-sm rounded-3xl border border-white/5 shadow-2xl overflow-hidden flex flex-col">
                    <div className="bg-green-500/20 py-6 text-center border-b border-green-500/30">
                        <h2 className="text-4xl font-bold text-green-400 uppercase tracking-widest">Pronto a Levantar</h2>
                    </div>
                    <div className="flex-1 p-8 grid grid-cols-2 lg:grid-cols-3 gap-6 content-start overflow-y-auto custom-scrollbar">
                        <AnimatePresence>
                            {ready.map((order: any) => (
                                <motion.div
                                    key={order.id}
                                    initial={{ opacity: 0, scale: 0.8 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.8 }}
                                    layout
                                    className="bg-green-500/10 border-2 border-green-400 rounded-2xl p-6 text-center shadow-lg"
                                >
                                    <span className="text-6xl font-mono font-bold text-green-400 tracking-wider">
                                        #{order.order_number}
                                    </span>
                                </motion.div>
                            ))}
                        </AnimatePresence>
                        {ready.length === 0 && (
                            <div className="col-span-full h-full flex items-center justify-center opacity-30 mt-20">
                                <p className="text-3xl font-bold uppercase tracking-widest">Nenhum Pedido</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Footer / Ticker */}
            <div className="bg-black/50 py-3 text-center border-t border-white/5">
                <p className="text-[#d9a65a] text-sm uppercase tracking-[0.3em] opacity-80">
                    Sabor que aquece o coração - Por favor aguarde o seu número
                </p>
            </div>
        </div>
    );
};
