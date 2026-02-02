import React, { useState, useEffect } from 'react';
import { Eye, EyeOff, Sparkles, MessageSquare, Trash2, Upload, Send, CheckCircle, Package, TrendingUp, User, LogOut, ShoppingBag, Clock, Menu, X, ChevronRight, Search, Plus, Calendar, MapPin, Truck, Smartphone, Users, MessageCircle, Mail, Download, ChevronLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { AdminSupportAI } from '../components/AdminSupportAI';
import { Kitchen } from './Kitchen';
import { sendSMS, sendWhatsApp, notifyCustomer } from '../services/sms';

// --- Types ---
interface Order {
    orderId: string;
    paymentRef: string;
    date: string;
    status: 'pending' | 'processing' | 'ready' | 'delivering' | 'completed' | 'cancelled';
    driver_id?: string;
    otp?: string;
    total: number;
    amountPaid: number;
    balance: number;
    customer: {
        name: string;
        phone: string;
        type: 'delivery' | 'pickup' | 'dine_in';
        address?: string;
        tableZone?: string;
        tablePeople?: number;
        notes?: string;
    };
    items: Array<{
        name: string;
        price: number;
        quantity: number;
    }>;
}

// --- New Types for Logistics ---
interface Driver {
    id: string;
    name: string;
    phone: string;
    vehicle?: string;
    status: 'available' | 'busy' | 'offline';
    base_location?: string;
    alternative_phone?: string;
    email?: string;
}

interface ManualDelivery { // For non-order based deliveries if needed
    id: string;
    customer_name: string;
    address: string;
    phone: string;
    details: string;
    coordinates?: string; // Link or coords
}

export const Admin: React.FC = () => {
    // Auth State
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [userId, setUserId] = useState('');
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [currentUserRole, setCurrentUserRole] = useState<string>('');
    const [showPassword, setShowPassword] = useState(false);

    // Data State
    const [orders, setOrders] = useState<Order[]>([]);
    const [products, setProducts] = useState<any[]>([]);

    // Logistics State
    const [logisticsTab, setLogisticsTab] = useState<'dashboard' | 'deliveries' | 'drivers'>('dashboard');
    const [drivers, setDrivers] = useState<Driver[]>([]);
    const [isAddingDriver, setIsAddingDriver] = useState(false);
    const [isSupportTicketOpen, setIsSupportTicketOpen] = useState(false);
    const [supportForm, setSupportForm] = useState({ subject: '', message: '', image: null as File | null });
    const [isAddingDelivery, setIsAddingDelivery] = useState(false); // For manual delivery
    const [selectedDriver, setSelectedDriver] = useState<Driver | null>(null); // For assigning
    const [orderToAssign, setOrderToAssign] = useState<Order | null>(null);
    const [driverForm, setDriverForm] = useState({
        name: '',
        phone: '',
        vehicle: '',
        base_location: '',
        email: '',
        alternative_phone: ''
    });

    const [teamMembers, setTeamMembers] = useState<any[]>([]);
    const [messages, setMessages] = useState<any[]>([]);
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

    // Initial Data Load
    useEffect(() => {
        const savedOrders = localStorage.getItem('bakery_orders');
        if (savedOrders) setOrders(JSON.parse(savedOrders));

        const savedMembers = localStorage.getItem('bakery_members');
        if (savedMembers) setTeamMembers(JSON.parse(savedMembers));

        const savedProducts = localStorage.getItem('bakery_products_db');
        if (savedProducts) setProducts(JSON.parse(savedProducts));

        const savedDrivers = localStorage.getItem('bakery_drivers');
        if (savedDrivers) setDrivers(JSON.parse(savedDrivers));

        // Load Admin User
        const savedUser = localStorage.getItem('admin_user');
        const savedUserId = localStorage.getItem('admin_id');

        if (savedUserId) setUserId(savedUserId);

        if (savedUser) {
            // Legacy handling or simple string
            if (savedUser.startsWith('{')) {
                const parsed = JSON.parse(savedUser);
                setUsername(parsed.name || 'Nazir');
            } else {
                setUsername(savedUser);
            }
        } else {
            setUsername('Nazir');
        }
    }, []);

    // Load Drivers (Supabase)
    const loadDrivers = async () => {
        const { supabase } = await import('../services/supabase');
        const { data, error } = await supabase.from('logistics_drivers').select('*').order('name');
        if (data) setDrivers(data);
    };

    useEffect(() => {
        loadDrivers();
    }, []);

    const handleSaveDriver = async (e: React.FormEvent) => {
        e.preventDefault();
        const { supabase } = await import('../services/supabase');

        const driverData = {
            name: driverForm.name,
            phone: driverForm.phone,
            vehicle_type: driverForm.vehicle,
            base_location: driverForm.base_location,
            email: driverForm.email,
            alternative_phone: driverForm.alternative_phone,
            status: 'available' // default
        };

        if (selectedDriver) {
            await supabase.from('logistics_drivers').update(driverData).eq('id', selectedDriver.id);
        } else {
            await supabase.from('logistics_drivers').insert(driverData);
        }

        loadDrivers();
        setIsAddingDriver(false);
        setSelectedDriver(null);
        setDriverForm({ name: '', phone: '', vehicle: '', base_location: '', email: '', alternative_phone: '' });
    };

    const handleDeleteDriver = async (id: string) => {
        if (!confirm('Remover Motorista?')) return;
        const { supabase } = await import('../services/supabase');
        await supabase.from('logistics_drivers').delete().eq('id', id);
        loadDrivers();
    };

    const handleDriverStatusChange = async (driverId: string, newStatus: string) => {
        const { supabase } = await import('../services/supabase');
        // Optimistic update
        setDrivers(drivers.map(d => d.id === driverId ? { ...d, status: newStatus as any } : d));

        await supabase.from('logistics_drivers').update({ status: newStatus }).eq('id', driverId);
    };

    // Assign Order to Driver
    const handleAssignOrder = async () => {
        if (!selectedDriver || !orderToAssign) return;

        // 1. Generate OTP
        const otp = Math.floor(1000 + Math.random() * 9000).toString();

        // 2. Send WhatsApp
        const message = `*Nova Entrega - Pão Caseiro*%0A%0APedido: #${orderToAssign.orderId}%0ACliente: ${orderToAssign.customer.name}%0ATelefone: ${orderToAssign.customer.phone}%0AEndereço: ${orderToAssign.customer.address || 'N/A'}%0A%0AItems:%0A${orderToAssign.items.map(i => `- ${i.quantity}x ${i.name}`).join('%0A')}%0A%0A*CÓDIGO DE CONFIRMAÇÃO (OTP):* ${otp}`;
        const whatsappUrl = `https://wa.me/258${selectedDriver.phone.replace(/\D/g, '').slice(-9)}?text=${message}`;

        window.open(whatsappUrl, '_blank');

        // 3. Update Order in State (and localStorage for demo, should be DB)
        // 3. Update Order in Supabase
        const { supabase } = await import('../services/supabase');
        await supabase
            .from('orders')
            .update({ status: 'delivering', driver_id: selectedDriver.id, otp: otp })
            .eq('short_id', orderToAssign.orderId);

        loadOrders();

        // Notify Customer
        notifyCustomer({ ...orderToAssign, status: 'delivering' }, 'status_update').catch(err => console.error("Customer delivery status notification failed", err));

        alert(`Pedido #${orderToAssign.orderId} atribuído a ${selectedDriver.name} (Status: Em Rota).`);
        setOrderToAssign(null);
        setSelectedDriver(null);
    };

    const handleCompleteDelivery = (order: Order) => {
        if (!order.otp) {
            alert("Erro: Esta encomenda não tem OTP. Finalize apenas pelo painel de admin.");
            return;
        }
        const inputOtp = prompt(`Para finalizar a entrega #${order.orderId}, peça o OTP ao cliente:`);
        if (inputOtp === order.otp) {
            (async () => {
                const { supabase } = await import('../services/supabase');
                await supabase.from('orders').update({ status: 'completed' }).eq('short_id', order.orderId);

                const updatedOrder = { ...order, status: 'completed' as const };
                loadOrders();

                // Notify Customer
                notifyCustomer(updatedOrder, 'status_update').catch(err => console.error("Customer completion status notification failed", err));

                alert("Sucesso! Entrega marcada como concluída.");
            })();
        } else {
            alert("Código OTP Incorreto! A entrega não foi finalizada.");
        }
    };



    // View State
    const [activeView, setActiveView] = useState<'dashboard' | 'orders' | 'stock' | 'team' | 'messages' | 'support_ai' | 'logistics'>('dashboard');
    const [searchTerm, setSearchTerm] = useState('');
    const [stockSearchTerm, setStockSearchTerm] = useState(''); // New Stock Search Scope
    const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'completed' | 'cancelled'>('all');

    // Modal/Edit States
    const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
    const [isEditingProduct, setIsEditingProduct] = useState(false);
    const [currentProduct, setCurrentProduct] = useState<any>(null);
    const [previewImage, setPreviewImage] = useState('');
    const [productVariations, setProductVariations] = useState<any[]>([]);
    const [isEditingMember, setIsEditingMember] = useState(false);
    const [currentMember, setCurrentMember] = useState<any>(null);

    // Dashboard States
    const [currentTime, setCurrentTime] = useState(new Date());
    const [quote, setQuote] = useState('');
    const [showUserModal, setShowUserModal] = useState(false);
    const [userForm, setUserForm] = useState({ name: '', phone: '', password: '', confirmPassword: '', photo: '' });
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const { supabase } = await import('../services/supabase');
        const fileExt = file.name.split('.').pop();
        const fileName = `avatars/${Date.now()}.${fileExt}`;
        const { error } = await supabase.storage.from('products').upload(fileName, file); // Using products bucket as generic storage for now

        if (error) {
            alert('Erro ao enviar foto: ' + error.message);
        } else {
            const { data } = supabase.storage.from('products').getPublicUrl(fileName);
            setUserForm(prev => ({ ...prev, photo: data.publicUrl }));
        }
    };

    const handleUpdateUser = async (e: React.FormEvent) => {
        e.preventDefault();
        console.log("Submit clicked. Form State:", userForm); // DEBUG
        setIsSubmitting(true);

        if (userForm.password && userForm.password !== userForm.confirmPassword) {
            console.warn("Password mismatch validation failed");
            alert('As senhas não coincidem!');
            setIsSubmitting(false);
            return;
        }

        try {
            const { supabase } = await import('../services/supabase');
            // Assuming we have a way to identify the current user ID, e.g., stored in localStorage or context
            // Since we don't have the ID in state in this snippet, we might need to fetch it or rely on username
            // Ideally should use ID. For now, let's try to update by username if unique or if we have the ID.

            // Allow update if we have an ID or just update local if legacy
            // But requirement is persistence.
            // Let's assume we can query by username first to get ID if needed, 
            // or we might have the user object in state if we expanded `loadTeam`.

            const updates: any = {};
            if (userForm.name) {
                updates.name = userForm.name;
                localStorage.setItem('admin_user', userForm.name);
            }
            if (userForm.photo) {
                updates.avatar_url = userForm.photo; // Assuming column is avatar_url or we need to add it? Let's check schema/types implicitly or add generic 'photo'
                localStorage.setItem('admin_photo', userForm.photo);
            }
            if (userForm.phone) {
                updates.phone = userForm.phone;
                localStorage.setItem('admin_phone', userForm.phone);
            }
            if (userForm.password) {
                updates.password = userForm.password;
            }

            // Update in Supabase
            // Use ID if available, otherwise try fallback
            let uid = userId;

            if (!uid) {
                // Try to find by username map if we don't have ID (Legacy session)
                // This is risky if username state is actually 'Name'
                // We'll throw an error and ask to relogin if ID is missing
                const { data: userProps } = await supabase.from('team_members').select('id').eq('username', username).single();
                if (userProps) uid = userProps.id;
            }

            if (uid) {
                const { error: updateError } = await supabase.from('team_members').update(updates).eq('id', uid);
                if (updateError) throw updateError;

                // Reload user data
                const { data: freshUser } = await supabase.from('team_members').select('*').eq('id', uid).single();
                if (freshUser) {
                    setUsername(freshUser.name);
                    localStorage.setItem('admin_user', freshUser.name); // Keep legacy for display
                    localStorage.setItem('admin_id', freshUser.id);
                    if (freshUser.role) localStorage.setItem('admin_role', freshUser.role);
                    if (freshUser.avatar_url) localStorage.setItem('admin_photo', freshUser.avatar_url);
                }
            } else {
                console.error("DEBUG: UserId missing and username lookup failed. User needs to re-login.");
                throw new Error("SESSÃO INVÁLIDA: O sistema não conseguiu identificar seu usuário. Por favor faça LOGOUT e LOGIN novamente.");
            }

            if (userForm.password && userForm.phone) {
                await sendSMS(userForm.phone, `Zyph Security: Sua senha de Admin foi alterada com sucesso.`);
            }

            setShowUserModal(false);
            alert('Perfil atualizado com sucesso!');

        } catch (err: any) {
            console.error("Update Error", err);
            alert('ATENÇÃO: ' + (err.message || err));
        } finally {
            setIsSubmitting(false);
        }
    };

    // --- Init ---
    useEffect(() => {
        if (localStorage.getItem('admin_auth') === 'true') {
            setIsAuthenticated(true);
            setCurrentUserRole(localStorage.getItem('admin_role') || 'staff');
            loadOrders();
            loadProducts();
            loadMessages();
            if (localStorage.getItem('admin_role') === 'admin' || localStorage.getItem('admin_role') === 'it') {
                loadTeam();
            }
            setUserId(localStorage.getItem('admin_id') || ''); // FIX PERSISTENCE

            // Real-time Orders Listener
            (async () => {
                const { supabase } = await import('../services/supabase');
                const channel = supabase
                    .channel('schema-db-changes')
                    .on(
                        'postgres_changes',
                        {
                            event: 'INSERT',
                            schema: 'public',
                            table: 'orders',
                        },
                        (payload) => {
                            console.log('New Order Received!', payload);
                            loadOrders();
                            // Optional: Notification sound or Toast
                            alert(`NOVO PEDIDO RECEBIDO! #${payload.new.short_id}`);
                        }
                    )
                    .subscribe();

                return () => {
                    supabase.removeChannel(channel);
                };
            })();

            // Redirect Driver
            if (localStorage.getItem('admin_role') === 'driver') {
                setActiveView('logistics');
            }
        }
    }, []);

    // Clock
    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    // Quote
    useEffect(() => {
        const quotes = [
            "A qualidade é a nossa melhor receita.",
            "O sucesso é a soma de pequenos esforços repetidos dia após dia.",
            "Um cliente satisfeito é a melhor estratégia de negócios.",
            "Grandes conquistas começam com bons pães!",
            "A padaria é o coração da comunidade.",
            "Liderança é servir.",
            "Foco no cliente, paixão pelo produto."
        ];
        setQuote(quotes[Math.floor(Math.random() * quotes.length)]);
    }, []);

    // --- Actions ---

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
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
                setCurrentUserRole(data.role);
                setUserId(data.id);
                setUsername(data.name);

                localStorage.setItem('admin_auth', 'true');
                localStorage.setItem('admin_role', data.role);
                localStorage.setItem('admin_id', data.id); // Save ID
                localStorage.setItem('admin_user', data.name);

                loadOrders();
                loadProducts();
                loadMessages();
                if (data.role === 'admin' || data.role === 'it') {
                    loadTeam();
                }
            } else {
                setError('Credenciais incorretas');
            }
        } catch (err) {
            console.error(err);
            setError('Erro ao conectar');
        }
    };

    const handleLogout = () => {
        setIsAuthenticated(false);
        localStorage.removeItem('admin_auth');
        localStorage.removeItem('admin_role');
        localStorage.removeItem('admin_user');
        localStorage.removeItem('admin_id');
        setUserId('');
        setUsername('');
    };

    // Orders (Supabase)
    const loadOrders = async () => {
        try {
            const { supabase } = await import('../services/supabase');
            const { data, error } = await supabase
                .from('orders')
                .select(`
                    *,
                    items:order_items(*)
                `)
                .order('created_at', { ascending: false });

            if (error) throw error;

            if (data) {
                const mapped: Order[] = data.map((o: any) => ({
                    orderId: o.short_id,
                    paymentRef: o.payment_ref,
                    transaction_id: o.transaction_id,
                    date: new Date(o.created_at).toLocaleString(),
                    status: o.status,
                    total: Number(o.total_amount),
                    amountPaid: Number(o.amount_paid),
                    balance: Number(o.balance),
                    customer: {
                        name: o.customer_name,
                        phone: o.customer_phone,
                        type: o.delivery_type,
                        address: o.delivery_address,
                        tableZone: o.table_zone,
                        tablePeople: o.table_people,
                        notes: o.notes
                    },
                    items: (o.items || []).map((i: any) => ({
                        name: i.product_name,
                        price: Number(i.price),
                        quantity: i.quantity
                    }))
                }));
                setOrders(mapped);
            }
        } catch (e) {
            console.error("Failed to load orders", e);
        }
    };

    // Products (Supabase)
    const loadProducts = async () => {
        const { supabase } = await import('../services/supabase');
        const { data, error } = await supabase
            .from('products')
            .select(`*, variations:product_variations(*)`)
            .order('name');

        if (!error && data) {
            const mapped = data.map((p: any) => ({
                id: p.id,
                name: p.name,
                price: p.price,
                category: p.category,
                inStock: p.is_available,
                stockQuantity: p.stock_quantity,
                prepTime: p.prep_time,
                deliveryTime: p.delivery_time,
                image: p.image_url,
                variations: p.variations,
                unit: p.unit || 'un'
            }));
            setProducts(mapped);
        }
    };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0) return;
        const file = e.target.files[0];
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}.${fileExt}`;
        const filePath = `${fileName}`;

        const { supabase } = await import('../services/supabase');
        const { error: uploadError } = await supabase.storage.from('products').upload(filePath, file);

        if (uploadError) {
            console.error('Upload Error:', uploadError);
            alert('Erro ao fazer upload da imagem.');
            return;
        }

        const { data } = supabase.storage.from('products').getPublicUrl(filePath);
        setPreviewImage(data.publicUrl);
    };

    const handleSaveProduct = async (e: React.FormEvent) => {
        e.preventDefault();
        const form = e.target as any;
        const productData = {
            name: form.name.value,
            category: form.category.value,
            price: Number(form.price.value),
            stock_quantity: Number(form.stockQuantity.value) || 0,
            is_available: form.inStock.checked,
            prep_time: form.prepTime.value,
            delivery_time: form.deliveryTime.value,
            unit: form.unit.value,
            image_url: previewImage,
            name_en: form.name_en?.value || null,
            description_en: form.description_en?.value || null
        };

        const { supabase } = await import('../services/supabase');
        try {
            let productId = currentProduct?.id;

            if (currentProduct?.id && typeof currentProduct.id === 'string') {
                await supabase.from('products').update(productData).eq('id', currentProduct.id);
            } else {
                const { data } = await supabase.from('products').insert(productData).select().single();
                if (data) productId = data.id;
            }

            // Handle Variations
            if (productId) {
                // Delete existing (simple way to sync)
                await supabase.from('product_variations').delete().eq('product_id', productId);

                // Insert current
                if (productVariations.length > 0) {
                    const varsToInsert = productVariations.map(v => ({
                        product_id: productId,
                        name: v.name,
                        price: Number(v.price)
                    }));
                    await supabase.from('product_variations').insert(varsToInsert);
                }
            }

            loadProducts();
            setIsEditingProduct(false);
            setCurrentProduct(null);
            setProductVariations([]);
        } catch (error) {
            console.error("Error saving product:", error);
            alert("Erro ao salvar produto");
        }
    };

    const handleDeleteProduct = async (id: any) => {
        if (confirm('Tem certeza?')) {
            const { supabase } = await import('../services/supabase');
            await supabase.from('products').delete().eq('id', id);
            loadProducts();
        }
    };

    // Team (Supabase)
    const loadTeam = async () => {
        const { supabase } = await import('../services/supabase');
        const { data } = await supabase.from('team_members').select('*').order('name');
        if (data) setTeamMembers(data);
    };

    const handleSaveMember = async (e: React.FormEvent) => {
        e.preventDefault();
        const form = e.target as any;
        const memberData = {
            name: form.memberName.value,
            username: form.memberUsername.value,
            role: form.memberRole.value,
            password: form.memberPassword.value
        };

        const { supabase } = await import('../services/supabase');
        if (currentMember?.id) {
            await supabase.from('team_members').update(memberData).eq('id', currentMember.id);
        } else {
            await supabase.from('team_members').insert(memberData);
        }
        loadTeam();
        setIsEditingMember(false);
        setCurrentMember(null);
    };

    const handleDeleteMember = async (id: string) => {
        if (confirm('Remover membro?')) {
            const { supabase } = await import('../services/supabase');
            await supabase.from('team_members').delete().eq('id', id);
            loadTeam();
        }
    };

    // Messages (Supabase)
    const loadMessages = async () => {
        const { supabase } = await import('../services/supabase');
        const { data } = await supabase.from('contact_messages').select('*').order('created_at', { ascending: false });
        if (data) setMessages(data);
    };

    const handleSupportSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        let imageUrl = '';
        if (supportForm.image) {
            const file = supportForm.image;
            const filePath = `tickets/${Date.now()}_${file.name}`;
            const { supabase } = await import('../services/supabase');
            await supabase.storage.from('support-tickets').upload(filePath, file);
            const { data } = supabase.storage.from('support-tickets').getPublicUrl(filePath);
            imageUrl = data.publicUrl;
        }

        const body = `*Novo Ticket de Suporte*\n\n*Assunto:* ${supportForm.subject}\n*Mensagem:* ${supportForm.message}\n\n*Imagem:* ${imageUrl || 'N/A'}\n\n*Enviado por:* ${localStorage.getItem('admin_user')}`;

        // WhatsApp API (Zyph Tech)
        window.open(`https://wa.me/258863242532?text=${encodeURIComponent(body)}`, '_blank');

        // Email
        window.location.href = `mailto:supporte@zyph.co.in?subject=Support Ticket: ${supportForm.subject}&body=${encodeURIComponent(body)}`;

        setIsSupportTicketOpen(false);
        setSupportForm({ subject: '', message: '', image: null });
        alert("Ticket criado! A verificar envio via WhatsApp e Email...");
    };

    // Stats & Export
    const totalSales = orders.reduce((sum, order) => sum + (order.total || 0), 0);
    const totalOrders = orders.length;
    const pendingOrders = orders.filter(o => o.status === 'pending').length;

    // Stock Stats
    const totalProducts = products.length;
    const lowStockProducts = products.filter(p => p.stockQuantity < 10 && p.stockQuantity > 0).length;
    const outOfStockProducts = products.filter(p => p.stockQuantity === 0).length;

    // Recent Orders (Assuming newer at end, reverse to verify recent)
    const recentOrders = [...orders].reverse().slice(0, 5);

    // Graph Data
    const getLast7DaysSales = () => {
        const days = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab'];
        const today = new Date();
        const sales = Array(7).fill(0);
        // This simulates distribution based on today since real dates vary
        // In prod, match date string. For now, mock distribution for visuals.
        return days.map((day, i) => ({
            day,
            value: i === today.getDay() ? totalSales * 0.4 : totalSales * Math.random() * 0.2
        }));
    };
    const salesData = getLast7DaysSales();
    const maxSale = Math.max(...salesData.map(d => d.value), 1);

    // Derived Data
    const filteredOrders = orders.filter(o =>
        (statusFilter === 'all' || o.status === statusFilter) &&
        (o.orderId.toLowerCase().includes(searchTerm.toLowerCase()) ||
            o.customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            o.customer.phone.includes(searchTerm) ||
            (o.paymentRef && o.paymentRef.toLowerCase().includes(searchTerm.toLowerCase())))
    );

    const filteredProducts = products.filter(p =>
        p.name.toLowerCase().includes(stockSearchTerm.toLowerCase()) ||
        (p.id && p.id.toString().toLowerCase().includes(stockSearchTerm.toLowerCase()))
    );

    const downloadCSV = () => {
        const headers = ["ID", "Ref", "Cliente", "Tel", "Data", "Total", "Status", "Items"];
        const rows = orders.map(o => [
            o.orderId, o.paymentRef, o.customer.name, o.customer.phone, o.date, o.total, o.status,
            o.items.map(i => `${i.quantity}x ${i.name}`).join('|')
        ]);
        const csvContent = "data:text/csv;charset=utf-8," + headers.join(",") + "\n" + rows.map(e => e.join(",")).join("\n");
        const link = document.createElement("a");
        link.setAttribute("href", encodeURI(csvContent));
        link.setAttribute("download", "pedidos.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    // --- Render ---

    if (!isAuthenticated) {
        return (
            <div className="min-h-screen bg-[#f7f1eb] flex items-center justify-center p-6 bg-pattern">
                <div className="bg-white p-8 rounded-2xl shadow-2xl w-full max-w-md border border-[#d9a65a]/20">
                    <div className="text-center mb-8">
                        <ShoppingBag className="w-12 h-12 text-[#d9a65a] mx-auto mb-4" />
                        <h1 className="text-2xl font-serif font-bold text-[#3b2f2f]">Admin Pão Caseiro</h1>
                        <p className="text-gray-400 text-sm mt-2">Acesso Restrito</p>
                    </div>
                    <form onSubmit={handleLogin} className="space-y-4">
                        <input type="text" value={username} onChange={e => setUsername(e.target.value)} className="w-full p-3 border border-gray-200 rounded-lg focus:border-[#d9a65a] focus:ring-1 focus:ring-[#d9a65a] outline-none transition-all" placeholder="Username" autoFocus />
                        <input type="password" value={password} onChange={e => setPassword(e.target.value)} className="w-full p-3 border border-gray-200 rounded-lg focus:border-[#d9a65a] focus:ring-1 focus:ring-[#d9a65a] outline-none transition-all" placeholder="Senha" />
                        {error && <p className="text-red-500 text-sm font-bold bg-red-50 p-2 rounded">{error}</p>}
                        <button type="submit" className="w-full bg-[#3b2f2f] text-[#d9a65a] py-3 rounded-xl font-bold uppercase tracking-wide hover:shadow-lg hover:scale-[1.02] transition-all">Entrar</button>
                    </form>
                </div>
            </div>
        );
    }

    return (
        <div className="h-screen overflow-hidden bg-[#f7f1eb] flex flex-col md:flex-row font-sans">
            {/* Sidebar */}
            <div className={`bg-[#3b2f2f] text-white transition-all duration-300 flex flex-col justify-between shrink-0 shadow-xl z-20 ${isSidebarCollapsed ? 'w-20 p-4 items-center' : 'w-full md:w-64 p-6'}`}>
                <div>
                    <div className={`flex items-center gap-3 mb-10 ${isSidebarCollapsed ? 'justify-center' : ''} relative`}>
                        <ShoppingBag className="w-8 h-8 text-[#d9a65a]" />
                        {!isSidebarCollapsed && (
                            <div className="animate-fade-in">
                                <span className="font-serif font-bold text-xl block leading-none">Admin</span>
                                <span className="text-[10px] text-[#d9a65a]/80 uppercase tracking-widest">Painel</span>
                            </div>
                        )}
                        <button
                            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                            className={`absolute -right-10 top-1 bg-white text-[#3b2f2f] p-1 rounded-full shadow-lg hover:scale-110 transition-transform hidden md:block border border-gray-200 z-50`}
                        >
                            {isSidebarCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
                        </button>
                    </div>
                    <nav className="space-y-2">
                        {currentUserRole !== 'driver' && (
                            <>
                                <button onClick={() => setActiveView('dashboard')} className={`w-full flex items-center gap-3 p-3 rounded-lg font-bold transition-all ${activeView === 'dashboard' ? 'bg-[#d9a65a] text-[#3b2f2f] shadow-lg translate-x-1' : 'text-gray-400 hover:text-white hover:bg-white/5'} ${isSidebarCollapsed ? 'justify-center' : ''}`} title="Dashboard"><TrendingUp size={20} /> {!isSidebarCollapsed && "Dashboard"}</button>
                                <button onClick={() => setActiveView('orders')} className={`w-full flex items-center gap-3 p-3 rounded-lg font-bold transition-all ${activeView === 'orders' ? 'bg-[#d9a65a] text-[#3b2f2f] shadow-lg translate-x-1' : 'text-gray-400 hover:text-white hover:bg-white/5'} ${isSidebarCollapsed ? 'justify-center' : ''}`} title="Pedidos"><CheckCircle size={20} /> {!isSidebarCollapsed && "Pedidos"}</button>
                                <button onClick={() => setActiveView('stock')} className={`w-full flex items-center gap-3 p-3 rounded-lg font-bold transition-all ${activeView === 'stock' ? 'bg-[#d9a65a] text-[#3b2f2f] shadow-lg translate-x-1' : 'text-gray-400 hover:text-white hover:bg-white/5'} ${isSidebarCollapsed ? 'justify-center' : ''}`} title="Stock"><Package size={20} /> {!isSidebarCollapsed && "Stock"}</button>
                            </>
                        )}
                        {(currentUserRole === 'admin' || currentUserRole === 'it') && (
                            <button onClick={() => setActiveView('team')} className={`w-full flex items-center gap-3 p-3 rounded-lg font-bold transition-all ${activeView === 'team' ? 'bg-[#d9a65a] text-[#3b2f2f] shadow-lg translate-x-1' : 'text-gray-400 hover:text-white hover:bg-white/5'} ${isSidebarCollapsed ? 'justify-center' : ''}`} title="Equipe"><User size={20} /> {!isSidebarCollapsed && "Equipe"}</button>
                        )}
                        {currentUserRole !== 'driver' && (
                            <button onClick={() => setActiveView('messages')} className={`w-full flex items-center gap-3 p-3 rounded-lg font-bold transition-all ${activeView === 'messages' ? 'bg-[#d9a65a] text-[#3b2f2f] shadow-lg translate-x-1' : 'text-gray-400 hover:text-white hover:bg-white/5'} ${isSidebarCollapsed ? 'justify-center' : ''}`} title="Mensagens"><MessageSquare size={20} /> {!isSidebarCollapsed && <span>Mensagens {messages.some(m => m.status === 'unread') && <span className="w-2 h-2 bg-red-500 rounded-full inline-block ml-2"></span>}</span>}</button>
                        )}
                        <button onClick={() => setActiveView('support_ai')} className={`w-full flex items-center gap-3 p-3 rounded-lg font-bold transition-all ${activeView === 'support_ai' ? 'bg-[#d9a65a] text-[#3b2f2f] shadow-lg translate-x-1' : 'text-gray-400 hover:text-white hover:bg-white/5'} ${isSidebarCollapsed ? 'justify-center' : ''}`} title="Suporte IT"><Sparkles size={20} /> {!isSidebarCollapsed && "Suporte IT"}</button>
                        <button onClick={() => setActiveView('logistics')} className={`w-full flex items-center gap-3 p-3 rounded-lg font-bold transition-all ${activeView === 'logistics' ? 'bg-[#d9a65a] text-[#3b2f2f] shadow-lg translate-x-1' : 'text-gray-400 hover:text-white hover:bg-white/5'} ${isSidebarCollapsed ? 'justify-center' : ''}`} title="Logística"><Truck size={20} /> {!isSidebarCollapsed && "Logística"}</button>
                        <button onClick={() => setActiveView('kitchen')} className={`w-full flex items-center gap-3 p-3 rounded-lg font-bold transition-all ${activeView === 'kitchen' ? 'bg-[#d9a65a] text-[#3b2f2f] shadow-lg translate-x-1' : 'text-gray-400 hover:text-white hover:bg-white/5'} ${isSidebarCollapsed ? 'justify-center' : ''}`} title="Cozinha (KDS)"><Menu size={20} /> {!isSidebarCollapsed && "Cozinha (KDS)"}</button>
                    </nav>
                </div>
                <div>
                    <div
                        onClick={() => setShowUserModal(true)}
                        className={`mb-4 px-3 py-2 bg-black/20 rounded-lg cursor-pointer hover:bg-black/30 transition-colors group ${isSidebarCollapsed ? 'flex justify-center' : ''}`}
                    >
                        {!isSidebarCollapsed && <p className="text-xs text-gray-400 uppercase font-bold mb-1 group-hover:text-[#d9a65a] transition-colors">Usuário (Editar)</p>}
                        <div className={`flex items-center gap-2 ${isSidebarCollapsed ? 'justify-center' : ''}`}>
                            {/* Photo or Default Icon */}
                            {localStorage.getItem('admin_photo') ? <img src={localStorage.getItem('admin_photo')!} className="w-8 h-8 rounded-full object-cover" /> : <User size={24} className="text-gray-400" />}

                            {!isSidebarCollapsed && (
                                <div>
                                    <p className="font-bold text-sm truncate w-32">{localStorage.getItem('admin_user')}</p>
                                    <p className="text-xs text-[#d9a65a] capitalize">{currentUserRole}</p>
                                </div>
                            )}
                        </div>
                    </div>
                    <button onClick={handleLogout} className={`flex items-center gap-2 text-gray-400 hover:text-white transition-colors w-full p-2 hover:bg-white/5 rounded ${isSidebarCollapsed ? 'justify-center' : ''}`} title="Sair"><LogOut size={18} /> {!isSidebarCollapsed && "Sair"}</button>

                    {/* Footer */}
                    {/* Footer - New Logo */}
                    {!isSidebarCollapsed && (
                        <div className="mt-8 pt-4 border-t border-gray-700 text-center flex flex-col items-center justify-center animate-fade-in">
                            <img
                                src="/paocaseiropng.png"
                                alt="Pão Caseiro"
                                className="w-24 h-auto opacity-90 hover:opacity-100 transition-opacity drop-shadow-lg"
                            />
                            <p className="text-[9px] text-gray-600/50 mt-2 italic max-w-[150px] mx-auto leading-tight">
                                "O Sabor que aquece o coração"
                            </p>
                        </div>
                    )}
                </div>
            </div>

            {/* Content */}
            <div className={`flex-1 overflow-hidden relative flex flex-col ${activeView === 'logistics' ? 'bg-white' : 'p-6 md:p-10'}`}>

                {/* Header with Clock/Quote */}
                {activeView === 'dashboard' && (
                    <div className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-end gap-4 animate-fade-in">
                        <div>
                            <h2 className="text-2xl font-bold text-[#3b2f2f] mb-1">Olá, {localStorage.getItem('admin_user')?.split(' ')[0]}</h2>
                            <p className="text-gray-500 text-sm max-w-md italic">"{quote}"</p>
                        </div>
                        <div className="text-right">
                            <p className="text-3xl font-bold text-[#d9a65a] font-mono tracking-wide">
                                {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </p>
                            <p className="text-gray-400 text-xs uppercase font-bold">
                                {currentTime.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
                            </p>
                        </div>
                    </div>
                )}

                {/* Dashboard View */}
                {activeView === 'dashboard' && (
                    <div className="space-y-8 animate-fade-in">
                        {/* Stats Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                            <div
                                onClick={() => setActiveView('orders')} // Leads to Sales (Completed Orders)
                                className="bg-white p-6 rounded-2xl shadow-sm border border-[#d9a65a]/10 cursor-pointer group hover:shadow-xl hover:-translate-y-1 transition-all duration-300 relative overflow-hidden"
                            >
                                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity"><TrendingUp size={60} /></div>
                                <h3 className="text-4xl font-bold text-[#3b2f2f] mb-1">{totalSales.toLocaleString()} MT</h3>
                                <p className="text-gray-500 text-sm font-bold flex items-center gap-2">Vendas Totais <span className="bg-green-100 text-green-700 text-[10px] px-2 py-0.5 rounded-full">HOJE</span></p>
                            </div>

                            <div
                                onClick={() => { setActiveView('orders'); setStatusFilter('all'); }}
                                className="bg-white p-6 rounded-2xl shadow-sm border border-[#d9a65a]/10 cursor-pointer group hover:shadow-xl hover:-translate-y-1 transition-all duration-300 relative overflow-hidden"
                            >
                                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity"><ShoppingBag size={60} /></div>
                                <h3 className="text-4xl font-bold text-[#3b2f2f] mb-1">{totalOrders}</h3>
                                <p className="text-gray-500 text-sm font-bold">Pedidos Totais</p>
                            </div>

                            <div
                                onClick={() => { setActiveView('orders'); setStatusFilter('pending'); }}
                                className="bg-white p-6 rounded-2xl shadow-sm border border-[#d9a65a]/10 cursor-pointer group hover:shadow-xl hover:-translate-y-1 transition-all duration-300 relative overflow-hidden"
                            >
                                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity"><Clock size={60} /></div>
                                <h3 className="text-4xl font-bold text-[#d9a65a] mb-1">{pendingOrders}</h3>
                                <p className="text-gray-500 text-sm font-bold">Pedidos Pendentes</p>
                            </div>

                            <div
                                onClick={() => setActiveView('stock')}
                                className="bg-white p-6 rounded-2xl shadow-sm border border-[#d9a65a]/10 cursor-pointer group hover:shadow-xl hover:-translate-y-1 transition-all duration-300 relative overflow-hidden"
                            >
                                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity"><Package size={60} /></div>
                                <h3 className="text-4xl font-bold text-[#d9a65a] mb-1">{totalProducts}</h3>
                                <p className="text-gray-500 text-sm font-bold">Total Produtos</p>
                                {lowStockProducts > 0 && <span className="text-xs text-red-500 font-bold bg-red-100 px-2 py-1 rounded-full mt-2 inline-block">{lowStockProducts} Baixo Stock</span>}
                            </div>

                            <div className="md:col-span-2 lg:col-span-4 grid grid-cols-1 md:grid-cols-3 gap-6">
                                {/* 1. Entregas Disponíveis */}
                                <div
                                    onClick={() => setActiveView('logistics')}
                                    className="bg-white p-6 rounded-2xl shadow-sm border border-[#d9a65a]/10 cursor-pointer group hover:shadow-xl hover:-translate-y-1 transition-all duration-300 relative overflow-hidden"
                                >
                                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity"><Package size={60} /></div>
                                    <h3 className="text-4xl font-bold text-[#3b2f2f] mb-1">{orders.filter(o => o.customer.type === 'delivery' && o.status === 'pending').length}</h3>
                                    <p className="text-[#d9a65a] text-sm font-bold uppercase">Entregas Disponíveis</p>
                                    <p className="text-xs text-gray-400 mt-2">Aguardando atribuição</p>
                                </div>

                                {/* 2. Motoristas Disponíveis */}
                                <div
                                    onClick={() => { setActiveView('logistics'); setLogisticsTab('drivers'); }}
                                    className="bg-white p-6 rounded-2xl shadow-sm border border-[#d9a65a]/10 cursor-pointer group hover:shadow-xl hover:-translate-y-1 transition-all duration-300 relative overflow-hidden"
                                >
                                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity"><Users size={60} /></div>
                                    <h3 className="text-4xl font-bold text-[#3b2f2f] mb-1">{drivers.filter(d => d.status === 'available').length}</h3>
                                    <p className="text-[#d9a65a] text-sm font-bold uppercase">Motoristas Disponíveis</p>
                                    <p className="text-xs text-gray-400 mt-2">Prontos para entrega</p>
                                </div>

                                {/* 3. Live Delivery (Em Direto) */}
                                <div
                                    onClick={() => setActiveView('logistics')}
                                    className="bg-[#3b2f2f] p-6 rounded-2xl shadow-sm border border-[#d9a65a]/20 cursor-pointer group hover:shadow-xl hover:-translate-y-1 transition-all duration-300 relative overflow-hidden text-white"
                                >
                                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity"><MapPin size={60} /></div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
                                        <h3 className="text-4xl font-bold text-white">{drivers.filter(d => d.status === 'busy').length}</h3>
                                    </div>
                                    <p className="text-[#d9a65a] text-sm font-bold uppercase">Live Delivery</p>
                                    <p className="text-xs text-gray-400/80 mt-2">Entregas em curso (Em Direto)</p>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                            {/* Graph */}
                            <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-[#d9a65a]/10 p-8">
                                <h3 className="text-xl font-bold text-[#3b2f2f] mb-6 flex items-center gap-2"><TrendingUp size={20} /> Performance (7 Dias)</h3>
                                <div className="flex items-end gap-3 h-48 w-full mt-4">
                                    {salesData.map((data, idx) => (
                                        <div key={idx} className="flex-1 flex flex-col items-center gap-2 group">
                                            <div className="relative w-full flex items-end justify-center h-full">
                                                <div
                                                    className="w-full max-w-[40px] bg-[#d9a65a]/80 rounded-t-lg transition-all duration-500 group-hover:bg-[#3b2f2f] group-hover:scale-y-110 origin-bottom"
                                                    style={{ height: `${(data.value / maxSale) * 100}%`, minHeight: '4px' }}
                                                ></div>
                                                <div className="absolute -top-8 bg-[#3b2f2f] text-white text-[10px] py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                                                    {data.value.toLocaleString()} MT
                                                </div>
                                            </div>
                                            <span className="text-[10px] font-bold text-gray-400 uppercase">{data.day}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Recent Activity */}
                            <div className="bg-white rounded-2xl shadow-sm border border-[#d9a65a]/10 p-6">
                                <h3 className="text-xl font-bold text-[#3b2f2f] mb-6 flex items-center gap-2"><Clock size={20} /> Recentes</h3>
                                <div className="space-y-4">
                                    {recentOrders.length === 0 ? <p className="text-gray-400 text-sm text-center py-4">Sem atividade recente.</p> : recentOrders.map((o, i) => (
                                        <div key={i} className="flex items-center gap-3 p-3 bg-gray-50/50 rounded-xl hover:bg-white hover:shadow-md transition-all border border-transparent hover:border-[#d9a65a]/20">
                                            <div className={`p-2 rounded-lg ${o.status === 'completed' ? 'bg-green-100 text-green-600' : o.status === 'pending' ? 'bg-orange-100 text-orange-600' : 'bg-red-100 text-red-600'}`}>
                                                {o.status === 'completed' ? <CheckCircle size={16} /> : o.status === 'pending' ? <Clock size={16} /> : <X size={16} />}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="font-bold text-[#3b2f2f] text-sm truncate">{o.customer.name}</p>
                                                <p className="text-xs text-gray-500">{o.items.length} itens • {o.total} MT</p>
                                            </div>
                                            <span className="text-[10px] font-bold text-gray-400">{o.date.split(',')[1]}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Orders View */}
                {activeView === 'orders' && (
                    <div className="bg-white rounded-2xl shadow-sm border border-[#d9a65a]/10 overflow-hidden animate-fade-in">
                        <div className="p-6 border-b border-gray-100 flex flex-col md:flex-row gap-4 justify-between items-center bg-[#fcfbf9]">
                            <div className="flex items-center gap-3">
                                <h2 className="text-2xl font-bold text-[#3b2f2f]">Pedidos</h2>
                                <span className="bg-[#3b2f2f] text-white text-xs font-bold px-2 py-1 rounded-full">{orders.length}</span>
                            </div>
                            <div className="flex flex-col md:flex-row gap-2 w-full md:w-auto">
                                <div className="flex bg-gray-100 p-1 rounded-lg">
                                    {(['all', 'pending', 'completed', 'cancelled'] as const).map(s => (
                                        <button key={s} onClick={() => setStatusFilter(s)} className={`px-4 py-1.5 rounded-md text-xs font-bold uppercase transition-all ${statusFilter === s ? 'bg-white text-[#d9a65a] shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>{s === 'all' ? 'Todos' : s}</button>
                                    ))}
                                </div>
                                <button onClick={downloadCSV} className="bg-[#d9a65a]/10 text-[#d9a65a] px-4 py-2 rounded-lg font-bold text-xs hover:bg-[#d9a65a] hover:text-white transition-colors">Exportar CSV</button>
                            </div>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-gray-50 text-xs uppercase font-bold text-gray-500 border-b">
                                    <tr><th className="p-4 w-20">ID</th><th className="p-4">Cliente</th><th className="p-4">Total</th><th className="p-4">Status</th><th className="p-4 text-right">Detalhes</th></tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {filteredOrders.length === 0 ? <tr><td colSpan={5} className="p-10 text-center text-gray-400">Nenhum pedido encontrado.</td></tr> : filteredOrders.map(order => (
                                        <tr key={order.orderId} className="hover:bg-blue-50/30 transition-colors">
                                            <td className="p-4 font-mono text-xs font-bold text-gray-400">#{order.orderId}</td>
                                            <td className="p-4">
                                                <div className="font-bold text-[#3b2f2f]">{order.customer.name}</div>
                                                <div className="text-xs text-gray-500 flex items-center gap-1"><MapPin size={10} /> {order.customer.type} • {order.customer.phone}</div>
                                            </td>
                                            <td className="p-4 font-bold text-[#d9a65a]">{order.total.toLocaleString()} MT</td>
                                            <td className="p-4"><span className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${order.status === 'completed' ? 'bg-green-100 text-green-700' : order.status === 'pending' ? 'bg-orange-100 text-orange-700' : 'bg-red-100 text-red-700'}`}>{order.status}</span></td>
                                            <td className="p-4 text-right"><button onClick={() => setSelectedOrder(order)} className="text-[#3b2f2f] border border-gray-200 hover:bg-[#3b2f2f] hover:text-white px-3 py-1 rounded-lg text-xs font-bold transition-all">Ver Pedido</button></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* Stock View */}
                {activeView === 'stock' && (
                    <div className="bg-white rounded-2xl shadow-sm border border-[#d9a65a]/10 overflow-hidden animate-fade-in">
                        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-[#fcfbf9]">
                            <div className="flex items-center gap-3">
                                <h2 className="text-2xl font-bold text-[#3b2f2f]">Stock</h2>
                                <span className="bg-[#3b2f2f] text-white text-xs font-bold px-2 py-1 rounded-full">{products.length}</span>
                            </div>
                            {/* Stock Search Bar */}
                            <div className="mx-6 mb-4 relative">
                                <Search className="absolute left-3 top-3 text-gray-400 w-4 h-4" />
                                <input
                                    type="text"
                                    value={stockSearchTerm}
                                    onChange={(e) => setStockSearchTerm(e.target.value)}
                                    placeholder="Pesquisar produto por nome ou ID..."
                                    className="w-full pl-10 p-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-[#d9a65a]"
                                />
                            </div>
                            <button onClick={() => { setCurrentProduct(null); setProductVariations([]); setPreviewImage(''); setIsEditingProduct(true); }} className="bg-[#3b2f2f] text-[#d9a65a] px-4 py-2 rounded-lg font-bold text-sm shadow-lg hover:brightness-110 transition-all">+ Novo Produto</button>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-gray-50 text-xs uppercase font-bold text-gray-500 border-b">
                                    <tr><th className="p-4 w-16">ID</th><th className="p-4">Produto</th><th className="p-4">Preço</th><th className="p-4">Qtd</th><th className="p-4">Unidade</th><th className="p-4">Disponibilidade</th><th className="p-4 text-right">Ações</th></tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {filteredProducts.map((p, index) => (
                                        <tr key={p.id} className="hover:bg-blue-50/30 transition-colors">
                                            <td className="p-4 text-[10px] font-mono text-gray-400 max-w-[50px] truncate" title={p.id}>
                                                PC-{index + 10}
                                            </td>
                                            <td className="p-4 flex items-center gap-3">
                                                {p.image ? <img src={p.image} className="w-10 h-10 rounded-lg object-cover border border-gray-200" /> : <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center text-gray-300"><LogOut size={16} /></div>}
                                                <div>
                                                    <span className="font-bold text-[#3b2f2f] block">{p.name}</span>
                                                    <span className="text-xs text-gray-400 capitalize">{p.category}</span>
                                                </div>
                                            </td>
                                            <td className="p-4 font-bold text-[#d9a65a]">{p.price} MT</td>
                                            <td className="p-4 text-sm font-bold text-gray-600">{p.stockQuantity}</td>
                                            <td className="p-4 text-sm text-gray-500">{p.unit}</td>
                                            <td className="p-4"><span className={`w-2 h-2 rounded-full inline-block mr-2 ${p.inStock ? 'bg-green-500' : 'bg-red-500'}`}></span><span className="text-xs text-gray-500">{p.inStock ? 'Disponível' : 'Indisponível'}</span></td>
                                            <td className="p-4 text-right space-x-2">
                                                <button onClick={() => { setCurrentProduct(p); setProductVariations(p.variations || []); setPreviewImage(p.image || p.image_url || ''); setIsEditingProduct(true); }} className="text-blue-600 font-bold text-xs hover:underline">Editar</button>
                                                <button onClick={() => handleDeleteProduct(p.id)} className="text-red-500 font-bold text-xs hover:underline">Remover</button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* Team View */}
                {activeView === 'team' && (
                    <div className="bg-white rounded-2xl shadow-sm border border-[#d9a65a]/10 overflow-hidden animate-fade-in">
                        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-[#fcfbf9]">
                            <div className="flex items-center gap-3">
                                <h2 className="text-2xl font-bold text-[#3b2f2f]">Equipe</h2>
                            </div>
                            <button onClick={() => { setCurrentMember(null); setIsEditingMember(true); }} className="bg-[#3b2f2f] text-[#d9a65a] px-4 py-2 rounded-lg font-bold text-sm shadow-lg hover:brightness-110 transition-all">+ Novo Membro</button>
                        </div>
                        <table className="w-full text-left">
                            <thead className="bg-gray-50 text-xs uppercase font-bold text-gray-500 border-b">
                                <tr><th className="p-4">Nome</th><th className="p-4">Username</th><th className="p-4">Cargo</th><th className="p-4 text-right">Ações</th></tr>
                            </thead>
                            <tbody>
                                {teamMembers.map(m => (
                                    <tr key={m.id} className="hover:bg-blue-50/30 transition-colors">
                                        <td className="p-4 font-bold text-[#3b2f2f]">{m.name}</td>
                                        <td className="p-4 text-sm text-gray-500 font-mono">{m.username}</td>
                                        <td className="p-4"><span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${m.role === 'admin' ? 'bg-purple-100 text-purple-700' : m.role === 'it' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}`}>{m.role}</span></td>
                                        <td className="p-4 text-right space-x-2">
                                            <button onClick={() => { setCurrentMember(m); setIsEditingMember(true); }} className="text-blue-600 font-bold text-xs hover:underline">Editar</button>
                                            <button onClick={() => handleDeleteMember(m.id)} className="text-red-500 font-bold text-xs hover:underline">Remover</button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Messages View */}
                {activeView === 'messages' && (
                    <div className="bg-white rounded-2xl shadow-sm border border-[#d9a65a]/10 overflow-hidden animate-fade-in">
                        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-[#fcfbf9]">
                            <h2 className="text-2xl font-bold text-[#3b2f2f]">Mensagens</h2>
                            <span className="bg-[#3b2f2f] text-white text-xs font-bold px-2 py-1 rounded-full">{messages.filter(m => m.status === 'unread').length} Novas</span>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-gray-50 text-xs uppercase font-bold text-gray-500 border-b">
                                    <tr><th className="p-4">Data</th><th className="p-4">Nome</th><th className="p-4">Mensagem</th><th className="p-4">Status</th><th className="p-4 text-right">Ações</th></tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {messages.map(msg => (
                                        <tr key={msg.id} className="hover:bg-blue-50/30 transition-colors">
                                            <td className="p-4 text-xs text-gray-400 font-mono">{new Date(msg.created_at).toLocaleDateString()}</td>
                                            <td className="p-4">
                                                <div className="font-bold text-[#3b2f2f]">{msg.name}</div>
                                                <div className="text-xs text-gray-500">{msg.email}</div>
                                                <div className="text-xs text-gray-500">{msg.phone}</div>
                                            </td>
                                            <td className="p-4 max-w-md truncate text-sm text-gray-600" title={msg.message}>{msg.message}</td>
                                            <td className="p-4"><span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${msg.status === 'unread' ? 'bg-red-100 text-red-600' : msg.status === 'replied' ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-600'}`}>{msg.status}</span></td>
                                            <td className="p-4 text-right">
                                                <a
                                                    href={`mailto:${msg.email}?subject=Resposta: Contacto Pão Caseiro&body=Olá ${msg.name},%0A%0AObrigado pelo seu contacto.%0A%0A`}
                                                    onClick={async () => {
                                                        const { supabase } = await import('../services/supabase');
                                                        await supabase.from('contact_messages').update({ status: 'replied' }).eq('id', msg.id);
                                                        loadMessages();
                                                    }}
                                                    className="inline-flex items-center gap-1 text-[#d9a65a] border border-[#d9a65a]/30 hover:bg-[#d9a65a] hover:text-[#3b2f2f] px-3 py-1 rounded-lg text-xs font-bold transition-all"
                                                >
                                                    <Mail size={14} /> Responder
                                                </a>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            {messages.length === 0 && <p className="text-center p-8 text-gray-400">Nenhuma mensagem encontrada.</p>}
                        </div>
                    </div>
                )}

                {/* Support & AI View */}
                {activeView === 'support_ai' && (
                    <div className="h-[calc(100vh-140px)] animate-fade-in flex flex-col gap-6">
                        <AdminSupportAI
                            userName={localStorage.getItem('admin_user') || 'Admin'}
                            stats={{
                                totalSales: salesData.reduce((acc, curr) => acc + (curr.value || 0), 0),
                                totalOrders,
                                pendingOrders,
                                lowStockCount: lowStockProducts,
                                unavailableProducts: filteredProducts.filter(p => !p.inStock).map(p => p.name)
                            }}
                        />

                        {/* Zaiv Contacts */}
                        <div className="bg-[#3b2f2f] p-6 rounded-2xl text-white shadow-lg">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-xl font-serif font-bold flex items-center gap-2"><Sparkles className="text-[#d9a65a]" /> Suporte IT (Zyph Tech, Lda)</h3>
                                <button onClick={() => setIsSupportTicketOpen(true)} className="bg-[#d9a65a] text-[#3b2f2f] px-4 py-2 rounded-lg text-xs font-bold hover:bg-white transition-colors flex items-center gap-2">
                                    <MessageSquare size={16} /> Abrir Ticket
                                </button>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                <a href="https://wa.me/258863242532" target="_blank" className="bg-white/10 hover:bg-white/20 p-4 rounded-xl flex items-center gap-4 transition-all group cursor-pointer border border-transparent hover:border-[#d9a65a]/50">
                                    <div className="bg-[#25D366] p-2 rounded-full text-white"><MessageSquare size={24} /></div>
                                    <div>
                                        <p className="font-bold text-sm text-gray-300 uppercase">WhatsApp Suporte</p>
                                        <p className="text-lg font-bold group-hover:text-[#d9a65a] transition-colors">+258 86 324 2532</p>
                                    </div>
                                </a>
                                <a href="https://wa.me/918725861829" target="_blank" className="bg-white/10 hover:bg-white/20 p-4 rounded-xl flex items-center gap-4 transition-all group cursor-pointer border border-transparent hover:border-[#d9a65a]/50">
                                    <div className="bg-[#25D366] p-2 rounded-full text-white"><MessageSquare size={24} /></div>
                                    <div>
                                        <p className="font-bold text-sm text-gray-300 uppercase">WhatsApp India</p>
                                        <p className="text-lg font-bold group-hover:text-[#d9a65a] transition-colors">+91 87258 61829</p>
                                    </div>
                                </a>
                                <a href="mailto:supporte@zyph.co.mz" className="bg-white/10 hover:bg-white/20 p-4 rounded-xl flex items-center gap-4 transition-all group cursor-pointer border border-transparent hover:border-[#d9a65a]/50">
                                    <div className="bg-blue-500 p-2 rounded-full text-white"><Mail size={24} /></div>
                                    <div>
                                        <p className="font-bold text-sm text-gray-300 uppercase">Email Suporte</p>
                                        <p className="text-lg font-bold group-hover:text-[#d9a65a] transition-colors">supporte@zyph.co.mz</p>
                                    </div>
                                </a>
                            </div>
                        </div>
                    </div>

                )}

                {/* Kitchen View */}
                {activeView === 'kitchen' && (
                    <div className="h-full">
                        <Kitchen user={{
                            id: userId || 'admin',
                            name: localStorage.getItem('admin_user') || 'Administrador',
                            role: 'admin'
                        }} />
                    </div>
                )}


                {/* Logistics View */}





                {/* User Profile Modal */}
                {
                    showUserModal && (
                        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                            <div className="bg-white rounded-2xl w-full max-w-md p-6 animate-scale-in">
                                <div className="flex justify-between items-center mb-6">
                                    <h3 className="text-xl font-bold font-serif text-[#3b2f2f]">Editar Perfil</h3>
                                    <button onClick={() => setShowUserModal(false)} className="text-gray-400 hover:text-red-500 transition-colors"><X size={24} /></button>
                                </div>
                                <form onSubmit={handleUpdateUser} className="space-y-4">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Nome</label>
                                        <input required type="text" value={userForm.name} onChange={e => setUserForm({ ...userForm, name: e.target.value })} className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:border-[#d9a65a] outline-none" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Foto de Perfil</label>
                                        <div className="flex items-center gap-3">
                                            {userForm.photo && <img src={userForm.photo} className="w-12 h-12 rounded-full object-cover border border-gray-200" />}
                                            <label className="flex-1 cursor-pointer bg-gray-50 border border-dashed border-gray-300 rounded-xl p-3 text-center text-sm text-gray-500 hover:bg-gray-100 transition-colors">
                                                <input type="file" className="hidden" accept="image/*" onChange={handleAvatarUpload} />
                                                <span className="flex items-center justify-center gap-2"><Upload size={16} /> Carregar Foto</span>
                                            </label>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Nova Senha</label>
                                        <div className="relative">
                                            <input
                                                type={showPassword ? "text" : "password"}
                                                autoComplete="new-password"
                                                value={userForm.password}
                                                onChange={e => setUserForm({ ...userForm, password: e.target.value })}
                                                placeholder="Deixe em branco para manter"
                                                className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:border-[#d9a65a] outline-none pr-10"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowPassword(!showPassword)}
                                                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-[#d9a65a]"
                                            >
                                                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                            </button>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Confirmar Senha</label>
                                        <input
                                            type="password"
                                            autoComplete="new-password"
                                            value={userForm.confirmPassword}
                                            onChange={e => setUserForm({ ...userForm, confirmPassword: e.target.value })}
                                            placeholder="Repita a senha"
                                            className={`w-full p-3 bg-gray-50 border rounded-xl focus:border-[#d9a65a] outline-none ${userForm.password && userForm.password !== userForm.confirmPassword ? 'border-red-500' : 'border-gray-200'}`}
                                        />
                                        {userForm.password && userForm.password !== userForm.confirmPassword && (
                                            <p className="text-red-500 text-xs mt-1 font-bold">As senhas não coincidem</p>
                                        )}
                                    </div>
                                    <div className="pt-4 flex gap-3">
                                        <button type="button" onClick={() => setShowUserModal(false)} disabled={isSubmitting} className="flex-1 py-3 text-gray-500 font-bold hover:bg-gray-50 rounded-xl transition-colors disabled:opacity-50">Cancelar</button>
                                        <button type="submit" disabled={isSubmitting} className="flex-1 py-3 bg-[#d9a65a] text-[#3b2f2f] font-bold rounded-xl hover:bg-[#c89549] transition-colors shadow-lg flex justify-center items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed">
                                            {isSubmitting ? (
                                                <>
                                                    <span className="w-4 h-4 border-2 border-[#3b2f2f] border-t-transparent rounded-full animate-spin"></span>
                                                    Salvando...
                                                </>
                                            ) : (
                                                'Salvar Alterações'
                                            )}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    )}
                {/* Logistics View */}
                {
                    activeView === 'logistics' && (
                        <div className="flex flex-col flex-1 h-full animate-fade-in w-full">
                            {/* Header & Tabs */}
                            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 p-6 pb-4">
                                <div>
                                    <h2 className="text-3xl font-serif font-bold text-[#3b2f2f]">Logística</h2>
                                    <p className="text-gray-500 text-sm">Gerencie entregas, motoristas e monitoramento em tempo real.</p>
                                </div>
                                <div className="bg-white p-1 rounded-xl shadow-sm border border-[#d9a65a]/20 flex gap-1">
                                    <button
                                        onClick={() => setLogisticsTab('dashboard')}
                                        className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all ${logisticsTab === 'dashboard' ? 'bg-[#3b2f2f] text-[#d9a65a] shadow-lg' : 'text-gray-500 hover:bg-gray-50'}`}
                                    >
                                        <TrendingUp size={16} /> Dashboard
                                    </button>
                                    <button
                                        onClick={() => setLogisticsTab('deliveries')}
                                        className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all ${logisticsTab === 'deliveries' ? 'bg-[#3b2f2f] text-[#d9a65a] shadow-lg initial-scale' : 'text-gray-500 hover:bg-gray-50'}`}
                                    >
                                        <Truck size={16} /> Entregas
                                        {orders.filter(o => o.customer.type === 'delivery' && o.status === 'pending').length > 0 && (
                                            <span className="bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full shadow-sm ml-1">
                                                {orders.filter(o => o.customer.type === 'delivery' && o.status === 'pending').length}
                                            </span>
                                        )}
                                    </button>
                                    <button
                                        onClick={() => setLogisticsTab('drivers')}
                                        className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all ${logisticsTab === 'drivers' ? 'bg-[#3b2f2f] text-[#d9a65a] shadow-lg' : 'text-gray-500 hover:bg-gray-50'}`}
                                    >
                                        <Users size={16} /> Parceiros (Drive)
                                        <span className="bg-gray-200 text-gray-600 text-[10px] px-1.5 py-0.5 rounded-full ml-1">{drivers.length}</span>
                                    </button>
                                </div>
                            </div>

                            {/* CONTENT AREA (Full Flex) */}
                            <div className="flex-1 overflow-auto bg-gray-50/30 p-6 md:p-10 relative">

                                {/* TAB 1: DASHBOARD */}
                                {logisticsTab === 'dashboard' && (
                                    <div className="space-y-8 animate-fade-in h-full">
                                        {/* KPI Cards */}
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                            <div className="bg-blue-50 p-6 rounded-2xl border border-blue-100 flex items-center justify-between">
                                                <div>
                                                    <p className="text-blue-600 font-bold text-xs uppercase mb-1">Total Entregas (Hoje)</p>
                                                    <h3 className="text-4xl font-bold text-[#3b2f2f]">
                                                        {orders.filter(o => o.customer.type === 'delivery').length}
                                                    </h3>
                                                </div>
                                                <div className="bg-white p-3 rounded-xl text-blue-500 shadow-sm"><Truck size={32} /></div>
                                            </div>
                                            <div className="bg-orange-50 p-6 rounded-2xl border border-orange-100 flex items-center justify-between">
                                                <div>
                                                    <p className="text-orange-600 font-bold text-xs uppercase mb-1">Em Rota (Ativas)</p>
                                                    <h3 className="text-4xl font-bold text-[#3b2f2f]">
                                                        {orders.filter(o => o.status === 'delivering').length}
                                                    </h3>
                                                </div>
                                                <div className="bg-white p-3 rounded-xl text-orange-500 shadow-sm"><MapPin size={32} /></div>
                                            </div>
                                            <div className="bg-green-50 p-6 rounded-2xl border border-green-100 flex items-center justify-between">
                                                <div>
                                                    <p className="text-green-600 font-bold text-xs uppercase mb-1">Parceiros Livres</p>
                                                    <h3 className="text-4xl font-bold text-[#3b2f2f]">
                                                        {drivers.filter(d => d.status === 'available').length}
                                                    </h3>
                                                </div>
                                                <div className="bg-white p-3 rounded-xl text-green-500 shadow-sm"><CheckCircle size={32} /></div>
                                            </div>
                                        </div>

                                        {/* Action Banner */}
                                        <div className="bg-[#3b2f2f] rounded-2xl p-8 text-white relative overflow-hidden flex items-center justify-between">
                                            <div className="relative z-10 w-2/3">
                                                <h3 className="text-2xl font-bold font-serif text-[#d9a65a] mb-2">Monitoramento de Frota</h3>
                                                <p className="text-gray-300 text-sm mb-6">Acompanhe as entregas em tempo real e gerencie sua equipe de Drive Partners com eficiência.</p>
                                                <button
                                                    onClick={() => setLogisticsTab('deliveries')}
                                                    className="bg-[#d9a65a] text-[#3b2f2f] px-6 py-3 rounded-xl font-bold shadow-lg hover:brightness-110 transition-all flex items-center gap-2"
                                                >
                                                    <Truck size={18} /> Ver Entregas em Curso
                                                </button>
                                            </div>
                                            <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-gradient-to-l from-[#d9a65a]/20 to-transparent"></div>
                                            <MapPin size={180} className="absolute -right-10 -bottom-10 text-white/5" />
                                        </div>
                                    </div>
                                )}

                                {/* TAB 2: DELIVERIES */}
                                {logisticsTab === 'deliveries' && (
                                    <div className="space-y-6 animate-fade-in h-full">
                                        {(() => {
                                            const visibleOrders = currentUserRole === 'driver'
                                                ? orders.filter(o => o.driver_id === userId) // Ensure userId matches team_member.id
                                                : orders; // Admin sees all

                                            const pendingList = orders.filter(o => o.customer.type === 'delivery' && o.status === 'pending');
                                            const deliveringList = visibleOrders.filter(o => o.status === 'delivering');
                                            const completedList = visibleOrders.filter(o => o.customer.type === 'delivery' && o.status === 'completed');

                                            return (
                                                <>
                                                    {/* ACTIVE DELIVERIES (Highlighted) */}
                                                    <div className="space-y-4">
                                                        <h3 className="font-bold text-[#3b2f2f] text-lg flex items-center gap-2">
                                                            <span className="w-2 h-2 bg-orange-500 rounded-full animate-pulse"></span>
                                                            Em Rota / A Entregar
                                                            <span className="bg-orange-100 text-orange-600 text-xs px-2 py-1 rounded-full">{deliveringList.length}</span>
                                                        </h3>

                                                        {deliveringList.length === 0 ? (
                                                            <div className="bg-gray-50 border-2 border-dashed border-gray-200 rounded-xl p-8 text-center text-gray-400">
                                                                <Truck className="w-12 h-12 mx-auto mb-2 opacity-50" />
                                                                <p>Nenhuma entrega em curso no momento.</p>
                                                            </div>
                                                        ) : (
                                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                                {deliveringList.map(order => (
                                                                    <div key={order.orderId} className="bg-white border border-blue-200 rounded-xl p-4 shadow-lg ring-1 ring-blue-50 relative overflow-hidden group hover:-translate-y-1 transition-all">
                                                                        <div className="absolute top-0 right-0 p-2 bg-blue-500 text-white text-xs font-bold rounded-bl-xl">EM ROTA</div>
                                                                        <h4 className="font-bold text-[#3b2f2f] text-lg mb-1">Pedido #{order.orderId}</h4>
                                                                        <div className="text-sm text-gray-600 mb-4 space-y-1">
                                                                            <p className="font-bold">{order.customer.name}</p>
                                                                            <p className="text-xs text-gray-500">{order.customer.phone}</p>
                                                                            <p className="flex items-start gap-1 bg-gray-50 p-2 rounded text-xs mt-2 text-blue-800"><MapPin size={14} className="shrink-0" /> {order.customer.address}</p>
                                                                        </div>

                                                                        <div className="flex gap-2 mt-4 pt-4 border-t border-gray-100">
                                                                            <a
                                                                                href={`https://wa.me/258${order.customer.phone.replace(/\D/g, '')}`}
                                                                                target="_blank"
                                                                                className="flex-1 bg-green-50 text-green-600 py-2 rounded-lg font-bold text-xs flex items-center justify-center gap-1 hover:bg-green-100"
                                                                            >
                                                                                <MessageCircle size={14} /> WhatsApp
                                                                            </a>
                                                                            <button
                                                                                onClick={() => handleCompleteDelivery(order)}
                                                                                className="flex-1 bg-[#3b2f2f] text-[#d9a65a] py-2 rounded-lg font-bold text-xs flex items-center justify-center gap-1 shadow-md hover:brightness-110"
                                                                            >
                                                                                <CheckCircle size={14} /> Finalizar (OTP)
                                                                            </button>
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* PENDING (Admin Only) */}
                                                    {(currentUserRole === 'admin' || currentUserRole === 'it') && (
                                                        <div className="space-y-4 pt-8 border-t border-gray-100">
                                                            <h3 className="font-bold text-gray-400 text-sm uppercase flex items-center gap-2">
                                                                <Clock size={16} /> Pendentes de Atribuição
                                                                <span className="bg-gray-100 text-gray-500 text-xs px-2 py-1 rounded-full">{pendingList.length}</span>
                                                            </h3>
                                                            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                                                                <table className="w-full text-left text-sm">
                                                                    <thead className="bg-gray-50 text-gray-500 font-bold text-xs uppercase">
                                                                        <tr><th className="p-4">ID</th><th className="p-4">Cliente</th><th className="p-4">Logradouro</th><th className="p-4 text-right">Ação</th></tr>
                                                                    </thead>
                                                                    <tbody className="divide-y divide-gray-100">
                                                                        {pendingList.map(order => (
                                                                            <tr key={order.orderId} className="hover:bg-gray-50 transition-colors">
                                                                                <td className="p-4 font-bold">{order.orderId}</td>
                                                                                <td className="p-4">
                                                                                    <div className="font-bold">{order.customer.name}</div>
                                                                                    <div className="text-xs text-gray-500">{order.customer.phone}</div>
                                                                                </td>
                                                                                <td className="p-4 text-gray-500 truncate max-w-[200px]">{order.customer.address || 'N/A'}</td>
                                                                                <td className="p-4 text-right">
                                                                                    <button onClick={() => setOrderToAssign(order)} className="bg-[#3b2f2f] text-[#d9a65a] px-3 py-1.5 rounded-lg text-xs font-bold hover:shadow-lg">Atribuir</button>
                                                                                </td>
                                                                            </tr>
                                                                        ))}
                                                                        {pendingList.length === 0 && (
                                                                            <tr><td colSpan={4} className="p-8 text-center text-gray-400">Todos os pedidos foram atribuídos.</td></tr>
                                                                        )}
                                                                    </tbody>
                                                                </table>
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* History (Completed) */}
                                                    <div className="pt-8">
                                                        <button onClick={() => { /* Toggle History? For now static */ }} className="text-gray-400 text-xs font-bold uppercase flex items-center gap-2 hover:text-[#d9a65a]">
                                                            <Clock size={14} /> Histórico Recente ({completedList.length})
                                                        </button>
                                                    </div>
                                                </>
                                            );
                                        })()}
                                    </div>
                                )}

                                {/* TAB 3: DRIVERS */}
                                {logisticsTab === 'drivers' && (
                                    <div className="space-y-6 animate-fade-in h-full">
                                        <div className="flex justify-between items-center mb-4">
                                            <h3 className="text-xl font-bold text-[#3b2f2f]">Parceiros de Entrega ({drivers.length})</h3>
                                            <button onClick={() => setIsAddingDriver(true)} className="bg-[#3b2f2f] text-[#d9a65a] px-4 py-2 rounded-lg font-bold text-sm shadow-lg hover:brightness-110 flex items-center gap-2">
                                                <Plus size={16} /> Novo Partner
                                            </button>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                            {drivers.map(driver => (
                                                <div key={driver.id} className="border border-gray-100 rounded-xl p-4 hover:shadow-md transition-all bg-white relative group">
                                                    <div className="flex items-start justify-between mb-2">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center font-bold text-[#3b2f2f] text-lg border-2 border-white shadow-sm">
                                                                {driver.name.charAt(0)}
                                                            </div>
                                                            <div>
                                                                <h4 className="font-bold text-[#3b2f2f]">{driver.name}</h4>
                                                                <p className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full inline-block mt-1">{driver.vehicle || 'Veículo N/A'}</p>
                                                            </div>
                                                        </div>
                                                        <div className="relative">
                                                            <select
                                                                value={driver.status}
                                                                onChange={(e) => handleDriverStatusChange(driver.id, e.target.value)}
                                                                className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase border appearance-none pr-6 cursor-pointer outline-none transition-colors ${driver.status === 'available' ? 'bg-green-50 border-green-200 text-green-700 hover:bg-green-100' :
                                                                    driver.status === 'busy' ? 'bg-orange-50 border-orange-200 text-orange-700 hover:bg-orange-100' :
                                                                        'bg-red-50 border-red-200 text-red-700 hover:bg-red-100'
                                                                    }`}
                                                            >
                                                                <option value="available">Livre</option>
                                                                <option value="busy">Em Rota</option>
                                                                <option value="offline">Offline</option>
                                                            </select>
                                                            <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none">
                                                                <div className={`w-0 h-0 border-l-[3px] border-l-transparent border-r-[3px] border-r-transparent border-t-[4px] ${driver.status === 'available' ? 'border-t-green-700' :
                                                                    driver.status === 'busy' ? 'border-t-orange-700' :
                                                                        'border-t-red-700'
                                                                    }`}></div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="space-y-2 mt-4 pt-4 border-t border-gray-50">
                                                        <p className="text-xs text-gray-500 flex items-center gap-2">
                                                            <Smartphone size={14} className="text-gray-300" /> {driver.phone}
                                                        </p>
                                                        <p className="text-xs text-gray-500 flex items-center gap-2">
                                                            <MapPin size={14} className="text-gray-300" /> {driver.base_location || 'Sem Base Fixa'}
                                                        </p>
                                                    </div>
                                                    <div className="absolute top-4 right-14 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                                                        <button onClick={() => { setSelectedDriver(driver); setDriverForm({ name: driver.name, phone: driver.phone, vehicle: driver.vehicle || '', base_location: driver.base_location || '', email: driver.email || '', alternative_phone: driver.alternative_phone || '' }); setIsAddingDriver(true); }} className="p-1 hover:bg-gray-100 rounded text-blue-500"><User size={14} /></button>
                                                        <button onClick={() => handleDeleteDriver(driver.id)} className="p-1 hover:bg-gray-100 rounded text-red-500"><Trash2 size={14} /></button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )
                }
                <AnimatePresence>
                    {selectedOrder && (
                        <div className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-sm flex justify-end">
                            <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} className="bg-[#fcfbf9] w-full max-w-md h-full p-8 shadow-2xl overflow-y-auto flex flex-col">
                                <div className="flex justify-between items-start mb-8 border-b pb-4">
                                    <div>
                                        <h2 className="text-2xl font-bold text-[#3b2f2f]">Pedido #{selectedOrder.orderId}</h2>
                                        <p className="text-sm text-gray-500">{selectedOrder.date}</p>
                                    </div>
                                    <button onClick={() => setSelectedOrder(null)} className="bg-gray-200 p-2 rounded-full hover:bg-gray-300 transition-colors"><X size={20} /></button>
                                </div>

                                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 mb-6">
                                    <h3 className="font-bold text-gray-400 text-xs uppercase mb-4">Cliente</h3>
                                    <p className="font-bold text-lg text-[#3b2f2f]">{selectedOrder.customer.name}</p>
                                    <p className="text-sm text-gray-600 mb-1">{selectedOrder.customer.phone}</p>
                                    {selectedOrder.customer.type === 'delivery' && (
                                        <p className="text-sm bg-blue-50 text-blue-800 p-2 rounded mt-2 flex gap-2 items-start"><MapPin size={16} className="shrink-0 mt-0.5" /> {selectedOrder.customer.address}</p>
                                    )}
                                </div>

                                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 mb-6 flex-1">
                                    <h3 className="font-bold text-gray-400 text-xs uppercase mb-4">Itens</h3>
                                    <div className="space-y-3">
                                        {selectedOrder.items.map((i, idx) => (
                                            <div key={idx} className="flex justify-between text-sm py-2 border-b border-dashed border-gray-100 last:border-0">
                                                <div className="flex gap-3">
                                                    <span className="font-bold text-[#d9a65a]">{i.quantity}x</span>
                                                    <span className="font-bold text-gray-700">{i.name}</span>
                                                </div>
                                                <span className="font-bold text-gray-900">{(i.price * i.quantity).toLocaleString()} MT</span>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="mt-6 flex justify-between items-center pt-4 border-t border-gray-100">
                                        <span className="font-bold text-gray-500">Total</span>
                                        <span className="font-bold text-2xl text-[#d9a65a]">{selectedOrder.total.toLocaleString()} MT</span>
                                    </div>
                                </div>

                                <div className="mt-4">
                                    <h3 className="font-bold text-gray-400 text-xs uppercase mb-3">Atualizar Status</h3>
                                    <div className="grid grid-cols-3 gap-2">
                                        {['pending', 'completed', 'cancelled'].map((s: any) => (
                                            <button key={s} onClick={async () => {
                                                const { supabase } = await import('../services/supabase');
                                                await supabase.from('orders').update({ status: s }).eq('short_id', selectedOrder.orderId);

                                                const updatedOrder = { ...selectedOrder, status: s };
                                                setSelectedOrder(updatedOrder);
                                                loadOrders();

                                                // Notification to Customer
                                                notifyCustomer(updatedOrder, 'status_update').catch(err => console.error("Customer status notification failed", err));

                                                if (s === 'completed' && selectedOrder.customer.phone) {
                                                    // Optional fallback or additional SMS if needed, but notifyCustomer handles WhatsApp
                                                    // await sendSMS(selectedOrder.customer.phone, `Pão Caseiro: Seu pedido #${selectedOrder.orderId} está pronto/entregue! Obrigado.`);
                                                }
                                            }} className={`border p-3 rounded-xl capitalize text-sm font-bold transition-all ${selectedOrder.status === s ?
                                                (s === 'completed' ? 'bg-green-100 border-green-300 text-green-800' : s === 'pending' ? 'bg-orange-100 border-orange-300 text-orange-800' : 'bg-red-100 border-red-300 text-red-800')
                                                : 'hover:bg-gray-50 bg-white'}`}>{s}</button>
                                        ))}
                                    </div>
                                </div>
                            </motion.div>
                        </div>
                    )}

                    {isEditingProduct && (
                        <div className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
                            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white rounded-2xl p-6 w-full max-w-lg shadow-2xl overflow-y-auto max-h-[90vh]">
                                <h3 className="font-bold text-lg mb-4 text-[#3b2f2f]">{currentProduct ? 'Editar' : 'Novo'} Produto</h3>
                                <form onSubmit={handleSaveProduct} className="space-y-3">
                                    <input name="name" defaultValue={currentProduct?.name} placeholder="Nome do Produto" className="w-full p-2 border rounded-lg focus:border-[#d9a65a] outline-none" required />
                                    <input name="category" defaultValue={currentProduct?.category || 'Pães'} placeholder="Categoria" className="w-full p-2 border rounded-lg focus:border-[#d9a65a] outline-none" required />
                                    <div className="grid grid-cols-2 gap-2">
                                        <input name="price" type="number" defaultValue={currentProduct?.price} placeholder="Preço Base (MT)" className="w-full p-2 border rounded-lg focus:border-[#d9a65a] outline-none" required />
                                        <div className="grid grid-cols-2 gap-2">
                                            <input name="stockQuantity" type="number" defaultValue={currentProduct?.stockQuantity} placeholder="Stock" className="w-full p-2 border rounded-lg focus:border-[#d9a65a] outline-none" />
                                            <input name="unit" defaultValue={currentProduct?.unit || 'un'} placeholder="Unidade (kg, un)" className="w-full p-2 border rounded-lg focus:border-[#d9a65a] outline-none" />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2">
                                        <input name="prepTime" defaultValue={currentProduct?.prepTime} placeholder="Tempo Prep (ex: 20min)" className="w-full p-2 border rounded-lg focus:border-[#d9a65a] outline-none" />
                                        <input name="deliveryTime" defaultValue={currentProduct?.deliveryTime} placeholder="Entrega (ex: 40min)" className="w-full p-2 border rounded-lg focus:border-[#d9a65a] outline-none" />
                                    </div>

                                    {/* English Translations */}
                                    <div className="border p-2 rounded-lg bg-gray-50 space-y-2">
                                        <p className="text-xs font-bold text-gray-500 uppercase">Tradução (Inglês)</p>
                                        <input name="name_en" defaultValue={currentProduct?.name_en} placeholder="Product Name (English)" className="w-full p-2 border rounded-lg focus:border-[#d9a65a] outline-none text-sm" />
                                        <textarea name="description_en" defaultValue={currentProduct?.description_en} placeholder="Description (English)" className="w-full p-2 border rounded-lg focus:border-[#d9a65a] outline-none text-sm" rows={2} />
                                    </div>

                                    <div className="space-y-2">
                                        <input type="file" accept="image/*" onChange={handleImageUpload} className="w-full p-2 border rounded-lg focus:border-[#d9a65a] outline-none text-sm file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-[#d9a65a]/10 file:text-[#d9a65a] hover:file:bg-[#d9a65a]/20" />
                                        {previewImage && (
                                            <div className="w-full h-32 rounded-xl overflow-hidden bg-gray-50 border relative">
                                                <img src={previewImage} alt="Preview" className="w-full h-full object-cover" />
                                            </div>
                                        )}
                                    </div>

                                    {/* Variations Section */}
                                    <div className="border-t border-b border-gray-100 py-3">
                                        <div className="flex justify-between items-center mb-2">
                                            <label className="text-sm font-bold text-gray-500 uppercase">Variedades</label>
                                            <button type="button" onClick={() => setProductVariations([...productVariations, { name: '', price: 0 }])} className="text-[#d9a65a] hover:bg-[#d9a65a]/10 p-1 rounded transition-colors"><Plus size={16} /></button>
                                        </div>
                                        <div className="space-y-2 max-h-32 overflow-y-auto pr-1">
                                            {productVariations.map((v, idx) => (
                                                <div key={idx} className="flex gap-2 items-center">
                                                    <input value={v.name} onChange={e => { const n = [...productVariations]; n[idx].name = e.target.value; setProductVariations(n); }} placeholder="Nome (ex: Grande)" className="flex-1 p-2 border rounded-lg text-sm" />
                                                    <input type="number" value={v.price} onChange={e => { const n = [...productVariations]; n[idx].price = e.target.value; setProductVariations(n); }} placeholder="MT" className="w-20 p-2 border rounded-lg text-sm" />
                                                    <button type="button" onClick={() => setProductVariations(productVariations.filter((_, i) => i !== idx))} className="text-red-400 hover:text-red-600"><Trash2 size={16} /></button>
                                                </div>
                                            ))}
                                            {productVariations.length === 0 && <p className="text-xs text-gray-400 italic">Sem variedades.</p>}
                                        </div>
                                    </div>

                                    {/* Image Download */}
                                    {currentProduct?.image && (
                                        <div className="flex justify-end">
                                            <a href={currentProduct.image} download target="_blank" rel="noopener noreferrer" className="text-xs flex items-center gap-1 text-[#d9a65a] hover:underline font-bold"><Download size={12} /> Baixar Imagem Atual</a>
                                        </div>
                                    )}
                                    <label className="flex items-center gap-2 bg-gray-50 p-2 rounded-lg cursor-pointer"><input type="checkbox" name="inStock" defaultChecked={currentProduct?.inStock} className="w-4 h-4 text-[#d9a65a]" /> <span className="text-sm font-bold text-gray-600">Disponível para venda</span></label>
                                    <div className="flex gap-2 pt-2">
                                        <button type="button" onClick={() => setIsEditingProduct(false)} className="flex-1 bg-gray-100 py-2 rounded-lg font-bold text-gray-500 hover:bg-gray-200">Cancelar</button>
                                        <button type="submit" className="flex-1 bg-[#3b2f2f] text-[#d9a65a] py-2 rounded-lg font-bold hover:brightness-110">Salvar</button>
                                    </div>
                                </form>
                            </motion.div>
                        </div>
                    )}

                    {isEditingMember && (
                        <div className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
                            <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl">
                                <h3 className="font-bold text-lg mb-4 text-[#3b2f2f]">{currentMember ? 'Editar' : 'Novo'} Membro</h3>
                                <form onSubmit={handleSaveMember} className="space-y-3">
                                    <input name="memberName" defaultValue={currentMember?.name} placeholder="Nome Completo" className="w-full p-2 border rounded-lg" required />
                                    <input name="memberUsername" defaultValue={currentMember?.username} placeholder="Username (Login)" className="w-full p-2 border rounded-lg" required />
                                    <input name="memberPassword" defaultValue={currentMember?.password} placeholder="Senha" className="w-full p-2 border rounded-lg" required />
                                    <select name="memberRole" defaultValue={currentMember?.role || 'staff'} className="w-full p-2 border rounded-lg bg-white">
                                        <option value="staff">Staff (Acesso Básico)</option>
                                        <option value="admin">Admin (Acesso Total)</option>
                                        <option value="it">IT Support</option>
                                    </select>
                                    <div className="flex gap-2 pt-2">
                                        <button type="button" onClick={() => setIsEditingMember(false)} className="flex-1 bg-gray-100 py-2 rounded-lg font-bold text-gray-500 hover:bg-gray-200">Cancelar</button>
                                        <button type="submit" className="flex-1 bg-[#3b2f2f] text-[#d9a65a] py-2 rounded-lg font-bold hover:brightness-110">Salvar</button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    )}
                    {/* Driver Modal */}
                    {isAddingDriver && (
                        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 backdrop-blur-sm">
                            <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-2xl animate-scale-in">
                                <h3 className="text-xl font-bold mb-4">{selectedDriver ? 'Editar Motorista' : 'Novo Motorista'}</h3>
                                <form onSubmit={handleSaveDriver} className="space-y-4">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Nome do Motorista</label>
                                        <input value={driverForm.name} onChange={e => setDriverForm({ ...driverForm, name: e.target.value })} className="w-full p-3 border rounded-xl" required placeholder="Nome Completo" />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Telefone Principal</label>
                                            <input value={driverForm.phone} onChange={e => setDriverForm({ ...driverForm, phone: e.target.value })} className="w-full p-3 border rounded-xl" required placeholder="+258..." />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Telefone Alternativo</label>
                                            <input value={driverForm.alternative_phone} onChange={e => setDriverForm({ ...driverForm, alternative_phone: e.target.value })} className="w-full p-3 border rounded-xl" placeholder="Opcional" />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Email (Opcional)</label>
                                        <input type="email" value={driverForm.email} onChange={e => setDriverForm({ ...driverForm, email: e.target.value })} className="w-full p-3 border rounded-xl" placeholder="email@exemplo.com" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Localização Base</label>
                                        <input value={driverForm.base_location} onChange={e => setDriverForm({ ...driverForm, base_location: e.target.value })} className="w-full p-3 border rounded-xl" placeholder="Ex: Matola, Maputo, etc." />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Veículo</label>
                                        <input value={driverForm.vehicle} onChange={e => setDriverForm({ ...driverForm, vehicle: e.target.value })} className="w-full p-3 border rounded-xl" placeholder="Mota, Carro, Bicicleta..." />
                                    </div>
                                    <div className="flex gap-3 pt-2">
                                        <button type="button" onClick={() => setIsAddingDriver(false)} className="flex-1 py-3 bg-gray-100 rounded-xl font-bold text-gray-500">Cancelar</button>
                                        <button type="submit" className="flex-1 py-3 bg-[#3b2f2f] text-[#d9a65a] rounded-xl font-bold hover:shadow-lg">Salvar</button>
                                    </div>
                                </form>

                            </div>
                        </div>
                    )
                    }

                    {/* Assign Order Modal */}
                    {
                        orderToAssign && (
                            <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 backdrop-blur-sm">
                                <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-2xl animate-scale-in">
                                    <h3 className="text-xl font-bold mb-4">Atribuir Entrega #{orderToAssign.orderId}</h3>
                                    <p className="text-sm text-gray-500 mb-6">Selecione um motorista disponível para enviar os detalhes via WhatsApp.</p>

                                    <div className="space-y-2 max-h-[300px] overflow-y-auto">
                                        {drivers.map(d => (
                                            <div
                                                key={d.id}
                                                onClick={() => setSelectedDriver(d)}
                                                className={`p-3 rounded-xl border flex justify-between items-center cursor-pointer transition-all ${selectedDriver?.id === d.id ? 'border-[#d9a65a] bg-orange-50' : 'border-gray-100 hover:border-gray-300'}`}
                                            >
                                                <div>
                                                    <p className="font-bold text-[#3b2f2f]">{d.name}</p>
                                                    <p className="text-xs text-gray-500">{d.vehicle} • {d.status}</p>
                                                </div>
                                                {selectedDriver?.id === d.id && <CheckCircle size={16} className="text-[#d9a65a]" />}
                                            </div>
                                        ))}
                                    </div>

                                    <div className="flex gap-2 pt-6">
                                        <button onClick={() => setOrderToAssign(null)} className="flex-1 bg-gray-100 py-3 rounded-xl font-bold text-gray-500 hover:bg-gray-200">Cancelar</button>
                                        <button
                                            onClick={handleAssignOrder}
                                            disabled={!selectedDriver}
                                            className="flex-1 bg-[#25D366] text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            <Send size={18} /> Enviar WhatsApp
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )
                    }

                    {/* Support Ticket Modal */}
                    {isSupportTicketOpen && (
                        <div className="fixed inset-0 z-[60] bg-black/50 flex items-center justify-center p-4 backdrop-blur-sm">
                            <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl animate-scale-in">
                                <h3 className="text-xl font-bold mb-4 font-serif text-[#3b2f2f]">Abrir Ticket de Suporte</h3>
                                <form onSubmit={handleSupportSubmit} className="space-y-4">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Assunto</label>
                                        <input
                                            required
                                            value={supportForm.subject}
                                            onChange={e => setSupportForm({ ...supportForm, subject: e.target.value })}
                                            className="w-full p-3 border rounded-xl focus:border-[#d9a65a] outline-none"
                                            placeholder="Resumo do problema..."
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Descrição Detalhada</label>
                                        <textarea
                                            required
                                            rows={4}
                                            value={supportForm.message}
                                            onChange={e => setSupportForm({ ...supportForm, message: e.target.value })}
                                            className="w-full p-3 border rounded-xl focus:border-[#d9a65a] outline-none"
                                            placeholder="Descreva o erro ou solicitação..."
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Print Screen (Opcional)</label>
                                        <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer hover:bg-gray-50 transition-colors">
                                            {supportForm.image ? (
                                                <p className="text-sm font-bold text-green-600">{supportForm.image.name}</p>
                                            ) : (
                                                <>
                                                    <Upload className="mx-auto h-8 w-8 text-gray-400" />
                                                    <p className="text-xs text-gray-500 mt-2">Clique para carregar imagem</p>
                                                </>
                                            )}
                                            <input type="file" className="hidden" accept="image/*" onChange={e => e.target.files && setSupportForm({ ...supportForm, image: e.target.files[0] })} />
                                        </label>
                                    </div>
                                    <div className="flex gap-2 pt-4">
                                        <button type="button" onClick={() => setIsSupportTicketOpen(false)} className="flex-1 bg-gray-100 py-3 rounded-xl font-bold text-gray-500 hover:bg-gray-200">Cancelar</button>
                                        <button type="submit" className="flex-1 bg-[#3b2f2f] text-[#d9a65a] py-3 rounded-xl font-bold hover:shadow-lg flex justify-center items-center gap-2">
                                            <Send size={18} /> Enviar Ticket
                                        </button>
                                    </div>
                                    <p className="text-[10px] text-center text-gray-400 mt-2">O ticket será enviado para o WhatsApp e Email da Zyph Tech.</p>
                                </form>
                            </div>
                        </div>
                    )}
                </AnimatePresence>
            </div>
        </div >
    );
};

