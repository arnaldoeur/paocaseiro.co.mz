import React, { useEffect, useState } from 'react';
import { supabase } from '../services/supabase';
import { Language } from '../translations';
import { useNavigate } from 'react-router-dom';
import { ShoppingBag, LogOut, Clock, CheckCircle, XCircle, ChevronRight, MessageSquare, Loader, PenBox, User } from 'lucide-react';
import { motion } from 'framer-motion';
import { sendEmail } from '../services/email';
import { sendSMS } from '../services/sms';

export const ClientDashboard: React.FC<{ language: Language }> = ({ language }) => {
    const [user, setUser] = useState<any>(null);
    const [orders, setOrders] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [supportMsg, setSupportMsg] = useState('');
    const [isSubmittingSupport, setIsSubmittingSupport] = useState(false);
    const [supportStatus, setSupportStatus] = useState<'idle' | 'success' | 'error'>('idle');
    const navigate = useNavigate();

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

                setUser({ ...su, phone: finalIdentifier, isGoogle: su.app_metadata?.provider === 'google' });
                fetchOrders(finalIdentifier);

                if (customerRecord) {
                    setCustomerData(customerRecord);
                    setEditData({
                        name: customerRecord.name || '',
                        email: customerRecord.email || '',
                        date_of_birth: customerRecord.date_of_birth || '',
                        address: customerRecord.address || '',
                        nuit: customerRecord.nuit || '',
                        whatsapp: customerRecord.whatsapp || ''
                    });
                    localStorage.setItem('pc_auth_phone', finalIdentifier);
                    localStorage.setItem('pc_user_data', JSON.stringify(customerRecord));
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

    const [customerData, setCustomerData] = useState<any>(null);
    const [isAvatarModalOpen, setIsAvatarModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editData, setEditData] = useState({
        name: '',
        email: '',
        date_of_birth: '',
        address: '',
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
                nuit: data.nuit || '',
                whatsapp: data.whatsapp || ''
            });
        }
    };

    const fetchOrders = async (phone: string | undefined) => {
        if (!phone) { setLoading(false); return; }

        try {
            // We search orders by matching `customer_phone_snapshot` or looking up the `customer_id`
            // Assuming the `customers` table phone matches or `customer_phone_snapshot` matching
            let searchPhone = phone.replace('+', '');

            const { data, error } = await supabase
                .from('orders')
                .select('*, order_items(*)')
                .ilike('customer_phone_snapshot', `%${searchPhone.slice(-8)}%`)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setOrders(data || []);
        } catch (error) {
            console.error('Error fetching past orders:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = async () => {
        await supabase.auth.signOut();
        localStorage.removeItem('pc_auth_phone');
        localStorage.removeItem('pc_user_data');
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
                    nuit: editData.nuit || null,
                    whatsapp: editData.whatsapp || null,
                    updated_at: new Date().toISOString()
                })
                .eq('contact_no', user.phone);

            if (error) throw error;

            const updatedData = { ...customerData, ...editData };
            setCustomerData(updatedData);
            localStorage.setItem('pc_user_data', JSON.stringify(updatedData));
            setIsEditModalOpen(false);
        } catch (err) {
            console.error('Error updating profile:', err);
        } finally {
            setLoading(false);
        }
    };

    const AVATARS = [
        '/avatars/young_man.png',
        '/avatars/older_man.png',
        '/avatars/woman.png',
        '/avatars/young_girl.png'
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
                message: `[SUPORTE CLIENTE] ${supportMsg}`,
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

    if (loading) return (
        <div className="min-h-screen flex items-center justify-center bg-[#f7f1eb]">
            <Loader className="w-12 h-12 text-[#d9a65a] animate-spin" />
        </div>
    );

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
                                <span className="text-white text-[10px] font-bold uppercase">Mudar</span>
                            </div>
                        </div>
                        <div className="flex-1">
                            <h1 className="font-serif text-3xl md:text-4xl text-[#3b2f2f] mb-1">{customerData?.name || 'A Minha Conta'}</h1>
                            <div className="flex flex-wrap items-center gap-4 text-gray-500 font-medium text-sm">
                                <p>Telemóvel: {user?.phone}</p>
                                {customerData?.nuit && <p>NUIT: {customerData.nuit}</p>}
                                <button
                                    onClick={() => setIsEditModalOpen(true)}
                                    className="text-[#d9a65a] hover:underline flex items-center gap-1 font-bold"
                                >
                                    <PenBox className="w-4 h-4" />
                                    Editar Perfil
                                </button>
                            </div>
                        </div>
                    </div>
                    <button
                        onClick={handleLogout}
                        className="flex items-center gap-2 text-red-500 hover:bg-red-50 px-4 py-2 rounded-xl transition-colors font-bold w-fit"
                    >
                        <LogOut className="w-5 h-5" />
                        Terminar Sessão
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
                            <button onClick={() => setIsEditModalOpen(false)} className="absolute top-6 right-6 text-gray-400 hover:text-gray-600" title="Fechar">
                                <XCircle className="w-6 h-6" />
                            </button>

                            <h3 className="font-serif text-2xl text-[#3b2f2f] mb-6 flex items-center gap-3">
                                <User className="w-6 h-6 text-[#d9a65a]" />
                                Editar Perfil
                            </h3>

                            <form onSubmit={handleUpdateProfile} className="space-y-4">
                                <div>
                                    <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Nome Completo</label>
                                    <input
                                        type="text"
                                        required
                                        value={editData.name}
                                        onChange={e => setEditData({ ...editData, name: e.target.value })}
                                        className="w-full p-3 rounded-xl border border-gray-100 focus:border-[#d9a65a] outline-none"
                                        placeholder="Seu nome completo"
                                        title="Nome Completo"
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
                                    <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Morada Completa</label>
                                    <input
                                        type="text"
                                        value={editData.address}
                                        onChange={e => setEditData({ ...editData, address: e.target.value })}
                                        className="w-full p-3 rounded-xl border border-gray-100 focus:border-[#d9a65a] outline-none"
                                        placeholder="Bairro, Rua, Casa..."
                                        title="Morada"
                                    />
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
                                        Cancelar
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className="flex-1 py-3 bg-[#3b2f2f] text-[#d9a65a] rounded-xl font-bold hover:bg-[#d9a65a] hover:text-[#3b2f2f] transition-all uppercase tracking-widest text-sm disabled:opacity-50"
                                    >
                                        {loading ? 'A Gravar...' : 'Gravar Alterações'}
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
                            <h3 className="font-serif text-2xl text-[#3b2f2f] mb-6 text-center">Escolher Avatar</h3>
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
                                Cancelar
                            </button>
                        </div>
                    </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Left: Orders History */}
                    <div className="lg:col-span-2 space-y-6">
                        <h2 className="font-serif text-2xl text-[#3b2f2f] flex items-center gap-3">
                            <ShoppingBag className="w-6 h-6 text-[#d9a65a]" />
                            Histórico de Pedidos
                        </h2>

                        {orders.length === 0 ? (
                            <div className="bg-white p-12 rounded-3xl text-center border border-dashed border-gray-300">
                                <ShoppingBag className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                                <h3 className="text-lg font-bold text-gray-500">Sem pedidos anteriores</h3>
                                <p className="text-gray-400">Quando fizer a sua primeira encomenda, ela aparecerá aqui.</p>
                                <button onClick={() => navigate('/menu')} className="mt-6 bg-[#d9a65a] text-[#3b2f2f] px-6 py-2 rounded-full font-bold">
                                    Explorar Menu
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
                                                    <p className="font-bold text-[#3b2f2f]">Pedido {order.short_id || `#${order.id.slice(0, 6)}`}</p>
                                                    <p className="text-sm text-gray-500">
                                                        {new Date(order.created_at).toLocaleDateString('pt-PT', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className="font-bold text-lg text-[#3b2f2f]">{Number(order.total_amount).toFixed(2)} MT</p>
                                                <span className="text-xs uppercase tracking-wider font-bold bg-gray-100 px-2 py-1 rounded-full text-gray-600">
                                                    {order.delivery_type === 'delivery' ? 'Entrega' : order.delivery_type === 'pickup' ? 'Levantamento' : 'Mesa'}
                                                </span>
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <p className="text-sm font-bold text-gray-500 mb-2">Itens:</p>
                                            {order.order_items?.map((item: any) => (
                                                <div key={item.id} className="flex justify-between text-sm">
                                                    <span className="text-gray-700">{item.quantity}x {item.product_name}</span>
                                                    <span className="text-gray-500">{(item.subtotal || (item.quantity * item.price)).toFixed(2)} MT</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Right: Support Contact */}
                    <div className="space-y-6">
                        <div className="bg-[#3b2f2f] text-white p-8 rounded-3xl relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-[#d9a65a]/10 rounded-full blur-3xl -mr-16 -mt-16" />

                            <h2 className="font-serif text-2xl text-[#d9a65a] mb-2 flex items-center gap-3">
                                <MessageSquare className="w-6 h-6" />
                                Suporte Direto
                            </h2>
                            <p className="text-gray-300 text-sm mb-6 leading-relaxed">
                                Tem alguma questão sobre a sua encomenda? Precisa de ajuda? Fale com a equipa de suporte aqui.
                            </p>

                            {supportStatus === 'success' && (
                                <div className="bg-green-500/20 text-green-300 p-4 rounded-xl text-sm font-bold mb-6">
                                    Mensagem enviada com sucesso! Responderemos o mais breve possível.
                                </div>
                            )}

                            {supportStatus === 'error' && (
                                <div className="bg-red-500/20 text-red-300 p-4 rounded-xl text-sm font-bold mb-6 animate-shake">
                                    Erro ao enviar. Tente novamente ou use o nosso WhatsApp.
                                </div>
                            )}

                            <form onSubmit={handleSupportSubmit} className="space-y-4">
                                <textarea
                                    required
                                    value={supportMsg}
                                    onChange={(e) => setSupportMsg(e.target.value)}
                                    placeholder="Escreva a sua mensagem detalhada aqui..."
                                    className="w-full h-32 p-4 rounded-xl bg-white/10 border border-white/20 focus:border-[#d9a65a] focus:bg-white/15 outline-none resize-none placeholder:text-gray-400 transition-all text-sm"
                                ></textarea>

                                <button
                                    type="submit"
                                    disabled={isSubmittingSupport || supportMsg.trim().length === 0}
                                    className="w-full bg-[#d9a65a] text-[#3b2f2f] py-3 rounded-xl font-bold uppercase tracking-widest hover:bg-white transition-all disabled:opacity-50"
                                >
                                    {isSubmittingSupport ? 'A Enviar...' : 'Enviar Mensagem'}
                                </button>
                            </form>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
