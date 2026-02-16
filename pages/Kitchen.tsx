import React, { useState, useEffect } from 'react';
import { ChefHat, Clock, CheckCircle, AlertCircle, Loader, LogOut, User, Bell, Plus, Search } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// Types (Mirrors Admin/Supabase structure)
interface Order {
    id: string; // Supabase ID
    orderId?: string; // App ID (if different, usually 'orderId' in JSON logic, but 'id' in DB)
    // We'll map DB fields
    customer_name: string;
    status: 'pending' | 'processing' | 'ready' | 'delivering' | 'completed' | 'cancelled';
    items: Array<{
        name: string;
        quantity: number;
        notes?: string;
    }>;
    created_at: string;
    estimated_ready_at?: string;
}

interface Product {
    id: string;
    name: string;
    price: number;
}

// Sub-component for Countdown
const OrderTimer: React.FC<{ target: string }> = ({ target }) => {
    const [timeLeft, setTimeLeft] = useState('');

    useEffect(() => {
        const update = () => {
            const diff = new Date(target).getTime() - new Date().getTime();
            if (diff <= 0) {
                setTimeLeft('Atrasado');
                return;
            }
            const mins = Math.floor(diff / 60000);
            const secs = Math.floor((diff % 60000) / 1000);
            setTimeLeft(`${mins}:${secs.toString().padStart(2, '0')}`);
        };
        update();
        const interval = setInterval(update, 1000);
        return () => clearInterval(interval);
    }, [target]);

    return <span>{timeLeft}</span>;
}

interface KitchenProps {
    user?: any; // If passed from Admin, bypass login
}

