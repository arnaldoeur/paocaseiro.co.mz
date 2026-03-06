import React, { useState, useEffect } from 'react';
import { Eye, EyeOff, Sparkles, MessageSquare, Trash2, Upload, Send, CheckCircle, Package, TrendingUp, User, LogOut, ShoppingBag, Clock, Menu, X, ChevronRight, Search, Plus, Calendar, MapPin, Truck, Smartphone, Users, MessageCircle, Mail, Download, ChevronLeft, Loader, ShoppingCart } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { AdminSupportAI } from '../components/AdminSupportAI';
import { Kitchen } from './Kitchen';
import { sendSMS, sendWhatsApp, notifyCustomer } from '../services/sms';
import { sendEmail } from '../services/email';
import { supabase, getConnectionMode, setConnectionMode, refreshSupabaseClient, type ConnectionMode } from '../services/supabase';

const MAIL_STYLES = `
    .custom-scrollbar::-webkit-scrollbar {
        width: 6px;
    }
    .custom-scrollbar::-webkit-scrollbar-track {
        background: transparent;
    }
    .custom-scrollbar::-webkit-scrollbar-thumb {
        background: #3b2f2f20;
        border-radius: 10px;
    }
    .custom-scrollbar::-webkit-scrollbar-thumb:hover {
        background: #d9a65a40;
    }
`;

// --- Types ---
interface Order {
    id?: string;
    customer_id?: string;
    orderId: string;
    paymentRef: string;
    date: string;
    status: 'pending' | 'processing' | 'ready' | 'delivering' | 'arrived' | 'completed' | 'cancelled';
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
        internal_id?: string;
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
    useEffect(() => {
        const styleTag = document.createElement("style");
        styleTag.innerHTML = MAIL_STYLES;
        document.head.appendChild(styleTag);
        return () => { document.head.removeChild(styleTag); };
    }, []);

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
    const [customers, setCustomers] = useState<any[]>([]);
    const [messages, setMessages] = useState<any[]>([]);
    const [messageFolder, setMessageFolder] = useState<'inbox' | 'sent' | 'trash'>('inbox');
    const [selectedMessage, setSelectedMessage] = useState<any | null>(null);

    // POS State
    const [posCart, setPosCart] = useState<any[]>([]);
    const [posCustomer, setPosCustomer] = useState<any>(null);
    const [posOrderType, setPosOrderType] = useState<'takeaway' | 'dine-in' | 'local'>('local');
    const [posSearchTerm, setPosSearchTerm] = useState('');
    const [posCategory, setPosCategory] = useState('all');

    // Message Settings State
    const [emailSettings, setEmailSettings] = useState(() => {
        const saved = localStorage.getItem('message_settings');
        return saved ? JSON.parse(saved) : { senderId: 'Zyph Tech', user: 'admin', icon: '' };
    });
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
    const [dbStatus, setDbStatus] = useState<{ status: 'online' | 'error' | 'loading' | 'offline', message?: string }>({ status: 'offline' });
    const [connectionMode, setConnectionModeState] = useState<ConnectionMode>(getConnectionMode());
    const [isAddingQuickCustomer, setIsAddingQuickCustomer] = useState(false);
    const [quickCustomerForm, setQuickCustomerForm] = useState({ name: '', phone: '', email: '', nuit: '' });

    // --- Persistence ---
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

    // --- Logistics Data ---
    const loadMessages = async () => {
        try {
            let query = supabase.from('contact_messages').select('*');

            if (messageFolder === 'trash') {
                query = query.eq('status', 'trash');
            } else if (messageFolder === 'sent') {
                query = query.eq('status', 'replied');
            } else {
                // Inbox status: typically 'unread' or 'read', but NOT 'trash' and NOT 'replied'
                query = query.not('status', 'in', '("trash", "replied")');
            }

            const { data, error } = await query.order('created_at', { ascending: false });
            if (error) {
                console.error("Messages Error:", error);
                throw error;
            }
            if (data) {
                console.log(`Loaded ${data.length} messages`);
                setMessages(data);
            }
        } catch (e) {
            console.error("Error loading messages:", e);
            throw e;
        }
    };
    const loadDrivers = async () => {
        try {
            const { data, error } = await supabase.from('logistics_drivers').select('*').order('name');
            if (error) throw error;
            if (data) {
                const mapped = data.map((d: any) => ({
                    ...d,
                    vehicle: d.vehicle_type // Map vehicle_type from DB to vehicle used in UI
                }));
                setDrivers(mapped);
            }
        } catch (e) {
            console.error("Failed to load drivers", e);
            throw e;
        }
    };

    const handleSaveDriver = async (e: React.FormEvent) => {
        e.preventDefault();

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
        await supabase.from('logistics_drivers').delete().eq('id', id);
        loadDrivers();
    };

    const handleDriverStatusChange = async (driverId: string, newStatus: string) => {
        // Optimistic update
        setDrivers(drivers.map(d => d.id === driverId ? { ...d, status: newStatus as any } : d));

        await supabase.from('logistics_drivers').update({ status: newStatus }).eq('id', driverId);
    };

