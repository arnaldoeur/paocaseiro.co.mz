import React, { useState, useEffect } from 'react';
import { supabase } from '../../services/supabase';
import { Mail, ShieldCheck, Search, Trash2, Download, X, MessageSquare, ShoppingBag, Loader, CalendarDays, User } from 'lucide-react';

interface Subscriber {
    id: string;
    name: string;
    email: string;
    status: string;
    created_at: string;
    isClient?: boolean;
}

interface SubscriberDetails {
    comments: any[];
    orders: any[];
    loading: boolean;
}

export const AdminNewsletterView: React.FC = () => {
    const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    
    // Modal state
    const [selectedSub, setSelectedSub] = useState<Subscriber | null>(null);
    const [subDetails, setSubDetails] = useState<SubscriberDetails>({ comments: [], orders: [], loading: false });

    useEffect(() => {
        loadSubscribers();
    }, []);

    const loadSubscribers = async () => {
        setLoading(true);
        try {
            const { data: subsData, error: subsError } = await supabase
                .from('newsletter_subscribers')
                .select('*')
                .order('created_at', { ascending: false });

            if (subsError) throw subsError;

            const { data: custData, error: custError } = await supabase
                .from('customers')
                .select('email, contact_no');

            if (custError) throw custError;

            const customersEmails = new Set(custData?.map(c => c.email?.toLowerCase()).filter(Boolean));

            const mapped: Subscriber[] = (subsData || []).map(sub => ({
                ...sub,
                isClient: customersEmails.has(sub.email.toLowerCase())
            }));

            setSubscribers(mapped);
        } catch (error) {
            console.error('Error loading subscribers:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (e: React.MouseEvent, id: string, email: string) => {
        e.stopPropagation();
        if (!window.confirm(`Tem a certeza que deseja remover ${email} da newsletter?`)) return;
        try {
            const { error } = await supabase.from('newsletter_subscribers').delete().eq('id', id);
            if (error) throw error;
            setSubscribers(prev => prev.filter(s => s.id !== id));
            if (selectedSub?.id === id) setSelectedSub(null);
        } catch (error) {
            console.error('Error deleting subscriber:', error);
            alert('Erro ao remover subscritor.');
        }
    };

    const handleExportCSV = () => {
        if (subscribers.length === 0) return;
        
        const headers = ['Nome', 'Email', 'Data de Registo', 'É Cliente (Sim/Nao)'];
        const csvRows = [headers.join(',')];
        
        subscribers.forEach(sub => {
            const row = [
                `"${sub.name}"`,
                `"${sub.email}"`,
                `"${new Date(sub.created_at).toLocaleDateString('pt-PT')}"`,
                sub.isClient ? 'Sim' : 'Nao'
            ];
            csvRows.push(row.join(','));
        });
        
        const csvString = csvRows.join('\n');
        const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `subscritores_paocaseiro_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const openSubscriberModal = async (sub: Subscriber) => {
        setSelectedSub(sub);
        setSubDetails({ comments: [], orders: [], loading: true });
        
        try {
            const { data: comments } = await supabase
                .from('blog_comments')
                .select('content, created_at, blog_posts(title)')
                .eq('author_email', sub.email)
                .order('created_at', { ascending: false })
                .limit(5);

            let orders: any[] = [];
            if (sub.isClient) {
                const { data: customerData } = await supabase
                    .from('customers')
                    .select('id')
                    .eq('email', sub.email)
                    .single();
                    
                if (customerData) {
                    const { data: ordersData } = await supabase
                        .from('orders')
                        .select('id, created_at, total_amount, status')
                        .eq('customer_id', customerData.id)
                        .order('created_at', { ascending: false })
                        .limit(5);
                    orders = ordersData || [];
                }
            }

            setSubDetails({ comments: comments || [], orders, loading: false });
        } catch (error) {
            console.error('Error fetching details:', error);
            setSubDetails(prev => ({ ...prev, loading: false }));
        }
    };

    const filtered = subscribers.filter(s => 
        s.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        s.email.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div>
            {/* Header Block exactly matching Repository/Gallery UI */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 bg-white p-6 rounded-[2rem] shadow-sm border border-gray-100 gap-4">
                <div>
                    <h3 className="font-bold text-[#3b2f2f] text-lg">Subscritores da Newsletter</h3>
                    <p className="text-sm text-gray-500">Total de {subscribers.length} subscritor(es) registado(s).</p>
                </div>
                
                <div className="flex gap-4 w-full md:w-auto">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                        <input
                            type="text"
                            placeholder="Procurar subscritor..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="bg-gray-50 border border-gray-200 rounded-xl py-2 pl-9 pr-4 text-sm focus:outline-none focus:border-[#d9a65a] w-full"
                        />
                    </div>
                    <button 
                        onClick={handleExportCSV}
                        className="bg-[#3b2f2f] text-[#d9a65a] px-5 py-2 rounded-xl font-bold text-sm shadow-md hover:bg-black transition-colors flex items-center justify-center gap-2 whitespace-nowrap"
                        disabled={subscribers.length === 0}
                    >
                        <Download size={16} /> Exportar CSV
                    </button>
                </div>
            </div>

            {/* Content List matching Gallery grid styling */}
            {loading ? (
                <div className="flex justify-center items-center py-20">
                    <Loader size={32} className="text-[#d9a65a] animate-spin" />
                </div>
            ) : filtered.length === 0 ? (
                <div className="text-center py-20 text-gray-400">
                    <Mail size={40} className="mx-auto mb-3" />
                    <p>Nenhum subscritor encontrado.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {filtered.map(sub => (
                        <div 
                            key={sub.id} 
                            onClick={() => openSubscriberModal(sub)}
                            className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm hover:shadow-lg transition-all flex flex-col relative group cursor-pointer"
                        >
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-12 h-12 rounded-full bg-[#f7f1eb] text-[#d9a65a] flex items-center justify-center font-bold text-xl uppercase shrink-0">
                                    {sub.name.charAt(0)}
                                </div>
                                <div className="overflow-hidden">
                                    <h4 className="font-bold text-[#3b2f2f] truncate text-sm">{sub.name}</h4>
                                    <p className="text-xs text-gray-500 truncate">{sub.email}</p>
                                </div>
                            </div>
                            
                            <div className="flex justify-between items-center mt-auto pt-3 border-t border-gray-50">
                                <span className="text-[10px] text-gray-400 flex items-center gap-1">
                                    <CalendarDays size={12} />
                                    {new Date(sub.created_at).toLocaleDateString('pt-PT')}
                                </span>
                                {sub.isClient && (
                                    <span className="text-[10px] font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded-md flex items-center gap-1">
                                        <ShieldCheck size={12} /> Cliente
                                    </span>
                                )}
                            </div>
                            
                            <button 
                                onClick={(e) => handleDelete(e, sub.id, sub.email)}
                                className="absolute top-3 right-3 bg-red-500 text-white p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity shadow-sm hover:bg-red-600"
                                title="Remover Subscritor"
                            >
                                <Trash2 size={14} />
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {/* Exact same Side Panel modal logic but with a cleaner cardless content flow */}
            {selectedSub && (
                <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-[#fdfcfb] shadow-2xl w-full max-w-md h-full overflow-y-auto flex flex-col animate-in slide-in-from-right duration-300 border-l border-[#d9a65a]/20">
                        <div className="p-8 pb-6 border-b border-[#d9a65a]/20 shrink-0 sticky top-0 bg-[#fdfcfb] z-10 flex justify-between items-start">
                            <div className="flex flex-col items-start gap-4">
                                <div className="w-16 h-16 rounded-full bg-white flex items-center justify-center text-[#d9a65a] shrink-0 font-serif font-bold text-3xl uppercase shadow-sm border border-[#d9a65a]/30">
                                    {selectedSub.name.charAt(0)}
                                </div>
                                <div>
                                    <h3 className="text-2xl font-bold font-serif text-[#3b2f2f] leading-none mb-2">{selectedSub.name}</h3>
                                    <p className="text-base text-gray-500">{selectedSub.email}</p>
                                </div>
                            </div>
                            <button onClick={() => setSelectedSub(null)} className="p-2 text-gray-400 hover:text-[#d9a65a] transition-colors -mt-2 -mr-2">
                                <X size={24} />
                            </button>
                        </div>
                        
                        <div className="p-8 flex-1 flex flex-col gap-10">
                            {subDetails.loading ? (
                                <div className="flex items-center gap-3 text-[#d9a65a] py-10">
                                    <Loader className="animate-spin" size={20} />
                                    <span className="font-medium text-sm uppercase tracking-wide">A carregar registos...</span>
                                </div>
                            ) : (
                                <>
                                    <div className="flex flex-col gap-3 text-sm text-gray-600">
                                        <div className="flex justify-between items-center py-2 border-b border-gray-200/60">
                                            <span className="font-bold uppercase tracking-wider text-xs text-gray-400">Estatuto</span>
                                            {selectedSub.isClient ? (
                                                <span className="font-bold text-green-700">Cliente Autorizado</span>
                                            ) : (
                                                <span className="font-bold text-gray-500">Leitor do Blog</span>
                                            )}
                                        </div>
                                        <div className="flex justify-between items-center py-2 border-b border-gray-200/60">
                                            <span className="font-bold uppercase tracking-wider text-xs text-gray-400">Registo a</span>
                                            <span className="font-medium text-[#3b2f2f]">{new Date(selectedSub.created_at).toLocaleDateString('pt-PT', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                                        </div>
                                    </div>

                                    {selectedSub.isClient && (
                                        <div>
                                            <h4 className="font-bold text-[#3b2f2f] text-sm uppercase tracking-wide mb-4 text-gray-400">
                                                Histórico E-commerce
                                            </h4>
                                            {subDetails.orders.length === 0 ? (
                                                <p className="text-gray-400 text-sm italic">Nenhum pedido efetuado ainda.</p>
                                            ) : (
                                                <div className="flex flex-col gap-4">
                                                    {subDetails.orders.map((order, i) => (
                                                        <div key={i} className="flex justify-between items-end border-b border-dashed border-gray-300 pb-3">
                                                            <div>
                                                                <div className="text-[10px] text-gray-400 mb-1">{new Date(order.created_at).toLocaleDateString('pt-PT')}</div>
                                                                <div className="font-bold text-[#3b2f2f] text-sm">#{order.id.slice(0,6).toUpperCase()}</div>
                                                            </div>
                                                            <div className="text-right">
                                                                <div className="font-bold text-[#d9a65a] text-sm mb-1">{order.total_amount} MT</div>
                                                                <div className={`text-[10px] font-bold uppercase tracking-wider ${
                                                                    order.status === 'completed' ? 'text-green-600' :
                                                                    order.status === 'cancelled' ? 'text-red-500' :
                                                                    'text-blue-500'
                                                                }`}>
                                                                    {order.status}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    <div>
                                        <h4 className="font-bold text-[#3b2f2f] text-sm uppercase tracking-wide mb-4 text-gray-400">
                                            Interações no Blog
                                        </h4>
                                        {subDetails.comments.length === 0 ? (
                                            <p className="text-gray-400 text-sm italic">Sem comentários registados.</p>
                                        ) : (
                                            <div className="flex flex-col gap-6">
                                                {subDetails.comments.map((comment, i) => (
                                                    <div key={i} className="border-l-[3px] border-[#d9a65a] pl-4">
                                                        <div className="text-[10px] font-bold text-gray-400 tracking-widest mb-1">
                                                            {new Date(comment.created_at).toLocaleDateString('pt-PT')}
                                                        </div>
                                                        <p className="text-[#3b2f2f] text-sm italic leading-relaxed mb-2">"{comment.content}"</p>
                                                        <p className="text-[10px] text-gray-500">Comentado em: <span className="font-bold">{comment.blog_posts?.title}</span></p>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