export const Kitchen: React.FC<KitchenProps> = ({ user: externalUser }) => {
    // Auth
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [user, setUser] = useState<any>(null);
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // Kitchen Data
    const [orders, setOrders] = useState<Order[]>([]);
    const [kitchenStatus, setKitchenStatus] = useState<'open' | 'busy' | 'closed'>('open');
    const [products, setProducts] = useState<Product[]>([]);
    const [refreshing, setRefreshing] = useState(false);

    // Modal State
    const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
    const [prepTime, setPrepTime] = useState(15);
    const [isTimeModalOpen, setIsTimeModalOpen] = useState(false);

    // Manual Order Modal
    const [isManualModalOpen, setIsManualModalOpen] = useState(false);
    const [manualCustomer, setManualCustomer] = useState('Cliente Balcão');
    const [manualPhone, setManualPhone] = useState('');
    const [manualItems, setManualItems] = useState([{ name: '', quantity: 1, price: 0 }]);
    const [manualPrepTime, setManualPrepTime] = useState<number | null>(null);
    const [searchTerm, setSearchTerm] = useState('');

    // --- Init ---
    useEffect(() => {
        if (externalUser) {
            console.log("Kitchen loaded in Admin mode", externalUser);
            setIsAuthenticated(true);
            setUser(externalUser);
            fetchOrders();
            fetchStatus();
            fetchProducts();
        } else {
            const savedAuth = localStorage.getItem('kitchen_auth');
            if (savedAuth) {
                setIsAuthenticated(true);
                const savedUser = localStorage.getItem('kitchen_user');
                if (savedUser) setUser(JSON.parse(savedUser));
                fetchOrders();
                fetchStatus();
                fetchProducts();
            }
        }
    }, [externalUser]);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            const { supabase } = await import('../services/supabase');
            const { data, error } = await supabase
                .from('team_members')
                .select('*')
                .eq('username', username)
                .eq('password', password)
                .single();

            if (data) {
                setIsAuthenticated(true);
                setUser(data);
                localStorage.setItem('kitchen_auth', 'true');
                localStorage.setItem('kitchen_user', JSON.stringify(data));
                fetchOrders();
                fetchStatus();
                fetchProducts();
            } else {
                setError('Acesso negado.');
            }
        } catch (err) {
            setError('Erro ao conectar.');
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = () => {
        if (externalUser) return; // Can't logout if embedded
        setIsAuthenticated(false);
        localStorage.removeItem('kitchen_auth');
        localStorage.removeItem('kitchen_user');
        setUser(null);
    };

    // --- Data Logic ---
    const fetchOrders = async () => {
        setRefreshing(true);
        try {
            const { supabase } = await import('../services/supabase');
            const { data, error } = await supabase
                .from('orders')
                .select('*')
                .in('status', ['pending', 'processing', 'ready'])
                .order('created_at', { ascending: true });

            if (data) {
                const mapped = data.map(o => ({
                    ...o,
                    items: typeof o.items === 'string' ? JSON.parse(o.items) : o.items
                }));
                setOrders(mapped);
            }
        } catch (e) { console.error(e); }
        finally { setRefreshing(false); }
    };

    const fetchProducts = async () => {
        try {
            const { supabase } = await import('../services/supabase');
            const { data } = await supabase.from('products').select('id, name, price');
            if (data) setProducts(data);
        } catch (e) { }
    }

    const fetchStatus = async () => {
        try {
            const { supabase } = await import('../services/supabase');
            const { data } = await supabase.from('settings').select('*').eq('key', 'kitchen_status').single();
            if (data) setKitchenStatus(data.value);
        } catch (e) { }
    };

    const updateStatus = async (status: 'open' | 'busy' | 'closed') => {
        setKitchenStatus(status);
        try {
            const { supabase } = await import('../services/supabase');
            await supabase.from('settings').upsert({ key: 'kitchen_status', value: status });
        } catch (e) {
            console.warn("Could not save status to DB (Table 'settings' might be missing)");
        }
    };

    // Poll for new orders every 10 seconds
    useEffect(() => {
        if (!isAuthenticated) return;
        const interval = setInterval(() => {
            fetchOrders();
            fetchStatus();
        }, 10000);
        return () => clearInterval(interval);
    }, [isAuthenticated]);

    // --- Actions ---
    const handleAcceptClick = (order: Order) => {
        setSelectedOrder(order);
        setPrepTime(15); // Default
        setIsTimeModalOpen(true);
    };

    const confirmAccept = async () => {
        if (!selectedOrder) return;
        setIsTimeModalOpen(false);

        // Optimistic Update
        setOrders(prev => prev.map(o => o.id === selectedOrder.id ? { ...o, status: 'processing' } : o));

        const { supabase } = await import('../services/supabase');

        // Calculate estimated time
        const now = new Date();
        now.setMinutes(now.getMinutes() + prepTime);

        await supabase
            .from('orders')
            .update({
                status: 'processing',
                estimated_ready_at: now.toISOString()
            })
            .eq('id', selectedOrder.id);

        fetchOrders(); // Sync
    };

    const handleMarkReady = async (orderId: string) => {
        if (!confirm("Confirmar pedido pronto?")) return;

        // Optimistic
        setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: 'ready' } : o));

        const { supabase } = await import('../services/supabase');
        await supabase.from('orders').update({ status: 'ready' }).eq('id', orderId);
    };

    const handleArchive = async (orderId: string) => {
        if (!confirm("Confirmar entrega / arquivar?")) return;

        const { supabase } = await import('../services/supabase');
        await supabase.from('orders').update({ status: 'completed' }).eq('id', orderId);
        setOrders(prev => prev.filter(o => o.id !== orderId));
    };

    // --- Manual Order ---
    const saveManualOrder = async () => {
        if (!manualCustomer) return;
        setIsManualModalOpen(false);
        setLoading(true);

        try {
            const { saveOrderToSupabase } = await import('../services/supabase');

            let status = 'pending';
            // let estimated_ready_at = null; // Removed as saveOrderToSupabase doesn't support passing this directly yet, or we need to add it to payload

            if (manualPrepTime) {
                status = 'processing';
                // const now = new Date();
                // now.setMinutes(now.getMinutes() + manualPrepTime);
                // estimated_ready_at = now.toISOString();
            }

            // Calculate Total
            const total = manualItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);

            const timestamp = Date.now();
            const orderPayload = {
                short_id: `KDS-${timestamp.toString().slice(-4)}`,
                payment_ref: `MANUAL-${timestamp}`,
                customer_name: manualCustomer,
                customer_phone: manualPhone || '999999999', // Default for walk-ins
                customer_address: 'Balcão',
                delivery_type: 'pickup',
                total_amount: total,
                amount_paid: 0, // Assume pending payment or handle later
                balance: total,
                status: status,
                notes: manualPrepTime ? `Tempo de preparo: ${manualPrepTime} min` : 'Pedido Manual KDS'
            };

            const result = await saveOrderToSupabase(orderPayload, manualItems);

            if (!result.success) {
                throw result.error;
            }

            fetchOrders();
            // Reset form
            setManualCustomer('Cliente Balcão');
            setManualPhone('');
            setManualItems([{ name: '', quantity: 1, price: 0 }]);
            setManualPrepTime(null);

        } catch (e: any) {
            console.error("Error creating order:", e);
            alert(e.message || "Erro ao criar pedido. Verifique os dados.");
        } finally {
            setLoading(false);
        }
    };

    const updateManualItem = (idx: number, field: string, val: any) => {
        const newItems = [...manualItems];
        // @ts-ignore
        newItems[idx][field] = val;

        if (field === 'name') {
            const product = products.find(p => p.name === val);
            if (product) {
                newItems[idx].price = product.price;
            }
        }

        setManualItems(newItems);
    };

    const filteredProducts = products.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()));

    // Groups
    const pendingOrders = orders.filter(o => o.status === 'pending');
    const processingOrders = orders.filter(o => o.status === 'processing');
    const readyOrders = orders.filter(o => o.status === 'ready');

    if (!isAuthenticated) {
        return (
            <div className="min-h-screen bg-[#2f3b3b] flex items-center justify-center p-6">
                <div className="bg-white p-8 rounded-2xl shadow-2xl w-full max-w-md">
                    <div className="text-center mb-6">
                        <div className="w-16 h-16 bg-[#d9a65a] rounded-full flex items-center justify-center mx-auto mb-4 text-[#3b2f2f]">
                            <ChefHat size={32} />
                        </div>
                        <h1 className="text-2xl font-bold text-[#3b2f2f]">Cozinha Pão Caseiro</h1>
                        <p className="text-gray-500">Acesso Restrito</p>
                    </div>
                    <form onSubmit={handleLogin} className="space-y-4">
                        <input
                            type="text"
                            placeholder="Username"
                            className="w-full p-3 border rounded-lg"
                            value={username} onChange={e => setUsername(e.target.value)}
                        />
                        <input
                            type="password"
                            placeholder="Password"
                            className="w-full p-3 border rounded-lg"
                            value={password} onChange={e => setPassword(e.target.value)}
                        />
                        {error && <p className="text-red-500 text-sm">{error}</p>}
                        <button className="w-full bg-[#3b2f2f] text-white py-3 rounded-lg font-bold hover:bg-[#d9a65a] transition-colors">
                            {loading ? 'Entrando...' : 'Entrar'}
                        </button>
                    </form>
                </div>
            </div>
        );
    }

    return (
        <div className={`bg-[#1a1f1f] text-white font-sans flex flex-col ${externalUser ? 'w-full h-[calc(100vh-100px)]' : 'min-h-screen'}`}>
            {/* Header */}
            <header className="bg-[#2f3b3b] p-4 shadow-lg flex justify-between items-center sticky top-0 z-20">
                <div className="flex items-center gap-4">
                    <div className="bg-[#d9a65a] p-2 rounded-lg text-[#3b2f2f]">
                        <ChefHat size={28} />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold leading-none">KDS - Cozinha</h1>
                        <p className="text-xs text-gray-400 mt-1">{new Date().toLocaleTimeString()} | Staff: {user?.name}</p>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <div className="bg-black/30 p-1 rounded-full flex items-center text-xs font-bold">
                        <button
                            onClick={() => updateStatus('open')}
                            className={`px-3 py-1.5 rounded-full transition-all ${kitchenStatus === 'open' ? 'bg-green-500 text-white' : 'text-gray-400 hover:text-white'}`}
                        >
                            ABERTO
                        </button>
                        <button
                            onClick={() => updateStatus('busy')}
                            className={`px-3 py-1.5 rounded-full transition-all ${kitchenStatus === 'busy' ? 'bg-orange-500 text-white' : 'text-gray-400 hover:text-white'}`}
                        >
                            BUSY
                        </button>
                        <button
                            onClick={() => updateStatus('closed')}
                            className={`px-3 py-1.5 rounded-full transition-all ${kitchenStatus === 'closed' ? 'bg-red-500 text-white' : 'text-gray-400 hover:text-white'}`}
                        >
                            FECHADO
                        </button>
                    </div>
                    <button onClick={() => setIsManualModalOpen(true)} className="p-2 bg-[#d9a65a] text-[#3b2f2f] rounded font-bold hover:brightness-110 flex items-center gap-2 text-sm px-4">
                        <Plus size={16} /> <span className="hidden sm:inline">Novo Pedido</span>
                    </button>
                    <button onClick={fetchOrders} className={`p-2 bg-white/10 rounded hover:bg-white/20 ${refreshing ? 'animate-spin' : ''}`} title="Refresh">
                        <Loader size={20} />
                    </button>
                    {!externalUser && <button onClick={handleLogout} className="p-2 bg-red-500/20 text-red-400 rounded hover:bg-red-500 hover:text-white transition-colors">
                        <LogOut size={20} />
                    </button>}
                </div>
            </header>

            {/* Content Grid */}
            <div className={`flex-1 p-4 grid grid-cols-1 md:grid-cols-3 gap-6 overflow-hidden ${externalUser ? 'overflow-y-auto' : 'h-[calc(100vh-80px)]'}`}>

                {/* Column: PENDING */}
                <div className="flex flex-col bg-[#2a3030] rounded-xl overflow-hidden border border-gray-700">
                    <div className="bg-red-900/40 p-3 border-b border-red-900/50 flex justify-between items-center">
                        <h2 className="font-bold text-red-100 flex items-center gap-2">
                            <Bell className="w-5 h-5 text-red-500 animate-pulse" />
                            Novos Pedidos
                        </h2>
                        <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">{pendingOrders.length}</span>
                    </div>
                    <div className="flex-1 overflow-y-auto p-3 space-y-3 min-h-[300px]">
                        {pendingOrders.length === 0 && <p className="text-gray-500 text-center text-sm mt-10">Sem novos pedidos</p>}
                        {pendingOrders.map(order => (
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                key={order.id}
                                className="bg-white text-[#3b2f2f] rounded-lg p-4 shadow-lg border-l-4 border-red-500"
                            >
                                <div className="flex justify-between items-start mb-2">
                                    <h3 className="font-bold text-lg">#{order.orderId || order.id.slice(0, 6)}</h3>
                                    <span className="text-xs text-gray-500">{new Date(order.created_at).toLocaleTimeString().slice(0, 5)}</span>
                                </div>
                                <p className="text-xs font-bold mb-2">{order.customer_name}</p>
                                <div className="space-y-1 mb-4">
                                    {order.items.map((item, idx) => (
                                        <div key={idx} className="flex justify-between text-sm border-b border-dashed border-gray-200 pb-1 last:border-0">
                                            <span className="font-bold">{item.quantity}x {item.name}</span>
                                        </div>
                                    ))}
                                </div>
                                <button
                                    onClick={() => handleAcceptClick(order)}
                                    className="w-full bg-[#3b2f2f] text-[#d9a65a] py-2 rounded font-bold uppercase text-sm hover:brightness-125 transition-all flex items-center justify-center gap-2"
                                >
                                    <Clock size={16} /> Aceitar
                                </button>
                            </motion.div>
                        ))}
                    </div>
                </div>

                {/* Column: PROCESSING */}
                <div className="flex flex-col bg-[#2a3030] rounded-xl overflow-hidden border border-gray-700">
                    <div className="bg-orange-900/40 p-3 border-b border-orange-900/50 flex justify-between items-center">
                        <h2 className="font-bold text-orange-100 flex items-center gap-2">
                            <ChefHat className="w-5 h-5 text-orange-500" />
                            Em Preparação
                        </h2>
                        <span className="bg-orange-500 text-white text-xs px-2 py-0.5 rounded-full">{processingOrders.length}</span>
                    </div>
                    <div className="flex-1 overflow-y-auto p-3 space-y-3 min-h-[300px]">
                        {processingOrders.length === 0 && <p className="text-gray-500 text-center text-sm mt-10">Cozinha livre</p>}
                        {processingOrders.map(order => (
                            <motion.div
                                layoutId={order.id}
                                className="bg-[#3b2f2f] text-[#f7f1eb] rounded-lg p-4 shadow-lg border-l-4 border-orange-500"
                            >
                                <div className="flex justify-between items-start mb-3">
                                    <h3 className="font-bold text-lg text-[#d9a65a]">#{order.orderId || order.id.slice(0, 6)}</h3>
                                    {order.estimated_ready_at && (
                                        <span className="text-xs bg-orange-500/20 text-orange-300 px-2 py-1 rounded font-mono">
                                            <OrderTimer target={order.estimated_ready_at} />
                                        </span>
                                    )}
                                </div>
                                <div className="space-y-1 mb-4 text-sm opacity-90">
                                    {order.items.map((item, idx) => (
                                        <div key={idx} className="flex justify-between">
                                            <span>{item.quantity}x {item.name}</span>
                                        </div>
                                    ))}
                                </div>
                                <button
                                    onClick={() => handleMarkReady(order.id)}
                                    className="w-full bg-green-600 text-white py-2 rounded font-bold uppercase text-sm hover:bg-green-500 transition-all flex items-center justify-center gap-2"
                                >
                                    <CheckCircle size={16} /> Pronto
                                </button>
                            </motion.div>
                        ))}
                    </div>
                </div>

                {/* Column: READY */}
                <div className="flex flex-col bg-[#2a3030] rounded-xl overflow-hidden border border-gray-700">
                    <div className="bg-green-900/40 p-3 border-b border-green-900/50 flex justify-between items-center">
                        <h2 className="font-bold text-green-100 flex items-center gap-2">
                            <CheckCircle className="w-5 h-5 text-green-500" />
                            Prontos
                        </h2>
                        <span className="bg-green-500 text-white text-xs px-2 py-0.5 rounded-full">{readyOrders.length}</span>
                    </div>
                    <div className="flex-1 overflow-y-auto p-3 space-y-3 min-h-[300px]">
                        {readyOrders.length === 0 && <p className="text-gray-500 text-center text-sm mt-10">Nada pronto</p>}
                        {readyOrders.map(order => (
                            <div key={order.id} className="bg-[#1f2626] border border-green-900/30 rounded-lg p-3 opacity-80 hover:opacity-100 transition-opacity">
                                <div className="flex justify-between items-center mb-2">
                                    <h3 className="font-bold text-green-400">#{order.orderId || order.id.slice(0, 6)}</h3>
                                    <span className="text-xs text-gray-400">{order.customer_name}</span>
                                </div>
                                <p className="text-xs text-gray-400 mb-2 truncate">
                                    {order.items.map(i => `${i.quantity} ${i.name}`).join(', ')}
                                </p>
                                <button
                                    onClick={() => handleArchive(order.id)}
                                    className="w-full py-1 text-xs border border-gray-600 rounded text-gray-400 hover:text-white hover:border-white transition-colors"
                                >
                                    Arquivar
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Time Modal */}
            <AnimatePresence>
                {isTimeModalOpen && (
                    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            className="bg-[#2f3b3b] p-6 rounded-2xl w-full max-w-sm border border-gray-600"
                        >
                            <h3 className="text-xl font-bold text-white mb-4 text-center">Tempo de Preparo</h3>
                            <div className="grid grid-cols-3 gap-3 mb-6">
                                {[10, 15, 20, 30, 45, 60].map(time => (
                                    <button
                                        key={time}
                                        onClick={() => setPrepTime(time)}
                                        className={`py-3 rounded-lg font-bold border transition-all ${prepTime === time ? 'bg-[#d9a65a] text-[#3b2f2f] border-[#d9a65a]' : 'border-gray-600 text-gray-300 hover:border-[#d9a65a]'}`}
                                    >
                                        {time} min
                                    </button>
                                ))}
                            </div>
                            <div className="flex gap-3">
                                <button onClick={() => setIsTimeModalOpen(false)} className="flex-1 py-3 rounded-lg font-bold bg-transparent border border-gray-500 text-gray-300">Cancelar</button>
                                <button onClick={confirmAccept} className="flex-1 py-3 rounded-lg font-bold bg-[#d9a65a] text-[#3b2f2f]">Confirmar</button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Manual Order Modal */}
            <AnimatePresence>
                {isManualModalOpen && (
                    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
                        <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="bg-white p-6 rounded-2xl w-full max-w-md text-[#3b2f2f]">
                            <h3 className="text-xl font-bold mb-4">Adicionar Pedido Manual</h3>

                            {/* Prep Time Selector in Manual */}
                            <div className="mb-4">
                                <label className="text-xs font-bold uppercase text-gray-400 mb-2 block">Tempo de Preparo</label>
                                <div className="flex gap-2">
                                    {[10, 15, 20, 30].map(time => (
                                        <button
                                            key={time}
                                            onClick={() => setManualPrepTime(time === manualPrepTime ? null : time)}
                                            className={`flex-1 py-2 text-xs font-bold border rounded ${manualPrepTime === time ? 'bg-[#3b2f2f] text-white border-[#3b2f2f]' : 'text-gray-500 border-gray-300'}`}
                                        >
                                            {time}m
                                        </button>
                                    ))}
                                </div>
                                <p className="text-[10px] text-gray-400 mt-1">Se selecionado, vai direto para "Em Preparação"</p>
                            </div>

                            <div className="space-y-4 mb-6">
                                <div>
                                    <label className="text-xs font-bold uppercase text-gray-400">Nome Cliente</label>
                                    <input type="text" className="w-full p-2 border rounded font-bold" value={manualCustomer} onChange={e => setManualCustomer(e.target.value)} />
                                </div>
                                <div>
                                    <label className="text-xs font-bold uppercase text-gray-400">Telefone (Opcional)</label>
                                    <input type="tel" className="w-full p-2 border rounded" placeholder="Ex: 84..." value={manualPhone} onChange={e => setManualPhone(e.target.value)} />
                                </div>
                                <div>
                                    <label className="text-xs font-bold uppercase text-gray-400 mb-2 block">Itens</label>
                                    {manualItems.map((item, idx) => (
                                        <div key={idx} className="flex gap-2 mb-2">
                                            <div className="flex-1 relative group">
                                                <input
                                                    type="text"
                                                    list={`products-list-${idx}`}
                                                    placeholder="Buscar Produto..."
                                                    className="w-full p-2 border rounded"
                                                    value={item.name}
                                                    onChange={e => updateManualItem(idx, 'name', e.target.value)}
                                                />
                                                <datalist id={`products-list-${idx}`}>
                                                    {products.map(p => <option key={p.id} value={p.name} />)}
                                                </datalist>
                                            </div>
                                            <input type="number" className="w-16 p-2 border rounded" value={item.quantity} onChange={e => updateManualItem(idx, 'quantity', parseInt(e.target.value))} />
                                        </div>
                                    ))}
                                    <button onClick={() => setManualItems([...manualItems, { name: '', quantity: 1, price: 0 }])} className="text-xs text-[#d9a65a] font-bold">+ Adicionar Item</button>
                                </div>
                            </div>
                            <div className="flex gap-3">
                                <button onClick={() => setIsManualModalOpen(false)} className="flex-1 py-3 rounded-lg font-bold bg-gray-100 text-gray-500">Cancelar</button>
                                <button onClick={saveManualOrder} className="flex-1 py-3 rounded-lg font-bold bg-[#3b2f2f] text-white">Criar Pedido</button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};
