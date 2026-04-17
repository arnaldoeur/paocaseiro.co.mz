import React, { useEffect, useState, useRef } from 'react';
import { supabase } from '../../services/supabase';
import { Bell, ShoppingBag, MessageSquare, Ticket, Settings, Info, AlertTriangle, CheckCircle, Clock, Users } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface SystemNotification {
    id: string;
    created_at: string;
    title: string;
    message: string;
    type: 'order' | 'support' | 'system' | 'user';
    link?: string;
    entity_id?: string;
    read: boolean;
}

export const AdminNotifications: React.FC = () => {
    const [notifications, setNotifications] = useState<SystemNotification[]>([]);
    const [loading, setLoading] = useState(true);
    const [unreadCount, setUnreadCount] = useState(0);
    const [soundEnabled, setSoundEnabled] = useState(true);
    const audioRef = useRef<HTMLAudioElement | null>(null);

    // Notification sound
    useEffect(() => {
        audioRef.current = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3'); 
    }, []);

    const fetchNotifications = async () => {
        try {
            // Fetch from the unified notifications table
            const { data, error } = await supabase
                .from('notifications')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(50);

            if (error) throw error;
            setNotifications(data || []);
            setUnreadCount(data?.filter(n => !n.read).length || 0);
        } catch (err) {
            console.error("Error fetching notifications:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchNotifications();

        // Subscribe to real-time changes on the notifications table
        const subscription = supabase
            .channel('notifications_channel')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications' }, (payload) => {
                const newNotification = payload.new as SystemNotification;
                setNotifications(prev => [newNotification, ...prev].slice(0, 50));
                setUnreadCount(c => c + 1);
                
                if (soundEnabled && audioRef.current) {
                    audioRef.current.play().catch(e => console.warn("Audio play blocked:", e));
                }
            })
            .subscribe();

        return () => {
            subscription.unsubscribe();
        };
    }, [soundEnabled]);

    const markAsRead = async (id: string) => {
        try {
            await supabase.from('notifications').update({ read: true }).eq('id', id);
            setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
            setUnreadCount(c => Math.max(0, c - 1));
        } catch (err) {
            console.error("Error marking notification as read:", err);
        }
    };

    const markAllRead = async () => {
        try {
            await supabase.from('notifications').update({ read: true }).eq('read', false);
            setNotifications(prev => prev.map(n => ({ ...n, read: true })));
            setUnreadCount(0);
        } catch (err) {
            console.error("Error marking all notifications as read:", err);
        }
    };

    const getIcon = (type: string) => {
        switch (type.toLowerCase()) {
            case 'order': return <ShoppingBag className="w-5 h-5 text-emerald-500" />;
            case 'support': return <MessageSquare className="w-5 h-5 text-blue-500" />;
            case 'ticket': return <Ticket className="w-5 h-5 text-amber-500" />;
            case 'user': return <Users className="w-5 h-5 text-indigo-500" />;
            default: return <Settings className="w-5 h-5 text-gray-500" />;
        }
    };

    const getSeverityBadge = (type: string) => {
        // Since notifications table doesn't have 'level', we infer from type or just use standard
        switch (type.toLowerCase()) {
            case 'order': return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-600 uppercase">Novo Pedido</span>;
            case 'support': return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-600 uppercase">Suporte</span>;
            case 'system': return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-600 uppercase">Sistema</span>;
            default: return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-gray-100 text-gray-600 uppercase">Info</span>;
        }
    };

    return (
        <div className="flex flex-col h-full bg-gray-50/50 rounded-3xl overflow-hidden border border-gray-100 backdrop-blur-sm">
            {/* Header */}
            <div className="p-4 md:p-6 bg-white border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="relative">
                        <div className={`p-2.5 rounded-2xl ${unreadCount > 0 ? 'bg-rose-50 text-rose-500' : 'bg-gray-50 text-gray-400'}`}>
                            <Bell className="w-6 h-6" />
                        </div>
                        {unreadCount > 0 && (
                            <span className="absolute -top-1 -right-1 bg-rose-500 text-white text-[10px] font-black w-5 h-5 flex items-center justify-center rounded-full border-2 border-white shadow-sm animate-pulse">
                                {unreadCount}
                            </span>
                        )}
                    </div>
                    <div>
                        <h2 className="text-lg md:text-xl font-black text-[#3b2f2f] tracking-tight leading-none">Centro de Notificações</h2>
                        <p className="text-[10px] md:text-xs text-gray-400 font-bold uppercase tracking-wider mt-1 opacity-70">Monitoria de Eventos em Tempo Real</p>
                    </div>
                </div>
                
                <div className="flex items-center gap-2 justify-end">
                    <button 
                        onClick={() => setSoundEnabled(!soundEnabled)}
                        className={`p-2.5 rounded-xl border transition-all duration-300 flex items-center gap-2 ${
                            soundEnabled 
                            ? 'bg-amber-50 border-amber-100 text-amber-600 shadow-sm' 
                            : 'bg-gray-50 border-gray-100 text-gray-400 opacity-60'
                        }`}
                        title={soundEnabled ? "Desativar Alerta Sonoro" : "Ativar Alerta Sonoro"}
                    >
                        <Clock className={`w-4 h-4 ${soundEnabled ? 'animate-pulse' : ''}`} />
                        <span className="text-[10px] font-black uppercase hidden lg:block">{soundEnabled ? 'Som Ativo' : 'Mudo'}</span>
                    </button>
                    <button 
                        onClick={markAllRead}
                        disabled={unreadCount === 0}
                        className="px-4 py-2.5 bg-[#3b2f2f] text-white text-xs font-black rounded-xl hover:bg-[#4a3b3b] disabled:opacity-30 disabled:grayscale transition-all shadow-md shadow-brown-500/10 active:scale-95 uppercase tracking-tighter"
                    >
                        Limpar Tudo
                    </button>
                </div>
            </div>

            {/* Notifications List */}
            <div className="flex-1 overflow-y-auto p-3 md:p-6 space-y-4 custom-scrollbar bg-white/30">
                {loading ? (
                    <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-4">
                        <div className="relative">
                            <div className="w-12 h-12 border-4 border-gray-100 border-t-[#d9a65a] rounded-full animate-spin"></div>
                            <div className="absolute inset-0 flex items-center justify-center">
                                <div className="w-2 h-2 bg-[#d9a65a] rounded-full animate-ping"></div>
                            </div>
                        </div>
                        <p className="text-xs font-bold uppercase tracking-widest opacity-50">Sincronizando Sistema...</p>
                    </div>
                ) : notifications.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-gray-400 py-12 px-6 text-center">
                        <div className="w-20 h-20 bg-gray-100/50 rounded-full flex items-center justify-center mb-6">
                            <Bell className="w-10 h-10 opacity-20" />
                        </div>
                        <h3 className="text-[#3b2f2f] font-black text-lg mb-2">Tudo em ordem!</h3>
                        <p className="text-sm font-medium max-w-[240px] leading-relaxed">Não existem novos eventos ou alertas críticos no sistema no momento.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-3 max-w-5xl mx-auto">
                        <AnimatePresence initial={false}>
                            {notifications.map((notif) => (
                                <motion.div
                                    key={notif.id}
                                    initial={{ opacity: 0, x: -20, scale: 0.98 }}
                                    animate={{ opacity: 1, x: 0, scale: 1 }}
                                    exit={{ opacity: 0, x: 20, scale: 0.95 }}
                                    onClick={() => !notif.read && markAsRead(notif.id)}
                                    className={`group p-4 md:p-5 rounded-2xl border transition-all duration-300 cursor-pointer relative overflow-hidden backdrop-blur-sm ${
                                        notif.read 
                                        ? 'bg-white border-gray-100 hover:border-gray-200 shadow-sm' 
                                        : 'bg-white border-[#3b2f2f]/10 shadow-xl shadow-[#3b2f2f]/5 ring-1 ring-[#3b2f2f]/5 active:scale-[0.99]'
                                    }`}
                                >
                                    {!notif.read && (
                                        <div className="absolute top-0 left-0 w-1.5 h-full bg-[#d9a65a] shadow-[2px_0_10px_rgba(217,166,90,0.3)]" />
                                    )}
                                    
                                    <div className="flex flex-col sm:flex-row gap-4">
                                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-110 ${
                                            notif.read ? 'bg-gray-50' : 'bg-[#d9a65a]/10'
                                        }`}>
                                            {getIcon(notif.type)}
                                        </div>
                                        
                                        <div className="flex-1 min-w-0">
                                            <div className="flex flex-wrap items-center justify-between mb-2 gap-2">
                                                <div className="flex items-center gap-2">
                                                    <h3 className={`text-sm md:text-base font-black tracking-tight underline-offset-4 ${notif.read ? 'text-gray-500' : 'text-[#3b2f2f]'}`}>
                                                        {notif.title}
                                                    </h3>
                                                    {getSeverityBadge(notif.type)}
                                                </div>
                                                <div className="flex items-center gap-1.5 px-2 py-1 bg-gray-50 rounded-lg shrink-0">
                                                    <Clock size={10} className="text-gray-400" />
                                                    <span className="text-[10px] font-bold text-gray-500 font-mono">
                                                        {new Date(notif.created_at).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })}
                                                    </span>
                                                </div>
                                            </div>
                                            <p className={`text-xs md:text-sm leading-relaxed font-medium break-words ${notif.read ? 'text-gray-400' : 'text-gray-600'}`}>
                                                {notif.message}
                                            </p>
                                            
                                            <div className="mt-4 flex items-center justify-between">
                                                <div className="flex items-center gap-1.5">
                                                    <span className="text-[10px] bg-gray-100 text-gray-400 px-2 py-0.5 rounded-md font-bold uppercase tracking-tighter">#{notif.type}</span>
                                                    {notif.entity_id && (
                                                        <span className="text-[10px] text-[#d9a65a] font-bold">ID: {notif.entity_id.slice(-8)}</span>
                                                    )}
                                                </div>
                                                {!notif.read && (
                                                    <span className="text-[10px] text-[#3b2f2f] font-black uppercase tracking-widest flex items-center gap-1">
                                                        <CheckCircle size={10} /> Marcar como lido
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    </div>
                )}
            </div>
            
            {/* Footer */}
            <div className="p-4 bg-white/60 border-t border-gray-100 backdrop-blur-md">
                <div className="flex flex-col sm:flex-row justify-between items-center gap-2 max-w-5xl mx-auto">
                    <p className="text-[10px] text-gray-400 uppercase tracking-widest font-black">
                        Pão Caseiro Dashboard • 2025
                    </p>
                    <div className="flex items-center gap-4 text-[10px] font-bold text-gray-300 uppercase">
                        <span>Sistema Ativo</span>
                        <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.5)]"></div>
                        <span className="hidden sm:inline">Tempo de Resposta: 45ms</span>
                    </div>
                </div>
            </div>
        </div>
    );
};
