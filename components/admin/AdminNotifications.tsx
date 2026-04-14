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
        <div className="flex flex-col h-full bg-gray-50/50 rounded-3xl overflow-hidden border border-gray-100">
            {/* Header */}
            <div className="p-6 bg-white border-b border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="relative">
                        <Bell className="w-6 h-6 text-[#3b2f2f]" />
                        {unreadCount > 0 && (
                            <span className="absolute -top-1 -right-1 bg-rose-500 text-white text-[10px] font-black w-4 h-4 flex items-center justify-center rounded-full border-2 border-white animate-pulse">
                                {unreadCount}
                            </span>
                        )}
                    </div>
                    <div>
                        <h2 className="text-xl font-black text-[#3b2f2f] tracking-tight">Centro de Notificações</h2>
                        <p className="text-xs text-gray-400 font-medium lowercase">Feed de eventos do sistema em tempo-real</p>
                    </div>
                </div>
                
                <div className="flex items-center gap-2">
                    <button 
                        onClick={() => setSoundEnabled(!soundEnabled)}
                        className={`p-2 rounded-xl border transition-all ${soundEnabled ? 'bg-amber-50 border-amber-100 text-amber-600' : 'bg-gray-50 border-gray-100 text-gray-400'}`}
                        title={soundEnabled ? "Desativar Som" : "Ativar Som"}
                    >
                        <Clock className={`w-4 h-4 ${soundEnabled ? 'animate-pulse' : ''}`} />
                    </button>
                    <button 
                        onClick={markAllRead}
                        disabled={unreadCount === 0}
                        className="px-4 py-2 bg-[#3b2f2f] text-white text-xs font-bold rounded-xl hover:bg-[#4a3b3b] disabled:opacity-50 disabled:grayscale transition-all shadow-md shadow-brown-500/10"
                    >
                        Limpar Tudo
                    </button>
                </div>
            </div>

            {/* Notifications List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                {loading ? (
                    <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-3">
                        <div className="w-8 h-8 border-4 border-gray-100 border-t-[#3b2f2f] rounded-full animate-spin"></div>
                        <p className="text-sm font-medium">A carregar eventos...</p>
                    </div>
                ) : notifications.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-gray-400 py-12">
                        <Bell className="w-12 h-12 mb-4 opacity-10" />
                        <p className="text-sm font-medium">Nenhum evento registado</p>
                    </div>
                ) : (
                    <AnimatePresence initial={false}>
                        {notifications.map((notif) => (
                            <motion.div
                                key={notif.id}
                                initial={{ opacity: 0, y: -20, scale: 0.95 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.9 }}
                                onClick={() => !notif.read && markAsRead(notif.id)}
                                className={`group p-4 rounded-2xl border transition-all cursor-pointer relative overflow-hidden ${
                                    notif.read 
                                    ? 'bg-white border-gray-100 opacity-70 hover:opacity-100 hover:border-gray-200' 
                                    : 'bg-white border-[#3b2f2f]/10 shadow-lg shadow-[#3b2f2f]/5 ring-1 ring-[#3b2f2f]/5'
                                }`}
                            >
                                {!notif.read && (
                                    <div className="absolute top-0 left-0 w-1 h-full bg-[#3b2f2f]" />
                                )}
                                
                                <div className="flex gap-4">
                                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
                                        notif.read ? 'bg-gray-50' : 'bg-[#3b2f2f]/5'
                                    }`}>
                                        {getIcon(notif.type)}
                                    </div>
                                    
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between mb-1">
                                            <h3 className={`text-sm font-black truncate ${notif.read ? 'text-gray-600' : 'text-[#3b2f2f]'}`}>
                                                {notif.title}
                                            </h3>
                                            <span className="text-[10px] font-bold text-gray-400 font-mono">
                                                {new Date(notif.created_at).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                                            </span>
                                        </div>
                                        <p className={`text-xs leading-relaxed ${notif.read ? 'text-gray-400' : 'text-gray-600'}`}>
                                            {notif.message}
                                        </p>
                                        
                                        <div className="mt-3 flex items-center gap-2">
                                            {getSeverityBadge(notif.type)}
                                            <span className="text-[10px] text-gray-300 font-medium">#{notif.type}</span>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                )}
            </div>
            
            {/* Footer */}
            <div className="p-4 bg-white/50 border-t border-gray-100">
                <p className="text-[10px] text-center text-gray-400 uppercase tracking-widest font-bold">
                    Monitorização em Tempo Real • Pão Caseiro Platform
                </p>
            </div>
        </div>
    );
};
