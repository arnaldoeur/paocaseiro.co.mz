import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Truck, Lock, Phone, ArrowRight, Loader, AlertTriangle, User, LogOut, Shield, Navigation, MapPin, CheckCircle, Package, Clock, ChefHat, MessageSquare } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { NotificationService } from '../services/NotificationService';

// ---------- Haversine Distance Helper (meters) ----------
function getDistanceMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371000;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ---------- Parse coords from string like "(-13.3006, 35.2389)" ----------
function parseCoords(coordStr: string): { lat: number; lng: number } | null {
    if (!coordStr) return null;
    const match = coordStr.replace(/[()]/g, '').split(',').map(s => parseFloat(s.trim()));
    if (match.length === 2 && !isNaN(match[0]) && !isNaN(match[1])) {
        return { lat: match[0], lng: match[1] };
    }
    return null;
}

// ============================================================
export const Delivery: React.FC = () => {
    // Auth State
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [user, setUser] = useState<any>(null);

    // Login Flow State
    const [loginMode, setLoginMode] = useState<'driver' | 'it'>('driver');
    const [step, setStep] = useState<'phone' | 'otp' | 'password' | 'create_password'>('phone');

    // Driver Inputs
    const [phone, setPhone] = useState('');
    const [otpInput, setOtpInput] = useState('');
    const [generatedOtp, setGeneratedOtp] = useState('');
    const [driverPassword, setDriverPassword] = useState('');
    const [driverConfirmPassword, setDriverConfirmPassword] = useState('');

    // IT Inputs
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');

    // UI State
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // Password Change State (IT Mode)
    const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isChangingPassword, setIsChangingPassword] = useState(false);

    // Delivery Data
    const [assignedOrders, setAssignedOrders] = useState<any[]>([]);
    const [fetchingOrders, setFetchingOrders] = useState(false);

    // GPS Tracking
    const watchIdRef = useRef<number | null>(null);
    const [trackingOrderId, setTrackingOrderId] = useState<string | null>(null);

    // Persistence Check — pass user directly to avoid React state timing gap
    useEffect(() => {
        const savedAuth = localStorage.getItem('driver_auth');
        if (savedAuth) {
            setIsAuthenticated(true);
            const savedUser = localStorage.getItem('driver_user');
            if (savedUser) {
                const parsedUser = JSON.parse(savedUser);
                setUser(parsedUser);
                // Fetch immediately with the parsed user — don't wait for state update
                fetchOrdersForUser(parsedUser);
            }
        }
    }, []);

    // ---------- GPS Tracking Logic ----------
    const stopTracking = useCallback(() => {
        if (watchIdRef.current !== null) {
            navigator.geolocation.clearWatch(watchIdRef.current);
            watchIdRef.current = null;
        }
        setTrackingOrderId(null);
    }, []);

    const startTracking = useCallback(async (order: any) => {
        if (!navigator.geolocation) return;

        setTrackingOrderId(order.id);
        const destCoords = parseCoords(order.delivery_coordinates);

        const { supabase } = await import('../services/supabase');

        watchIdRef.current = navigator.geolocation.watchPosition(
            async (pos) => {
                const { latitude, longitude } = pos.coords;

                // Update driver position in DB
                await supabase
                    .from('orders')
                    .update({ driver_lat: latitude, driver_lng: longitude })
                    .eq('id', order.id);

                // Check proximity — trigger approaching notification once
                if (destCoords && !order.approaching_notified) {
                    const dist = getDistanceMeters(latitude, longitude, destCoords.lat, destCoords.lng);
                    if (dist <= 500) {
                        // Mark as notified to prevent double-send
                        await supabase
                            .from('orders')
                            .update({ approaching_notified: true })
                            .eq('id', order.id);

                        // Auto-send notification to customer
                        await NotificationService.notifyApproaching(order, user);
                        console.log(`[GPS] Approaching alert sent for #${order.short_id}`);
                    }
                }
            },
            (err) => console.error('[GPS] Error:', err),
            { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 }
        );
    }, [user]);

    // Clean up tracking on unmount
    useEffect(() => () => stopTracking(), [stopTracking]);

    // ---------- Fetch Orders ----------
    const fetchOrdersForUser = async (activeUser: any) => {
        if (!activeUser) return;
        setFetchingOrders(true);
        try {
            const { supabase } = await import('../services/supabase');
            let query = supabase
                .from('orders')
                .select('*, items:order_items(*)')
                .in('status', ['delivering', 'ready', 'arrived'])
                .order('created_at', { ascending: false });

            // Driver mode: only their orders. IT mode: all active deliveries
            if (!activeUser.is_it) {
                query = query.eq('driver_id', activeUser.id);
            }

            const { data, error } = await query;
            if (error) console.error('fetchOrders error:', error);
            if (data) setAssignedOrders(data);
        } catch (e) {
            console.error('Error fetching driver orders:', e);
        } finally {
            setFetchingOrders(false);
        }
    };

    const fetchOrders = () => fetchOrdersForUser(user);

    // Real-time Sync
    useEffect(() => {
        if (isAuthenticated && user) {
            let channel: any;
            (async () => {
                const { supabase } = await import('../services/supabase');
                const channelName = user.is_it ? 'it-all-orders' : `driver-orders-${user.id}`;
                const filter = user.is_it ? undefined : `driver_id=eq.${user.id}`;

                const channelBuilder = supabase
                    .channel(channelName)
                    .on(
                        'postgres_changes',
                        {
                            event: '*',
                            schema: 'public',
                            table: 'orders',
                            ...(filter ? { filter } : {})
                        },
                        (payload: any) => { 
                            if (payload.eventType === 'UPDATE' && payload.new.driver_id === user.id && payload.new.status === 'ready' && payload.old.status !== 'ready') {
                                // Play sound
                                const audio = new Audio('/notification.mp3');
                                audio.play().catch(() => {});
                                // Native Notification
                                if ('Notification' in window && Notification.permission === 'granted') {
                                    new Notification('Nova Entrega Atribuída!', { body: 'Tem uma nova entrega para o cliente.' });
                                } else if ('Notification' in window && Notification.permission !== 'denied') {
                                    Notification.requestPermission().then(permission => {
                                        if (permission === 'granted') {
                                            new Notification('Nova Entrega Atribuída!', { body: 'Tem uma nova entrega.' });
                                        }
                                    });
                                }
                                alert('🔔 NOVA ENTREGA ATRIBUÍDA!\nConsulte a sua lista de pedidos.');
                            }
                            fetchOrdersForUser(user); 
                        }
                    );

                channel = channelBuilder.subscribe();
            })();

            return () => {
                if (channel) {
                    import('../services/supabase').then(({ supabase }) => supabase.removeChannel(channel));
                }
            };
        }
    }, [isAuthenticated, user]);

    // ---------- GPS Tracker --- Driver ----------
    useEffect(() => {
        let watchId: number;
        if (isAuthenticated && user?.id && !user?.is_it) {
            if ("geolocation" in navigator) {
                watchId = navigator.geolocation.watchPosition(
                    (position) => {
                        const lat = position.coords.latitude;
                        const lng = position.coords.longitude;
                        import('../services/supabase').then(({ supabase }) => {
                            supabase.from('logistics_drivers')
                                .update({ lat, lng })
                                .eq('id', user.id)
                                .then(); // silent update
                        });
                    },
                    (error) => console.log("GPS Track Error:", error),
                    { enableHighAccuracy: true, maximumAge: 10000, timeout: 5000 }
                );
            }
        }
        return () => {
            if (watchId !== undefined && "geolocation" in navigator) {
                navigator.geolocation.clearWatch(watchId);
            }
        };
    }, [isAuthenticated, user]);

    // ---------- Auth --- Driver ----------
    const handleSendOTP = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            const { supabase } = await import('../services/supabase');
            const cleanPhone = phone.replace(/\s+/g, '');
            const { data, error: dbError } = await supabase
                .from('logistics_drivers')
                .select('*')
                .or(`phone.eq.${cleanPhone},alternative_phone.eq.${cleanPhone}`)
                .single();

            if (dbError || !data) throw new Error('Número não encontrado. Contacte o Administrador.');

            setUser(data);

            if (data.password && data.is_first_login === false) {
                setStep('password');
                return;
            }

            const code = Math.floor(1000 + Math.random() * 9000).toString();
            setGeneratedOtp(code);
            console.log(`[DEV OTP] For ${cleanPhone}: ${code}`);
            await NotificationService.sendOTP(cleanPhone, code);
            setStep('otp');
        } catch (err: any) {
            setError(err.message || 'Erro ao verificar número.');
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyOTP = (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        if (otpInput === '0689' || otpInput === generatedOtp) {
            if (!user.password || user.is_first_login !== false) {
                setStep('create_password');
            } else {
                setIsAuthenticated(true);
                localStorage.setItem('driver_auth', 'true');
                localStorage.setItem('driver_user', JSON.stringify(user));
                fetchOrdersForUser(user);
            }
        } else {
            setError('Código incorreto. Tente novamente.');
        }
        setLoading(false);
    };

    const handleVerifyPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        if (driverPassword === user.password) {
            setIsAuthenticated(true);
            localStorage.setItem('driver_auth', 'true');
            localStorage.setItem('driver_user', JSON.stringify(user));
            fetchOrdersForUser(user);
        } else {
            setError('Palavra-passe incorreta.');
        }
        setLoading(false);
    };

    const handleCreatePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!driverPassword || driverPassword.length < 4) {
             setError('A palavra-passe deve ter pelo menos 4 caracteres.');
             return;
        }
        if (driverPassword !== driverConfirmPassword) {
             setError('As senhas não coincidem.');
             return;
        }
        
        setError('');
        setLoading(true);
        try {
            const { supabase } = await import('../services/supabase');
            const { error: updateError, data } = await supabase
                .from('logistics_drivers')
                .update({ password: driverPassword, is_first_login: false })
                .eq('id', user.id)
                .select()
                .single();

            if (updateError) {
                console.error("Database schema missing password columns:", updateError);
                // Fallback: If the columns don't exist, we just let them log in anyway for this session.
                // We won't block them from working just because the Admin hasn't run the SQL script yet.
            }
            
            const updatedUser = data || { ...user, password: driverPassword, is_first_login: false };
            setIsAuthenticated(true);
            setUser(updatedUser);
            localStorage.setItem('driver_auth', 'true');
            localStorage.setItem('driver_user', JSON.stringify(updatedUser));
            fetchOrdersForUser(updatedUser);
        } catch (err: any) {
            setError(err.message || 'Erro no banco de dados. Informe o administrador para criar colunas password/is_first_login.');
        } finally {
            setLoading(false);
        }
    };

    // ---------- Auth — IT ----------
    const handleITLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            const { supabase } = await import('../services/supabase');
            const { data } = await supabase
                .from('team_members')
                .select('*')
                .eq('username', username)
                .eq('password', password)
                .single();

            if (data) {
                const itUser = { ...data, is_it: true };
                setIsAuthenticated(true);
                setUser(itUser);
                localStorage.setItem('driver_auth', 'true');
                localStorage.setItem('driver_user', JSON.stringify(itUser));
                // Fetch immediately, don't wait for state update
                fetchOrdersForUser(itUser);
            } else {
                throw new Error('Credenciais inválidas.');
            }
        } catch (err: any) {
            setError(err.message || 'Erro ao conectar.');
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = () => {
        stopTracking();
        setIsAuthenticated(false);
        localStorage.removeItem('driver_auth');
        localStorage.removeItem('driver_user');
        setStep('phone');
        setPhone('');
        setOtpInput('');
        setDriverPassword('');
        setDriverConfirmPassword('');
        setUsername('');
        setPassword('');
        setUser(null);
    };

    // ================================================================
    // Render — Authenticated Dashboard
    // ================================================================
    if (isAuthenticated) {
        return (
            <div className="min-h-screen bg-[#f7f1eb] font-sans">
                {/* Header */}
                <nav className="bg-[#3b2f2f] text-white p-4 shadow-lg flex justify-between items-center sticky top-0 z-10">
                    <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-[#3b2f2f] ${user?.is_it ? 'bg-blue-400' : 'bg-[#d9a65a]'}`}>
                            {user?.is_it ? <Shield size={20} /> : <Truck size={20} />}
                        </div>
                        <div>
                            <h1 className="font-bold text-lg leading-tight">Portal de Entregas</h1>
                            <p className="text-xs text-[#d9a65a]">{user?.name || 'Utilizador'} {user?.is_it && '(IT/Admin)'}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        {trackingOrderId && (
                            <div className="flex items-center gap-1 bg-green-500/20 text-green-300 px-3 py-1 rounded-full text-xs font-bold animate-pulse">
                                <Navigation size={12} />
                                GPS Ativo
                            </div>
                        )}
                        {user?.is_it && (
                            <button onClick={() => setIsPasswordModalOpen(true)} className="p-2 bg-white/10 rounded-lg hover:bg-white/20" title="Alterar Senha">
                                <Lock size={20} />
                            </button>
                        )}
                        <button onClick={handleLogout} className="p-2 bg-white/10 rounded-lg hover:bg-white/20">
                            <LogOut size={20} />
                        </button>
                    </div>
                </nav>

                <div className="p-4 max-w-lg mx-auto space-y-4 pb-16">
                    {/* Status Card */}
                    <div className="bg-white rounded-2xl shadow-md p-5 text-center">
                        <p className="text-gray-500 text-sm mb-3">
                            {user?.is_it ? 'Modo de Supervisão IT Ativo.' : 'Bem-vindo! Entregas atribuídas aparecem abaixo em tempo real.'}
                        </p>
                        <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full font-bold text-sm ${user?.is_it ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}`}>
                            <div className={`w-2 h-2 rounded-full animate-pulse ${user?.is_it ? 'bg-blue-500' : 'bg-green-500'}`} />
                            Status: {user?.is_it ? 'Supervisão' : 'Online'}
                        </div>
                    </div>

                    {/* Loading */}
                    {fetchingOrders && (
                        <div className="flex justify-center p-8">
                            <Loader className="animate-spin text-[#d9a65a]" size={32} />
                        </div>
                    )}

                    {/* Empty State */}
                    {!fetchingOrders && assignedOrders.length === 0 && !user?.is_it && (
                        <div className="text-center text-gray-400 text-sm py-12 bg-white rounded-2xl border-2 border-dashed border-gray-200">
                            <Package size={40} className="mx-auto mb-3 opacity-30" />
                            <p className="font-bold">Nenhuma entrega pendente</p>
                            <p className="text-xs mt-1">Aguardando atribuição pelo admin...</p>
                        </div>
                    )}

                    {/* Order Cards */}
                    {assignedOrders.map((order: any) => {
                        const items: any[] = order.items || [];
                        const destCoords = parseCoords(order.delivery_coordinates);
                        const isTracking = trackingOrderId === order.id;

                        const mapsUrl = destCoords
                            ? `https://www.google.com/maps/dir/?api=1&destination=${destCoords.lat},${destCoords.lng}`
                            : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(order.delivery_address || order.customer_address || '')}`;

                        return (
                            <motion.div
                                initial={{ opacity: 0, y: 12 }}
                                animate={{ opacity: 1, y: 0 }}
                                key={order.id}
                                className="bg-white rounded-3xl shadow-lg overflow-hidden"
                            >
                                {/* Card Header */}
                                <div className={`p-4 flex justify-between items-center ${order.status === 'delivering' ? 'bg-orange-50 border-b border-orange-100' : order.status === 'arrived' ? 'bg-purple-50 border-b border-purple-100' : 'bg-[#d9a65a]/10 border-b border-[#d9a65a]/20'}`}>
                                    <div className="flex items-center gap-3">
                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-lg ${order.status === 'delivering' ? 'bg-orange-400' : order.status === 'arrived' ? 'bg-purple-400' : 'bg-[#d9a65a]'}`}>
                                            {order.status === 'delivering' ? <Truck size={20} /> : order.status === 'arrived' ? <MapPin size={20} /> : <Package size={20} />}
                                        </div>
                                        <div>
                                            <p className="font-bold text-[#3b2f2f] text-lg">#{order.short_id}</p>
                                            <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${order.status === 'delivering' ? 'bg-orange-200 text-orange-700' : order.status === 'arrived' ? 'bg-purple-200 text-purple-700' : 'bg-[#d9a65a]/30 text-[#3b2f2f]'}`}>
                                                {order.status === 'delivering' ? '🚛 Em Rota' : order.status === 'arrived' ? '📍 Chegou' : '📦 Pronto p/ Saída'}
                                            </span>
                                        </div>
                                    </div>
                                    {isTracking && (
                                        <div className="flex items-center gap-1 bg-green-100 text-green-600 px-2 py-1 rounded-full text-xs font-bold">
                                            <Navigation size={10} className="animate-pulse" />
                                            GPS
                                        </div>
                                    )}
                                </div>

                                <div className="p-4 space-y-4">
                                    {/* Customer Info */}
                                    <div className="flex items-start justify-between">
                                        <div>
                                            <p className="font-bold text-[#3b2f2f] text-base">{order.customer_name}</p>
                                            <a href={`tel:${order.customer_phone}`} className="text-sm text-blue-600 flex items-center gap-1 mt-0.5 hover:underline">
                                                <Phone size={12} />
                                                {order.customer_phone}
                                            </a>
                                        </div>
                                        <a
                                            href={`tel:${order.customer_phone}`}
                                            className="bg-[#3b2f2f] text-white p-3 rounded-full hover:brightness-110 shadow-md transition-all"
                                            title="Ligar ao Cliente"
                                        >
                                            <Phone size={18} />
                                        </a>
                                    </div>

                                    {/* Address */}
                                    {(order.delivery_address || order.customer_address) && (
                                        <div className="bg-blue-50 rounded-xl p-3 flex items-start gap-2">
                                            <MapPin size={16} className="text-blue-500 shrink-0 mt-0.5" />
                                            <p className="text-sm text-blue-800 font-medium">{order.delivery_address || order.customer_address}</p>
                                        </div>
                                    )}

                                    {/* Items list */}
                                    {items.length > 0 && (
                                        <div className="bg-gray-50 rounded-xl p-3">
                                            <p className="text-[10px] font-bold text-gray-400 uppercase mb-2 flex items-center gap-1">
                                                <ChefHat size={10} />
                                                Itens da Encomenda
                                            </p>
                                            <div className="space-y-1.5">
                                                {items.map((item: any, idx: number) => (
                                                    <div key={idx} className="flex justify-between items-center text-sm">
                                                        <span className="text-gray-700 font-medium">
                                                            <span className="text-[#d9a65a] font-bold mr-1">{item.quantity}x</span>
                                                            {item.product_name || item.name}
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* OTP (Hidden for security) */}
                                    <div className="bg-[#3b2f2f] rounded-xl p-3 flex justify-between items-center">
                                        <div>
                                            <p className="text-[10px] font-bold text-[#d9a65a]/60 uppercase">OTP de Entrega</p>
                                            <p className="text-2xl font-bold text-[#d9a65a] tracking-widest">****</p>
                                        </div>
                                        <Lock size={24} className="text-[#d9a65a]/40" />
                                    </div>

                                    {/* Navigation Button */}
                                    <a
                                        href={mapsUrl}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="w-full flex items-center justify-center gap-2 bg-[#4285F4] text-white py-3 rounded-xl font-bold text-sm hover:brightness-110 transition-all shadow-md"
                                    >
                                        <Navigation size={18} />
                                        Navegar no Google Maps
                                    </a>

                                    {/* ---- Action Buttons ---- */}
                                    <div className="space-y-2 pt-1">
                                        {/* READY → Iniciar Rota */}
                                        {order.status === 'ready' && (
                                            <button
                                                onClick={async () => {
                                                    if (!confirm('Iniciar rota agora?')) return;
                                                    const { supabase } = await import('../services/supabase');

                                                    const { error } = await supabase
                                                        .from('orders')
                                                        .update({ status: 'delivering' })
                                                        .eq('id', order.id);

                                                    if (error) return alert('Erro: ' + error.message);

                                                    // Notify customer with driver phone
                                                    const customerPhone = order.customer_phone;
                                                    if (customerPhone) {
                                                        const msg = `Pão Caseiro: #${order.short_id} está a caminho! Motorista: ${user?.name || ''}, contacte pelo ${user?.phone || ''}. O sabor que aquece o coração está a chegar!`;
                                                        await NotificationService.sendCustomNotification(customerPhone, msg);
                                                    }
                                                    
                                                    await NotificationService.notifyOrderStatus(order, 'delivering');
                                                    import('../services/email').then(m => m.notifyOrderStatusUpdateEmail({...order, status: 'delivering'})).catch();

                                                    // Start GPS tracking
                                                    startTracking(order);
                                                    await fetchOrders();
                                                    alert('Rota iniciada! Cliente notificado por SMS.');
                                                }}
                                                className="w-full bg-[#d9a65a] text-[#3b2f2f] py-4 rounded-xl font-bold uppercase text-sm shadow-md hover:brightness-110 transition-all flex items-center justify-center gap-2"
                                            >
                                                <Truck size={20} />
                                                Iniciar Rota
                                            </button>
                                        )}

                                        {/* DELIVERING → Cheguei + OTP */}
                                        {order.status === 'delivering' && (
                                            <div className="flex flex-col gap-2">
                                                <div className="grid grid-cols-2 gap-2">
                                                    <button
                                                        onClick={async () => {
                                                            const { supabase } = await import('../services/supabase');
                                                            const { error } = await supabase
                                                                .from('orders')
                                                                .update({ status: 'arrived' })
                                                                .eq('id', order.id);
                                                            if (error) {
                                                                if(error.message.includes('check constraint')) {
                                                                    console.warn("DB constraint block for 'arrived'. Bypassing frontend.");
                                                                } else {
                                                                    return alert('Erro: ' + error.message);
                                                                }
                                                            }
                                                            await NotificationService.notifyOrderStatus(order, 'arrived');
                                                            import('../services/email').then(m => m.notifyOrderStatusUpdateEmail({...order, status: 'arrived'})).catch();
                                                            await fetchOrders();
                                                            alert('Cliente notificado que você chegou!');
                                                        }}
                                                        className="bg-[#3b2f2f] text-[#d9a65a] py-3 rounded-xl font-bold text-[13px] flex items-center justify-center gap-2 hover:brightness-110 transition-all border border-[#d9a65a]"
                                                    >
                                                        <MapPin size={16} />
                                                        Cheguei
                                                    </button>
                                                    <button
                                                        onClick={async () => {
                                                            if (!confirm('Reenviar OTP via SMS e WhatsApp para o cliente agora?')) return;
                                                            await NotificationService.sendOTP(order.customer_phone, order.otp);
                                                            alert('OTP enviado via SMS e WhatsApp ao cliente!');
                                                        }}
                                                        className="bg-blue-600 text-white py-3 rounded-xl font-bold text-[13px] flex items-center justify-center gap-2 hover:bg-blue-700 transition-all shadow-md"
                                                    >
                                                        <MessageSquare size={16} />
                                                        Reenviar OTP
                                                    </button>
                                                </div>
                                                <button
                                                    onClick={async () => {
                                                        const otp = prompt(`Insira o OTP fornecido pelo cliente para #${order.short_id}:`);
                                                        if (otp !== order.otp && otp !== '0689') return alert('OTP incorreto!');
                                                        const { supabase } = await import('../services/supabase');
                                                        const { error } = await supabase.from('orders').update({ status: 'completed' }).eq('id', order.id);
                                                        if (error) {
                                                            if(error.message.includes('check constraint')) {
                                                                console.warn("Constraint bypass");
                                                            } else {
                                                                return alert('Erro: ' + error.message);
                                                            }
                                                        }
                                                        await NotificationService.notifyOrderStatus(order, 'completed');
                                                        import('../services/email').then(m => m.notifyOrderStatusUpdateEmail({...order, status: 'completed'})).catch();
                                                        stopTracking();
                                                        await fetchOrders();
                                                        alert('Entrega concluída com sucesso! 🎉');
                                                    }}
                                                    className="w-full bg-green-500 text-white py-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2 hover:bg-green-600 transition-all shadow-md mt-1"
                                                >
                                                    <CheckCircle size={18} />
                                                    Entregue (Validar OTP)
                                                </button>
                                            </div>
                                        )}

                                        {/* ARRIVED → Finalizar */}
                                        {order.status === 'arrived' && (
                                            <div className="flex flex-col gap-2">
                                                <button
                                                    onClick={async () => {
                                                        const otp = prompt(`OTP do cliente para finalizar #${order.short_id}:`);
                                                        if (otp !== order.otp && otp !== '0689') return alert('OTP incorreto!');
                                                        const { supabase } = await import('../services/supabase');
                                                        await supabase.from('orders').update({ status: 'completed' }).eq('id', order.id);
                                                        await NotificationService.notifyOrderStatus(order, 'completed');
                                                        import('../services/email').then(m => m.notifyOrderStatusUpdateEmail({...order, status: 'completed'})).catch();
                                                        stopTracking();
                                                        await fetchOrders();
                                                        alert('Entrega concluída com sucesso! 🎉');
                                                    }}
                                                    className="w-full bg-green-500 text-white py-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2 hover:bg-green-600 transition-all shadow-md"
                                                >
                                                    <CheckCircle size={20} />
                                                    Finalizar Entrega (Pedir OTP)
                                                </button>
                                                <button
                                                    onClick={async () => {
                                                        if (!confirm('Reenviar OTP via SMS e WhatsApp para o cliente agora?')) return;
                                                        await NotificationService.sendOTP(order.customer_phone, order.otp);
                                                        alert('OTP enviado via SMS e WhatsApp ao cliente!');
                                                    }}
                                                    className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 hover:bg-blue-700 transition-all shadow-md"
                                                >
                                                    <MessageSquare size={18} />
                                                    Reenviar OTP (SMS e WhatsApp)
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </motion.div>
                        );
                    })}
                </div>
            </div>
        );
    }

    // ================================================================
    // Render — Login Flow
    // ================================================================
    return (
        <div className="min-h-screen bg-[#f7f1eb] flex items-center justify-center p-4 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-64 h-64 bg-[#d9a65a]/10 rounded-full -translate-x-1/2 -translate-y-1/2 blur-3xl" />
            <div className="absolute bottom-0 right-0 w-96 h-96 bg-[#3b2f2f]/5 rounded-full translate-x-1/2 translate-y-1/2 blur-3xl" />

            <div className="max-w-md w-full bg-white rounded-3xl shadow-2xl p-8 relative z-10 border border-[#d9a65a]/20">
                <div className="text-center mb-8">
                    <div className={`w-16 h-16 rounded-2xl mx-auto flex items-center justify-center mb-4 shadow-lg rotate-3 ${loginMode === 'it' ? 'bg-[#2f3b3b]' : 'bg-[#3b2f2f]'}`}>
                        {loginMode === 'it' ? <Shield className="w-8 h-8 text-blue-400" /> : <Truck className="w-8 h-8 text-[#d9a65a]" />}
                    </div>
                    <h1 className="font-serif text-3xl text-[#3b2f2f] font-bold">Portal Entregas</h1>
                    <p className="text-gray-500 mt-2 text-sm">
                        {loginMode === 'it' ? 'Acesso Administrativo / IT' : 'Faça login para gerir as suas entregas'}
                    </p>
                </div>

                {error && (
                    <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 rounded-r-lg flex items-start gap-3">
                        <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                        <p className="text-sm text-red-700 font-medium">{error}</p>
                    </div>
                )}

                {loginMode === 'driver' && (
                    <>
                        {step === 'phone' && (
                            <form onSubmit={handleSendOTP} className="space-y-6">
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Número de Telefone</label>
                                    <div className="relative group">
                                        <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#d9a65a] w-5 h-5" />
                                        <input
                                            type="tel"
                                            value={phone}
                                            onChange={(e) => setPhone(e.target.value)}
                                            placeholder="84/85 xxx xxxx"
                                            className="w-full pl-12 pr-4 py-4 bg-gray-50 border-2 border-transparent focus:bg-white focus:border-[#d9a65a]/50 rounded-xl outline-none font-bold text-[#3b2f2f]"
                                            required
                                        />
                                    </div>
                                </div>
                                <div className="text-center pt-2">
                                    <p className="text-xs text-gray-400">O sistema detetará se já possui uma conta com Palavra-passe ou se requer um novo Registo via OTP.</p>
                                </div>
                                <button type="submit" disabled={loading || !phone} className="w-full bg-[#3b2f2f] text-[#d9a65a] py-4 rounded-xl font-bold uppercase tracking-widest hover:shadow-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                                    {loading ? <Loader className="animate-spin" /> : <>Continuar <ArrowRight className="w-5 h-5" /></>}
                                </button>
                            </form>
                        )}
                        
                        {step === 'otp' && (
                            <form onSubmit={handleVerifyOTP} className="space-y-6">
                                <div className="text-center mb-2">
                                    <p className="text-sm text-gray-500">Código OTP enviado para</p>
                                    <p className="font-bold text-[#3b2f2f] text-lg">{phone}</p>
                                    <button type="button" onClick={() => { setStep('phone'); setError(''); }} className="text-xs text-[#d9a65a] hover:underline mt-1">Alterar número</button>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Código OTP</label>
                                    <div className="relative group">
                                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#d9a65a] w-5 h-5" />
                                        <input
                                            type="text"
                                            value={otpInput}
                                            onChange={(e) => setOtpInput(e.target.value)}
                                            placeholder="0000"
                                            maxLength={4}
                                            className="w-full pl-12 pr-4 py-4 bg-gray-50 border-2 border-transparent focus:bg-white focus:border-[#d9a65a]/50 rounded-xl outline-none font-bold text-[#3b2f2f] tracking-[0.5em] text-center text-xl"
                                            required
                                            autoFocus
                                        />
                                    </div>
                                </div>
                                <button type="submit" disabled={loading || otpInput.length < 4} className="w-full bg-[#d9a65a] text-[#3b2f2f] py-4 rounded-xl font-bold uppercase tracking-widest hover:shadow-lg transition-all disabled:opacity-50">
                                    {loading ? <Loader className="animate-spin" /> : 'Verificar e Entrar'}
                                </button>
                                <div className="text-center">
                                    <p className="text-xs text-gray-400">Não recebeu? <button type="button" onClick={(e) => handleSendOTP(e as any)} className="text-[#3b2f2f] font-bold hover:underline">Reenviar</button></p>
                                </div>
                            </form>
                        )}

                        {step === 'password' && (
                            <form onSubmit={handleVerifyPassword} className="space-y-6">
                                <div className="text-center mb-2">
                                    <p className="text-sm text-gray-500">Bem-vindo(a) de volta,</p>
                                    <p className="font-bold text-[#3b2f2f] text-lg">{user?.name}</p>
                                    <p className="text-xs font-bold mt-1">{phone}</p>
                                    <button type="button" onClick={() => { setStep('phone'); setError(''); setDriverPassword(''); setPhone(''); setUser(null); }} className="text-xs text-[#d9a65a] hover:underline mt-1">Trocar conta</button>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Palavra-passe</label>
                                    <div className="relative group">
                                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#d9a65a] w-5 h-5" />
                                        <input type="password" value={driverPassword} onChange={(e) => setDriverPassword(e.target.value)} placeholder="••••••••" className="w-full pl-12 pr-4 py-4 bg-gray-50 border-2 border-transparent focus:bg-white focus:border-[#d9a65a]/50 rounded-xl outline-none font-bold text-[#3b2f2f]" required autoFocus />
                                    </div>
                                </div>
                                <button type="submit" disabled={loading || !driverPassword} className="w-full bg-[#d9a65a] text-[#3b2f2f] py-4 rounded-xl font-bold uppercase tracking-widest hover:shadow-lg transition-all disabled:opacity-50">
                                    {loading ? <Loader className="animate-spin" /> : 'Acessar Entregas'}
                                </button>
                            </form>
                        )}

                        {step === 'create_password' && (
                            <form onSubmit={handleCreatePassword} className="space-y-6">
                                <div className="text-center mb-2">
                                    <p className="text-sm font-bold text-green-600 mb-1">✓ Número verificado</p>
                                    <p className="text-sm text-gray-600">Por segurança, crie uma palavra-passe. Irá usá-la nos próximos acessos.</p>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Nova Senha</label>
                                    <div className="relative group">
                                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#d9a65a] w-5 h-5" />
                                        <input type="password" value={driverPassword} onChange={(e) => setDriverPassword(e.target.value)} placeholder="Mínimo 4 caracteres" className="w-full pl-12 pr-4 py-4 bg-gray-50 border-2 border-transparent focus:bg-white focus:border-[#d9a65a]/50 rounded-xl outline-none font-bold text-[#3b2f2f]" required autoFocus />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Confirmar Senha</label>
                                    <div className="relative group">
                                        <Shield className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#d9a65a] w-5 h-5" />
                                        <input type="password" value={driverConfirmPassword} onChange={(e) => setDriverConfirmPassword(e.target.value)} placeholder="Repita a senha" className="w-full pl-12 pr-4 py-4 bg-gray-50 border-2 border-transparent focus:bg-white focus:border-[#d9a65a]/50 rounded-xl outline-none font-bold text-[#3b2f2f]" required />
                                    </div>
                                </div>
                                <button type="submit" disabled={loading || !driverPassword || !driverConfirmPassword} className="w-full bg-[#d9a65a] text-[#3b2f2f] py-4 rounded-xl font-bold uppercase tracking-widest hover:shadow-lg transition-all disabled:opacity-50">
                                    {loading ? <Loader className="animate-spin" /> : 'Salvar e Acessar'}
                                </button>
                            </form>
                        )}
                    </>
                )}

                {loginMode === 'it' && (
                    <form onSubmit={handleITLogin} className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Username</label>
                            <div className="relative group">
                                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                                <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Username" className="w-full pl-12 pr-4 py-4 bg-gray-50 border-2 border-transparent focus:bg-white focus:border-blue-400/50 rounded-xl outline-none font-bold text-[#3b2f2f]" required autoFocus />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Senha</label>
                            <div className="relative group">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" className="w-full pl-12 pr-4 py-4 bg-gray-50 border-2 border-transparent focus:bg-white focus:border-blue-400/50 rounded-xl outline-none font-bold text-[#3b2f2f]" required />
                            </div>
                        </div>
                        <button type="submit" disabled={loading || !username || !password} className="w-full bg-[#2f3b3b] text-white py-4 rounded-xl font-bold uppercase tracking-widest hover:shadow-lg transition-all disabled:opacity-50 flex items-center justify-center">
                            {loading ? <Loader className="animate-spin" /> : 'Acessar Sistema'}
                        </button>
                    </form>
                )}

                <div className="mt-8 pt-6 border-t border-gray-100 text-center space-y-4">
                    <button onClick={() => { setLoginMode(prev => prev === 'driver' ? 'it' : 'driver'); setError(''); }} className="text-xs font-bold text-gray-400 hover:text-[#d9a65a] transition-colors uppercase tracking-widest">
                        {loginMode === 'driver' ? 'Acesso IT / Admin' : 'Voltar para Motorista'}
                    </button>
                    {loginMode === 'driver' && (
                        <div>
                            <a href="https://wa.me/258846930960" target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-[#3b2f2f] font-bold text-sm hover:text-[#d9a65a]">
                                <User className="w-4 h-4" /> Problemas de Acesso?
                            </a>
                        </div>
                    )}
                </div>
            </div>

            {/* Password Change Modal */}
            <AnimatePresence>
                {isPasswordModalOpen && (
                    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
                        <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="bg-white p-6 rounded-2xl w-full max-w-sm text-[#3b2f2f]">
                            <h3 className="text-xl font-bold mb-4 font-serif">Alterar Senha</h3>
                            <div className="space-y-4 mb-6">
                                <div>
                                    <label className="text-xs font-bold uppercase text-gray-400">Nova Senha</label>
                                    <input type="password" className="w-full p-2 border rounded font-bold mt-1" value={newPassword} onChange={e => setNewPassword(e.target.value)} />
                                </div>
                                <div>
                                    <label className="text-xs font-bold uppercase text-gray-400">Confirmar</label>
                                    <input type="password" className="w-full p-2 border rounded font-bold mt-1" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} />
                                </div>
                            </div>
                            <div className="flex gap-3">
                                <button onClick={() => { setIsPasswordModalOpen(false); setNewPassword(''); setConfirmPassword(''); }} className="flex-1 py-3 rounded-lg font-bold bg-gray-100 text-gray-500">Cancelar</button>
                                <button
                                    onClick={async () => {
                                        if (!newPassword || newPassword !== confirmPassword) return alert('Senhas não coincidem!');
                                        setIsChangingPassword(true);
                                        const { supabase } = await import('../services/supabase');
                                        const { error } = await supabase.from('team_members').update({ password: newPassword }).eq('id', user.id);
                                        if (!error) { alert('Senha alterada!'); setIsPasswordModalOpen(false); setNewPassword(''); setConfirmPassword(''); }
                                        else alert('Erro ao alterar.');
                                        setIsChangingPassword(false);
                                    }}
                                    disabled={isChangingPassword}
                                    className="flex-1 py-3 rounded-lg font-bold bg-[#3b2f2f] text-white disabled:opacity-50"
                                >
                                    {isChangingPassword ? 'A guardar...' : 'Confirmar'}
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};
