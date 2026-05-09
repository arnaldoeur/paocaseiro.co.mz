import React, { useState, useEffect, useRef } from 'react';
import { ChefHat, Clock, CheckCircle, AlertCircle, Loader, LogOut, User, Bell, Plus, Search, Archive, LayoutDashboard, Package, EyeOff } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { formatProductName } from '../services/stringUtils';
import { NotificationService } from '../services/NotificationService';

// Types (Mirrors Admin/Supabase structure)
interface Order {
    id: string; // Supabase UUID
    short_id: string; // PC-1234 or KDS-1234
    orderId?: string; // Compatibility alias
    customer_name: string;
    customer_phone?: string;
    delivery_type?: string;
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
    stock_quantity: number;
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

const isValidUUID = (id: string) => {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
};

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
    const [archivedOrders, setArchivedOrders] = useState<Order[]>([]);
    const [kitchenStatus, setKitchenStatus] = useState<'open' | 'busy' | 'closed'>('open');
    const [activeTab, setActiveTab] = useState<'kds' | 'dashboard' | 'archive'>('kds');
    const [products, setProducts] = useState<Product[]>([]);
    const [refreshing, setRefreshing] = useState(false);
    const [soundEnabled, setSoundEnabled] = useState(() => localStorage.getItem('kitchen_sound') !== 'false');

    // Modal State
    const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
    const [prepTime, setPrepTime] = useState(15);
    const [customPrepTime, setCustomPrepTime] = useState<string>('');
    const [isTimeModalOpen, setIsTimeModalOpen] = useState(false);

    // Add Time State
    const [isAddTimeModalOpen, setIsAddTimeModalOpen] = useState(false);
    const [addTimeOrder, setAddTimeOrder] = useState<Order | null>(null);

    // Manual Order Modal
    const [isManualModalOpen, setIsManualModalOpen] = useState(false);
    const [manualCustomer, setManualCustomer] = useState('Cliente Balcão');
    const [manualPhone, setManualPhone] = useState('');
    const [manualItems, setManualItems] = useState([{ name: '', quantity: 1, price: 0 }]);
    const [manualPrepTime, setManualPrepTime] = useState<number | null>(null);
    const [manualOrderType, setManualOrderType] = useState<'local' | 'delivery' | 'pickup'>('local'); // New state
    const [searchTerm, setSearchTerm] = useState('');

