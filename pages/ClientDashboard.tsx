import React, { useEffect, useState } from 'react';
import { supabase } from '../services/supabase';
import { Language, translations } from '../translations';
import { useNavigate } from 'react-router-dom';
import { ShoppingBag, LogOut, Clock, CheckCircle, XCircle, ChevronRight, MessageSquare, Loader, PenBox, User, RotateCcw, HelpCircle, Ticket, Smartphone, UserCheck } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { motion, AnimatePresence } from 'framer-motion';
import { sendEmail } from '../services/email';
import { sendSMS } from '../services/sms';
import { logAudit } from '../services/audit';
import { getEnglishProductName } from '../services/stringUtils';
import { notifyAdminSystemsAlert } from '../services/whatsapp';
import { NotificationService } from '../services/NotificationService';
export const ClientDashboard: React.FC<{ language: Language }> = ({ language }) => {
    const t = translations[language].clientDashboard;
    const [user, setUser] = useState<any>(null);
    const [orders, setOrders] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [needsPhonePrompt, setNeedsPhonePrompt] = useState(false);
    const [googlePhone, setGooglePhone] = useState('');
    const [isSubmittingPhone, setIsSubmittingPhone] = useState(false);
    const [supportMsg, setSupportMsg] = useState('');
    const [isSubmittingSupport, setIsSubmittingSupport] = useState(false);
    const [supportStatus, setSupportStatus] = useState<'idle' | 'success' | 'error'>('idle');
    const { addToCart } = useCart();
    const navigate = useNavigate();
    const [activeTicket, setActiveTicket] = useState<any>(null);
    const [ticketLoading, setTicketLoading] = useState(false);
    const [peopleAhead, setPeopleAhead] = useState(0);
    const [searchOrderCode, setSearchOrderCode] = useState('');
    const [searchedOrders, setSearchedOrders] = useState<any[]>([]);
    const [isSearchingOrder, setIsSearchingOrder] = useState(false);
    const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);

    useEffect(() => {
        window.scrollTo(0, 0);
        const checkUser = async () => {
            const { data: { session } } = await supabase.auth.getSession();

            if (session) {
                const su = session.user;
                const email = su.email;
                const authIdentifier = su.phone || email || su.id;

                let customerRecord = null;

                // 1. Try to find the user in customers table
                let query = supabase.from('customers').select('*');
                if (authIdentifier && email) {
                    query = query.or(`contact_no.eq."${authIdentifier}",email.eq."${email}"`);
                } else {
                    query = query.eq('contact_no', authIdentifier);
                }
                const { data: existing } = await query.limit(1);
                customerRecord = existing?.[0];

                // 2. Auto-register if not found (Likely a new Google Sign-In)
                if (!customerRecord && email) {
                    const newCustomer = {
                        contact_no: email, // Use email as contact_no for Google users without phone
                        name: su.user_metadata?.full_name || email.split('@')[0],
                        email: email,
                        avatar_url: su.user_metadata?.avatar_url,
                        updated_at: new Date().toISOString()
                    };

                    const { data: inserted, error } = await supabase
                        .from('customers')
                        .insert([newCustomer])
                        .select()
                        .single();

                    if (!error && inserted) {
                        customerRecord = inserted;
                    }
                } else if (customerRecord && su.user_metadata?.avatar_url && !customerRecord.avatar_url) {
                    // Auto-update avatar if missing
                    await supabase.from('customers').update({ avatar_url: su.user_metadata.avatar_url }).eq('id', customerRecord.id);
                    customerRecord.avatar_url = su.user_metadata.avatar_url;
                }

                const finalIdentifier = customerRecord?.contact_no || authIdentifier;

                const isGoogle = su.app_metadata?.provider === 'google';
                if (isGoogle && (!customerRecord?.contact_no || customerRecord.contact_no.includes('@'))) {
                    setNeedsPhonePrompt(true);
                }

                setUser({ ...su, phone: finalIdentifier, isGoogle });
                fetchOrders(finalIdentifier);

                if (customerRecord) {
                    setCustomerData(customerRecord);
                    setEditData({
                        name: customerRecord.name || '',
                        email: customerRecord.email || '',
                        date_of_birth: customerRecord.date_of_birth || '',
                        address: customerRecord.address || '',
                        street: customerRecord.street || '',
                        reference_point: customerRecord.reference_point || '',
                        nuit: customerRecord.nuit || '',
                        whatsapp: customerRecord.whatsapp || ''
                    });
                    localStorage.setItem('pc_auth_phone', finalIdentifier);
                    localStorage.setItem('pc_user_data', JSON.stringify(customerRecord));
                    window.dispatchEvent(new Event('pc_user_update'));
                }
            } else {
                // Check for manual login
                const manualPhone = localStorage.getItem('pc_auth_phone');
                if (manualPhone) {
                    setUser({ phone: manualPhone, isManual: true });
                    fetchOrders(manualPhone);
                    fetchCustomerData(manualPhone);
                } else {
                    navigate('/');
                }
            }
        };
        checkUser();
    }, [navigate]);

    useEffect(() => {
        if (!user?.phone && !user?.id) return;

        fetchActiveTicket();

        const channel = supabase
            .channel('customer-ticket')
            .on(
                'postgres_changes',
                { 
                    event: '*', 
                    schema: 'public', 
                    table: 'queue_tickets',
                    filter: user.id ? `user_id=eq.${user.id}` : `phone_number=eq.${user.phone}`
                },
                (payload) => {
                    if (payload.eventType === 'DELETE') {
                        setActiveTicket(null);
                    } else {
                        const ticket = payload.new as any;
                        if (ticket.status === 'completed' || ticket.status === 'skipped') {
                            setActiveTicket(ticket);
                        } else {
                            setActiveTicket(ticket);
                        }
                    }
                }
            )
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [user?.phone, user?.id]);

    useEffect(() => {
        if (!user?.phone) return;

        const localNumber = user.phone.replace(/\D/g, '').slice(-9);

        const channel = supabase
            .channel('customer-orders')
            .on(
                'postgres_changes',
                { 
                    event: 'UPDATE', 
                    schema: 'public', 
                    table: 'orders',
                    filter: `customer_phone=ilike.%${localNumber}%`
                },
                (payload) => {
                    const updatedOrder = payload.new as any;
                    setOrders(prev => prev.map(o => o.id === updatedOrder.id ? { ...o, ...updatedOrder } : o));
                }
            )
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [user?.phone]);

    useEffect(() => {
        if (activeTicket?.status !== 'waiting') return;

        const checkAhead = async () => {
            const { count } = await supabase
                .from('queue_tickets')
                .select('*', { count: 'exact', head: true })
                .eq('status', 'waiting')
                .lt('created_at', activeTicket.created_at);
            if (count !== null) setPeopleAhead(count);
        };

        checkAhead();
        const interval = setInterval(checkAhead, 10000);
        return () => clearInterval(interval);
    }, [activeTicket]);

    const fetchActiveTicket = async () => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        let query = supabase
            .from('queue_tickets')
            .select('*')
            .gte('created_at', today.toISOString())
            .in('status', ['waiting', 'calling'])
            .order('created_at', { ascending: false })
            .limit(1);
        
        if (user?.id) {
            query = query.eq('user_id', user.id);
        } else {
            query = query.eq('phone_number', user?.phone);
        }

        const { data } = await query;
        if (data && data.length > 0) {
            setActiveTicket(data[0]);
        }
    };

    const handleRequestTicket = async (priority: boolean = false) => {
        setTicketLoading(true);
        try {
            const { data, error } = await supabase.rpc('generate_queue_ticket', {
                p_phone: user?.phone || null,
                p_user_id: user?.id || null,
                p_priority: priority
            });

            if (error) throw error;
            if (data && data.length > 0) {
                const newTicket = data[0];
                setActiveTicket(newTicket);

                // NEW: Log System Event for Admin Center
                try {
                    await NotificationService.logSystemEvent(
                        'Nova Senha Digital',
                        `Senha #${newTicket.ticket_number} (${priority ? 'Prioritária' : 'Normal'}) gerada via App para ${user?.phone || 'Cliente'}.`,
                        'TICKET',
                        'info',
                        user?.id
                    );
                } catch (logErr) {
                    console.error("Digital ticket system logging failed:", logErr);
                }
            }
        } catch (error: any) {
            alert(language === 'en' ? 'Error requesting ticket: ' + error.message : 'Erro ao solicitar senha: ' + error.message);
        } finally {
            setTicketLoading(false);
        }
    };

    const [customerData, setCustomerData] = useState<any>(null);
    const [isAvatarModalOpen, setIsAvatarModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editData, setEditData] = useState({
        name: '',
        email: '',
        date_of_birth: '',
        address: '',
        street: '',
        reference_point: '',
        nuit: '',
        whatsapp: ''
    });

    const fetchCustomerData = async (phone: string) => {
        const { data } = await supabase
            .from('customers')
            .select('*')
            .eq('contact_no', phone)
            .maybeSingle();
        if (data) {
            setCustomerData(data);
            setEditData({
                name: data.name || '',
                email: data.email || '',
                date_of_birth: data.date_of_birth || '',
                address: data.address || '',
                street: data.street || '',
                reference_point: data.reference_point || '',
                nuit: data.nuit || '',
                whatsapp: data.whatsapp || ''
            });
        }
    };

    const fetchOrders = async (phone: string | undefined) => {
        if (!phone) { setLoading(false); return; }

        try {
            // Standardize phone for searching
            let searchPhone = phone.replace(/\D/g, ''); // Digits only

            // If starts with 258, get the 9 digit local number
            const localNumber = searchPhone.startsWith('258') ? searchPhone.substring(3) : searchPhone;
            const suffix9 = localNumber.slice(-9);

            const { data, error } = await supabase
                .from('orders')
                .select('*, order_items(*)')
                .or(`customer_phone.ilike.%${suffix9}%,customer_phone_snapshot.ilike.%${suffix9}%`)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setOrders(data || []);
        } catch (error) {
            console.error('Error fetching past orders:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleGooglePhoneSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmittingPhone(true);
        try {
            let formattedPhone = googlePhone.replace(/\D/g, '');
            if (formattedPhone.length >= 9) {
                if (!formattedPhone.startsWith('258')) {
                    formattedPhone = '258' + formattedPhone;
                }
            } else {
                throw new Error(language === 'en' ? 'Invalid phone number.' : 'Número de telemóvel inválido.');
            }

            // Check if phone already registered
            const { data: existing } = await supabase.from('customers').select('*').eq('contact_no', formattedPhone).limit(1);
            if (existing && existing.length > 0) {
                throw new Error(language === 'en' ? 'Number already registered! Please log out and sign in with this number.' : 'Número já registado! Por favor, saia e entre com este número (Palavra-passe ou OTP) em vez de usar o Google.');
            }

            const { error } = await supabase.from('customers').update({ 
                contact_no: formattedPhone, whatsapp: formattedPhone 
            }).eq('email', user?.email);

            if (error) throw error;

            setUser({ ...user, phone: formattedPhone });
            setNeedsPhonePrompt(false);
            
            // Reload user data
            const { data: updatedCustomer } = await supabase.from('customers').select('*').eq('contact_no', formattedPhone).single();
            if (updatedCustomer) {
                setCustomerData(updatedCustomer);
                localStorage.setItem('pc_auth_phone', formattedPhone);
                localStorage.setItem('pc_user_data', JSON.stringify(updatedCustomer));
                window.dispatchEvent(new Event('pc_user_update'));
                fetchOrders(formattedPhone);
            }
        } catch (err: any) {
            alert(err.message);
        } finally {
            setIsSubmittingPhone(false);
        }
    };

    const handleLogout = async () => {
        const phone = localStorage.getItem('pc_auth_phone');
        const userData = localStorage.getItem('pc_user_data');
        let customerId = null;
        if (userData) {
            try {
                customerId = JSON.parse(userData).id;
            } catch(e) {}
        }
        
        await logAudit({
            action: 'CUSTOMER_LOGOUT',
            entity_type: 'customer',
            entity_id: customerId,
            details: {},
            customer_phone: phone
        });

        await supabase.auth.signOut();
        localStorage.removeItem('pc_auth_phone');
        localStorage.removeItem('pc_user_data');
        window.dispatchEvent(new Event('pc_user_update'));
        navigate('/');
    };

    const handleUpdateAvatar = async (avatarUrl: string) => {
        if (!user?.phone) return;
        try {
            const { error } = await supabase
                .from('customers')
                .update({ avatar_url: avatarUrl })
                .eq('contact_no', user.phone);

            if (error) throw error;
            const updatedData = { ...customerData, avatar_url: avatarUrl };
            setCustomerData(updatedData);
            localStorage.setItem('pc_user_data', JSON.stringify(updatedData));
            setIsAvatarModalOpen(false);
            window.dispatchEvent(new Event('pc_user_update'));
        } catch (err) {
            console.error('Error updating avatar:', err);
        }
    };

    const handleUpdateProfile = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user?.phone) return;
        setLoading(true);
        try {
            const { error } = await supabase
                .from('customers')
                .update({
                    name: editData.name,
                    email: editData.email || null,
                    date_of_birth: editData.date_of_birth || null,
                    address: editData.address || null,
                    street: editData.street || null,
                    reference_point: editData.reference_point || null,
                    nuit: editData.nuit || null,
                    whatsapp: editData.whatsapp || null,
                    updated_at: new Date().toISOString()
                })
                .eq('contact_no', user.phone);

            if (error) throw error;

            const updatedData = { ...customerData, ...editData };
            setCustomerData(updatedData);
            localStorage.setItem('pc_user_data', JSON.stringify(updatedData));
            window.dispatchEvent(new Event('pc_user_update'));
            setIsEditModalOpen(false);
        } catch (err) {
            console.error('Error updating profile:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleReorder = (order: any) => {
        if (!order.order_items || order.order_items.length === 0) return;

        order.order_items.forEach((item: any) => {
            addToCart({
                name: item.product_name,
                price: Number(item.price),
                image: item.product_image,
                quantity: item.quantity
            });
        });

        alert(language === 'en' ? 'Items added to cart!' : 'Itens adicionados ao carrinho!');
    };

    const handleSupportOrder = (orderId: string, status: string, shortId?: string) => {
        const orderRef = shortId || orderId.slice(-6).toUpperCase();
        const msg = language === 'en' 
            ? encodeURIComponent(`Hello! I need help with my order #${orderRef}. Current status: ${status}.`)
            : encodeURIComponent(`Olá! Preciso de ajuda com a minha encomenda #${orderRef}. Estado atual: ${status}.`);
            
        // Pre-fill the form just in case
        setSupportMsg(language === 'en' ? `Order #${orderRef} Support` : `Suporte Encomenda #${orderRef}`);
        
        // Open WhatsApp direct
        window.open(`https://wa.me/258879146662?text=${msg}`, '_blank');
    };

    const handleCancelOrder = async (order: any) => {
        if (!window.confirm(language === 'en' ? 'Are you sure you want to cancel this order?' : 'Tem a certeza que deseja cancelar esta encomenda?')) return;
        
        setLoading(true);
        try {
            const { error } = await supabase
                .from('orders')
                .update({ status: 'cancelled', updated_at: new Date().toISOString() })
                .eq('id', order.id)
                .eq('status', 'pending');
                
            if (error) throw error;
            
            await logAudit({
                action: 'ORDER_CANCELLED_BY_CLIENT',
                entity_type: 'order',
                entity_id: order.id,
                details: { short_id: order.short_id || order.id.slice(0, 6) }
            });

            await fetchOrders(user?.phone);
            alert(language === 'en' ? 'Order cancelled successfully.' : 'Encomenda cancelada com sucesso.');
        } catch (err: any) {
            console.error('Error cancelling order:', err);
            alert(language === 'en' ? 'Failed to cancel the order. It might already be in preparation.' : 'Erro ao cancelar a encomenda. Pode já estar em preparação.');
        } finally {
            setLoading(false);
        }
    };

    const AVATARS = [
        '/avatars/defi_male_1.png',
        '/avatars/defi_male_2.png',
        '/avatars/defi_male_3.png',
        '/avatars/defi_female_1.png',
        '/avatars/defi_female_2.png'
    ];

    const handleSupportSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmittingSupport(true);
        setSupportStatus('idle');

        try {
            // 1. Save to Support Table (if exists, or reuse contact_messages but mark as support)
            await supabase.from('contact_messages').insert([{
                name: customerData?.name || user?.phone || 'Cliente Registado',
                phone: user?.phone || '',
                email: customerData?.email || 'N/A',
                message: (language === 'en' ? `[CUSTOMER SUPPORT] ${supportMsg}` : `[SUPORTE CLIENTE] ${supportMsg}`),
                status: 'unread'
            }]);

            // 2. Email Admin via internal Resend service
            const adminEmail = 'geral@paocaseiro.co.mz';
            const emailHtml = `
                <h2>Novo Pedido de Suporte</h2>
                <p><strong>Cliente:</strong> ${customerData?.name || 'Desconhecido'}</p>
                <p><strong>Telemóvel:</strong> ${user?.phone || 'N/A'}</p>
                <br/>
                <p><strong>Mensagem:</strong></p>
                <p style="background:#f4f4f4; padding:15px; border-radius:8px;">${supportMsg}</p>
            `;
            await sendEmail([adminEmail], `Pedido de Suporte: ${user?.phone || 'Cliente'}`, emailHtml)
                .catch(e => console.error("Support Email failed:", e));

            // 3. SMS Admin via internal Turbo service
            const adminPhone = '258879146662'; // Bakery main line
            const smsMessage = `PAO CASEIRO SUPORTE: Recebeu mensagem de ${user?.phone || 'Cliente'}. Verifique o painel ou email.`;
            await sendSMS(adminPhone, smsMessage)
                .catch(e => console.error("Support SMS failed:", e));
                
            await notifyAdminSystemsAlert(`Pedido de Suporte (WA)`, `Cliente: ${customerData?.name || 'Desconhecido'}\nTelefone: ${user?.phone || 'N/A'}\n\nMensagem:\n${supportMsg}`)
                .catch(e => console.error("Support WhatsApp Alert failed:", e));

            // 4. Open WhatsApp link in new tab
            const supportNumber = '258879146662';
            const clientName = customerData?.name || user?.phone || 'Cliente';
            const clientPhone = user?.phone || 'N/A';
            const fullMessage = (language === 'en' 
                ? `Hello Pão Caseiro Support!\n\n*Client:* ${clientName}\n*Phone:* ${clientPhone}\n\n*Issue/Message:*\n${supportMsg}`
                : `Olá Suporte Pão Caseiro!\n\n*Cliente:* ${clientName}\n*Telefone:* ${clientPhone}\n\n*Assunto/Mensagem:*\n${supportMsg}`);
            
            const waUrl = `https://wa.me/${supportNumber}?text=${encodeURIComponent(fullMessage)}`;
            window.open(waUrl, '_blank');

            // 5. Log as System Event for Admin Center
            await NotificationService.logSystemEvent(
                language === 'en' ? 'New Support Request' : 'Novo Pedido de Suporte',
                `Cliente: ${clientName}\nTelefone: ${clientPhone}\n\nMensagem: ${supportMsg}`,
                'SUPPORT',
                'info',
                user?.id
            );

            setSupportStatus('success');
            setSupportMsg('');
            setTimeout(() => setSupportStatus('idle'), 5000);
        } catch (error) {
            console.error('Support error:', error);
            setSupportStatus('error');
        } finally {
            setIsSubmittingSupport(false);
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status?.toLowerCase()) {
            case 'completed':
            case 'delivered':
                return <CheckCircle className="w-5 h-5 text-green-500" />;
            case 'cancelled':
                return <XCircle className="w-5 h-5 text-red-500" />;
            default:
                return <Clock className="w-5 h-5 text-amber-500" />;
        }
    };

    const getStatusBg = (status: string) => {
        switch (status?.toLowerCase()) {
            case 'pending': return 'bg-gray-100 text-gray-500';
            case 'confirmed': return 'bg-blue-50 text-blue-500';
            case 'kitchen': return 'bg-amber-50 text-amber-600';
            case 'ready': return 'bg-green-50 text-green-600';
            case 'delivering': return 'bg-green-600 text-white';
            case 'completed': return 'bg-gray-50 text-gray-400';
            case 'cancelled': return 'bg-red-50 text-red-500';
            default: return 'bg-gray-100 text-gray-500';
        }
    };

    const getStatusIconDashboard = (status: string) => {
        switch (status?.toLowerCase()) {
            case 'pending': return <Clock className="w-6 h-6" />;
            case 'confirmed': return <CheckCircle className="w-6 h-6" />;
            case 'kitchen': return <PenBox className="w-6 h-6" />;
            case 'ready': return <ShoppingBag className="w-6 h-6" />;
            case 'delivering': return <Smartphone className="w-6 h-6" />;
            case 'completed': return <CheckCircle className="w-6 h-6" />;
            case 'cancelled': return <XCircle className="w-6 h-6" />;
            default: return <Clock className="w-6 h-6" />;
        }
    };

    const getStatusProgress = (status: string) => {
        switch (status?.toLowerCase()) {
            case 'pending': return 0;
            case 'confirmed': return 25;
            case 'kitchen': return 50;
            case 'ready': return 75;
            case 'delivering': return 100;
            case 'completed': return 100;
            default: return 0;
        }
    };

    const formatStatus = (status: string, lang: string) => {
        const map: any = {
            'pending': { pt: 'Pendente', en: 'Pending' },
            'confirmed': { pt: 'Confirmado', en: 'Confirmed' },
            'kitchen': { pt: 'Na Cozinha', en: 'In Kitchen' },
            'ready': { pt: 'Pronto para Entrega', en: 'Ready' },
            'delivering': { pt: 'Em Rota de Entrega', en: 'Out for Delivery' },
            'completed': { pt: 'Concluído', en: 'Completed' },
            'cancelled': { pt: 'Cancelado', en: 'Cancelled' }
        };
        return map[status?.toLowerCase()]?.[lang] || status;
    };

    const handleOrderSearch = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        const code = searchOrderCode.trim();
        if (!code) return;

        setIsSearchingOrder(true);
        try {
            // Search by short ID (suffix) or full ID
            const { data, error } = await supabase
                .from('orders')
                .select('*, order_items(*)')
                .or(`id.ilike.%${code}%,short_id.ilike.%${code}%`)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setSearchedOrders(data || []);
            
            if (!data || data.length === 0) {
                alert(language === 'en' ? 'No order found with this code.' : 'Nenhuma encomenda encontrada com este código.');
            }
        } catch (err) {
            console.error('Search error:', err);
            alert(language === 'en' ? 'Error searching for order.' : 'Erro ao procurar encomenda.');
        } finally {
            setIsSearchingOrder(false);
        }
    };

    const ActiveOrderTracking: React.FC<{ orders: any[], searchedOrders: any[] }> = ({ orders, searchedOrders }) => {
        const activeOrders = orders.filter(o => 
            ['pending', 'confirmed', 'kitchen', 'ready', 'delivering'].includes(o.status?.toLowerCase())
        );

        // Combine user's active orders with manually searched ones, removing duplicates
        const allTrackedOrders = [...activeOrders];
        searchedOrders.forEach(so => {
            if (!allTrackedOrders.find(o => o.id === so.id)) {
                allTrackedOrders.push(so);
            }
        });

        if (allTrackedOrders.length === 0 && !isSearchingOrder) {
            return (
                <div className="bg-white rounded-3xl p-6 shadow-sm border-2 border-[#d9a65a]/10 flex flex-col items-center text-center">
                    <div className="w-16 h-16 bg-[#f7f1eb] rounded-2xl flex items-center justify-center mb-4">
                        <ShoppingBag className="w-8 h-8 text-[#d9a65a]" />
                    </div>
                    <h3 className="font-serif text-lg text-[#3b2f2f] mb-1">{language === 'en' ? 'No Active Orders' : 'Sem Encomendas Ativas'}</h3>
                    <p className="text-sm text-gray-500 mb-6">{language === 'en' ? 'Your active orders will appear here for tracking.' : 'As suas encomendas ativas aparecerão aqui para acompanhamento.'}</p>
                    
                    <div className="w-full max-w-xs">
                        <form onSubmit={handleOrderSearch} className="relative">
                            <input 
                                type="text"
                                placeholder={language === 'en' ? 'Track by order code...' : 'Acompanhar por código...'}
                                value={searchOrderCode}
                                onChange={(e) => setSearchOrderCode(e.target.value)}
                                className="w-full pl-4 pr-12 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm focus:outline-none focus:border-[#d9a65a] transition-all"
                            />
                            <button 
                                type="submit"
                                disabled={isSearchingOrder}
                                className="absolute right-2 top-1.5 p-1.5 bg-[#3b2f2f] text-[#d9a65a] rounded-lg hover:bg-[#d9a65a] hover:text-[#3b2f2f] transition-all disabled:opacity-50"
                            >
                                {isSearchingOrder ? <Loader className="w-4 h-4 animate-spin" /> : <ChevronRight className="w-4 h-4" />}
                            </button>
                        </form>
                    </div>
                </div>
            );
        }

        // Set the featured order (either the one user picked, or the latest one)
        const featuredOrder = allTrackedOrders.find(o => o.id === selectedOrderId) || allTrackedOrders[0];
        const otherOrders = allTrackedOrders.filter(o => o.id !== featuredOrder.id);
        
        const steps = [
            { id: 'pending', label: { en: 'Pending', pt: 'Pendente' }, icon: <Clock className="w-5 h-5" /> },
            { id: 'confirmed', label: { en: 'Confirmed', pt: 'Confirmado' }, icon: <CheckCircle className="w-5 h-5" /> },
            { id: 'kitchen', label: { en: 'Kitchen', pt: 'Cozinha' }, icon: <PenBox className="w-5 h-5" /> },
            { id: 'ready', label: { en: 'Ready', pt: 'Pronto' }, icon: <ShoppingBag className="w-5 h-5" /> },
            { id: 'delivering', label: { en: 'Out', pt: 'Em Rota' }, icon: <Smartphone className="w-5 h-5" /> }
        ];

        return (
            <div className="space-y-6">
                <div className="flex items-center justify-between px-2">
                    <h3 className="font-serif text-xl md:text-2xl text-[#3b2f2f]">{language === 'en' ? 'Track Encomenda' : 'Acompanhar Encomenda'} <span className="text-[#d9a65a]/40 ml-2">#{featuredOrder.short_id || featuredOrder.id.slice(-6).toUpperCase()}</span></h3>
                    <div className="flex items-center gap-3">
                        <span className="text-xs font-black bg-[#d9a65a] text-[#3b2f2f] px-3 py-1 rounded-full uppercase tracking-widest shadow-sm">
                            {allTrackedOrders.length} {allTrackedOrders.length === 1 ? (language === 'en' ? 'Active' : 'Ativa') : (language === 'en' ? 'Active' : 'Ativas')}
                        </span>
                    </div>
                </div>

                {/* Featured Order - Premium Full-Width Card */}
                <motion.div 
                    layoutId={featuredOrder.id}
                    className="bg-white rounded-[2.5rem] p-6 md:p-10 shadow-2xl border-2 border-[#d9a65a]/10 relative overflow-hidden"
                >
                    {/* Background Decorative Pattern */}
                    <div className="absolute top-0 right-0 w-64 h-64 bg-[#fcf7f2] rounded-bl-[200px] -mr-32 -mt-32 opacity-50 pointer-events-none" />
                    
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-6 relative z-10">
                        <div>
                            <p className="text-[10px] font-black text-[#d9a65a] uppercase tracking-[0.3em] mb-2">{language === 'en' ? 'Current Status' : 'Estado Atual'}</p>
                            <h4 className="font-serif text-3xl md:text-4xl text-[#3b2f2f]">
                                {formatStatus(featuredOrder.status, language)}
                            </h4>
                        </div>
                        <div className="flex items-center gap-4">
                            <div className="text-right hidden md:block">
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{language === 'en' ? 'Est. Arrival' : 'Chegada Est.'}</p>
                                <p className="font-black text-[#3b2f2f] text-lg">30-45 min</p>
                            </div>
                            <button 
                                onClick={() => handleSupportOrder(featuredOrder.id, featuredOrder.status)}
                                className="flex items-center gap-3 py-4 px-6 bg-[#3b2f2f] text-[#d9a65a] rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-[#d9a65a] hover:text-[#3b2f2f] transition-all shadow-xl hover:-translate-y-1"
                            >
                                <MessageSquare className="w-5 h-5" />
                                {language === 'en' ? 'Live Support' : 'Suporte Direto'}
                            </button>
                        </div>
                    </div>

                    {/* Prominent Stages UI */}
                    <div className="relative z-10 pt-4 pb-12">
                        {/* Progress Line */}
                        <div className="absolute top-6 left-[30px] right-[30px] h-2 bg-gray-50 rounded-full" />
                        <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: `calc(${getStatusProgress(featuredOrder.status)}% - 60px)` }}
                            className="absolute top-6 left-[30px] h-2 bg-gradient-to-r from-[#d9a65a] to-amber-400 rounded-full shadow-[0_0_15px_rgba(217,166,90,0.3)] transition-all duration-1000"
                        />

                        {/* Stage Icons and Labels */}
                        <div className="flex justify-between relative">
                            {steps.map((step, idx) => {
                                const isActive = getStatusProgress(featuredOrder.status) >= (idx * 25);
                                const isCurrent = (getStatusProgress(featuredOrder.status) === (idx * 25)) || (!isActive && idx > 0 && getStatusProgress(featuredOrder.status) >= ((idx-1) * 25));
                                
                                return (
                                    <div key={step.id} className="flex flex-col items-center gap-4 w-12 md:w-20">
                                        <div className={`w-12 h-12 md:w-14 md:h-14 rounded-2xl flex items-center justify-center transition-all duration-700 border-2 ${
                                            isActive 
                                                ? 'bg-white border-[#d9a65a] text-[#d9a65a] shadow-[0_10px_20px_rgba(217,166,90,0.15)] ring-4 ring-[#d9a65a]/10 scale-110' 
                                                : 'bg-white border-gray-100 text-gray-300'
                                        }`}>
                                            {step.icon}
                                        </div>
                                        <div className="text-center group">
                                            <p className={`text-[9px] md:text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-colors ${isActive ? 'text-[#3b2f2f]' : 'text-gray-300'}`}>
                                                {step.label[language as 'en' | 'pt']}
                                            </p>
                                            {isCurrent && (
                                                <motion.div 
                                                    layoutId="currentIndicator"
                                                    className="w-1 h-1 bg-[#d9a65a] rounded-full mx-auto mt-1"
                                                    animate={{ opacity: [0.3, 1, 0.3] }}
                                                    transition={{ repeat: Infinity, duration: 1.5 }}
                                                />
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Order Details Preview */}
                    <div className="mt-8 pt-8 border-t border-gray-50 flex flex-wrap gap-6 items-center">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center">
                                <ShoppingBag className="w-5 h-5 text-gray-400" />
                            </div>
                            <div>
                                <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">{language === 'en' ? 'Items' : 'Artigos'}</p>
                                <p className="text-sm font-black text-[#3b2f2f]">{featuredOrder.order_items?.length || 0} {language === 'en' ? 'Products' : 'Produtos'}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center">
                                <Clock className="w-5 h-5 text-gray-400" />
                            </div>
                            <div>
                                <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">{language === 'en' ? 'Ordered At' : 'Pedido há'}</p>
                                <p className="text-sm font-black text-[#3b2f2f]">{new Date(featuredOrder.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                            </div>
                        </div>
                    </div>
                </motion.div>

                {/* Tracking Search & Other Orders Section */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pt-4">
                    {/* Search Component */}
                    <div className="md:col-span-1">
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-4 ml-2">{language === 'en' ? 'Track Another Order' : 'Rastrear Outro Pedido'}</p>
                        <form onSubmit={handleOrderSearch} className="relative group">
                            <input 
                                type="text"
                                placeholder={language === 'en' ? 'By code...' : 'Por código...'}
                                value={searchOrderCode}
                                onChange={(e) => setSearchOrderCode(e.target.value)}
                                className="w-full pl-5 pr-14 py-4 bg-white border border-gray-100 rounded-2xl text-sm focus:outline-none focus:ring-8 focus:ring-[#d9a65a]/5 focus:border-[#d9a65a] transition-all shadow-sm group-hover:shadow-md"
                            />
                            <button 
                                type="submit"
                                disabled={isSearchingOrder}
                                className="absolute right-2 top-2 p-2.5 bg-[#d9a65a] text-[#3b2f2f] rounded-xl hover:bg-[#3b2f2f] hover:text-[#d9a65a] transition-all disabled:opacity-50"
                            >
                                {isSearchingOrder ? <Loader className="w-5 h-5 animate-spin" /> : <ChevronRight className="w-5 h-5" />}
                            </button>
                        </form>
                    </div>

                    {/* Pending List ("Lista Pendente") */}
                    <div className="md:col-span-2">
                        {otherOrders.length > 0 && (
                            <>
                                <div className="flex items-center justify-between mb-4 ml-2">
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">{language === 'en' ? 'Pending Tracker List' : 'Lista Pendente'}</p>
                                    <span className="text-[10px] font-bold text-[#d9a65a]">{otherOrders.length} {language === 'en' ? 'more' : 'mais'}</span>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    {otherOrders.map((order) => (
                                        <motion.button
                                            key={order.id}
                                            onClick={() => setSelectedOrderId(order.id)}
                                            whileHover={{ x: 5 }}
                                            className="flex items-center justify-between p-4 bg-white rounded-2xl border border-gray-50 hover:border-[#d9a65a]/30 hover:shadow-lg transition-all text-left"
                                        >
                                            <div className="flex items-center gap-4">
                                                <div className={`p-2 rounded-xl ${getStatusBg(order.status)}`}>
                                                    {getStatusIconDashboard(order.status)}
                                                </div>
                                                <div>
                                                    <p className="text-[10px] font-black text-[#d9a65a] tracking-widest">#{order.short_id || order.id.slice(-6).toUpperCase()}</p>
                                                    <p className="text-sm font-serif text-[#3b2f2f]">{formatStatus(order.status, language)}</p>
                                                </div>
                                            </div>
                                            <div className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center group-hover:bg-[#d9a65a]/10">
                                                <ChevronRight className="w-4 h-4 text-gray-400" />
                                            </div>
                                        </motion.button>
                                    ))}
                                </div>
                            </>
                        )}
                        
                        {otherOrders.length === 0 && !isSearchingOrder && allTrackedOrders.length === 1 && (
                            <div className="h-full flex items-center justify-center p-8 bg-[#fdfaf7]/50 rounded-[2rem] border border-dashed border-[#d9a65a]/10">
                                <p className="text-[10px] font-black text-[#d9a65a]/40 uppercase tracking-[0.3em] text-center">
                                    {language === 'en' ? 'Tracking 1 Active Order' : 'Acompanhando 1 Pedido Ativo'}
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    };

    if (loading) return (
        <div className="min-h-screen flex items-center justify-center bg-[#f7f1eb]">
            <Loader className="w-12 h-12 text-[#d9a65a] animate-spin" />
        </div>
    );

    if (needsPhonePrompt) {
        return (
            <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-8 text-center"
                >
                    <div className="w-16 h-16 bg-[#f7f1eb] rounded-full flex items-center justify-center mx-auto mb-6">
                        <MessageSquare className="w-8 h-8 text-[#d9a65a]" />
                    </div>
                    <h2 className="font-serif text-2xl text-[#3b2f2f] mb-4">
                        {language === 'en' ? 'Confirm your Phone Number' : 'Confirme o seu Telemóvel'}
                    </h2>
                    <p className="text-gray-500 mb-6 text-sm">
                        {language === 'en' 
                            ? 'Please provide your WhatsApp number so we can notify you about your order status.' 
                            : 'Por favor, introduza o seu número de WhatsApp para podermos notificar sobre o estado dos seus pedidos.'}
                    </p>
                    <form onSubmit={handleGooglePhoneSubmit} className="space-y-4">
                        <input
                            type="tel"
                            required
                            value={googlePhone}
                            onChange={(e) => setGooglePhone(e.target.value)}
                            placeholder="84/85 xxx xxxx"
                            className="w-full p-4 rounded-xl border border-gray-200 focus:border-[#d9a65a] focus:ring-2 focus:ring-[#d9a65a]/20 outline-none transition-all text-center text-lg"
                        />
                        <button
                            type="submit"
                            disabled={isSubmittingPhone || googlePhone.length < 9}
                            className="w-full bg-[#3b2f2f] text-[#d9a65a] py-4 rounded-xl font-bold uppercase tracking-widest hover:bg-[#d9a65a] hover:text-[#3b2f2f] transition-all flex justify-center items-center disabled:opacity-70"
                        >
                            {isSubmittingPhone ? <Loader className="w-6 h-6 animate-spin" /> : (language === 'en' ? 'Confirm Details' : 'Confirmar Dados')}
                        </button>
                    </form>
                </motion.div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#f7f1eb] pt-28 pb-12 px-4 md:px-8">
            <div className="max-w-5xl mx-auto space-y-8">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-[#d9a65a]/20">
                    <div className="flex items-center gap-6">
                        <div className="relative group cursor-pointer" onClick={() => setIsAvatarModalOpen(true)}>
                            {customerData?.avatar_url ? (
                                <img
                                    src={customerData.avatar_url}
                                    alt="Avatar"
                                    className="w-20 h-20 rounded-full border-4 border-[#d9a65a]/20 group-hover:border-[#d9a65a] transition-all object-cover"
                                />
                            ) : (
                                <div className="w-20 h-20 rounded-full bg-[#d9a65a] flex items-center justify-center text-2xl font-black text-[#3b2f2f] border-4 border-[#d9a65a]/20 group-hover:border-[#d9a65a] transition-all">
                                    {(customerData?.name || user?.phone || '?')[0].toUpperCase()}
                                </div>
                            )}
                            <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                                <span className="text-white text-[10px] font-bold uppercase">{language === 'en' ? 'Change' : 'Mudar'}</span>
                            </div>
                        </div>
                        <div className="flex-1">
                            <h1 className="font-serif text-3xl md:text-4xl text-[#3b2f2f] mb-1">{customerData?.name || t.myAccount}</h1>
                            <div className="flex flex-wrap items-center gap-4 text-gray-500 font-medium text-sm">
                                <p>{t.phone}: {user?.phone}</p>
                                {customerData?.nuit && <p>NUIT: {customerData.nuit}</p>}
                                <button
                                    onClick={() => setIsEditModalOpen(true)}
                                    className="text-[#d9a65a] hover:underline flex items-center gap-1 font-bold"
                                >
                                    <PenBox className="w-4 h-4" />
                                    {t.editProfile}
                                </button>
                            </div>
                        </div>
                    </div>
                    <button
                        onClick={handleLogout}
                        className="flex items-center gap-2 text-red-500 hover:bg-red-50 px-4 py-2 rounded-xl transition-colors font-bold w-fit"
                    >
                        <LogOut className="w-5 h-5" />
                        {t.logout}
                    </button>
                </div>

                {/* Edit Profile Modal */}
                {isEditModalOpen && (
                    <div className="fixed inset-0 z-[110] flex items-center justify-center px-4">
                        <div className="absolute inset-0 bg-[#3b2f2f]/60 backdrop-blur-sm" onClick={() => setIsEditModalOpen(false)} />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="bg-white rounded-3xl p-8 max-w-xl w-full relative z-10 shadow-2xl border border-[#d9a65a]/20 max-h-[90vh] overflow-y-auto"
                        >
                            <button onClick={() => setIsEditModalOpen(false)} className="absolute top-6 right-6 text-gray-400 hover:text-gray-600" title={t.cancel}>
                                <XCircle className="w-6 h-6" />
                            </button>

                            <h3 className="font-serif text-2xl text-[#3b2f2f] mb-6 flex items-center gap-3">
                                <User className="w-6 h-6 text-[#d9a65a]" />
                                {t.editProfile}
                            </h3>

                            <form onSubmit={handleUpdateProfile} className="space-y-4">
                                <div>
                                    <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">{t.fullName}</label>
                                    <input
                                        type="text"
                                        required
                                        value={editData.name}
                                        onChange={e => setEditData({ ...editData, name: e.target.value })}
                                        className="w-full p-3 rounded-xl border border-gray-100 focus:border-[#d9a65a] outline-none"
                                        placeholder={t.fullName}
                                        title={t.fullName}
                                    />
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Email</label>
                                        <input
                                            type="email"
                                            value={editData.email}
                                            onChange={e => setEditData({ ...editData, email: e.target.value })}
                                            className="w-full p-3 rounded-xl border border-gray-100 focus:border-[#d9a65a] outline-none"
                                            placeholder="seu@email.com"
                                            title="Email"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Data de Nascimento</label>
                                        <input
                                            type="date"
                                            value={editData.date_of_birth}
                                            onChange={e => setEditData({ ...editData, date_of_birth: e.target.value })}
                                            className="w-full p-3 rounded-xl border border-gray-100 focus:border-[#d9a65a] outline-none"
                                            title="Data de Nascimento"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">{t.addressTitle}</label>
                                    <input
                                        type="text"
                                        value={editData.address}
                                        onChange={e => setEditData({ ...editData, address: e.target.value })}
                                        className="w-full p-3 rounded-xl border border-gray-100 focus:border-[#d9a65a] outline-none"
                                        placeholder={language === 'en' ? "Ex: Sommerschield, Malhangalene..." : "Ex: Sommerschield, Malhangalene..."}
                                        title={t.addressTitle}
                                    />
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">{t.street}</label>
                                        <input
                                            type="text"
                                            value={editData.street}
                                            onChange={e => setEditData({ ...editData, street: e.target.value })}
                                            className="w-full p-3 rounded-xl border border-gray-100 focus:border-[#d9a65a] outline-none"
                                            placeholder={language === 'en' ? "Ex: Av. Eduardo Mondlane..." : "Ex: Av. Eduardo Mondlane..."}
                                            title={t.street}
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">{t.reference}</label>
                                        <input
                                            type="text"
                                            value={editData.reference_point}
                                            onChange={e => setEditData({ ...editData, reference_point: e.target.value })}
                                            className="w-full p-3 rounded-xl border border-gray-100 focus:border-[#d9a65a] outline-none"
                                            placeholder={language === 'en' ? "Ex: Near School X..." : "Ex: Próximo à Escola X..."}
                                            title={t.reference}
                                        />
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">NUIT</label>
                                        <input
                                            type="text"
                                            value={editData.nuit}
                                            onChange={e => setEditData({ ...editData, nuit: e.target.value })}
                                            className="w-full p-3 rounded-xl border border-gray-100 focus:border-[#d9a65a] outline-none"
                                            placeholder="123456789"
                                            title="NUIT"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">WhatsApp</label>
                                        <input
                                            type="tel"
                                            value={editData.whatsapp}
                                            onChange={e => setEditData({ ...editData, whatsapp: e.target.value })}
                                            className="w-full p-3 rounded-xl border border-gray-100 focus:border-[#d9a65a] outline-none"
                                            placeholder="84/85..."
                                            title="WhatsApp"
                                        />
                                    </div>
                                </div>

                                <div className="pt-4 flex gap-4">
                                    <button
                                        type="button"
                                        onClick={() => setIsEditModalOpen(false)}
                                        className="flex-1 py-3 bg-gray-100 text-gray-600 rounded-xl font-bold hover:bg-gray-200 transition-colors uppercase tracking-widest text-sm"
                                    >
                                        {t.cancel}
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className="flex-1 py-3 bg-[#3b2f2f] text-[#d9a65a] rounded-xl font-bold hover:bg-[#d9a65a] hover:text-[#3b2f2f] transition-all uppercase tracking-widest text-sm disabled:opacity-50"
                                    >
                                        {loading ? t.saving : t.save}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}

                {/* Avatar Selection Modal */}
                {isAvatarModalOpen && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center px-4">
                        <div className="absolute inset-0 bg-[#3b2f2f]/60 backdrop-blur-sm" onClick={() => setIsAvatarModalOpen(false)} />
                        <div className="bg-white rounded-3xl p-8 max-w-md w-full relative z-10 shadow-2xl border border-[#d9a65a]/20">
                            <h3 className="font-serif text-2xl text-[#3b2f2f] mb-6 text-center">{t.chooseAvatar}</h3>
                            <div className="grid grid-cols-3 gap-4 mb-8">
                                {AVATARS.map((url, idx) => (
                                    <button
                                        key={idx}
                                        onClick={() => handleUpdateAvatar(url)}
                                        className={`relative rounded-full overflow-hidden border-4 transition-all hover:scale-105 ${customerData?.avatar_url === url ? 'border-[#d9a65a]' : 'border-transparent hover:border-[#d9a65a]/40'}`}
                                    >
                                        <img src={url} alt={`Avatar ${idx}`} className="w-full h-full object-cover" />
                                    </button>
                                ))}
                            </div>
                            <button
                                onClick={() => setIsAvatarModalOpen(false)}
                                className="w-full py-3 bg-gray-100 text-gray-600 rounded-xl font-bold hover:bg-gray-200 transition-colors"
                            >
                                {t.cancel}
                            </button>
                        </div>
                    </div>
                )}

                {/* Order Tracking Section */}
                <div className="mb-10">
                    <ActiveOrderTracking orders={orders} searchedOrders={searchedOrders} />
                </div>

                {/* Queue Ticket Section */}
                <div className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-[#d9a65a]/20">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-[#d9a65a]/10 rounded-2xl flex items-center justify-center">
                                <Ticket className="w-6 h-6 text-[#d9a65a]" />
                            </div>
                            <div>
                                <h2 className="font-serif text-2xl text-[#3b2f2f]">{language === 'en' ? 'Service Queue' : 'Fila de Atendimento'}</h2>
                                <p className="text-sm text-gray-500">{language === 'en' ? 'Get your ticket and wait comfortably' : 'Tire a sua senha e aguarde confortavelmente'}</p>
                            </div>
                        </div>

                        {!activeTicket ? (
                            <div className="flex flex-col sm:flex-row gap-2">
                                <button 
                                    onClick={() => handleRequestTicket(false)}
                                    disabled={ticketLoading}
                                    className="bg-[#3b2f2f] text-[#d9a65a] px-6 py-3 rounded-xl font-bold uppercase tracking-widest text-[10px] flex items-center gap-2 hover:bg-[#2a2121] transition-all shadow-lg active:scale-95 disabled:opacity-50"
                                >
                                    <Ticket className="w-4 h-4" />
                                    {language === 'en' ? 'Normal' : 'Normal'}
                                </button>
                                <button 
                                    onClick={() => handleRequestTicket(true)}
                                    disabled={ticketLoading}
                                    className="bg-amber-500/10 text-amber-600 border border-amber-500/20 px-4 py-3 rounded-xl font-bold uppercase tracking-widest text-[10px] flex items-center gap-2 hover:bg-amber-500/20 transition-all active:scale-95 disabled:opacity-50"
                                >
                                    <UserCheck className="w-4 h-4" />
                                    {language === 'en' ? 'Priority' : 'Prioritária'}
                                </button>
                            </div>
                        ) : (
                            <div className="w-full md:w-auto flex items-center gap-4 bg-[#f7f1eb] p-3 rounded-2xl border border-[#d9a65a]/30">
                                <div className="text-center px-4 border-r border-[#d9a65a]/20">
                                    <div className="flex flex-col items-center">
                                        <p className="text-[10px] font-bold text-[#d9a65a] uppercase tracking-tighter">{language === 'en' ? 'Your Ticket' : 'Sua Senha'}</p>
                                        <div className="flex items-center gap-1">
                                            <p className="text-2xl font-black font-mono text-[#3b2f2f]">{activeTicket.ticket_number}</p>
                                            {activeTicket.is_priority && (
                                                <div className="bg-amber-500 text-white text-[8px] font-black px-1.5 py-0.5 rounded leading-none uppercase" title="Prioritária">P</div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex-1 px-2">
                                    {activeTicket.status === 'waiting' && (
                                        <div className="flex flex-col">
                                            <span className="text-xs font-bold text-amber-600 flex items-center gap-1">
                                                <Clock className="w-3 h-3" /> {language === 'en' ? 'Waiting' : 'Em Espera'}
                                            </span>
                                            <span className="text-[10px] text-gray-500">
                                                {peopleAhead} {language === 'en' ? 'people ahead' : 'pessoas à frente'}
                                            </span>
                                        </div>
                                    )}
                                    {activeTicket.status === 'calling' && (
                                        <div className="flex flex-col">
                                            <span className="text-xs font-bold text-green-600 animate-pulse flex items-center gap-1">
                                                <Ticket className="w-3 h-3" /> {language === 'en' ? 'Your Turn!' : 'Sua Vez!'}
                                            </span>
                                            <span className="text-[10px] text-green-700 font-bold uppercase tracking-tighter">
                                                {activeTicket.counter || (language === 'en' ? 'Main Counter' : 'Balcão Principal')}
                                            </span>
                                        </div>
                                    )}
                                </div>
                                {(activeTicket.status === 'completed' || activeTicket.status === 'skipped') && (
                                    <button onClick={() => setActiveTicket(null)} className="text-gray-400 hover:text-gray-600 p-1">
                                        <XCircle className="w-5 h-5" />
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Left: Orders History */}
                    <div className="lg:col-span-2 space-y-6">
                        <h2 className="font-serif text-2xl text-[#3b2f2f] flex items-center gap-3">
                            <ShoppingBag className="w-6 h-6 text-[#d9a65a]" />
                            {t.orderHistory}
                        </h2>

                        {orders.length === 0 ? (
                            <div className="bg-white p-12 rounded-3xl text-center border border-dashed border-gray-300">
                                <ShoppingBag className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                                <h3 className="text-lg font-bold text-gray-500">{t.noOrders}</h3>
                                <p className="text-gray-400">{t.noOrdersDesc}</p>
                                <button onClick={() => navigate('/menu')} className="mt-6 bg-[#d9a65a] text-[#3b2f2f] px-6 py-2 rounded-full font-bold">
                                    {t.exploreMenu}
                                </button>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {orders.map((order) => (
                                    <div key={order.id} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:border-[#d9a65a]/40 transition-colors">
                                        <div className="flex flex-col md:flex-row justify-between md:items-center gap-4 mb-4 pb-4 border-b border-gray-100">
                                            <div className="flex items-center gap-3">
                                                {getStatusIcon(order.status)}
                                                <div>
                                                    <p className="font-bold text-[#3b2f2f]">{t.order} {order.short_id || `#${order.id.slice(0, 6)}`}</p>
                                                    <p className="text-sm text-gray-500">
                                                        {new Date(order.created_at).toLocaleDateString(language === 'en' ? 'en-US' : 'pt-PT', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className="font-bold text-lg text-[#3b2f2f]">{Number(order.total_amount).toFixed(2)} MT</p>
                                                <span className="text-xs uppercase tracking-wider font-bold bg-gray-100 px-2 py-1 rounded-full text-gray-600">
                                                    {order.delivery_type === 'delivery' ? t.delivery : order.delivery_type === 'pickup' ? t.pickup : t.dineIn}
                                                </span>
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <p className="text-sm font-bold text-gray-500 mb-2">{t.items}:</p>
                                            {order.order_items?.map((item: any) => (
                                                <div key={item.id} className="flex justify-between text-sm">
                                                    <span className="text-gray-700">{item.quantity}x {language === 'en' ? (item.product_name_en || getEnglishProductName(item.product_name)) : item.product_name}</span>
                                                    <span className="text-gray-500">{(item.subtotal || (item.quantity * item.price)).toFixed(2)} MT</span>
                                                </div>
                                            ))}
                                        </div>

                                        <div className="mt-6 flex flex-wrap gap-3 pt-4 border-t border-gray-50">
                                            <button
                                                onClick={() => handleReorder(order)}
                                                className="flex-1 min-w-[140px] flex items-center justify-center gap-2 bg-[#d9a65a]/10 text-[#d9a65a] py-3 rounded-xl font-bold hover:bg-[#d9a65a] hover:text-[#3b2f2f] transition-all text-xs uppercase tracking-widest"
                                            >
                                                <RotateCcw className="w-4 h-4" />
                                                {t.reorder}
                                            </button>
                                            <button
                                                onClick={() => handleSupportOrder(order.short_id || order.id, order.status)}
                                                className="flex-1 min-w-[140px] flex items-center justify-center gap-2 bg-gray-50 text-gray-500 py-3 rounded-xl font-bold hover:bg-gray-100 transition-all text-xs uppercase tracking-widest border border-gray-100"
                                            >
                                                <HelpCircle className="w-4 h-4" />
                                                {t.support}
                                            </button>
                                            {order.status === 'pending' && (
                                                <button
                                                    onClick={() => handleCancelOrder(order)}
                                                    className="flex-1 min-w-[140px] flex items-center justify-center gap-2 bg-red-50 text-red-500 py-3 rounded-xl font-bold hover:bg-red-100 transition-all text-xs uppercase tracking-widest border border-red-100"
                                                >
                                                    <XCircle className="w-4 h-4" />
                                                    {language === 'en' ? 'Cancel' : 'Cancelar'}
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Right: Support Contact & Status */}
                    <div className="space-y-6" id="support-section">
                        {/* WhatsApp Direct Card - NEW */}
                        <motion.div 
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            whileHover={{ scale: 1.02 }}
                            onClick={() => {
                                const msg = language === 'en' 
                                    ? encodeURIComponent("Hello Pão Caseiro Team! I need some assistance.") 
                                    : encodeURIComponent("Olá Equipa Pão Caseiro! Gostaria de obter assistência.");
                                window.open(`https://wa.me/258879146662?text=${msg}`, '_blank');
                            }}
                            className="bg-gradient-to-br from-[#25D366] to-[#128C7E] p-8 rounded-[2.5rem] text-white shadow-xl cursor-pointer relative overflow-hidden group"
                        >
                            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 transition-transform group-hover:scale-150 duration-700" />
                            <div className="relative z-10">
                                <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center mb-6 backdrop-blur-sm">
                                    <MessageSquare className="w-8 h-8 text-white" />
                                </div>
                                <h3 className="font-serif text-2xl mb-2">{language === 'en' ? 'WhatsApp Support' : 'Suporte WhatsApp'}</h3>
                                <p className="text-white/80 text-sm mb-6 leading-relaxed">
                                    {language === 'en' 
                                        ? 'Chat directly with our team for immediate assistance.' 
                                        : 'Fale directamente com a nossa equipa para assistência imediata.'}
                                </p>
                                <div className="flex items-center gap-2 font-black text-xs uppercase tracking-[0.2em]">
                                    {language === 'en' ? 'Open Chat' : 'Abrir Chat'}
                                    <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                                </div>
                            </div>
                        </motion.div>

                        <div className="bg-[#3b2f2f] text-white p-8 rounded-3xl relative overflow-hidden shadow-sm border border-white/5">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-[#d9a65a]/10 rounded-full blur-3xl -mr-16 -mt-16" />

                            <h2 className="font-serif text-2xl text-[#d9a65a] mb-2 flex items-center gap-3">
                                <MessageSquare className="w-6 h-6" />
                                {t.directSupport}
                            </h2>
                            <p className="text-gray-300 text-sm mb-6 leading-relaxed">
                                {t.supportDesc}
                            </p>

                            {supportStatus === 'success' && (
                                <div className="bg-green-500/20 text-green-300 p-4 rounded-xl text-sm font-bold mb-6">
                                    {t.supportSuccess}
                                </div>
                            )}

                            {supportStatus === 'error' && (
                                <div className="bg-red-500/20 text-red-300 p-4 rounded-xl text-sm font-bold mb-6 animate-shake">
                                    {t.supportError}
                                </div>
                            )}

                            <form onSubmit={handleSupportSubmit} className="space-y-4">
                                <textarea
                                    required
                                    value={supportMsg}
                                    onChange={(e) => setSupportMsg(e.target.value)}
                                    placeholder={t.supportPlaceholder}
                                    className="w-full h-32 p-4 rounded-xl bg-white/10 border border-white/20 focus:border-[#d9a65a] focus:bg-white/15 outline-none resize-none placeholder:text-gray-400 transition-all text-sm"
                                ></textarea>

                                <button
                                    type="submit"
                                    disabled={isSubmittingSupport || supportMsg.trim().length === 0}
                                    className="w-full bg-[#d9a65a] text-[#3b2f2f] py-3 rounded-xl font-bold uppercase tracking-widest hover:bg-white transition-all disabled:opacity-50"
                                >
                                    {isSubmittingSupport ? t.supportSending : t.supportSend}
                                </button>
                            </form>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
