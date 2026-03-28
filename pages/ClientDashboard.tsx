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
                setActiveTicket(data[0]);
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

    const handleSupportOrder = (orderId: string) => {
        const shortId = orderId.slice(-6).toUpperCase();
        setSupportMsg(language === 'en' 
            ? `Hello Pão Caseiro Team,\nI need support with my order #${shortId} from ${new Date().toLocaleDateString('en-US')}.\n\n[Describe the problem here...]`
            : `Olá Equipa Pão Caseiro,\nPreciso de suporte com a minha encomenda #${shortId} do dia ${new Date().toLocaleDateString('pt-PT')}.\n\n[Descreva aqui o problema...]`);

        const supportSection = document.getElementById('support-section');
        if (supportSection) {
            supportSection.scrollIntoView({ behavior: 'smooth' });
        }
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
                
            await notifyAdminSystemsAlert(`Pedido de Suporte`, `Cliente: ${customerData?.name || 'Desconhecido'}\nTelefone: ${user?.phone || 'N/A'}\n\nMensagem:\n${supportMsg}`)
                .catch(e => console.error("Support WhatsApp Alert failed:", e));

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

    const ActiveOrderTracking: React.FC<{ orders: any[] }> = ({ orders }) => {
        const activeOrders = orders.filter(o => 
            ['pending', 'confirmed', 'kitchen', 'ready', 'delivering'].includes(o.status?.toLowerCase())
        );

        if (activeOrders.length === 0) return null;

        const latestOrder = activeOrders[0];
        const statusSteps = ['pending', 'kitchen', 'ready', 'delivered'];
        
        const getStatusIndex = (status: string) => {
            const s = status?.toLowerCase();
            if (s === 'pending') return 0;
            if (s === 'kitchen' || s === 'confirmed') return 1;
            if (s === 'ready' || s === 'delivering') return 2;
            if (s === 'delivered' || s === 'completed') return 3;
            return 0;
        };

        const currentIndex = getStatusIndex(latestOrder.status);

        return (
            <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border-2 border-[#d9a65a]/10 relative overflow-hidden"
            >
                <div className="absolute top-0 right-0 p-4">
                    <motion.div 
                        animate={{ scale: [1, 1.1, 1] }} 
                        transition={{ repeat: Infinity, duration: 2 }}
                        className="flex items-center gap-2 bg-amber-50 text-amber-600 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest"
                    >
                        <Clock className="w-3 h-3" />
                        {language === 'en' ? 'Live Tracking' : 'Em Direto'}
                    </motion.div>
                </div>

                <div className="flex items-center gap-4 mb-8">
                    <div className="w-12 h-12 bg-[#3b2f2f] rounded-2xl flex items-center justify-center">
                        <ShoppingBag className="w-6 h-6 text-[#d9a65a]" />
                    </div>
                    <div>
                        <h2 className="font-serif text-2xl text-[#3b2f2f]">
                            {language === 'en' ? 'Acompanhar Pedido' : 'Acompanhar Pedido'}
                        </h2>
                        <p className="text-sm text-gray-400 font-medium">#{latestOrder.short_id || latestOrder.id.slice(0, 6)}</p>
                    </div>
                </div>

                {/* Stepper */}
                <div className="relative flex justify-between items-center px-2">
                    {/* Background Line */}
                    <div className="absolute left-0 right-0 h-1 bg-gray-100 top-1/2 -translate-y-1/2 z-0" />
                    {/* Active Line */}
                    <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${(currentIndex / (statusSteps.length - 1)) * 100}%` }}
                        className="absolute left-0 h-1 bg-[#d9a65a] top-1/2 -translate-y-1/2 z-0"
                    />

                    {statusSteps.map((s, idx) => {
                        const isActive = idx <= currentIndex;
                        const isCurrent = idx === currentIndex;
                        
                        let label = '';
                        let icon = null;
                        
                        if (idx === 0) {
                            label = language === 'en' ? 'Received' : 'Recebido';
                            icon = <CheckCircle className={`w-5 h-5 ${isActive ? 'text-white' : 'text-gray-400'}`} />;
                        } else if (idx === 1) {
                            label = language === 'en' ? 'Kitchen' : 'Cozinha';
                            icon = <PenBox className={`w-5 h-5 ${isActive ? 'text-white' : 'text-gray-400'}`} />;
                        } else if (idx === 2) {
                            label = language === 'en' ? 'Ready' : 'Pronto';
                            icon = <RotateCcw className={`w-5 h-5 ${isActive ? 'text-white' : 'text-gray-400'}`} />;
                        } else {
                            label = language === 'en' ? 'Finalized' : 'Finalizado';
                            icon = <CheckCircle className={`w-5 h-5 ${isActive ? 'text-white' : 'text-gray-400'}`} />;
                        }

                        return (
                            <div key={idx} className="relative z-10 flex flex-col items-center gap-3">
                                <motion.div 
                                    animate={isCurrent ? { scale: [1, 1.2, 1] } : {}}
                                    transition={{ repeat: Infinity, duration: 2 }}
                                    className={`w-10 h-10 rounded-full flex items-center justify-center border-4 ${isActive ? 'bg-[#d9a65a] border-[#fcf7f2]' : 'bg-white border-gray-100 shadow-sm'}`}
                                >
                                    {icon}
                                </motion.div>
                                <span className={`text-[10px] font-bold uppercase tracking-widest ${isActive ? 'text-[#3b2f2f]' : 'text-gray-400'}`}>
                                    {label}
                                </span>
                            </div>
                        );
                    })}
                </div>

                {latestOrder.status === 'delivering' && (
                    <div className="mt-8 p-4 bg-green-50 rounded-2xl flex items-center gap-4 border border-green-100 animate-pulse">
                        <div className="w-10 h-10 bg-green-500 rounded-xl flex items-center justify-center">
                            <Smartphone className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <p className="text-green-700 font-bold text-sm">
                                {language === 'en' ? 'Driver is on the way!' : 'O estafeta está a caminho!'}
                            </p>
                            <p className="text-green-600/70 text-xs font-medium">
                                {language === 'en' ? 'Keep your phone nearby.' : 'Mantenha o seu telemóvel por perto.'}
                            </p>
                        </div>
                    </div>
                )}
            </motion.div>
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

                {/* Active Order Tracking */}
                <ActiveOrderTracking orders={orders} />

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
                                                onClick={() => handleSupportOrder(order.short_id || order.id)}
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

                    {/* Right: Support Contact */}
                    <div className="space-y-6" id="support-section">
                        <div className="bg-[#3b2f2f] text-white p-8 rounded-3xl relative overflow-hidden">
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