    // Assign Order to Driver
    const handleAssignOrder = async () => {
        if (!selectedDriver || !orderToAssign) return;

        // 1. Generate OTP
        const otp = Math.floor(1000 + Math.random() * 9000).toString();

        // 2. Update Order in Supabase
        const { error } = await supabase
            .from('orders')
            .update({ status: 'ready', driver_id: selectedDriver.id, otp: otp })
            .eq('short_id', orderToAssign.orderId);

        if (error) return alert("Erro ao atribuir pedido: " + error.message);

        // 3. Notify Driver — rich SMS + WhatsApp link
        const { notifyDriverAssigned } = await import('../services/sms');
        const whatsappUrl = await notifyDriverAssigned(selectedDriver, { ...orderToAssign, otp });

        alert(`Pedido #${orderToAssign.orderId} atribuído a ${selectedDriver.name}!\nSMS de notificação enviado ao motorista.`);

        if (whatsappUrl && confirm("Deseja reforçar com WhatsApp?")) {
            window.open(whatsappUrl, '_blank');
        }

        loadOrders();
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
    const [activeView, setActiveView] = useState<'dashboard' | 'orders' | 'stock' | 'customers' | 'team' | 'messages' | 'support_ai' | 'logistics' | 'pos' | 'settings'>('dashboard');
    const [searchTerm, setSearchTerm] = useState('');
    const [stockSearchTerm, setStockSearchTerm] = useState(''); // New Stock Search Scope
    const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'pending' | 'completed' | 'cancelled'>('active');

    // Modal/Edit States
    const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
    const [isEditingProduct, setIsEditingProduct] = useState(false);
    const [currentProduct, setCurrentProduct] = useState<any>(null);
    const [previewImage, setPreviewImage] = useState('');
    const [productVariations, setProductVariations] = useState<any[]>([]);
    const [isEditingMember, setIsEditingMember] = useState(false);
    const [currentMember, setCurrentMember] = useState<any>(null);
    const [selectedCustomer, setSelectedCustomer] = useState<any | null>(null);
    const [customerLogs, setCustomerLogs] = useState<any[]>([]);

    // Advanced Customer Actions State
    const [isEditingCustomer, setIsEditingCustomer] = useState(false);
    const [customerForm, setCustomerForm] = useState<any>({});

    // Admin Security Gate State
    const [isAdminPasswordPromptOpen, setIsAdminPasswordPromptOpen] = useState(false);
    const [adminPasswordInput, setAdminPasswordInput] = useState('');
    const [pendingAdminAction, setPendingAdminAction] = useState<(() => void) | null>(null);

    const requestAdminAuth = (action: () => void) => {
        setPendingAdminAction(() => action);
        setAdminPasswordInput('');
        setIsAdminPasswordPromptOpen(true);
    };

    const handleVerifyAdmin = async (e: React.FormEvent) => {
        e.preventDefault();
        // Verify current admin password
        const { data } = await supabase
            .from('team_members')
            .select('id')
            .eq('id', userId)
            .eq('password', adminPasswordInput)
            .single();

        if (data) {
            setIsAdminPasswordPromptOpen(false);
            if (pendingAdminAction) pendingAdminAction();
        } else {
            alert('Palavra-passe de Administrador Incorreta!');
        }
    };

    const handleUpdateCustomer = async (e: React.FormEvent) => {
        e.preventDefault();
        requestAdminAuth(async () => {
            await supabase.from('customers').update({
                name: customerForm.name,
                contact_no: customerForm.contact_no,
                email: customerForm.email,
                nuit: customerForm.nuit,
                date_of_birth: customerForm.date_of_birth,
                whatsapp: customerForm.whatsapp,
                updated_at: new Date().toISOString()
            }).eq('id', selectedCustomer.id);
            alert('Cliente atualizado com sucesso!');
            setIsEditingCustomer(false);
            loadCustomers();
            setSelectedCustomer({ ...selectedCustomer, ...customerForm });
        });
    };

    const handleDeleteCustomer = (id: string) => {
        if (!confirm('ATENÇÃO: Deseja apagar permanentemente este cliente e o seu histórico?')) return;
        requestAdminAuth(async () => {
            await supabase.from('customers').delete().eq('id', id);
            alert('Cliente removido!');
            setSelectedCustomer(null);
            loadCustomers();
        });
    };

    const handleResetCustomerPassword = async (customer: any) => {
        const method = customer.email ?
            (confirm(`Deseja enviar o reset de senha por EMAIL para ${customer.email}?\n(Clique em Cancelar para enviar por SMS para ${customer.contact_no})`) ? 'email' : 'sms')
            : 'sms';

        if (method === 'sms' && !confirm(`Gerar nova palavra-passe e enviar SMS para ${customer.contact_no}?`)) return;

        requestAdminAuth(async () => {
            const newPassword = Math.random().toString(36).slice(-8);
            try {
                const { error: updateError } = await supabase
                    .from('customers')
                    .update({ password: newPassword })
                    .eq('id', customer.id);

                if (updateError) throw updateError;

                if (method === 'email' && customer.email) {
                    const emailHtml = `
                        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
                            <h2 style="color: #3b2f2f;">Reset de Senha - Pão Caseiro</h2>
                            <p>Olá <strong>${customer.name}</strong>,</p>
                            <p>A sua palavra-passe foi redefinida com sucesso.</p>
                            <div style="background: #fcfbf9; padding: 15px; border-radius: 8px; border: 1px solid #d9a65a; margin: 20px 0; text-align: center;">
                                <p style="margin: 0; color: #888; font-size: 12px; text-transform: uppercase; font-weight: bold;">Nova Palavra-passe</p>
                                <h3 style="margin: 5px 0; color: #3b2f2f; font-size: 24px; letter-spacing: 2px;">${newPassword}</h3>
                            </div>
                            <p>Recomendamos que altere a sua senha após o entrar.</p>
                            <p style="color: #888; font-size: 12px; margin-top: 30px;">Zyph Tech Security Team</p>
                        </div>
                    `;
                    await sendEmail([customer.email], 'Nova Palavra-passe - Pão Caseiro', emailHtml);
                    alert(`Sucesso! Nova senha enviada para o email ${customer.email}.`);
                } else {
                    const msg = `Pao Caseiro: A sua senha foi redefinida pela administracao. Nova senha: ${newPassword}`;
                    await sendSMS(customer.contact_no, msg);
                    alert('Palavra-passe redefinida e SMS enviado com sucesso!');
                }
            } catch (error: any) {
                alert('Erro ao resetar senha: ' + error.message);
            }
        });
    };

    const handleResetMemberPassword = async (member: any) => {
        const method = member.email ?
            (confirm(`Deseja enviar o reset de senha por EMAIL para ${member.email}?\n(Clique em Cancelar para ver no ecrã)`) ? 'email' : 'screen')
            : 'screen';

        if (method === 'screen' && !confirm(`Deseja redefinir a senha de ${member.name}?`)) return;

        requestAdminAuth(async () => {
            const newPassword = Math.random().toString(36).slice(-8);
            try {
                const { error: updateError } = await supabase
                    .from('team_members')
                    .update({ password: newPassword })
                    .eq('id', member.id);

                if (updateError) throw updateError;

                if (method === 'email' && member.email) {
                    const emailHtml = `
                        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
                            <h2 style="color: #3b2f2f;">Acesso Equipa - Pão Caseiro</h2>
                            <p>Olá <strong>${member.name}</strong>,</p>
                            <p>A tua palavra-passe de acesso ao painel admin foi redefinida.</p>
                            <div style="background: #fcfbf9; padding: 15px; border-radius: 8px; border: 1px solid #d9a65a; margin: 20px 0; text-align: center;">
                                <p style="margin: 0; color: #888; font-size: 12px; text-transform: uppercase; font-weight: bold;">Nova Palavra-passe</p>
                                <h3 style="margin: 5px 0; color: #3b2f2f; font-size: 24px; letter-spacing: 2px;">${newPassword}</h3>
                            </div>
                            <p>Utilizador: <strong>${member.username}</strong></p>
                            <p style="color: #888; font-size: 12px; margin-top: 30px;">Zyph Tech Security Team</p>
                        </div>
                    `;
                    await sendEmail([member.email], 'Redefinição de Senha Equipa', emailHtml);
                    alert(`Sucesso! Nova senha enviada para ${member.email}.`);
                } else {
                    alert(`Nova palavra-passe para ${member.name}: ${newPassword}\nUsername: ${member.username}`);
                }
                loadTeam();
            } catch (error: any) {
                alert('Erro ao resetar senha: ' + error.message);
            }
        });
    };

    const handleToggleBlockCustomer = (customer: any) => {
        const isCurrentlyBlocked = customer.is_blocked;
        const actionText = isCurrentlyBlocked ? 'Desbloquear' : 'Bloquear';
        if (!confirm(`Deseja ${actionText} o cliente ${customer.name}?`)) return;

        requestAdminAuth(async () => {
            await supabase.from('customers').update({ is_blocked: !isCurrentlyBlocked }).eq('id', customer.id);
            alert(`Cliente ${actionText.toLowerCase()} com sucesso!`);
            loadCustomers();
            setSelectedCustomer({ ...customer, is_blocked: !isCurrentlyBlocked });
        });
    };

    const handleOpenCustomerDetails = async (customer: any) => {
        setSelectedCustomer(customer);
        // Fetch all order logs linking to this customer by their phone
        const { data } = await supabase
            .from('orders')
            .select('*')
            .eq('customer_phone', customer.contact_no)
            .order('created_at', { ascending: false });

        if (data) setCustomerLogs(data);
    };

    // Dashboard States
    const [currentTime, setCurrentTime] = useState(new Date());
    const [quote, setQuote] = useState('');
    const [showUserModal, setShowUserModal] = useState(false);
    const [userForm, setUserForm] = useState({ name: '', phone: '', password: '', confirmPassword: '', photo: '' });
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

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

    // --- Persistence Init ---
    useEffect(() => {
        if (localStorage.getItem('admin_auth') === 'true') {
            setIsAuthenticated(true);
            setCurrentUserRole(localStorage.getItem('admin_role') || 'staff');
            setUserId(localStorage.getItem('admin_id') || '');
            refreshAllData();

            // Auto-refresh Orders every 2 seconds (user requested 2-5s)
            const refreshInterval = setInterval(() => {
                loadOrders().catch(err => console.error("Auto-refresh failed", err));
            }, 2000);

            // Real-time Listeners
            let ordersChannel: any;
            let productsChannel: any;

            (async () => {
                // Orders Listener
                ordersChannel = supabase
                    .channel('orders-changes')
                    .on(
                        'postgres_changes',
                        { event: '*', schema: 'public', table: 'orders' },
                        (payload: any) => {
                            console.log('Order Updated!', payload);
                            refreshAllData();
                            if (payload.eventType === 'INSERT') {
                                alert(`NOVO PEDIDO RECEBIDO! #${payload.new.short_id}`);
                            }
                            if (payload.eventType === 'UPDATE' && payload.old.payment_status !== 'paid' && payload.new.payment_status === 'paid') {
                                import('../services/sms').then(({ notifyPaymentConfirmed }) => {
                                    notifyPaymentConfirmed(payload.new.orderId || payload.new.id, payload.new.customer_phone, payload.new.short_id);
                                });
                            }
                        }
                    )
                    .subscribe();

                // Products Listener
                productsChannel = supabase
                    .channel('products-changes')
                    .on(
                        'postgres_changes',
                        { event: '*', schema: 'public', table: 'products' },
                        () => {
                            console.log('Products changed, reloading...');
                            refreshAllData();
                        }
                    )
                    .subscribe();
            })();

            return () => {
                clearInterval(refreshInterval);
                if (ordersChannel) ordersChannel.unsubscribe();
                if (productsChannel) productsChannel.unsubscribe();
            };

            // Redirect Driver
            if (localStorage.getItem('admin_role') === 'driver') {
                setActiveView('logistics');
            }
        }
    }, [isAuthenticated]); // Re-run when authenticated status changes

    // Clock
    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    // Messaging Folder Sync
    useEffect(() => {
        if (isAuthenticated && activeView === 'messages') {
            loadMessages();
        }
    }, [messageFolder, activeView]);

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

        // Local fallback credentials (mirrors team_members table in Supabase)
        // Used when network blocks Supabase access
        const localCredentials = [
            { id: '8baaa0b6-2ee1-45a0-b5aa-777055c0b95a', username: 'nazir', name: 'Nazir', role: 'admin', password: 'admin123' },
        ];

        try {
            const { data, error } = await supabase
                .from('team_members')
                .select('*')
                .ilike('username', username)
                .eq('password', password)
                .single();

            if (data) {
                setIsAuthenticated(true);
                setCurrentUserRole(data.role);
                setUserId(data.id);
                setUsername(data.name);

                localStorage.setItem('admin_auth', 'true');
                localStorage.setItem('admin_role', data.role);
                localStorage.setItem('admin_id', data.id);
                localStorage.setItem('admin_user', data.name);

                refreshAllData();
            } else {
                // Try local fallback if Supabase returned no match
                const localMatch = localCredentials.find(
                    c => c.username === username.toLowerCase() && c.password === password
                );
                if (localMatch) {
                    setIsAuthenticated(true);
                    setCurrentUserRole(localMatch.role);
                    setUserId(localMatch.id);
                    setUsername(localMatch.name);
                    localStorage.setItem('admin_auth', 'true');
                    localStorage.setItem('admin_role', localMatch.role);
                    localStorage.setItem('admin_id', localMatch.id);
                    localStorage.setItem('admin_user', localMatch.name);
                    refreshAllData();
                } else {
                    setError('Credenciais incorretas');
                }
            }
        } catch (err) {
            console.error(err);
            // Network error - try local fallback
            const localMatch = localCredentials.find(
                c => c.username === username.toLowerCase() && c.password === password
            );
            if (localMatch) {
                setIsAuthenticated(true);
                setCurrentUserRole(localMatch.role);
                setUserId(localMatch.id);
                setUsername(localMatch.name);
                localStorage.setItem('admin_auth', 'true');
                localStorage.setItem('admin_role', localMatch.role);
                localStorage.setItem('admin_id', localMatch.id);
                localStorage.setItem('admin_user', localMatch.name);
                refreshAllData();
            } else {
                setError('Erro ao conectar. Verifique as credenciais.');
            }
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
            const { data, error } = await supabase
                .from('orders')
                .select(`
                    *,
                    items:order_items(*),
                    customers ( internal_id )
                `)
                .order('created_at', { ascending: false });

            if (error) throw error;

            if (data) {
                const mapped: Order[] = data.map((o: any) => ({
                    id: o.id,
                    customer_id: o.customer_id,
                    orderId: o.short_id,
                    paymentRef: o.payment_ref,
                    transaction_id: o.transaction_id,
                    date: new Date(o.created_at).toLocaleString(),
                    status: o.status,
                    driver_id: o.driver_id,
                    otp: o.otp,
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
                        notes: o.notes,
                        internal_id: o.customers?.internal_id
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
            throw e;
        }
    };

    // Products (Supabase)
    const loadProducts = async () => {
        const { data, error } = await supabase
            .from('products')
            .select('*')
            .order('name');

        if (!error && data) {
            const mapped = data.map((p: any) => ({
                id: p.id,
                name: p.name,
                price: Number(p.price),
                category: p.category,
                inStock: p.is_available,
                stockQuantity: Number(p.stock_quantity) || 0, // Fixed: UI uses stockQuantity
                prepTime: p.prep_time,
                deliveryTime: p.delivery_time,
                image: p.image,
                availability: p.is_available ? 'available' : 'unavailable',
                variations: p.variations || [],
                complements: p.complements || [],
                unit: p.unit || 'un',
                name_en: p.name_en,
                description_en: p.description_en
            }));
            setProducts(mapped);
        } else if (error) {
            console.error("Failed to load products", error);
            throw error;
        }
    };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0) return;
        const file = e.target.files[0];
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}.${fileExt}`;
        const filePath = `${fileName}`;

        const { error: uploadError } = await supabase.storage.from('products').upload(filePath, file);

        if (uploadError) {
            console.error('Upload Error:', uploadError);
            alert('Erro ao fazer upload da imagem.');
            return;
        }

        const { data } = supabase.storage.from('products').getPublicUrl(filePath);
        setPreviewImage(data.publicUrl);
    };

    const handleSaveMember = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        const form = e.target as any;
        const memberData: any = {
            name: form.name.value,
            username: form.username.value,
            email: form.email.value,
            role: form.role.value
        };

        if (form.password.value) {
            memberData.password = form.password.value;
        }

        try {
            if (currentMember) {
                // Update
                const { error } = await supabase.from('team_members').update(memberData).eq('id', currentMember.id);
                if (error) throw error;
                alert('Membro atualizado com sucesso!');
            } else {
                // Insert
                memberData.created_at = new Date().toISOString();
                const { error } = await supabase.from('team_members').insert([memberData]);
                if (error) throw error;
                alert('Novo membro criado com sucesso!');
            }

            setIsEditingMember(false);
            setCurrentMember(null);
            loadTeam();
        } catch (error: any) {
            console.error('Error saving team member:', error);
            alert('Erro ao salvar membro da equipe: ' + error.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleSaveProduct = async (e: React.FormEvent) => {
        e.preventDefault();
        const form = e.target as any;
        const productData: any = {
            name: form.name.value,
            category: form.category.value,
            price: Number(form.price.value),
            stock_quantity: Number(form.stockQuantity.value) || 0,
            is_available: form.inStock.checked,
            prep_time: form.prepTime.value,
            delivery_time: form.deliveryTime.value,
            unit: form.unit.value,
            name_en: form.name_en?.value || null,
            description_en: form.description_en?.value || null
        };

        // ONLY update image if a new one was uploaded
        if (previewImage) {
            productData.image = previewImage; // Fixed: use 'image' column
        }

        try {
            let productId = currentProduct?.id;

            if (currentProduct?.id && typeof currentProduct.id === 'string') {
                const { error } = await supabase.from('products').update(productData).eq('id', currentProduct.id);
                if (error) throw error;
            } else {
                const { data, error } = await supabase.from('products').insert(productData).select().single();
                if (error) throw error;
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
                        price_adjustment: Number(v.price) // Fixed column name mismatch
                    }));
                    await supabase.from('product_variations').insert(varsToInsert);
                }
            }

            loadProducts();
            setIsEditingProduct(false);
            setCurrentProduct(null);
            setProductVariations([]);
        } catch (e: any) {
            console.error("Save Error:", e);
            alert("Erro ao salvar produto: " + (e.message || JSON.stringify(e)));
        }
    };

    const handleDeleteProduct = async (id: any) => {
        if (confirm('Tem certeza?')) {
            await supabase.from('products').delete().eq('id', id);
            loadProducts();
        }
    };

    // Team (Supabase)
    const loadTeam = async () => {
        const { data, error } = await supabase.from('team_members').select('*').order('name');
        if (error) {
            console.error("Failed to load team members", error);
            throw error;
        }
        if (data) setTeamMembers(data);
    };



    const handleDeleteMember = async (id: string) => {
        if (confirm('Remover membro?')) {
            await supabase.from('team_members').delete().eq('id', id);
            loadTeam();
        }
    };

    // Customers (Supabase)
    const loadCustomers = async () => {
        const { data, error } = await supabase.from('customers').select('*').order('created_at', { ascending: false });
        if (error) {
            console.error("Failed to load customers", error);
            throw error;
        }
        if (data) setCustomers(data);
    };

    const handleSupportSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        let imageUrl = '';
        if (supportForm.image) {
            const file = supportForm.image;
            const filePath = `tickets/${Date.now()}_${file.name}`;
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

    // --- Consolidated Data Loading ---
    const refreshAllData = async () => {
        setDbStatus({ status: 'loading' });
        try {
            console.log("Refreshing all admin data...");
            // Load base data for all roles
            await Promise.all([
                loadOrders().then(() => console.log("Orders loaded")),
                loadProducts().then(() => console.log("Products loaded")),
                loadMessages().then(() => console.log("Messages loaded")),
                loadDrivers().then(() => console.log("Drivers loaded"))
            ]);

            const rawRole = localStorage.getItem('admin_role') || currentUserRole || '';
            const role = rawRole.toLowerCase();
            console.log(`Checking extended data for role: ${role}`);

            if (role === 'admin' || role === 'it') {
                await Promise.all([
                    loadTeam().then(() => console.log("Team loaded")),
                    loadCustomers().then(() => console.log("Customers loaded"))
                ]);
            }
            setDbStatus({ status: 'online' });
            console.log("Refresh completed successfully");
        } catch (e: any) {
            console.error("Diagnostic: Refresh failed", e);
            let errorMsg = e.message || String(e);

            // Helpful detection for ISP/Network blocks (Supabase returning HTML)
            if (errorMsg.includes('Unexpected token <') || errorMsg.includes('DOCTYPE') || errorMsg.includes('Website Blocked')) {
                errorMsg = "CONEXÃO BLOQUEADA (ISP/VPN necessária). O Supabase está inacessível na sua rede.";
            } else if (errorMsg.includes('Failed to fetch')) {
                errorMsg = "Sem Internet ou Erro de DNS no Backend.";
            }

            setDbStatus({ status: 'error', message: errorMsg });
        }
    };

    const handleToggleConnectionMode = () => {
        const newMode: ConnectionMode = connectionMode === 'proxy' ? 'direct' : 'proxy';
        setConnectionMode(newMode);
        setConnectionModeState(newMode);
        refreshSupabaseClient();
        setTimeout(() => refreshAllData(), 500);
    };

    const handleTestDirectConnection = async () => {
        setDbStatus({ status: 'loading', message: "A testar ligação direta..." });
        try {
            const directUrl = import.meta.env.VITE_SUPABASE_URL || 'https://bqiegszufcqimlvucrpm.supabase.co';
            const res = await fetch(`${directUrl}/rest/v1/`, {
                headers: { 'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY }
            });
            const text = await res.text();
            if (text.includes('Website Blocked') || text.includes('DOCTYPE')) {
                alert("LIGAÇÃO DIRETA BLOQUEADA: O seu ISP ainda está a bloquear o Supabase. Use a VPN e mude o modo para Direto se a VPN estiver ativa.");
            } else {
                alert("LIGAÇÃO DIRETA OK: O Supabase está acessível (VPN provavelmente ativa). Pode mudar para o modo Direto.");
            }
        } catch (e) {
            alert("Erro ao testar ligação direta. Verifique a consola.");
        }
        refreshAllData();
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
        (statusFilter === 'all' || o.status === statusFilter || (statusFilter === 'active' && o.status !== 'completed' && o.status !== 'cancelled')) &&
        (o.orderId.toLowerCase().includes(searchTerm.toLowerCase()) ||
            o.customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            o.customer.phone.includes(searchTerm) ||
            (o.paymentRef && o.paymentRef.toLowerCase().includes(searchTerm.toLowerCase())))
    );

    const filteredProducts = products.filter(p =>
        p.name.toLowerCase().includes(stockSearchTerm.toLowerCase()) ||
        (p.id && p.id.toString().toLowerCase().includes(stockSearchTerm.toLowerCase()))
    );

    const downloadOrdersCSV = () => {
        const headers = ["ID", "Ref", "Cliente", "Tel", "Data", "Total", "Status", "Items"];
        const rows = orders.map(o => [
            o.orderId, o.paymentRef, o.customer.name, o.customer.phone, o.date, o.total, o.status,
            o.items.map(i => `${i.quantity}x ${i.name}`).join('|')
        ]);
        const csvContent = "data:text/csv;charset=utf-8," + headers.join(",") + "\n" + rows.map(e => e.join(",")).join("\n");
        const link = document.createElement("a");
        link.setAttribute("href", encodeURI(csvContent));
        link.setAttribute("download", `pedidos_paocaseiro_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const downloadStockCSV = () => {
        const headers = ["ID", "Produto", "Categoria", "Preço", "Stock", "Unidade", "Status"];
        const rows = products.map((p, index) => [
            `PC-${index + 10}`,
            p.name,
            p.category,
            p.price,
            p.stockQuantity,
            p.unit,
            p.inStock ? 'Disponível' : 'Indisponível'
        ]);

        const csvContent = "data:text/csv;charset=utf-8,"
            + headers.join(",") + "\n"
            + rows.map(r => r.join(",")).join("\n");

        const link = document.createElement("a");
        link.setAttribute("href", encodeURI(csvContent));
        link.setAttribute("download", `stock_paocaseiro_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const downloadCustomersCSV = () => {
        const headers = ["ID", "Nome", "Telefone", "Email", "NUIT", "Data Nasc.", "Status"];
        const rows = customers.map(c => [
            c.id, c.name, c.contact_no, c.email || 'N/A', c.nuit || 'N/A', c.date_of_birth || 'N/A',
            c.is_blocked ? 'Bloqueado' : 'Ativo'
        ]);
        const csvContent = "data:text/csv;charset=utf-8," + headers.join(",") + "\n" + rows.map(e => e.join(",")).join("\n");
        const link = document.createElement("a");
        link.setAttribute("href", encodeURI(csvContent));
        link.setAttribute("download", `clientes_paocaseiro_${new Date().toISOString().split('T')[0]}.csv`);
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
                        <input type="text" title="Username" value={username} onChange={e => setUsername(e.target.value)} className="w-full p-3 border border-gray-200 rounded-lg focus:border-[#d9a65a] focus:ring-1 focus:ring-[#d9a65a] outline-none transition-all" placeholder="Username" autoFocus />
                        <input type="password" title="Senha" value={password} onChange={e => setPassword(e.target.value)} className="w-full p-3 border border-gray-200 rounded-lg focus:border-[#d9a65a] focus:ring-1 focus:ring-[#d9a65a] outline-none transition-all" placeholder="Senha" />
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
                        <ShoppingBag className="w-12 h-12 text-[#d9a65a]" />
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
                                <button onClick={() => setActiveView('pos')} className={`w-full flex items-center gap-3 p-3 rounded-lg font-bold transition-all ${activeView === 'pos' ? 'bg-[#d9a65a] text-[#3b2f2f] shadow-lg translate-x-1' : 'text-gray-400 hover:text-white hover:bg-white/5'} ${isSidebarCollapsed ? 'justify-center' : ''}`} title="Ponto de Venda (POS)"><Smartphone size={20} /> {!isSidebarCollapsed && "POS / Balcão"}</button>
                            </>
                        )}
                        {(currentUserRole === 'admin' || currentUserRole === 'it') && (
                            <>
                                <button onClick={() => setActiveView('customers')} className={`w-full flex items-center gap-3 p-3 rounded-lg font-bold transition-all ${activeView === 'customers' ? 'bg-[#d9a65a] text-[#3b2f2f] shadow-lg translate-x-1' : 'text-gray-400 hover:text-white hover:bg-white/5'} ${isSidebarCollapsed ? 'justify-center' : ''}`} title="Clientes"><Users size={20} /> {!isSidebarCollapsed && "Clientes"}</button>
                                <button onClick={() => setActiveView('team')} className={`w-full flex items-center gap-3 p-3 rounded-lg font-bold transition-all ${activeView === 'team' ? 'bg-[#d9a65a] text-[#3b2f2f] shadow-lg translate-x-1' : 'text-gray-400 hover:text-white hover:bg-white/5'} ${isSidebarCollapsed ? 'justify-center' : ''}`} title="Equipe"><User size={20} /> {!isSidebarCollapsed && "Equipe"}</button>
                            </>
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
                            {localStorage.getItem('admin_photo') ? <img src={localStorage.getItem('admin_photo')!} alt="Foto de Perfil" className="w-8 h-8 rounded-full object-cover" /> : <User size={24} className="text-gray-400" />}

                            {!isSidebarCollapsed && (
                                <div>
                                    <p className="font-bold text-sm truncate w-32">{localStorage.getItem('admin_user')}</p>
                                    <p className="text-xs text-[#d9a65a] capitalize">{currentUserRole}</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Sidebar Footer with System Status */}
                    <div className="mt-auto p-4 border-t border-[#3d2b1f] bg-[#2d1e16]">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-[10px] text-[#d9a65a]/60 uppercase font-bold tracking-tighter">Status do Sistema</span>
                            <div className={`w-2 h-2 rounded-full animate-pulse ${dbStatus.status === 'online' ? 'bg-green-500' :
                                dbStatus.status === 'error' ? 'bg-red-500' : 'bg-blue-500'
                                }`} title={dbStatus.message || dbStatus.status} />
                        </div>
                        {dbStatus.status === 'error' && (
                            <p className="text-[7px] text-red-400 mb-2 leading-tight" title={dbStatus.message}>
                                {dbStatus.message}
                            </p>
                        )}
                        <div className="flex flex-col gap-2 mb-3">
                            <div className="flex items-center justify-between">
                                <span className="text-[8px] text-gray-400">Modo: <span className="text-[#d9a65a] uppercase">{connectionMode}</span></span>
                                <button
                                    onClick={handleToggleConnectionMode}
                                    className="text-[8px] bg-[#d9a65a] text-[#3b2f2f] px-2 py-0.5 rounded font-bold hover:brightness-110 active:scale-95 transition-all"
                                >
                                    ALTERAR
                                </button>
                            </div>
                            {connectionMode === 'proxy' && (
                                <button
                                    onClick={handleTestDirectConnection}
                                    className="text-[8px] border border-[#d9a65a]/30 text-[#d9a65a] px-2 py-0.5 rounded font-bold hover:bg-[#d9a65a]/10 transition-all"
                                >
                                    TESTAR LIGAÇÃO DIRETA
                                </button>
                            )}
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            <div className="bg-[#1a110b] p-1.5 rounded border border-[#d9a65a]/10">
                                <p className="text-[8px] text-[#d9a65a]/40 uppercase leading-none mb-1">Stock</p>
                                <p className="text-[10px] text-[#d9a65a] font-bold leading-none">{products.length}</p>
                            </div>
                            <div className="bg-[#1a110b] p-1.5 rounded border border-[#d9a65a]/10">
                                <p className="text-[8px] text-[#d9a65a]/40 uppercase leading-none mb-1">Pedidos</p>
                                <p className="text-[10px] text-[#d9a65a] font-bold leading-none">{orders.length}</p>
                            </div>
                        </div>
                        <button
                            onClick={refreshAllData}
                            className="w-full mt-2 py-1 text-[8px] font-bold text-[#d9a65a] border border-[#d9a65a]/30 rounded hover:bg-[#d9a65a]/10 transition-colors uppercase tracking-widest"
                        >
                            Force Refresh
                        </button>
                    </div>

                    <button onClick={handleLogout} className={`mt-4 flex items-center gap-2 text-gray-400 hover:text-[#d9a65a] transition-colors w-full p-2 hover:bg-white/5 rounded ${isSidebarCollapsed ? 'justify-center' : ''}`} title="Sair">
                        <LogOut size={18} />
                        {!isSidebarCollapsed && <span className="font-bold uppercase tracking-widest text-[10px]">Sair do Painel</span>}
                    </button>
                    {/* Footer - New Logo */}
                    {!isSidebarCollapsed && (
                        <div className="mt-8 pt-4 border-t border-gray-700 text-center flex flex-col items-center justify-center animate-fade-in">
                            <img
                                src="/paocaseiropng.png"
                                alt="P\u00e3o Caseiro Logo"
                                className="w-24 h-auto opacity-90 hover:opacity-100 transition-opacity drop-shadow-lg"
                            />
                            <p className="text-[9px] text-gray-600/50 mt-2 italic max-w-[150px] mx-auto leading-tight">
                                "O Sabor que aquece o cora\u00e7\u00e3o"
                            </p>
                        </div>
                    )}
                </div>
            </div>

            {/* Content */}
            <div className={`flex-1 overflow-y-auto relative flex flex-col ${activeView === 'logistics' ? 'bg-white' : 'p-6 md:p-10'}`}>

                {/* Header with Clock/Quote */}
                {/* Dashboard View */}
                {activeView === 'dashboard' && (
                    <div className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-end gap-4 animate-fade-in relative">
                        <div>
                            <h2 className="text-2xl font-bold text-[#3b2f2f] mb-1">Olá, {localStorage.getItem('admin_user')?.split(' ')[0]}</h2>
                            <p className="text-gray-500 text-sm max-w-md italic">"{quote}"</p>
                        </div>
                        <div className="flex items-end gap-6 text-right">
                            {/* Fecho do Dia Button */}
                            <button
                                onClick={async () => {
                                    if (window.confirm('Tem a certeza que deseja gerar e enviar o Fecho do Dia (Resumo Diário) para o email da gerência?')) {
                                        try {
                                            const { sendEmail } = await import('../services/email');

                                            // Calculate today's net summary
                                            const todayStart = new Date().setHours(0, 0, 0, 0);
                                            const todayOrders = orders.filter(o => {
                                                const d = new Date(o.date).valueOf();
                                                return d >= todayStart && (o.status === 'completed' || o.status === 'paid' || o.status === 'ready');
                                            });

                                            const totalDailyRevenue = todayOrders.reduce((sum, o) => sum + o.total, 0);
                                            const totalDailyOrders = todayOrders.length;

                                            const content = `
                                                <h2 style="color: #3b2f2f; border-bottom: 2px solid #d9a65a; padding-bottom: 10px;">Fecho de Caixa Diário</h2>
                                                <p><strong>Data de Referência:</strong> ${new Date().toLocaleDateString('pt-BR')}</p>
                                                <p><strong>Responsável:</strong> ${localStorage.getItem('admin_user') || 'Admin'}</p>
                                                
                                                <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
                                                    <tr style="background: #f7f1eb;">
                                                        <td style="padding: 15px; border: 1px solid #ddd;">Total de Pedidos Confirmados</td>
                                                        <td style="padding: 15px; border: 1px solid #ddd; font-weight: bold; font-size: 18px;">${totalDailyOrders}</td>
                                                    </tr>
                                                    <tr style="background: #fdfaf6;">
                                                        <td style="padding: 15px; border: 1px solid #ddd;">Faturação Bruta Total</td>
                                                        <td style="padding: 15px; border: 1px solid #ddd; font-weight: bold; font-size: 20px; color: #d9a65a;">${totalDailyRevenue.toLocaleString()} MT</td>
                                                    </tr>
                                                </table>
                                                <p style="font-size: 11px; color: #888;">Este resumo contabiliza apenas pedidos com estado pago, completado ou pronto.</p>
                                            `;

                                            const res = await sendEmail(['geral@paocaseiro.co.mz'], `RESUMO DIÁRIO: Fecho de Caixa - ${new Date().toLocaleDateString('pt-BR')}`, content);

                                            if (res.success) {
                                                alert('Fecho do Dia gerado e enviado para geral@paocaseiro.co.mz com sucesso!');
                                            } else {
                                                alert('Houve um erro no envio do fecho.');
                                            }
                                        } catch (e) {
                                            console.error(e);
                                            alert('Erro ao tentar processar o Fecho do Dia.');
                                        }
                                    }
                                }}
                                className="bg-[#3b2f2f] text-[#d9a65a] hover:bg-[#d9a65a] hover:text-[#3b2f2f] transition-all px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest shadow-lg flex flex-col items-center justify-center h-[56px]"
                            >
                                <span>Gerar</span>
                                <span>Fecho Dia</span>
                            </button>

                            {/* Clock */}
                            <div>
                                <p className="text-3xl font-bold text-[#d9a65a] font-mono tracking-wide">
                                    {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </p>
                                <p className="text-gray-400 text-xs uppercase font-bold">
                                    {currentTime.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
                                </p>
                            </div>
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
                                    {(['active', 'all', 'pending', 'completed', 'cancelled'] as const).map(s => (
                                        <button key={s} onClick={() => setStatusFilter(s)} className={`px-4 py-1.5 rounded-md text-xs font-bold uppercase transition-all ${statusFilter === s ? 'bg-white text-[#d9a65a] shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>{s === 'all' ? 'Todos' : s === 'active' ? 'Ativos' : s}</button>
                                    ))}
                                </div>
                                <button onClick={downloadOrdersCSV} className="bg-[#d9a65a]/10 text-[#d9a65a] px-4 py-2 rounded-lg font-bold text-xs hover:bg-[#d9a65a] hover:text-white transition-colors">Exportar CSV</button>
                            </div>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-gray-50 text-xs uppercase font-bold text-gray-500 border-b">
                                    <tr><th className="p-4 w-16">ID</th><th className="p-4">Data</th><th className="p-4">Cliente</th><th className="p-4">Total</th><th className="p-4">Status</th><th className="p-4">Tipo</th><th className="p-4 text-right">Ações</th></tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {filteredOrders.length === 0 ? <tr><td colSpan={7} className="p-10 text-center text-gray-400">Nenhum pedido encontrado.</td></tr> : filteredOrders.map(order => (
                                        <tr key={order.orderId} className="hover:bg-blue-50/30 transition-colors">
                                            <td className="p-4 font-mono text-xs font-bold text-gray-400">#{order.orderId}</td>
                                            <td className="p-4 text-xs text-gray-400 font-mono">{new Date(order.date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })}</td>
                                            <td className="p-4">
                                                <div className="font-bold text-[#3b2f2f]">{order.customer.name}</div>
                                                <div className="text-xs text-gray-500 flex items-center gap-1"><MapPin size={10} /> {order.customer.type} • {order.customer.phone}</div>
                                            </td>
                                            <td className="p-4 font-bold text-[#d9a65a]">{order.total.toLocaleString()} MT</td>
                                            <td className="p-4"><span className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${order.status === 'completed' ? 'bg-green-100 text-green-700' : order.status === 'pending' ? 'bg-orange-100 text-orange-700' : order.status === 'kitchen' ? 'bg-purple-100 text-purple-700' : 'bg-red-100 text-red-700'}`}>{order.status}</span></td>
                                            <td className="p-4"><span className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${order.customer.type === 'delivery' ? 'bg-blue-50 text-blue-600' : 'bg-yellow-50 text-yellow-700'}`}>{order.customer.type === 'delivery' ? 'Entrega' : 'Local/Takeaway'}</span></td>
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
                            <div className="flex gap-2">
                                <button onClick={downloadStockCSV} className="bg-white text-[#3b2f2f] border border-[#d9a65a]/20 px-4 py-2 rounded-lg font-bold text-sm shadow-sm hover:bg-gray-50 transition-all flex items-center gap-2">
                                    <Download size={16} /> Exportar Stock
                                </button>
                                <button onClick={() => { setCurrentProduct(null); setProductVariations([]); setPreviewImage(''); setIsEditingProduct(true); }} className="bg-[#3b2f2f] text-[#d9a65a] px-4 py-2 rounded-lg font-bold text-sm shadow-lg hover:brightness-110 transition-all">+ Novo Produto</button>
                            </div>
                        </div>
                        {/* Stock Search Bar */}
                        <div className="mx-6 mb-4 relative max-w-md">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                            <input
                                type="text"
                                value={stockSearchTerm}
                                onChange={(e) => setStockSearchTerm(e.target.value)}
                                placeholder="Pesquisar produto por nome ou ID..."
                                className="w-full pl-10 p-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:border-[#d9a65a] bg-gray-50/50"
                            />
                        </div>
                        <div className="overflow-x-auto overflow-y-auto max-h-[calc(100vh-350px)] custom-scrollbar">
                            <table className="w-full text-left">
                                <thead className="bg-[#3b2f2f] text-xs uppercase font-bold text-[#d9a65a] border-b sticky top-0 z-10">
                                    <tr><th className="p-4 w-16">ID</th><th className="p-4">Produto</th><th className="p-4">Preço</th><th className="p-4">Qtd</th><th className="p-4">Unidade</th><th className="p-4">Disponibilidade</th><th className="p-4 text-right">Ações</th></tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {filteredProducts.map((p, index) => (
                                        <tr key={p.id} className="hover:bg-blue-50/30 transition-colors">
                                            <td className="p-4 text-[10px] font-mono text-gray-400 max-w-[50px] truncate" title={p.id}>
                                                PC-{index + 10}
                                            </td>
                                            <td className="p-4 flex items-center gap-3">
                                                {p.image ? <img src={p.image} alt={p.name} className="w-10 h-10 rounded-lg object-cover border border-gray-200" /> : <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center text-gray-400"><Package size={16} /></div>}
                                                <div>
                                                    <span className="font-bold text-[#3b2f2f] block">{p.name.charAt(0).toUpperCase() + p.name.slice(1).toLowerCase()}</span>
                                                    <span className="text-xs text-gray-400 capitalize">{p.category}</span>
                                                </div>
                                            </td>
                                            <td className="p-4 font-bold text-[#d9a65a]">{p.price} MT</td>
                                            <td className="p-4 text-sm font-bold text-gray-600">{p.stockQuantity}</td>
                                            <td className="p-4 text-sm text-gray-500">{p.unit}</td>
                                            <td className="p-4"><span className={`w-2 h-2 rounded-full inline-block mr-2 ${p.inStock ? 'bg-green-500' : 'bg-red-500'}`}></span><span className="text-xs text-gray-500">{p.inStock ? 'Disponível' : 'Indisponível'}</span></td>
                                            <td className="p-4 text-right space-x-2">
                                                <button onClick={() => { setCurrentProduct(p); setProductVariations(p.variations || []); setPreviewImage(p.image || ''); setIsEditingProduct(true); }} className="text-blue-600 font-bold text-xs hover:underline">Editar</button>
                                                <button onClick={() => handleDeleteProduct(p.id)} className="text-red-500 font-bold text-xs hover:underline">Remover</button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* Customers View */}
                {activeView === 'customers' && (
                    <div className="bg-white rounded-2xl shadow-sm border border-[#d9a65a]/10 overflow-hidden animate-fade-in">
                        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-[#fcfbf9]">
                            <div className="flex items-center gap-3">
                                <h2 className="text-2xl font-bold text-[#3b2f2f]">Clientes</h2>
                                <span className="bg-[#3b2f2f] text-white text-xs font-bold px-2 py-1 rounded-full">{customers.length}</span>
                            </div>
                            <button
                                onClick={downloadCustomersCSV}
                                className="flex items-center gap-2 px-4 py-2 bg-white border border-[#d9a65a] text-[#d9a65a] rounded-xl text-xs font-bold hover:bg-[#d9a65a] hover:text-[#3b2f2f] transition-all shadow-sm"
                            >
                                <Download size={14} />
                                Exportar Clientes
                            </button>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-gray-50 text-xs uppercase font-bold text-gray-500 border-b">
                                    <tr><th className="p-4">Nome</th><th className="p-4">Telefone</th><th className="p-4">Email / Info</th><th className="p-4">Data Registo</th><th className="p-4 text-right">Ações</th></tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {customers.map((c: any) => (
                                        <tr key={c.id} className="hover:bg-blue-50/30 transition-colors">
                                            <td className="p-4 font-bold text-[#3b2f2f]">{c.name}</td>
                                            <td className="p-4 text-sm text-gray-500">
                                                {c.contact_no}
                                                {c.internal_id && <div className="text-[10px] font-bold text-[#d9a65a] mt-1">ID: {c.internal_id}</div>}
                                            </td>
                                            <td className="p-4 text-sm text-gray-500">
                                                {c.email ? <div>{c.email}</div> : <span className="text-gray-300 italic">Sem email</span>}
                                                {c.nuit && <div className="text-[10px] text-gray-400">NUIT: {c.nuit}</div>}
                                            </td>
                                            <td className="p-4 text-xs text-gray-400 font-mono">{new Date(c.created_at).toLocaleDateString()}</td>
                                            <td className="p-4 text-right space-x-2">
                                                <button onClick={() => handleOpenCustomerDetails(c)} className="text-[#3b2f2f] border border-gray-200 hover:bg-[#3b2f2f] hover:text-white px-3 py-1 rounded-lg text-xs font-bold transition-all">Ver</button>
                                            </td>
                                        </tr>
                                    ))}
                                    {customers.length === 0 && (
                                        <tr><td colSpan={5} className="p-8 text-center text-gray-400">Nenhum cliente registado.</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Customer Details Modal */}
                        {selectedCustomer && (
                            <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                                <div className="bg-white rounded-2xl w-full max-w-2xl p-6 animate-scale-in max-h-[90vh] overflow-y-auto">
                                    <div className="flex justify-between items-center mb-6">
                                        <h3 className="text-xl font-bold font-serif text-[#3b2f2f]">Ficha de Cliente</h3>
                                        <button onClick={() => { setSelectedCustomer(null); setCustomerLogs([]); }} title="Fechar" className="text-gray-400 hover:text-red-500 transition-colors"><X size={24} /></button>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                                        <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                                            <h4 className="text-sm font-bold text-gray-400 uppercase mb-4 border-b pb-2">Detalhes Principais</h4>
                                            <div className="space-y-3">
                                                <div>
                                                    <p className="text-[10px] text-gray-500 font-bold uppercase">ID Cliente</p>
                                                    <p className="font-bold text-[#d9a65a] text-lg">{selectedCustomer.internal_id || 'S/N'}</p>
                                                </div>
                                                <div>
                                                    <p className="text-[10px] text-gray-500 font-bold uppercase">Nome</p>
                                                    <p className="font-bold text-[#3b2f2f]">{selectedCustomer.name}</p>
                                                </div>
                                                <div>
                                                    <p className="text-[10px] text-gray-500 font-bold uppercase">Telefone Principal</p>
                                                    <p className="font-bold text-[#3b2f2f]">{selectedCustomer.contact_no}</p>
                                                </div>
                                                <div>
                                                    <p className="text-[10px] text-gray-500 font-bold uppercase">Email</p>
                                                    <p className="font-bold text-gray-700">{selectedCustomer.email || 'Não Defenido'}</p>
                                                </div>
                                                <div>
                                                    <p className="text-[10px] text-gray-500 font-bold uppercase">NUIT</p>
                                                    <p className="font-mono text-gray-700">{selectedCustomer.nuit || 'S/N'}</p>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                                            <h4 className="text-sm font-bold text-gray-400 uppercase mb-4 border-b pb-2">Informações Adicionais</h4>
                                            <div className="space-y-3">
                                                <div>
                                                    <p className="text-[10px] text-gray-500 font-bold uppercase">Data de Nascimento</p>
                                                    <p className="font-bold text-gray-700">{selectedCustomer.date_of_birth ? new Date(selectedCustomer.date_of_birth).toLocaleDateString() : 'Não Defenida'}</p>
                                                </div>
                                                <div>
                                                    <p className="text-[10px] text-gray-500 font-bold uppercase">WhatsApp Link</p>
                                                    <p className="font-bold text-gray-700">{selectedCustomer.whatsapp || 'Igual ao Principal (Padrão)'}</p>
                                                </div>
                                                <div>
                                                    <p className="text-[10px] text-gray-500 font-bold uppercase">Membro Desde</p>
                                                    <p className="font-bold text-gray-700">{new Date(selectedCustomer.created_at).toLocaleString()}</p>
                                                </div>
                                                <div>
                                                    <p className="text-[10px] text-[#d9a65a] font-bold uppercase">Último Acesso / Atualização</p>
                                                    <p className="font-mono text-gray-700">{selectedCustomer.updated_at ? new Date(selectedCustomer.updated_at).toLocaleString() : 'N/A'}</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Advanced Actions Card */}
                                    {(currentUserRole === 'admin' || currentUserRole === 'it') && (
                                        <div className="bg-red-50 p-4 rounded-xl border border-red-100 mb-8">
                                            <h4 className="text-sm font-bold text-red-800 uppercase mb-4 border-b border-red-200 pb-2 flex items-center gap-2">
                                                Ações Avançadas (Admin)
                                            </h4>
                                            <div className="flex flex-wrap gap-2">
                                                <button onClick={() => { setCustomerForm(selectedCustomer); setIsEditingCustomer(true); }} className="bg-white text-blue-600 border border-blue-200 px-4 py-2 rounded-lg text-xs font-bold hover:bg-blue-50 transition-colors">Editar Perfil</button>
                                                <button onClick={() => handleResetCustomerPassword(selectedCustomer)} className="bg-white text-orange-600 border border-orange-200 px-4 py-2 rounded-lg text-xs font-bold hover:bg-orange-50 transition-colors">Reset de Senha (SMS)</button>
                                                <button onClick={() => handleToggleBlockCustomer(selectedCustomer)} className="bg-white text-red-600 border border-red-200 px-4 py-2 rounded-lg text-xs font-bold hover:bg-red-50 transition-colors">
                                                    {selectedCustomer.is_blocked ? 'Desbloquear Acesso' : 'Bloquear Cliente'}
                                                </button>
                                                <button onClick={() => handleDeleteCustomer(selectedCustomer.id)} className="bg-red-600 text-white border border-red-700 px-4 py-2 rounded-lg text-xs font-bold hover:bg-red-700 transition-colors ml-auto">Apagar Conta</button>
                                            </div>
                                        </div>
                                    )}

                                    <div>
                                        <h4 className="text-sm font-bold text-gray-400 uppercase mb-4 flex justify-between items-center">
                                            Histórico de Pedidos
                                            <span className="bg-[#d9a65a] text-[#3b2f2f] px-2 py-0.5 rounded-full text-[10px]">{customerLogs.length} Compras</span>
                                        </h4>
                                        <div className="bg-gray-50 rounded-xl border border-gray-100 overflow-hidden">
                                            {customerLogs.length > 0 ? (
                                                <div className="max-h-60 overflow-y-auto">
                                                    <table className="w-full text-left text-sm">
                                                        <thead className="bg-gray-100 text-[10px] uppercase font-bold text-gray-500 sticky top-0">
                                                            <tr>
                                                                <th className="p-3">Ref</th>
                                                                <th className="p-3">Data</th>
                                                                <th className="p-3">Total</th>
                                                                <th className="p-3">Status</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody className="divide-y divide-gray-100">
                                                            {customerLogs.map((log: any) => (
                                                                <tr key={log.id} className="hover:bg-white transition-colors">
                                                                    <td className="p-3 font-mono text-gray-500">{log.short_id || log.id.slice(0, 8)}</td>
                                                                    <td className="p-3 text-gray-600">{new Date(log.created_at).toLocaleDateString()}</td>
                                                                    <td className="p-3 font-bold text-[#d9a65a]">{Number(log.total_amount).toLocaleString()} MT</td>
                                                                    <td className="p-3"><span className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${log.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-600'}`}>{log.status}</span></td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            ) : (
                                                <div className="p-8 text-center text-gray-400 text-sm">Este cliente ainda não efetuou nenhuma compra.</div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Customer Editing Modal */}
                        {isEditingCustomer && (
                            <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
                                <div className="bg-white rounded-2xl w-full max-w-md p-6 animate-scale-in">
                                    <div className="flex justify-between items-center mb-6">
                                        <h3 className="text-xl font-bold font-serif text-[#3b2f2f]">Editar Cliente</h3>
                                        <button onClick={() => setIsEditingCustomer(false)} title="Fechar" className="text-gray-400 hover:text-red-500"><X size={24} /></button>
                                    </div>
                                    <form onSubmit={handleUpdateCustomer} className="space-y-4">
                                        <div><label htmlFor="customer-name" className="block text-xs font-bold text-gray-500 uppercase mb-1">Nome</label><input id="customer-name" required value={customerForm.name || ''} onChange={e => setCustomerForm({ ...customerForm, name: e.target.value })} className="w-full p-2 border rounded-lg focus:border-[#d9a65a] outline-none" /></div>
                                        <div><label htmlFor="customer-phone" className="block text-xs font-bold text-gray-500 uppercase mb-1">Telefone Principal</label><input id="customer-phone" required value={customerForm.contact_no || ''} onChange={e => setCustomerForm({ ...customerForm, contact_no: e.target.value })} className="w-full p-2 border rounded-lg focus:border-[#d9a65a] outline-none" /></div>
                                        <div><label htmlFor="customer-email" className="block text-xs font-bold text-gray-500 uppercase mb-1">Email</label><input id="customer-email" type="email" value={customerForm.email || ''} onChange={e => setCustomerForm({ ...customerForm, email: e.target.value })} className="w-full p-2 border rounded-lg focus:border-[#d9a65a] outline-none" /></div>
                                        <div className="grid grid-cols-2 gap-2">
                                            <div><label htmlFor="customer-nuit" className="block text-xs font-bold text-gray-500 uppercase mb-1">NUIT</label><input id="customer-nuit" value={customerForm.nuit || ''} onChange={e => setCustomerForm({ ...customerForm, nuit: e.target.value })} className="w-full p-2 border rounded-lg focus:border-[#d9a65a] outline-none" /></div>
                                            <div><label htmlFor="customer-dob" className="block text-xs font-bold text-gray-500 uppercase mb-1">Nascimento (YYYY-MM-DD)</label><input id="customer-dob" type="date" title="Data de Nascimento" value={customerForm.date_of_birth || ''} onChange={e => setCustomerForm({ ...customerForm, date_of_birth: e.target.value })} className="w-full p-2 border rounded-lg focus:border-[#d9a65a] outline-none" /></div>
                                        </div>
                                        <button type="submit" className="w-full bg-[#3b2f2f] text-[#d9a65a] py-3 rounded-lg font-bold mt-4 hover:shadow-lg">Salvar Modificações</button>
                                    </form>
                                </div>
                            </div>
                        )}
                    </div>
                )
                }

                {/* Team View */}
                {
                    activeView === 'team' && (
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
                                                <button onClick={() => {
                                                    setCurrentMember(m);
                                                    setIsEditingMember(true);
                                                }} className="text-blue-600 font-bold text-xs hover:underline">Editar</button>
                                                <button onClick={() => handleResetMemberPassword(m)} className="text-orange-600 font-bold text-xs hover:underline">Reset Senha</button>
                                                <button onClick={() => handleDeleteMember(m.id)} className="text-red-500 font-bold text-xs hover:underline">Remover</button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>

                            {/* Edit / Create Member Modal */}
                            {isEditingMember && (
                                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                                    <div className="bg-white rounded-2xl w-full max-w-md p-6 animate-scale-in">
                                        <div className="flex justify-between items-center mb-6">
                                            <h3 className="text-xl font-bold font-serif text-[#3b2f2f]">{currentMember ? 'Editar Membro' : 'Novo Membro da Equipa'}</h3>
                                            <button onClick={() => { setIsEditingMember(false); setCurrentMember(null); }} title="Fechar" className="text-gray-400 hover:text-red-500 transition-colors"><X size={24} /></button>
                                        </div>
                                        <form onSubmit={handleSaveMember} className="space-y-4">
                                            <div>
                                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Nome Completo</label>
                                                <input required name="name" title="Nome Completo" defaultValue={currentMember?.name} type="text" className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:border-[#d9a65a] outline-none" />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Nome de Utilizador (Login)</label>
                                                <input required name="username" title="Nome de Utilizador" defaultValue={currentMember?.username} type="text" className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:border-[#d9a65a] outline-none" />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Email (Para Recuperação)</label>
                                                <input name="email" title="Email" defaultValue={currentMember?.email} type="email" className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:border-[#d9a65a] outline-none" />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Palavra-passe {currentMember && '(Opcional se não quiser alterar)'}</label>
                                                <input name="password" title="Palavra-passe" type="password" required={!currentMember} placeholder={currentMember ? 'Deixar em branco para manter a atual' : ''} className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:border-[#d9a65a] outline-none" />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Papel / Acesso</label>
                                                <select required name="role" title="Papel / Acesso" defaultValue={currentMember?.role || 'staff'} className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:border-[#d9a65a] outline-none">
                                                    <option value="admin">Administrador Geral</option>
                                                    <option value="it">Suporte TI</option>
                                                    <option value="staff">Equipa (Staff)</option>
                                                    <option value="driver">Motorista (Parceiro Drive)</option>
                                                    <option value="kitchen">Cozinha</option>
                                                </select>
                                            </div>
                                            <div className="pt-4 flex gap-3">
                                                <button type="submit" disabled={isSubmitting} className="flex-1 py-3 bg-[#d9a65a] text-[#3b2f2f] font-bold rounded-xl hover:bg-[#c89549] transition-colors shadow-lg flex justify-center items-center gap-2">
                                                    {isSubmitting ? <span className="w-4 h-4 border-2 border-[#3b2f2f] border-t-transparent rounded-full animate-spin"></span> : 'Guardar Membro'}
                                                </button>
                                            </div>
                                        </form>
                                    </div>
                                </div>
                            )}
                        </div>
                    )
                }

                {/* Messages View */}
                {
                    activeView === 'messages' && (
                        <div className="h-[calc(100vh-140px)] animate-fade-in flex border border-[#3b2f2f]/10 rounded-2xl overflow-hidden bg-white/50 backdrop-blur-sm shadow-2xl">
                            {/* Mail Sidebar */}
                            <div className="w-16 md:w-48 bg-[#3b2f2f] text-white flex flex-col p-2 md:p-4 gap-2 border-r border-white/10 shrink-0">
                                <button onClick={() => setMessageFolder('inbox')} className={`flex items-center gap-3 p-3 rounded-xl transition-all ${messageFolder === 'inbox' ? 'bg-[#d9a65a] text-[#3b2f2f] font-bold shadow-lg' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}>
                                    <Mail size={18} /> <span className="hidden md:inline">Entrada</span>
                                </button>
                                <button onClick={() => setMessageFolder('sent')} className={`flex items-center gap-3 p-3 rounded-xl transition-all ${messageFolder === 'sent' ? 'bg-[#d9a65a] text-[#3b2f2f] font-bold shadow-lg' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}>
                                    <Send size={18} /> <span className="hidden md:inline">Enviados</span>
                                </button>
                                <button onClick={() => setMessageFolder('trash')} className={`flex items-center gap-3 p-3 rounded-xl transition-all ${messageFolder === 'trash' ? 'bg-[#d9a65a] text-[#3b2f2f] font-bold shadow-lg' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}>
                                    <Trash2 size={18} /> <span className="hidden md:inline">Lixo</span>
                                </button>
                                <button onClick={() => setActiveView('settings')} className={`flex items-center gap-3 p-3 rounded-xl transition-all ${activeView === 'settings' ? 'bg-[#d9a65a] text-[#3b2f2f] font-bold shadow-lg' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}>
                                    <Sparkles size={18} /> <span className="hidden md:inline">Definições</span>
                                </button>
                                <div className="mt-auto pt-4 border-t border-white/5">
                                    <button onClick={() => loadMessages()} className="w-full flex items-center gap-3 p-3 text-gray-400 hover:text-[#d9a65a] transition-all text-xs uppercase font-bold tracking-widest">
                                        <Clock size={16} /> <span className="hidden md:inline">Atualizar</span>
                                    </button>
                                </div>
                            </div>

                            {/* Message List */}
                            <div className={`flex-1 transition-all flex h-full ${selectedMessage ? 'hidden lg:flex' : 'flex'}`}>
                                <div className="w-full lg:w-80 border-r border-gray-100 flex flex-col bg-white">
                                    <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                                        <h3 className="font-bold text-[#3b2f2f] uppercase tracking-wider text-[10px]">
                                            {messageFolder === 'inbox' ? 'Caixa de Entrada' : messageFolder === 'sent' ? 'Mensagens Enviadas' : 'Lixeira'}
                                        </h3>
                                        <span className="text-[10px] bg-[#d9a65a]/20 text-[#3b2f2f] px-2 py-0.5 rounded-full font-bold">
                                            {messages.length}
                                        </span>
                                    </div>
                                    <div className="flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar">
                                        {messages.length === 0 ? (
                                            <div className="p-12 text-center flex flex-col items-center gap-4 text-gray-300">
                                                <div className="p-4 bg-gray-50 rounded-full"><Mail size={32} /></div>
                                                <p className="text-sm italic">Vazio...</p>
                                            </div>
                                        ) : (
                                            messages.map((msg: any) => (
                                                <div
                                                    key={msg.id}
                                                    onClick={async () => {
                                                        setSelectedMessage(msg);
                                                        if (msg.status === 'unread') {
                                                            await supabase.from('contact_messages').update({ status: 'read' }).eq('id', msg.id);
                                                            // Update local state instead of full reload for smoother UX
                                                            setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, status: 'read' } : m));
                                                        }
                                                    }}
                                                    className={`p-4 border-b border-gray-100 cursor-pointer hover:bg-[#f7f1eb]/50 transition-all relative group ${selectedMessage?.id === msg.id ? 'bg-[#f7f1eb] border-l-4 border-l-[#d9a65a]' : ''} ${msg.status === 'unread' ? 'bg-[#d9a65a]/5 shadow-inner' : ''}`}
                                                >
                                                    {msg.status === 'unread' && <div className="absolute top-4 right-4 w-2.5 h-2.5 bg-red-500 rounded-full shadow-[0_0_10px_rgba(239,68,68,0.5)]"></div>}
                                                    <div className="flex justify-between items-start mb-1">
                                                        <span className={`text-[9px] uppercase font-bold tracking-tighter ${msg.status === 'unread' ? 'text-[#d9a65a]' : 'text-gray-400'}`}>
                                                            {new Date(msg.created_at).toLocaleDateString()}
                                                        </span>
                                                    </div>
                                                    <p className={`text-sm truncate pr-4 ${msg.status === 'unread' ? 'font-black text-[#3b2f2f]' : 'text-[#3b2f2f]/80'}`}>{msg.name}</p>
                                                    <p className="text-[11px] text-gray-400 truncate mt-0.5 group-hover:text-gray-600 transition-colors">
                                                        {messageFolder === 'sent' && msg.reply_content ? `Re: ${msg.reply_content}` : msg.message}
                                                    </p>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Message Detail View */}
                            <div className={`flex-[2] bg-white h-full flex flex-col ${selectedMessage ? 'flex' : 'hidden lg:flex'}`}>
                                {selectedMessage ? (
                                    <div className="flex flex-col h-full animate-fade-in">
                                        {/* Header */}
                                        <div className="p-6 border-b border-gray-100 bg-[#fcfbf9] flex flex-wrap gap-4 justify-between items-start">
                                            <div className="flex items-center gap-4">
                                                <button onClick={() => setSelectedMessage(null)} aria-label="Voltar para lista" className="lg:hidden p-2 text-gray-400 hover:text-[#3b2f2f] hover:bg-gray-100 rounded-full transition-all"><ChevronLeft size={20} /></button>
                                                <div>
                                                    <h2 className="text-2xl font-serif font-bold text-[#3b2f2f] mb-1">{selectedMessage.name}</h2>
                                                    <div className="flex items-center gap-3 flex-wrap">
                                                        <span className="text-sm font-medium bg-[#d9a65a]/10 text-[#3b2f2f] px-3 py-1 rounded-full">{selectedMessage.email}</span>
                                                        <span className="text-sm text-gray-400">•</span>
                                                        <span className="text-sm text-gray-500 font-mono">{selectedMessage.phone}</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={async () => {
                                                        const newStatus = selectedMessage.status === 'unread' ? 'read' : 'unread';
                                                        await supabase.from('contact_messages').update({ status: newStatus }).eq('id', selectedMessage.id);
                                                        loadMessages();
                                                        setSelectedMessage({ ...selectedMessage, status: newStatus });
                                                    }}
                                                    title={selectedMessage.status === 'unread' ? "Marcar como lida" : "Marcar como não lida"}
                                                    className={`p-2 rounded-xl border transition-all ${selectedMessage.status === 'unread' ? 'bg-[#d9a65a] text-[#3b2f2f] border-transparent shadow-lg' : 'hover:bg-white border-gray-100 text-gray-400 hover:text-[#d9a65a] bg-gray-50'}`}
                                                >
                                                    {selectedMessage.status === 'unread' ? <CheckCircle size={20} /> : <Mail size={20} />}
                                                </button>
                                                <button
                                                    onClick={async () => {
                                                        if (!confirm('Deseja mover esta mensagem para o lixo?')) return;
                                                        await supabase.from('contact_messages').update({ status: 'trash' }).eq('id', selectedMessage.id);
                                                        loadMessages();
                                                        setSelectedMessage(null);
                                                    }}
                                                    title="Mover para o Lixo"
                                                    className="p-2 hover:bg-red-500 hover:text-white rounded-xl border border-gray-100 transition-all text-gray-400 bg-gray-50"
                                                >
                                                    <Trash2 size={20} />
                                                </button>
                                            </div>
                                        </div>

                                        {/* Content */}
                                        <div className="flex-1 p-8 overflow-y-auto bg-gray-50/20 custom-scrollbar">
                                            <div className="max-w-3xl mx-auto">
                                                <div className="bg-white p-10 rounded-[2.5rem] border border-[#d9a65a]/10 shadow-[0_10px_40px_rgba(217,166,90,0.05)] text-[#3b2f2f] relative group">
                                                    <div className="absolute top-8 left-8 text-[#d9a65a]/10 group-hover:text-[#d9a65a]/20 transition-colors"><Sparkles size={48} /></div>
                                                    <div className="relative z-10">
                                                        <div className="flex items-center gap-2 mb-6 text-gray-300">
                                                            <div className="h-px w-8 bg-gray-100"></div>
                                                            <span className="uppercase tracking-[0.2em] text-[10px] font-bold italic">Mensagem Original</span>
                                                            <div className="h-px flex-1 bg-gray-100"></div>
                                                        </div>
                                                        <p className="text-lg leading-relaxed font-serif text-[#3b2f2f]/90 whitespace-pre-wrap">
                                                            {messageFolder === 'sent' && selectedMessage.reply_content ? selectedMessage.reply_content : selectedMessage.message}
                                                        </p>
                                                    </div>
                                                </div>

                                                {/* Reply Editor */}
                                                <div className="mt-12 pt-12 border-t border-gray-100">
                                                    <div className="flex items-center justify-between mb-8">
                                                        <h4 className="text-sm uppercase font-black tracking-[0.2em] text-[#3b2f2f] flex items-center gap-3">
                                                            <div className="p-2 bg-[#d9a65a] text-[#3b2f2f] rounded-lg shadow-lg"><Send size={18} /></div>
                                                            Enviar Resposta
                                                        </h4>
                                                        <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest bg-gray-100 px-3 py-1 rounded-full">Email: {selectedMessage.email}</span>
                                                    </div>
                                                    <form onSubmit={async (e: any) => {
                                                        e.preventDefault();
                                                        const response = (e.target as any).response.value;
                                                        if (!response) return;

                                                        setIsSubmitting(true);
                                                        try {
                                                            const { sendEmail } = await import('../services/email');
                                                            const emailHtml = `
                                                                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #d9a65a; padding: 20px; border-radius: 10px;">
                                                                    <h2 style="color: #3b2f2f;">Re: Contacto Pão Caseiro</h2>
                                                                    <p>Olá ${selectedMessage.name},</p>
                                                                    <p>${response}</p>
                                                                    <hr style="border-top: 1px solid #eee; margin: 20px 0;">
                                                                    <p style="font-style: italic; color: #666;">A sua mensagem original:</p>
                                                                    <blockquote style="border-left: 3px solid #d9a65a; padding-left: 10px; margin-left: 0; color: #555;">${selectedMessage.message}</blockquote>
                                                                    <p style="color: #999; font-size: 12px; margin-top: 30px;">
                                                                        Equipa Pão Caseiro, Lichinga - Moçambique.
                                                                    </p>
                                                                </div>
                                                            `;

                                                            const result = await sendEmail([selectedMessage.email], 'Resposta: Contacto Pão Caseiro', emailHtml, undefined, 'admin@paocaseiro.co.mz');

                                                            if (result.success) {
                                                                await supabase.from('contact_messages').update({ status: 'replied', reply_content: response }).eq('id', selectedMessage.id);
                                                                alert('Mensagem enviada com sucesso!');
                                                                (e.target as any).reset();
                                                                loadMessages();
                                                                setSelectedMessage(null);
                                                            } else {
                                                                alert('Erro ao enviar email: ' + result.error);
                                                            }
                                                        } catch (err: any) {
                                                            alert('Erro interno: ' + err.message);
                                                        } finally {
                                                            setIsSubmitting(false);
                                                        }
                                                    }}>
                                                        <div className="relative">
                                                            <textarea
                                                                name="response"
                                                                rows={8}
                                                                placeholder={`Prezado(a) ${selectedMessage.name}, ...`}
                                                                className="w-full p-8 bg-white border border-gray-100 rounded-[2rem] focus:border-[#d9a65a] focus:ring-8 focus:ring-[#d9a65a]/5 outline-none transition-all text-sm leading-relaxed shadow-sm resize-none"
                                                            ></textarea>
                                                            <div className="absolute bottom-6 right-6">
                                                                <button
                                                                    type="submit"
                                                                    disabled={isSubmitting}
                                                                    className="bg-[#3b2f2f] text-[#d9a65a] px-10 py-4 rounded-2xl font-black uppercase tracking-[0.2em] text-[10px] hover:bg-[#d9a65a] hover:text-[#3b2f2f] hover:translate-y-[-2px] active:translate-y-0 transition-all flex items-center gap-3 shadow-[0_10px_20px_rgba(59,47,47,0.2)] disabled:opacity-50 disabled:translate-y-0"
                                                                >
                                                                    {isSubmitting ? <span className="w-4 h-4 border-2 border-[#d9a65a] border-t-transparent rounded-full animate-spin"></span> : <><Send size={14} /> Enviar Resposta</>}
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </form>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex-1 flex flex-col items-center justify-center text-center p-12 bg-gray-50/40 relative overflow-hidden">
                                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-[0.02] scale-150 pointer-events-none">
                                            <ShoppingBag size={400} />
                                        </div>
                                        <div className="w-24 h-24 bg-white rounded-[2.5rem] flex items-center justify-center text-[#d9a65a] shadow-2xl mb-8 border border-[#d9a65a]/10 relative z-10">
                                            <Mail size={48} />
                                        </div>
                                        <h3 className="text-3xl font-serif font-black text-[#3b2f2f] mb-4 relative z-10">Correio Interno</h3>
                                        <p className="text-gray-400 max-w-sm mx-auto text-sm leading-relaxed font-medium relative z-10">Explore e gira as comunicações com os seus clientes num ambiente premium e organizado.</p>
                                        <div className="mt-10 flex gap-4 relative z-10">
                                            <div className="px-5 py-2 bg-white rounded-full border border-gray-100 shadow-sm flex items-center gap-2 text-[10px] font-bold text-gray-500 uppercase tracking-widest"><div className="w-2 h-2 bg-[#d9a65a] rounded-full"></div> {messages.filter(m => m.status === 'unread').length} Pendentes</div>
                                            <div className="px-5 py-2 bg-white rounded-full border border-gray-100 shadow-sm flex items-center gap-2 text-[10px] font-bold text-gray-500 uppercase tracking-widest"><Clock size={12} className="text-[#d9a65a]" /> {messages.length} Total</div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )
                }

                {/* Support & AI View */}
                {
                    activeView === 'support_ai' && (
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
                                    <a href="https://wa.me/258863242532" target="_blank" rel="noopener noreferrer" className="bg-white/10 hover:bg-white/20 p-4 rounded-xl flex items-center gap-4 transition-all group cursor-pointer border border-transparent hover:border-[#d9a65a]/50">
                                        <div className="bg-[#25D366] p-2 rounded-full text-white"><MessageSquare size={24} /></div>
                                        <div>
                                            <p className="font-bold text-sm text-gray-300 uppercase">WhatsApp Suporte</p>
                                            <p className="text-lg font-bold group-hover:text-[#d9a65a] transition-colors">+258 86 324 2532</p>
                                        </div>
                                    </a>
                                    <a href="https://wa.me/918725861829" target="_blank" rel="noopener noreferrer" className="bg-white/10 hover:bg-white/20 p-4 rounded-xl flex items-center gap-4 transition-all group cursor-pointer border border-transparent hover:border-[#d9a65a]/50">
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

                    )
                }

                {/* Kitchen View */}
                {
                    activeView === 'kitchen' && (
                        <div className="h-full">
                            <Kitchen user={{
                                id: userId || 'admin',
                                name: localStorage.getItem('admin_user') || 'Administrador',
                                role: 'admin'
                            }} />
                        </div>
                    )
                }


                {/* Logistics View */}





                {/* User Profile Modal */}
                {
                    showUserModal && (
                        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                            <div className="bg-white rounded-2xl w-full max-w-md p-6 animate-scale-in">
                                <div className="flex justify-between items-center mb-6">
                                    <h3 className="text-xl font-bold font-serif text-[#3b2f2f]">Editar Perfil</h3>
                                    <button onClick={() => setShowUserModal(false)} title="Fechar" className="text-gray-400 hover:text-red-500 transition-colors"><X size={24} /></button>
                                </div>
                                <form onSubmit={handleUpdateUser} className="space-y-4">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Nome</label>
                                        <input required type="text" title="Nome" value={userForm.name} onChange={e => setUserForm({ ...userForm, name: e.target.value })} className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:border-[#d9a65a] outline-none" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Foto de Perfil</label>
                                        <div className="flex items-center gap-3">
                                            {userForm.photo && <img src={userForm.photo} alt="Foto de Perfil" className="w-12 h-12 rounded-full object-cover border border-gray-200" />}
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
                    )
                }
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
                                                        {orders.filter(o => ['delivering', 'arrived'].includes(o.status)).length}
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

                                            const pendingList = orders.filter(o => o.customer.type === 'delivery' && (o.status === 'pending' || o.status === 'ready' && !o.driver_id));
                                            const activeDeliveries = visibleOrders.filter(o => o.status === 'delivering' || o.status === 'arrived');
                                            const completedList = visibleOrders.filter(o => o.customer.type === 'delivery' && o.status === 'completed');

                                            return (
                                                <>
                                                    {/* ACTIVE DELIVERIES (Highlighted) */}
                                                    <div className="space-y-4">
                                                        <h3 className="font-bold text-[#3b2f2f] text-lg flex items-center gap-2">
                                                            <span className="w-2 h-2 bg-orange-500 rounded-full animate-pulse"></span>
                                                            Em Rota / A Entregar
                                                            <span className="bg-orange-100 text-orange-600 text-xs px-2 py-1 rounded-full">{activeDeliveries.length}</span>
                                                        </h3>

                                                        {activeDeliveries.length === 0 ? (
                                                            <div className="bg-gray-50 border-2 border-dashed border-gray-200 rounded-xl p-8 text-center text-gray-400">
                                                                <Truck className="w-12 h-12 mx-auto mb-2 opacity-50" />
                                                                <p>Nenhuma entrega em curso no momento.</p>
                                                            </div>
                                                        ) : (
                                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                                {activeDeliveries.map(order => (
                                                                    <div key={order.orderId} className={`bg-white border rounded-xl p-4 shadow-lg ring-1 relative overflow-hidden group hover:-translate-y-1 transition-all ${order.status === 'arrived' ? 'border-green-200 ring-green-50' : 'border-blue-200 ring-blue-50'}`}>
                                                                        <div className={`absolute top-0 right-0 p-2 text-white text-[10px] font-bold rounded-bl-xl uppercase ${order.status === 'arrived' ? 'bg-green-500' : 'bg-blue-500'}`}>
                                                                            {order.status === 'arrived' ? 'CHEGOU' : 'EM ROTA'}
                                                                        </div>
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
                                                                <p className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full inline-block mt-1">{driver.vehicle_type || 'Veículo N/A'}</p>
                                                            </div>
                                                        </div>
                                                        <div className="relative">
                                                            <select
                                                                value={driver.status}
                                                                title="Status do Motorista"
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
                                                        <button onClick={() => { setSelectedDriver(driver); setDriverForm({ name: driver.name, phone: driver.phone, vehicle: driver.vehicle || '', base_location: driver.base_location || '', email: driver.email || '', alternative_phone: driver.alternative_phone || '' }); setIsAddingDriver(true); }} title="Editar Motorista" className="p-1 hover:bg-gray-100 rounded text-blue-500"><User size={14} /></button>
                                                        <button onClick={() => handleDeleteDriver(driver.id)} title="Remover Motorista" className="p-1 hover:bg-gray-100 rounded text-red-500"><Trash2 size={14} /></button>
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
                {/* POS / Ponto de Venda View */}
                {
                    activeView === 'pos' && (
                        <div className="flex flex-col lg:flex-row gap-6 h-[calc(100vh-140px)] animate-fade-in overflow-hidden">
                            {/* Product Selection Side */}
                            <div className="flex-1 flex flex-col gap-6 overflow-hidden">
                                {/* POS Header & Search */}
                                <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col md:flex-row gap-4 items-center shrink-0">
                                    <div className="flex-1 relative w-full lg:max-w-2xl">
                                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                        <input
                                            type="text"
                                            placeholder="Pesquisar produto ou código..."
                                            value={posSearchTerm}
                                            onChange={(e) => setPosSearchTerm(e.target.value)}
                                            className="w-full pl-12 pr-4 py-3.5 bg-gray-50 border border-gray-100 rounded-2xl focus:border-[#d9a65a] outline-none transition-all text-sm font-bold text-[#3b2f2f]"
                                        />
                                    </div>
                                    <div className="flex gap-2 overflow-x-auto w-full md:w-auto pb-1 md:pb-0 scrollbar-thin scrollbar-thumb-[#d9a65a]/30 scrollbar-track-transparent">
                                        <button onClick={() => setPosCategory('all')} className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${posCategory === 'all' ? 'bg-[#3b2f2f] text-[#d9a65a]' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>Todos</button>
                                        {[...new Set(products.map(p => p.category))].map(cat => (
                                            <button key={cat} onClick={() => setPosCategory(cat)} className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${posCategory === cat ? 'bg-[#3b2f2f] text-[#d9a65a]' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>{cat}</button>
                                        ))}
                                    </div>
                                </div>

                                {/* Product Grid */}
                                <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 pb-4">
                                    {products.filter(p => p.inStock && (posCategory === 'all' || p.category === posCategory) && p.name.toLowerCase().includes(posSearchTerm.toLowerCase())).map(product => (
                                        <div
                                            key={product.id}
                                            onClick={() => {
                                                const existing = posCart.find(item => item.id === product.id);
                                                if (existing) {
                                                    setPosCart(posCart.map(item => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item));
                                                } else {
                                                    setPosCart([...posCart, { ...product, quantity: 1 }]);
                                                }
                                            }}
                                            className="bg-white p-3 rounded-2xl border border-gray-100 hover:border-[#d9a65a] transition-all group cursor-pointer hover:shadow-xl hover:-translate-y-1 flex flex-col items-center text-center"
                                        >
                                            <div className="w-full h-24 mb-3 rounded-xl overflow-hidden bg-gray-50">
                                                <img src={product.image || 'https://via.placeholder.com/150'} alt={product.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                                            </div>
                                            <h4 className="font-bold text-[#3b2f2f] text-sm line-clamp-2 h-10 mb-1">{product.name.charAt(0).toUpperCase() + product.name.slice(1).toLowerCase()}</h4>
                                            <p className="text-[#d9a65a] font-bold">{product.price.toLocaleString()} MT</p>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Cart / Checkout Side */}
                            <div className="w-full lg:w-96 flex flex-col gap-6 shrink-0 h-full">
                                <div className="bg-[#3b2f2f] rounded-3xl shadow-2xl flex-1 flex flex-col overflow-hidden text-white border border-white/5">
                                    <div className="p-6 border-b border-white/5 flex justify-between items-center">
                                        <h3 className="text-xl font-serif font-bold text-[#d9a65a] flex items-center gap-2"><ShoppingCart size={24} /> Carrinho POS</h3>
                                        <button onClick={() => setPosCart([])} title="Limpar Carrinho" className="text-white/40 hover:text-red-400 transition-colors"><Trash2 size={20} /></button>
                                    </div>

                                    {/* Cart Items */}
                                    <div className="flex-1 overflow-y-auto p-6 scrollbar-hide">
                                        {posCart.length === 0 ? (
                                            <div className="h-full flex flex-col items-center justify-center text-white/30 text-center gap-4">
                                                <div className="bg-white/5 p-6 rounded-full"><Package size={48} className="opacity-20" /></div>
                                                <p className="text-sm font-bold uppercase tracking-widest">Carrinho Vazio</p>
                                            </div>
                                        ) : (
                                            <div className="space-y-4">
                                                {posCart.map(item => (
                                                    <div key={item.id} className="flex justify-between items-center bg-white/5 p-3 rounded-xl animate-fade-in group">
                                                        <div className="flex-1 min-w-0 pr-2">
                                                            <p className="font-bold text-sm truncate">{item.name.charAt(0).toUpperCase() + item.name.slice(1).toLowerCase()}</p>
                                                            <p className="text-[#d9a65a] text-xs font-bold">{item.price.toLocaleString()} MT</p>
                                                        </div>
                                                        <div className="flex items-center gap-3">
                                                            <button onClick={() => {
                                                                if (item.quantity > 1) {
                                                                    setPosCart(posCart.map(i => i.id === item.id ? { ...i, quantity: i.quantity - 1 } : i));
                                                                } else {
                                                                    setPosCart(posCart.filter(i => i.id !== item.id));
                                                                }
                                                            }} title="Remover um" className="p-1 hover:bg-white/10 rounded-lg text-white/60 hover:text-white">-</button>
                                                            <span className="font-bold text-sm w-4 text-center">{item.quantity}</span>
                                                            <button onClick={() => setPosCart(posCart.map(i => i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i))} title="Adicionar mais um" className="p-1 hover:bg-white/10 rounded-lg text-white/60 hover:text-white">+</button>
                                                            <button onClick={() => setPosCart(posCart.filter(i => i.id !== item.id))} title="Remover item" className="ml-2 text-white/20 hover:text-red-400 transition-opacity"><X size={14} /></button>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    {/* Order Details & Summary */}
                                    <div className="p-6 bg-white/5 border-t border-white/10 space-y-4">
                                        {/* Order Type */}
                                        <div className="grid grid-cols-3 gap-2">
                                            <button onClick={() => setPosOrderType('local')} className={`py-2 rounded-xl text-[10px] font-bold uppercase border transition-all ${posOrderType === 'local' ? 'bg-[#d9a65a] border-[#d9a65a] text-[#3b2f2f]' : 'border-white/10 text-white/60 hover:bg-white/5'}`}>Local</button>
                                            <button onClick={() => setPosOrderType('takeaway')} className={`py-2 rounded-xl text-[10px] font-bold uppercase border transition-all ${posOrderType === 'takeaway' ? 'bg-[#d9a65a] border-[#d9a65a] text-[#3b2f2f]' : 'border-white/10 text-white/60 hover:bg-white/5'}`}>Takeaway</button>
                                            <button onClick={() => setPosOrderType('dine-in')} className={`py-2 rounded-xl text-[10px] font-bold uppercase border transition-all ${posOrderType === 'dine-in' ? 'bg-[#d9a65a] border-[#d9a65a] text-[#3b2f2f]' : 'border-white/10 text-white/60 hover:bg-white/5'}`}>Dine-in</button>
                                        </div>

                                        {/* Customer Selector & Quick Add */}
                                        <div className="space-y-2">
                                            <div className="flex gap-2">
                                                <div className="relative flex-1">
                                                    <select
                                                        value={posCustomer?.id || ''}
                                                        onChange={(e) => {
                                                            const cust = customers.find(c => c.id === e.target.value);
                                                            setPosCustomer(cust || null);
                                                        }}
                                                        title="Selecionar Cliente"
                                                        className="w-full p-3 bg-white/5 border border-white/10 rounded-xl outline-none text-sm appearance-none pr-10"
                                                    >
                                                        <option value="" className="bg-[#3b2f2f]">Cliente Ocasional (Balcão)</option>
                                                        {customers.map(c => (
                                                            <option key={c.id} value={c.id} className="bg-[#3b2f2f]">{c.name} ({c.contact_no})</option>
                                                        ))}
                                                    </select>
                                                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-white/40"><Users size={16} /></div>
                                                </div>
                                                <button
                                                    onClick={() => setIsAddingQuickCustomer(!isAddingQuickCustomer)}
                                                    className={`p-3 rounded-xl border transition-all ${isAddingQuickCustomer ? 'bg-[#d9a65a] border-[#d9a65a] text-[#3b2f2f]' : 'border-white/10 text-white/40 hover:bg-white/5'}`}
                                                    title="Adicionar Novo Cliente"
                                                >
                                                    <Plus size={20} />
                                                </button>
                                            </div>

                                            <AnimatePresence>
                                                {isAddingQuickCustomer && (
                                                    <motion.div
                                                        initial={{ height: 0, opacity: 0 }}
                                                        animate={{ height: 'auto', opacity: 1 }}
                                                        exit={{ height: 0, opacity: 0 }}
                                                        className="overflow-hidden bg-white/5 rounded-xl border border-white/10"
                                                    >
                                                        <div className="p-4 space-y-3">
                                                            <input
                                                                type="text"
                                                                placeholder="Nome do Cliente"
                                                                value={quickCustomerForm.name}
                                                                onChange={e => setQuickCustomerForm({ ...quickCustomerForm, name: e.target.value })}
                                                                className="w-full p-2.5 bg-white/5 border border-white/10 rounded-lg outline-none text-sm"
                                                            />
                                                            <input
                                                                type="tel"
                                                                placeholder="Telemóvel"
                                                                value={quickCustomerForm.phone}
                                                                onChange={e => setQuickCustomerForm({ ...quickCustomerForm, phone: e.target.value })}
                                                                className="w-full p-2.5 bg-white/5 border border-white/10 rounded-lg outline-none text-sm"
                                                            />
                                                            <div className="grid grid-cols-2 gap-2">
                                                                <input
                                                                    type="email"
                                                                    placeholder="Email"
                                                                    value={quickCustomerForm.email}
                                                                    onChange={e => setQuickCustomerForm({ ...quickCustomerForm, email: e.target.value })}
                                                                    className="w-full p-2.5 bg-white/5 border border-white/10 rounded-lg outline-none text-sm"
                                                                />
                                                                <input
                                                                    type="text"
                                                                    placeholder="NUIT"
                                                                    value={quickCustomerForm.nuit}
                                                                    onChange={e => setQuickCustomerForm({ ...quickCustomerForm, nuit: e.target.value })}
                                                                    className="w-full p-2.5 bg-white/5 border border-white/10 rounded-lg outline-none text-sm"
                                                                />
                                                            </div>
                                                            <button
                                                                onClick={async () => {
                                                                    if (!quickCustomerForm.name || !quickCustomerForm.phone) return alert('Preencha nome e telefone!');
                                                                    const { data, error } = await supabase.from('customers').insert([{
                                                                        name: quickCustomerForm.name,
                                                                        contact_no: quickCustomerForm.phone,
                                                                        email: quickCustomerForm.email,
                                                                        nuit: quickCustomerForm.nuit
                                                                    }]).select().single();
                                                                    if (error) return alert('Erro ao criar cliente: ' + error.message);
                                                                    setCustomers([...customers, data]);
                                                                    setPosCustomer(data);
                                                                    setQuickCustomerForm({ name: '', phone: '', email: '', nuit: '' });
                                                                    setIsAddingQuickCustomer(false);
                                                                }}
                                                                className="w-full py-2 bg-[#d9a65a] text-[#3b2f2f] font-bold rounded-lg text-xs uppercase"
                                                            >
                                                                Confirmar Cliente
                                                            </button>
                                                        </div>
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>
                                        </div>

                                        <div className="flex justify-between items-center pt-2">
                                            <span className="text-white/60 font-bold uppercase text-xs tracking-widest">Total</span>
                                            <span className="text-2xl font-bold text-[#d9a65a]">{posCart.reduce((acc, curr) => acc + (curr.price * curr.quantity), 0).toLocaleString()} MT</span>
                                        </div>

                                        <button
                                            disabled={posCart.length === 0}
                                            onClick={async () => {
                                                const total = posCart.reduce((acc, curr) => acc + (curr.price * curr.quantity), 0);
                                                const shortId = Math.random().toString(36).substring(7).toUpperCase();
                                                const orderData = {
                                                    short_id: shortId,
                                                    customer_name: posCustomer?.name || 'Venda Local (Balcão)',
                                                    customer_phone: posCustomer?.contact_no || 'N/A',
                                                    customer_id: posCustomer?.id || null,
                                                    total_amount: total,
                                                    status: 'completed',
                                                    payment_status: 'paid',
                                                    payment_method: 'cash',
                                                    delivery_address: posOrderType.toUpperCase(),
                                                    delivery_type: posOrderType === 'takeaway' ? 'takeaway' : 'dine_in',
                                                    amount_paid: total,
                                                    balance: 0
                                                };

                                                const { data: orderResult, error: orderError } = await supabase.from('orders').insert([orderData]).select().single();
                                                if (orderError) {
                                                    alert('Erro ao processar venda: ' + orderError.message);
                                                } else {
                                                    // Insert items into order_items
                                                    const itemsToInsert = posCart.map(i => ({
                                                        order_id: orderResult.id,
                                                        product_id: i.id,
                                                        product_name: i.name,
                                                        price: i.price,
                                                        quantity: i.quantity
                                                    }));

                                                    const { error: itemsError } = await supabase.from('order_items').insert(itemsToInsert);

                                                    if (itemsError) {
                                                        console.error("Failed to insert items", itemsError);
                                                        alert('Erro ao salvar itens do pedido: ' + itemsError.message);
                                                    } else {
                                                        alert(`VENDA REALIZADA COM SUCESSO! #${shortId}`);

                                                        if (posCustomer?.contact_no && posCustomer.contact_no !== 'N/A') {
                                                            const { notifyPaymentConfirmed } = await import('../services/sms');
                                                            await notifyPaymentConfirmed(orderResult.id, posCustomer.contact_no, shortId);
                                                        }

                                                        setPosCart([]);
                                                        setPosCustomer(null);
                                                        loadOrders();
                                                    }
                                                }
                                            }}
                                            className="w-full py-4 bg-[#d9a65a] text-[#3b2f2f] font-bold rounded-2xl shadow-xl hover:brightness-110 active:scale-95 transition-all text-lg flex items-center justify-center gap-3 disabled:opacity-50 disabled:grayscale"
                                        >
                                            <CheckCircle size={24} /> Processar Venda
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )
                }

                {/* Secure Password Update Modal */}
                {/* Email / Messaging Settings View */}
                {
                    activeView === 'settings' && (
                        <div className="h-[calc(100vh-140px)] animate-fade-in flex flex-col gap-6">
                            <div className="bg-white rounded-3xl p-8 shadow-xl border border-gray-100 max-w-2xl mx-auto w-full overflow-y-auto custom-scrollbar">
                                <div className="flex items-center gap-4 mb-8">
                                    <div className="bg-[#d9a65a]/10 p-3 rounded-2xl text-[#d9a65a]"><Sparkles size={32} /></div>
                                    <div>
                                        <h2 className="text-2xl font-serif font-bold text-[#3b2f2f]">Definições de Mensagens</h2>
                                        <p className="text-gray-500 text-sm">Configure a identidade e parâmetros de envio de notificações.</p>
                                    </div>
                                </div>

                                <div className="space-y-6">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div>
                                            <label className="block text-xs font-bold text-gray-400 uppercase mb-2 tracking-widest">Sender ID (Branding)</label>
                                            <input
                                                type="text"
                                                title="Sender ID"
                                                value={emailSettings.senderId}
                                                onChange={e => setEmailSettings({ ...emailSettings, senderId: e.target.value })}
                                                className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl focus:border-[#d9a65a] outline-none font-bold"
                                                placeholder="Ex: PaoCaseiro"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-gray-400 uppercase mb-2 tracking-widest">Utilizador de Envio</label>
                                            <input
                                                type="text"
                                                title="Utilizador de Envio"
                                                value={emailSettings.user}
                                                onChange={e => setEmailSettings({ ...emailSettings, user: e.target.value })}
                                                className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl focus:border-[#d9a65a] outline-none font-bold"
                                                placeholder="Ex: admin"
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold text-gray-400 uppercase mb-2 tracking-widest">Logótipo / Ícone das Mensagens</label>
                                        <div className="flex gap-4 items-center">
                                            <div className="flex-1 relative">
                                                <input
                                                    type="text"
                                                    title="Logótipo das Mensagens URL"
                                                    value={emailSettings.icon}
                                                    onChange={e => setEmailSettings({ ...emailSettings, icon: e.target.value })}
                                                    className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl focus:border-[#d9a65a] outline-none font-bold pr-12"
                                                    placeholder="URL da imagem..."
                                                />
                                                <label className="absolute right-2 top-1/2 -translate-y-1/2 p-2 hover:bg-gray-100 rounded-lg cursor-pointer transition-all text-[#d9a65a]">
                                                    <Upload size={18} />
                                                    <input
                                                        type="file"
                                                        className="hidden"
                                                        accept="image/*"
                                                        onChange={async (e) => {
                                                            const file = e.target.files?.[0];
                                                            if (!file) return;
                                                            const fileName = `branding/${Date.now()}_${file.name}`;
                                                            const { error } = await supabase.storage.from('products').upload(fileName, file);
                                                            if (error) return alert('Erro no upload: ' + error.message);
                                                            const { data } = supabase.storage.from('products').getPublicUrl(fileName);
                                                            setEmailSettings({ ...emailSettings, icon: data.publicUrl });
                                                        }}
                                                    />
                                                </label>
                                            </div>
                                            {emailSettings.icon && (
                                                <div className="relative group">
                                                    <img src={emailSettings.icon} alt="Preview" className="w-12 h-12 rounded-xl object-contain bg-gray-50 border border-[#d9a65a]/20 p-1 shadow-sm" />
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="pt-6 flex justify-end">
                                        <button
                                            onClick={() => {
                                                localStorage.setItem('message_settings', JSON.stringify(emailSettings));
                                                alert('Definições guardadas com sucesso!');
                                                setActiveView('messages');
                                            }}
                                            className="px-8 py-3 bg-[#3b2f2f] text-[#d9a65a] font-bold rounded-xl shadow-lg hover:brightness-110 active:scale-95 transition-all"
                                        >
                                            Guardar Definições
                                        </button>
                                    </div>
                                </div>
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
                                    <button onClick={() => setSelectedOrder(null)} title="Fechar" className="bg-gray-200 p-2 rounded-full hover:bg-gray-300 transition-colors"><X size={20} /></button>
                                </div>

                                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 mb-6">
                                    <h3 className="font-bold text-gray-400 text-xs uppercase mb-4">Cliente</h3>
                                    <p className="font-bold text-lg text-[#3b2f2f]">{selectedOrder.customer.name}</p>
                                    <p className="text-sm text-gray-600 mb-1">{selectedOrder.customer.phone}</p>
                                    {selectedOrder.customer.internal_id && (
                                        <p className="text-sm font-bold text-[#d9a65a] mb-2 uppercase tracking-wide">ID: {selectedOrder.customer.internal_id}</p>
                                    )}
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
                                    <h3 className="font-bold text-gray-400 text-xs uppercase mb-3">Finanças & Financeiro</h3>
                                    <button onClick={async () => {
                                        if (!selectedOrder.id) {
                                            alert("Erro: ID do pedido ausente. Recarregue a página.");
                                            return;
                                        }
                                        const { generateReceipt } = await import('../services/supabase');
                                        const { notifyPaymentConfirmed } = await import('../services/sms');

                                        const receiptRes = await generateReceipt(
                                            selectedOrder.id,
                                            selectedOrder.orderId,
                                            selectedOrder.customer_id,
                                            selectedOrder.customer.name,
                                            selectedOrder.items,
                                            selectedOrder.total
                                        );

                                        if (receiptRes.success && receiptRes.data) {
                                            await notifyPaymentConfirmed(selectedOrder.orderId, selectedOrder.customer.phone);
                                            alert('Pagamento confirmado e recibo gerado com sucesso!');
                                        } else {
                                            alert('Erro ao gerar recibo.');
                                        }
                                    }} className="w-full p-3 mb-4 rounded-xl text-sm font-bold bg-[#d9a65a] text-[#3b2f2f] hover:brightness-110 shadow-lg">
                                        Confirmar Pagamento (Gerar Recibo)
                                    </button>

                                    <h3 className="font-bold text-gray-400 text-xs uppercase mb-3">Fluxo de Trabalho</h3>
                                    <div className="grid grid-cols-2 gap-2 mb-2">
                                        <button onClick={async () => {
                                            const { supabase } = await import('../services/supabase');
                                            await supabase.from('orders').update({ status: 'kitchen' }).eq('short_id', selectedOrder.orderId);
                                            loadOrders();
                                            setSelectedOrder({ ...selectedOrder, status: 'kitchen' });
                                        }} className={`p-3 rounded-xl text-sm font-bold border transition-all ${selectedOrder.status === 'kitchen' ? 'bg-purple-100 border-purple-300 text-purple-800' : 'bg-white hover:bg-purple-50'}`}>
                                            Enviar p/ Cozinha
                                        </button>
                                        <button onClick={async () => {
                                            const { supabase } = await import('../services/supabase');
                                            await supabase.from('orders').update({ status: 'ready' }).eq('short_id', selectedOrder.orderId);
                                            loadOrders();
                                            setSelectedOrder({ ...selectedOrder, status: 'ready' });
                                        }} className={`p-3 rounded-xl text-sm font-bold border transition-all ${selectedOrder.status === 'ready' ? 'bg-blue-100 border-blue-300 text-blue-800' : 'bg-white hover:bg-blue-50'}`}>
                                            Pronto (P/ Levantar)
                                        </button>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2">
                                        {selectedOrder.customer.type === 'delivery' && (
                                            <button onClick={() => {
                                                setOrderToAssign(selectedOrder);
                                                // Assuming setActiveView and setSelectedOrder are available in the parent scope
                                                // and that 'logistics' is a valid tab/view to switch to.
                                                setActiveView('logistics'); // Switch to logistics to assign
                                                setSelectedOrder(null); // Close the order modal
                                            }} className="p-3 rounded-xl text-sm font-bold bg-[#3b2f2f] text-[#d9a65a] hover:brightness-110">
                                                Enviar p/ Entrega
                                            </button>
                                        )}
                                        <button onClick={async () => {
                                            const { supabase } = await import('../services/supabase');
                                            await supabase.from('orders').update({ status: 'completed' }).eq('short_id', selectedOrder.orderId);
                                            loadOrders();
                                            setSelectedOrder({ ...selectedOrder, status: 'completed' });
                                            notifyCustomer({ ...selectedOrder, status: 'completed' }, 'status_update').catch(e => { });
                                        }} className="p-3 rounded-xl text-sm font-bold bg-green-600 text-white hover:bg-green-700">
                                            Concluir Pedido
                                        </button>
                                    </div>
                                    <div className="mt-3">
                                        <button onClick={async () => {
                                            const { supabase } = await import('../services/supabase');
                                            await supabase.from('orders').update({ status: 'cancelled' }).eq('short_id', selectedOrder.orderId);
                                            loadOrders();
                                            setSelectedOrder({ ...selectedOrder, status: 'cancelled' });
                                        }} className="w-full p-2 text-xs font-bold text-red-500 hover:bg-red-50 rounded-lg"> Cancelar Pedido </button>
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
                                        <input type="file" title="Upload de Imagem" accept="image/*" onChange={handleImageUpload} className="w-full p-2 border rounded-lg focus:border-[#d9a65a] outline-none text-sm file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-[#d9a65a]/10 file:text-[#d9a65a] hover:file:bg-[#d9a65a]/20" />
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
                                            <button type="button" onClick={() => setProductVariations([...productVariations, { name: '', price: 0 }])} title="Adicionar Variedade" className="text-[#d9a65a] hover:bg-[#d9a65a]/10 p-1 rounded transition-colors"><Plus size={16} /></button>
                                        </div>
                                        <div className="space-y-2 max-h-32 overflow-y-auto pr-1">
                                            {productVariations.map((v, idx) => (
                                                <div key={idx} className="flex gap-2 items-center">
                                                    <input value={v.name} title="Nome da Variedade" onChange={e => { const n = [...productVariations]; n[idx].name = e.target.value; setProductVariations(n); }} placeholder="Nome (ex: Grande)" className="flex-1 p-2 border rounded-lg text-sm" />
                                                    <input type="number" title="Pre\u00e7o da Variedade" value={v.price} onChange={e => { const n = [...productVariations]; n[idx].price = e.target.value; setProductVariations(n); }} placeholder="MT" className="w-20 p-2 border rounded-lg text-sm" />
                                                    <button type="button" onClick={() => setProductVariations(productVariations.filter((_, i) => i !== idx))} title="Remover Variedade" className="text-red-400 hover:text-red-600"><Trash2 size={16} /></button>
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
                                    <input name="memberPassword" defaultValue={currentMember?.password} title="Senha" placeholder="Senha" className="w-full p-2 border rounded-lg" required />
                                    <select name="memberRole" title="Papel do Membro" defaultValue={currentMember?.role || 'staff'} className="w-full p-2 border rounded-lg bg-white">
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

                {/* Secure Auth Gate Modal */}
                {
                    isAdminPasswordPromptOpen && (
                        <div className="fixed inset-0 z-[70] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4">
                            <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-2xl animate-scale-in text-center">
                                <h3 className="text-xl font-bold font-serif text-[#3b2f2f] mb-2 flex justify-center items-center gap-2">Ação Protegida</h3>
                                <p className="text-xs text-gray-500 mb-6 px-4">Por favor digite a sua palavra-passe de acesso, Administrador {username}.</p>
                                <form onSubmit={handleVerifyAdmin} className="space-y-4">
                                    <input
                                        type="password"
                                        required
                                        autoFocus
                                        placeholder="Sua password de admin..."
                                        value={adminPasswordInput}
                                        onChange={e => setAdminPasswordInput(e.target.value)}
                                        className="w-full p-3 border rounded-xl text-center focus:border-[#d9a65a] outline-none"
                                    />
                                    <div className="flex gap-2">
                                        <button type="button" onClick={() => { setIsAdminPasswordPromptOpen(false); setPendingAdminAction(null); }} className="flex-1 text-gray-500 bg-gray-100 py-3 rounded-xl font-bold hover:bg-gray-200 transition-colors">Cancelar</button>
                                        <button type="submit" className="flex-1 bg-red-600 text-white py-3 rounded-xl font-bold shadow-lg hover:bg-red-700 transition-colors">Confirmar</button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    )
                }
            </div >
        </div >
    );
};