    // Password Change State
    const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isChangingPassword, setIsChangingPassword] = useState(false);

    // Turn/Session State (Timestamps)
    const [isClockedIn, setIsClockedIn] = useState(false);
    const [activeSessionId, setActiveSessionId] = useState<string | null>(null);

    useEffect(() => {
        if (externalUser) {
            
            setIsAuthenticated(true);
            setUser(externalUser);
            fetchOrders();
            fetchStatus();
            fetchProducts();
            checkActiveSession(externalUser.id);
        } else {
            const savedAuth = localStorage.getItem('kitchen_auth');
            if (savedAuth) {
                setIsAuthenticated(true);
                const savedUser = localStorage.getItem('kitchen_user');
                if (savedUser) {
                    const parsedUser = JSON.parse(savedUser);
                    setUser(parsedUser);
                    checkActiveSession(parsedUser.id);
                }
                fetchOrders();
                fetchStatus();
                fetchProducts();
            }
        }
    }, [externalUser]);

    const checkActiveSession = async (memberId: string) => {
        try {
            const { hostingerService } = await import('../services/hostingerService');
            const data = await hostingerService.getActiveWorkSession(memberId);

            if (data && data.id) {
                setIsClockedIn(true);
                setActiveSessionId(data.id);
            }
        } catch (e) {
            console.error("Error checking active session", e);
        }
    };

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            const { hostingerService } = await import('../services/hostingerService');
            const data = await hostingerService.authTeam(username, password);

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
            const { hostingerService } = await import('../services/hostingerService');
            const data = await hostingerService.getOrders();
            
            if (data && Array.isArray(data)) {
                const mapped = data.map((o: any) => ({
                    ...o,
                    orderId: o.short_id,
                    items: (o.items || []).map((i: any) => ({
                        name: i.product_name || i.name,
                        quantity: i.quantity,
                        notes: i.notes
                    }))
                }));
                
                const active = mapped.filter((o: any) => ['kitchen', 'pending', 'processing', 'ready'].includes(o.status));
                const completed = mapped.filter((o: any) => o.status === 'completed');
                
                setOrders(active);
                if (completed.length > 0) setArchivedOrders(completed);
            }
        } catch (e) { 
            console.error("Kitchen fetchOrders error:", e); 
        } finally { 
            setRefreshing(false); 
        }
    };

    const fetchProducts = async () => {
        try {
            const { hostingerService } = await import('../services/hostingerService');
            const hProducts = await hostingerService.getProducts();
            const data = await hostingerService.getProducts();
            if (data) setProducts(data);
        } catch (error) {
            console.error('Error fetching products:', error);
        }
    };

    const fetchStatus = async () => {
        try {
            const { hostingerService } = await import('../services/hostingerService');
            const data = await hostingerService.getKitchenStatus();
            if (data) setKitchenStatus(data);
        } catch (e) { }
    };

    const updateStatus = async (status: 'open' | 'busy' | 'closed') => {
        setKitchenStatus(status);
        try {
            const { hostingerService } = await import('../services/hostingerService');
            await hostingerService.updateKitchenStatus(status);
        } catch (e) {
            console.warn("Could not save status");
        }
    };

    // --- Audio & Voice Notifications ---
    const speakQueue = useRef<string[]>([]);
    const isSpeaking = useRef(false);

    const processSpeakQueue = () => {
        if (isSpeaking.current || speakQueue.current.length === 0 || !soundEnabled) {
            if (!soundEnabled) {
                speakQueue.current = [];
                window.speechSynthesis.cancel();
            }
            return;
        }
        
        isSpeaking.current = true;
        const text = speakQueue.current.shift()!;
        
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'pt-PT';
        utterance.rate = 0.9;
        
        utterance.onend = () => {
            isSpeaking.current = false;
            setTimeout(processSpeakQueue, 500); // Small pause between announcements
        };

        utterance.onerror = () => {
            isSpeaking.current = false;
            processSpeakQueue();
        };

        window.speechSynthesis.speak(utterance);
    };

    const announceOrder = async (orderIdInDB: string) => {
        if (!soundEnabled) return;

        try {
            const chime = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
            chime.volume = 0.2;
            chime.play().catch(() => {});

            const { hostingerService } = await import('../services/hostingerService');
            const order = await hostingerService.getOrderById(orderIdInDB);

            if (order) {
                const displayId = order.short_id || order.id.slice(-4).toUpperCase();
                const type = order.delivery_type === 'delivery' ? 'Entrega' : 
                             order.delivery_type === 'pickup' ? 'Levantamento' : 'Digital';
                
                const itemsText = (order.items || [])
                    .map((i: any) => `${i.quantity} ${i.product_name}`)
                    .join(' e ');

                const text = `Novo pedido em ${type}. Código ${displayId}. Artigos: ${itemsText}`;
                speakQueue.current.push(text);
                processSpeakQueue();
            }
        } catch (e) {
            console.error("TTS Error:", e);
        }
    };

    const toggleSound = () => {
        const newVal = !soundEnabled;
        setSoundEnabled(newVal);
        localStorage.setItem('kitchen_sound', newVal.toString());
        if (!newVal) {
            window.speechSynthesis.cancel();
            speakQueue.current = [];
        }
    };

    const handleClockIn = async () => {
        if (!user) return;
        setLoading(true);
        try {
            const { hostingerService } = await import('../services/hostingerService');
            const newSession = await hostingerService.saveWorkSession({
                member_id: user.id,
                clock_in: new Date().toISOString(),
                status: 'active'
            });

            if (newSession) {
                setIsClockedIn(true);
                setActiveSessionId(newSession.id);
                alert("Início de turno registado!");
            }
        } catch (e: any) {
            alert("Erro ao registar início de turno: " + e.message);
        } finally {
            setLoading(false);
        }
    };

    const handleClockOut = async () => {
        if (!activeSessionId) return;
        if (!confirm("Confirmar fim de turno / saída?")) return;
        setLoading(true);
        try {
            const { hostingerService } = await import('../services/hostingerService');
            await hostingerService.updateWorkSession(activeSessionId, 'completed');
            
            setIsClockedIn(false);
            setActiveSessionId(null);
            alert("Fim de turno registado. Ótimo trabalho!");
        } catch (e: any) {
            alert("Erro ao registar fim de turno: " + e.message);
        } finally {
            setLoading(false);
        }
    };

    // Poll for new orders every 10 seconds
    useEffect(() => {
        if (!isAuthenticated) return;
        const interval = setInterval(() => {
            fetchOrders();
            fetchStatus();
            fetchProducts();
        }, 30000);
        return () => clearInterval(interval);
    }, [isAuthenticated]);

    // --- Actions ---
    const handleAcceptClick = (order: Order) => {
        setSelectedOrder(order);
        setPrepTime(15);
        setCustomPrepTime('');
        setIsTimeModalOpen(true);
    };

    const handleAddTimeClick = (order: Order) => {
        setAddTimeOrder(order);
        setIsAddTimeModalOpen(true);
    };

    const confirmAccept = async () => {
        if (!selectedOrder || (!prepTime && !customPrepTime)) return;
        
        const minutes = customPrepTime ? parseInt(customPrepTime) : prepTime;
        const now = new Date();
        const readyAt = new Date(now.getTime() + minutes * 60000);

        try {
            const { hostingerService } = await import('../services/hostingerService');
            await hostingerService.updateOrder(selectedOrder.id, {
                status: 'processing',
                estimated_ready_at: readyAt.toISOString()
            });

            setIsTimeModalOpen(false);
            setSelectedOrder(null);
            fetchOrders();
        } catch (error) {
            console.error('Error accepting order:', error);
            alert('Erro ao aceitar pedido. Tente novamente.');
        }
    };

    const confirmAddTime = async (minutes: number) => {
        if (!addTimeOrder) return;
        
        const currentReadyAt = addTimeOrder.estimated_ready_at 
            ? new Date(addTimeOrder.estimated_ready_at) 
            : new Date();
        const newReadyAt = new Date(currentReadyAt.getTime() + minutes * 60000);

        try {
            const { hostingerService } = await import('../services/hostingerService');
            await hostingerService.updateOrder(addTimeOrder.id, { estimated_ready_at: newReadyAt.toISOString() });
            setIsAddTimeModalOpen(false);
            setAddTimeOrder(null);
            fetchOrders();
        } catch (error) {
            console.error('Error adding time:', error);
        }
    };

    const handleMarkReady = async (orderId: string) => {
        if (!confirm("Confirmar pedido pronto?")) return;
        try {
            const { hostingerService } = await import('../services/hostingerService');
            await hostingerService.updateOrder(orderId, { status: 'ready' });
            fetchOrders();
        } catch (e) { }
    };

    const handleArchive = async (orderId: string) => {
        if (!confirm("Confirmar entrega / arquivar?")) return;
        try {
            const { hostingerService } = await import('../services/hostingerService');
            await hostingerService.updateOrder(orderId, { status: 'completed' });
            fetchOrders();
        } catch (e) { }
    };

    // --- Manual Order ---
    const saveManualOrder = async () => {
        if (!manualCustomer || manualItems.some(i => !i.name)) {
            alert("Preencha o nome do cliente e os itens!");
            return;
        }

        const orderId = `M${Math.floor(1000 + Math.random() * 9000)}`;
        const total = manualItems.reduce((acc, item) => acc + (item.price * item.quantity), 0);
        
        const newOrder = {
            id: crypto.randomUUID(),
            short_id: orderId,
            customer_name: manualCustomer,
            customer_phone: manualPhone,
            items: manualItems,
            total_amount: total,
            status: manualPrepTime ? 'processing' : 'pending',
            delivery_type: manualOrderType,
            created_at: new Date().toISOString(),
            estimated_ready_at: manualPrepTime ? new Date(Date.now() + manualPrepTime * 60000).toISOString() : null
        };

        try {
            const { hostingerService } = await import('../services/hostingerService');
            await hostingerService.saveOrder(newOrder);
            setIsManualModalOpen(false);
            setManualCustomer('');
            setManualPhone('');
            setManualItems([{ name: '', quantity: 1, price: 0 }]);
        } finally {
            setLoading(false);
        }
    };

    const updateManualItem = (idx: number, field: string, val: any) => {
        const newItems = [...manualItems] as any[];
        newItems[idx][field] = val;

        if (field === 'name') {
            const product = products.find(p => p.name === val);
            if (product) {
                newItems[idx].price = product.price;
                newItems[idx].id = product.id; // Crucial for stock deduction
            }
        }

        setManualItems(newItems);
    };

    const filteredProducts = products.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()));

    // Grouping orders for the KDS layout
    const pendingOrders = orders.filter(o => o.status === 'pending' || o.status === 'kitchen');
    const processingOrders = orders.filter(o => o.status === 'processing');
    const readyOrders = orders.filter(o => o.status === 'ready');

    if (!isAuthenticated) {
        return (
            <div className="min-h-screen bg-[#2f3b3b] flex items-center justify-center p-6">
                <div className="bg-white p-8 rounded-2xl shadow-2xl w-full max-w-md text-[#3b2f2f]">
                    <div className="text-center mb-6">
                        <div className="w-16 h-16 bg-[#d9a65a] rounded-full flex items-center justify-center mx-auto mb-4 text-[#3b2f2f]">
                            <ChefHat size={32} />
                        </div>
                        <h1 className="text-2xl font-bold">Cozinha Pão Caseiro</h1>
                        <p className="text-gray-500">Acesso Restrito ao Staff</p>
                    </div>
                    <form onSubmit={handleLogin} className="space-y-4">
                        <div>
                            <label className="text-xs font-bold text-gray-400 uppercase">Utilizador</label>
                            <input
                                type="text"
                                placeholder="Seu username"
                                className="w-full p-3 border rounded-lg mt-1"
                                value={username} onChange={e => setUsername(e.target.value)}
                                required
                            />
                        </div>
                        <div>
                            <label className="text-xs font-bold text-gray-400 uppercase">Senha</label>
                            <input
                                type="password"
                                placeholder="Sua senha"
                                className="w-full p-3 border rounded-lg mt-1"
                                value={password} onChange={e => setPassword(e.target.value)}
                                required
                            />
                        </div>
                        {error && <p className="text-red-500 text-sm font-bold">{error}</p>}
                        <button 
                            type="submit"
                            disabled={loading}
                            className="w-full bg-[#3b2f2f] text-white py-3 rounded-lg font-bold hover:bg-[#d9a65a] transition-colors disabled:opacity-50"
                        >
                            {loading ? 'A autenticar...' : 'Entrar na Cozinha'}
                        </button>
                    </form>
                </div>
            </div>
        );
    }

    return (
        <div className={`bg-[#1a1f1f] text-white font-sans flex flex-col ${externalUser ? 'w-full h-[calc(100vh-100px)]' : 'min-h-screen'}`}>
            {/* Main Navigation Header */}
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
                    {/* Tabs */}
                    <div className="hidden lg:flex bg-black/30 p-1 rounded-lg">
                        <button
                            onClick={() => setActiveTab('kds')}
                            className={`px-4 py-2 rounded-md font-bold text-sm transition-all flex items-center gap-2 ${activeTab === 'kds' ? 'bg-[#d9a65a] text-[#3b2f2f]' : 'text-gray-400 hover:text-white'}`}
                        >
                            <ChefHat size={16} /> KDS
                        </button>
                        <button
                            onClick={() => setActiveTab('dashboard')}
                            className={`px-4 py-2 rounded-md font-bold text-sm transition-all flex items-center gap-2 ${activeTab === 'dashboard' ? 'bg-[#d9a65a] text-[#3b2f2f]' : 'text-gray-400 hover:text-white'}`}
                        >
                            <LayoutDashboard size={16} /> Dashboard
                        </button>
                        <button
                            onClick={() => setActiveTab('archive')}
                            className={`px-4 py-2 rounded-md font-bold text-sm transition-all flex items-center gap-2 ${activeTab === 'archive' ? 'bg-[#d9a65a] text-[#3b2f2f]' : 'text-gray-400 hover:text-white'}`}
                        >
                            <Archive size={16} /> Arquivados
                        </button>
                    </div>

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
                    {isClockedIn ? (
                        <button onClick={handleClockOut} className="p-2 bg-red-500/20 text-red-400 rounded font-bold hover:bg-red-500 hover:text-white flex items-center gap-2 text-sm px-4 border border-red-500/30">
                            <LogOut size={16} /> <span className="hidden sm:inline">Sair do Turno</span>
                        </button>
                    ) : (
                        <button onClick={handleClockIn} className="p-2 bg-green-500/20 text-green-400 rounded font-bold hover:bg-green-500 hover:text-white flex items-center gap-2 text-sm px-4 border border-green-500/30">
                            <Clock size={16} /> <span className="hidden sm:inline">Entrar ao Serviço</span>
                        </button>
                    )}
                    <button onClick={() => setIsManualModalOpen(true)} className="p-2 bg-[#d9a65a] text-[#3b2f2f] rounded font-bold hover:brightness-110 flex items-center gap-2 text-sm px-4">
                        <Plus size={16} /> <span className="hidden sm:inline">Novo Pedido</span>
                    </button>
                    <button onClick={() => setIsPasswordModalOpen(true)} className="p-2 bg-white/10 rounded hover:bg-white/20" title="Alterar Senha">
                        <User size={20} />
                    </button>
                    <button onClick={fetchOrders} className={`p-2 bg-white/10 rounded hover:bg-white/20 ${refreshing ? 'animate-spin' : ''}`} title="Refresh">
                        <Loader size={20} />
                    </button>
                    <button 
                        onClick={toggleSound} 
                        className={`p-2 rounded transition-colors ${soundEnabled ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}
                        title={soundEnabled ? "Desativar Voz de Notificação" : "Ativar Voz de Notificação"}
                    >
                        {soundEnabled ? <Bell size={20} /> : <EyeOff size={20} />}
                    </button>
                    {!externalUser && <button onClick={handleLogout} className="p-2 bg-red-500/20 text-red-400 rounded hover:bg-red-500 hover:text-white transition-colors">
                        <LogOut size={20} />
                    </button>}
                </div>
            </header>

            {/* Mobile Tabs */}
            <div className="lg:hidden bg-[#242d2d] p-2 flex justify-center gap-2 border-b border-gray-700">
                <button
                    onClick={() => setActiveTab('kds')}
                    className={`flex-1 py-2 rounded-md font-bold text-xs transition-all flex justify-center items-center gap-1 ${activeTab === 'kds' ? 'bg-[#d9a65a] text-[#3b2f2f]' : 'bg-black/20 text-gray-400 hover:text-white'}`}
                >
                    <ChefHat size={14} /> KDS
                </button>
                <button
                    onClick={() => setActiveTab('dashboard')}
                    className={`flex-1 py-2 rounded-md font-bold text-xs transition-all flex justify-center items-center gap-1 ${activeTab === 'dashboard' ? 'bg-[#d9a65a] text-[#3b2f2f]' : 'bg-black/20 text-gray-400 hover:text-white'}`}
                >
                    <LayoutDashboard size={14} /> Dashboard
                </button>
                <button
                    onClick={() => setActiveTab('archive')}
                    className={`flex-1 py-2 rounded-md font-bold text-xs transition-all flex justify-center items-center gap-1 ${activeTab === 'archive' ? 'bg-[#d9a65a] text-[#3b2f2f]' : 'bg-black/20 text-gray-400 hover:text-white'}`}
                >
                    <Archive size={14} /> Histórico
                </button>
            </div>

            {/* Content Grid (KDS) */}
            {activeTab === 'kds' && (
            <div className={`flex-1 p-4 grid grid-cols-1 md:grid-cols-3 gap-6 overflow-hidden ${externalUser ? 'overflow-y-auto' : 'h-[calc(100vh-140px)]'}`}>

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
                                            <span className="font-bold">{item.quantity}x {formatProductName(item.name)}</span>
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
                                            <span>{item.quantity}x {formatProductName(item.name)}</span>
                                        </div>
                                    ))}
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => handleAddTimeClick(order)}
                                        className="w-1/3 bg-gray-600/40 text-gray-300 py-2 rounded font-bold uppercase text-xs hover:bg-gray-600 transition-all flex items-center justify-center gap-1"
                                        title="Adicionar Tempo"
                                    >
                                        <Clock size={14} /> + Tempo
                                    </button>
                                    <button
                                        onClick={() => handleMarkReady(order.id)}
                                        className="w-2/3 bg-green-600 text-white py-2 rounded font-bold uppercase text-sm hover:bg-green-500 transition-all flex items-center justify-center gap-2"
                                    >
                                        <CheckCircle size={16} /> Pronto
                                    </button>
                                </div>
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
                                    {order.items.map(i => `${i.quantity} ${formatProductName(i.name)}`).join(', ')}
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
            )}

            {/* Dashboard Content */}
            {activeTab === 'dashboard' && (
                <div className={`flex-1 p-6 overflow-y-auto ${externalUser ? '' : 'h-[calc(100vh-140px)]'}`}>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                        <div className="bg-[#2a3030] p-6 rounded-xl border border-gray-700 shadow-lg flex items-center gap-4">
                            <div className="bg-blue-500/20 p-4 rounded-full text-blue-400"><Bell size={32} /></div>
                            <div>
                                <p className="text-gray-400 text-sm font-bold uppercase">Novos Pedidos</p>
                                <h3 className="text-3xl font-bold">{pendingOrders.length}</h3>
                            </div>
                        </div>
                        <div className="bg-[#2a3030] p-6 rounded-xl border border-gray-700 shadow-lg flex items-center gap-4">
                            <div className="bg-orange-500/20 p-4 rounded-full text-orange-400"><ChefHat size={32} /></div>
                            <div>
                                <p className="text-gray-400 text-sm font-bold uppercase">Em Preparação</p>
                                <h3 className="text-3xl font-bold">{processingOrders.length}</h3>
                            </div>
                        </div>
                        <div className="bg-[#2a3030] p-6 rounded-xl border border-gray-700 shadow-lg flex items-center gap-4">
                            <div className="bg-green-500/20 p-4 rounded-full text-green-400"><CheckCircle size={32} /></div>
                            <div>
                                <p className="text-gray-400 text-sm font-bold uppercase">Finalizados (Hoje)</p>
                                <h3 className="text-3xl font-bold">{archivedOrders.length}</h3>
                            </div>
                        </div>
                    </div>

                    <h2 className="text-xl font-bold mb-4 flex items-center gap-2"><Package className="text-[#d9a65a]" /> Inventário da Cozinha</h2>
                    <div className="bg-[#2a3030] rounded-xl border border-gray-700 shadow-lg overflow-hidden">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-[#1f2626] text-gray-400 uppercase">
                                <tr>
                                    <th className="p-4 rounded-tl-xl text-left">Produto</th>
                                    <th className="p-4 text-center">Preço (MT)</th>
                                    <th className="p-4 rounded-tr-xl text-center">Stock Atual</th>
                                </tr>
                            </thead>
                            <tbody>
                                {products.map((p, i) => (
                                    <tr key={p.id} className="border-t border-gray-700 hover:bg-[#343b3b] transition-colors">
                                        <td className="p-4 font-bold">{p.name}</td>
                                        <td className="p-4 text-center text-gray-400">{p.price.toFixed(2)}</td>
                                        <td className="p-4 text-center">
                                            <span className={`px-3 py-1 rounded-full font-bold text-xs ${p.stock_quantity > 10 ? 'bg-green-500/20 text-green-400' : p.stock_quantity > 0 ? 'bg-orange-500/20 text-orange-400' : 'bg-red-500/20 text-red-400'}`}>
                                                {p.stock_quantity}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                                {products.length === 0 && (
                                    <tr>
                                        <td colSpan={3} className="p-8 text-center text-gray-500">Nenhum produto encontrado.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Archive Content */}
            {activeTab === 'archive' && (
                <div className={`flex-1 p-6 overflow-y-auto ${externalUser ? '' : 'h-[calc(100vh-140px)]'}`}>
                    <h2 className="text-xl font-bold mb-4 flex items-center gap-2"><Archive className="text-[#d9a65a]" /> Histórico de Pedidos (Hoje)</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                        {archivedOrders.map(order => (
                            <div key={order.id} className="bg-[#2a3030] p-5 rounded-xl border border-gray-700 shadow-lg opacity-80 hover:opacity-100 transition-opacity">
                                <div className="flex justify-between items-start mb-3 border-b border-gray-700 pb-3">
                                    <h3 className="font-bold text-green-500 text-lg">#{order.orderId || order.id.slice(0, 6)}</h3>
                                    <span className="text-xs text-gray-400 bg-gray-800 px-2 py-1 rounded">{new Date(order.created_at).toLocaleString('pt-PT').slice(0, 17)}</span>
                                </div>
                                <p className="font-bold text-gray-200 mb-3 flex items-center gap-2">
                                    <User size={14} className="text-gray-400" /> {order.customer_name}
                                </p>
                                <div className="space-y-1 text-sm text-gray-400 bg-black/20 p-3 rounded-lg">
                                    {order.items.map((item, idx) => (
                                        <div key={idx} className="flex justify-between border-b border-gray-700 last:border-0 pb-1 last:pb-0">
                                            <span>{item.quantity}x {formatProductName(item.name)}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                        {archivedOrders.length === 0 && (
                            <div className="col-span-full pt-10 text-center text-gray-500">
                                <Archive size={40} className="mx-auto mb-3 opacity-30" />
                                <p>Nenhum pedido arquivado hoje.</p>
                            </div>
                        )}
                    </div>
                </div>
            )}

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
                            <div className="grid grid-cols-3 gap-3 mb-4">
                                {[10, 15, 20, 30, 45, 60].map(time => (
                                    <button
                                        key={time}
                                        onClick={() => {
                                            setPrepTime(time);
                                            setCustomPrepTime(''); // Clear custom when picking preset
                                        }}
                                        className={`py-3 rounded-lg font-bold border transition-all ${prepTime === time && !customPrepTime ? 'bg-[#d9a65a] text-[#3b2f2f] border-[#d9a65a]' : 'border-gray-600 text-gray-300 hover:border-[#d9a65a]'}`}
                                    >
                                        {time} min
                                    </button>
                                ))}
                            </div>
                            <div className="mb-6">
                                <label className="text-xs text-gray-400 mb-1 block">Tempo Personalizado (minutos)</label>
                                <input
                                    type="number"
                                    min="1"
                                    placeholder="Ex: 25"
                                    className="w-full bg-[#1f2626] border border-gray-600 text-white p-3 rounded-lg focus:outline-none focus:border-[#d9a65a]"
                                    value={customPrepTime}
                                    onChange={(e) => setCustomPrepTime(e.target.value)}
                                />
                            </div>
                            <div className="flex gap-3">
                                <button onClick={() => setIsTimeModalOpen(false)} className="flex-1 py-3 rounded-lg font-bold bg-transparent border border-gray-500 text-gray-300">Cancelar</button>
                                <button onClick={confirmAccept} className="flex-1 py-3 rounded-lg font-bold bg-[#d9a65a] text-[#3b2f2f]">Confirmar</button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Add Time Modal */}
            <AnimatePresence>
                {isAddTimeModalOpen && (
                    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            className="bg-[#2f3b3b] p-6 rounded-2xl w-full max-w-sm border border-gray-600"
                        >
                            <h3 className="text-xl font-bold text-white mb-4 text-center">Adicionar Mais Tempo</h3>
                            <p className="text-gray-400 text-sm mb-6 text-center">
                                Quanto tempo quer acrescentar ao pedido <strong className="text-white">#{addTimeOrder?.orderId || addTimeOrder?.id.slice(0, 6)}</strong>?
                            </p>
                            <div className="grid grid-cols-2 gap-3 mb-6">
                                {[5, 10, 15, 20, 30, 45].map(time => (
                                    <button
                                        key={time}
                                        onClick={() => confirmAddTime(time)}
                                        className="py-3 rounded-lg font-bold border border-gray-600 text-gray-300 hover:bg-[#d9a65a] hover:text-[#3b2f2f] hover:border-[#d9a65a] transition-all"
                                    >
                                        + {time} min
                                    </button>
                                ))}
                            </div>
                            <div className="flex gap-3">
                                <button onClick={() => setIsAddTimeModalOpen(false)} className="w-full py-3 rounded-lg font-bold bg-transparent border border-gray-500 text-gray-300">Sair</button>
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

                            <div className="mb-4">
                                <label className="text-xs font-bold uppercase text-gray-400 mb-2 block">Tipo de Atendimento</label>
                                <div className="flex gap-2">
                                    {[
                                        { id: 'local', label: 'Local' },
                                        { id: 'pickup', label: 'Takeaway' },
                                        { id: 'delivery', label: 'Entrega' }
                                    ].map(type => (
                                        <button
                                            key={type.id}
                                            onClick={() => setManualOrderType(type.id as any)}
                                            className={`flex-1 py-2 text-xs font-bold border rounded transition-all ${manualOrderType === type.id ? 'bg-[#3b2f2f] text-white border-[#3b2f2f]' : 'text-gray-500 border-gray-300 hover:border-gray-400'}`}
                                        >
                                            {type.label}
                                        </button>
                                    ))}
                                </div>
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

            {/* Password Change Modal */}
            <AnimatePresence>
                {isPasswordModalOpen && (
                    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
                        <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="bg-white p-6 rounded-2xl w-full max-w-sm text-[#3b2f2f]">
                            <h3 className="text-xl font-bold mb-4">Alterar Senha</h3>
                            <div className="space-y-4 mb-6">
                                <div>
                                    <label className="text-xs font-bold uppercase text-gray-400">Nova Senha</label>
                                    <input
                                        type="password"
                                        className="w-full p-2 border rounded"
                                        value={newPassword}
                                        onChange={e => setNewPassword(e.target.value)}
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-bold uppercase text-gray-400">Confirmar Senha</label>
                                    <input
                                        type="password"
                                        className="w-full p-2 border rounded"
                                        value={confirmPassword}
                                        onChange={e => setConfirmPassword(e.target.value)}
                                    />
                                </div>
                            </div>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => { setIsPasswordModalOpen(false); setNewPassword(''); setConfirmPassword(''); }}
                                    className="flex-1 py-3 rounded-lg font-bold bg-gray-100 text-gray-500"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={async () => {
                                    if (!newPassword || newPassword !== confirmPassword) {
                                        alert("As senhas não coincidem!");
                                        return;
                                    }
                                    setIsChangingPassword(true);
                                    try {
                                        const { hostingerService } = await import('../services/hostingerService');
                                        await hostingerService.updateTeamMember(user.id, { password: newPassword });
                                        alert("Senha alterada com sucesso!");
                                        setIsPasswordModalOpen(false);
                                        setNewPassword('');
                                        setConfirmPassword('');
                                    } catch (error) {
                                        console.error('Error changing password:', error);
                                        alert("Erro ao alterar senha.");
                                    }
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
