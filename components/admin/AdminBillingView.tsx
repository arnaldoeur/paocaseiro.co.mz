import React, { useState, useEffect } from 'react';
import { supabase, generateReceipt, previewDocumentPDF } from '../../services/supabase';
import { FileText, Search, ExternalLink, Plus, RefreshCw, X, User, CheckCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// --- Loading SVG ---
const Loader = ({ className = '', size = 24 }: { className?: string; size?: number }) => (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
    </svg>
);

// --- Billing Details Modal ---
const BillingDetailsModal = ({ doc, onClose, onRefresh }: { doc: any, onClose: () => void, onRefresh: () => void }) => {
    const [generatingPreview, setGeneratingPreview] = useState(false);
    const [markingPaid, setMarkingPaid] = useState(false);

    const handleOpenPDF = async () => {
        setGeneratingPreview(true);
        try {
            const blobUrl = await previewDocumentPDF(doc);
            if (blobUrl) {
                window.open(blobUrl, '_blank');
            } else {
                alert("Não foi possível gerar a pré-visualização. Verifique os dados do documento.");
            }
        } catch (e) {
            console.error(e);
            alert("Ocorreu um erro ao gerar pré-visualização.");
        } finally {
            setGeneratingPreview(false);
        }
    };

    const handleMarkAsPaid = async () => {
        setMarkingPaid(true);
        try {
            // Update current document to paid
            const { error: updateError } = await supabase.from('receipts')
                .update({ status: 'paid' })
                .eq('id', doc.id);
                
            if (updateError) throw updateError;

            // Generate paired Recibo since it was an invoice that just got paid
            const shortIdStr = doc.receipt_no.split('-').pop() || '000';
            await generateReceipt(
                doc.order_id,
                shortIdStr,
                doc.customer_id,
                doc.customer_name,
                doc.items,
                doc.total_amount,
                'Receipt', // Gen the Receipt natively
                true,
                false // Do not loop paired gen since invoice already exists
            );

            alert("Fatura marcada como Paga e correspondente Recibo criado com sucesso!");
            onRefresh();
            onClose();
        } catch (err) {
            console.error(err);
            alert("Não foi possível alterar o estado da fatura.");
        } finally {
            setMarkingPaid(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-white rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col">
                <div className="p-6 bg-[#3b2f2f] text-[#d9a65a] flex justify-between items-center rounded-t-3xl">
                    <h3 className="font-serif text-2xl font-bold flex items-center gap-2">
                        <FileText size={24} />
                        Detalhes do Documento
                    </h3>
                    <button onClick={onClose} className="text-white/70 hover:text-white bg-white/10 hover:bg-white/20 p-2 rounded-full transition-all">
                        <X size={20} />
                    </button>
                </div>
                
                <div className="p-6 md:p-8 overflow-y-auto flex-1 bg-[#fcfbf9]">
                    <div className="flex justify-between items-start border-b border-gray-200 pb-6 mb-6">
                        <div>
                            <p className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-1">Documento</p>
                            <h4 className="text-2xl font-black text-[#3b2f2f]">{doc.receipt_no}</h4>
                            <p className="text-gray-500 font-medium">{doc.document_type === 'Invoice' ? 'Fatura' : 'Recibo'} - {doc.status === 'paid' ? 'Pago' : 'Pendente'}</p>
                        </div>
                        <div className="text-right">
                            <p className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-1">Data de Emissão</p>
                            <p className="text-lg font-bold text-[#3b2f2f]">
                                {new Date(doc.created_at).toLocaleDateString('pt-PT', { day: '2-digit', month: 'long', year: 'numeric' })}
                            </p>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-8 mb-8">
                        <div>
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 flex items-center gap-1"><User size={14}/> Cliente Faturado</p>
                            <p className="font-bold text-gray-800">{doc.customer_name || 'Consumidor Final'}</p>
                            {doc.customer_phone && <p className="text-sm text-gray-500">{doc.customer_phone}</p>}
                        </div>
                        <div>
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Montante Total</p>
                            <p className="text-2xl font-black text-green-600">{doc.total_amount?.toLocaleString()} MT</p>
                            <p className="text-xs text-gray-400 mt-1">Impostos Inclusos à taxa legal</p>
                        </div>
                    </div>

                    <div className="bg-white border text-sm rounded-2xl overflow-hidden shadow-sm">
                        <table className="w-full text-left">
                            <thead className="bg-gray-50 uppercase text-xs font-bold text-gray-400">
                                <tr>
                                    <th className="p-4">Artigo</th>
                                    <th className="p-4 text-center">Qtd</th>
                                    <th className="p-4 text-right">Preço Unit</th>
                                    <th className="p-4 text-right">Subtotal</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {doc.items && doc.items.length > 0 ? doc.items.map((item: any, i: number) => (
                                    <tr key={i} className="hover:bg-gray-50 transition-colors">
                                        <td className="p-4 text-gray-700 font-medium">{item.name || item.product_name}</td>
                                        <td className="p-4 text-center text-gray-500">{item.quantity}</td>
                                        <td className="p-4 text-right text-gray-500">{item.price?.toLocaleString()} MT</td>
                                        <td className="p-4 text-right font-bold text-gray-700">{(item.quantity * item.price)?.toLocaleString()} MT</td>
                                    </tr>
                                )) : (
                                    <tr>
                                        <td colSpan={4} className="p-6 text-center text-gray-400">Detalhes de artigos indísponiveis neste registo antigo.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
                
                <div className="p-6 border-t border-gray-100 bg-white flex flex-wrap justify-between items-center gap-4">
                    <div>
                        {doc.document_type === 'Invoice' && doc.status === 'pending' && (
                            <button 
                                onClick={handleMarkAsPaid}
                                disabled={markingPaid}
                                className="px-6 py-3 bg-green-600 text-white rounded-xl font-bold hover:shadow-lg transition-all flex items-center gap-2 disabled:opacity-50"
                            >
                                {markingPaid ? <Loader className="animate-spin" size={20} /> : <CheckCircle size={20} />} Marcar como Paga (Gerar Recibo)
                            </button>
                        )}
                    </div>
                    <button 
                        onClick={handleOpenPDF}
                        disabled={generatingPreview}
                        className="px-6 py-3 bg-[#3b2f2f] text-[#d9a65a] rounded-xl font-bold hover:shadow-lg transition-all flex items-center gap-2 disabled:opacity-50"
                    >
                        {generatingPreview ? <Loader className="animate-spin" size={20} /> : <ExternalLink size={20} />} Abrir PDF Original
                    </button>
                </div>
            </motion.div>
        </div>
    );
};

// --- Create Document Modal ---
const CreateDocumentModal = ({ type, onClose, onSuccess }: { type: 'Receipt'|'Invoice', onClose: () => void, onSuccess: () => void }) => {
    const [loading, setLoading] = useState(false);
    const [products, setProducts] = useState<any[]>([]);
    
    // Form fields
    const [customerName, setCustomerName] = useState('');
    const [customerPhone, setCustomerPhone] = useState('');
    const [customerLocation, setCustomerLocation] = useState('');
    const [customerEmail, setCustomerEmail] = useState('');
    const [customerNuit, setCustomerNuit] = useState('');
    const [status, setStatus] = useState(type === 'Receipt' ? 'paid' : 'pending');
    
    const [cart, setCart] = useState<{product: any, quantity: number, price: number}[]>([]);
    const [selectedProductInput, setSelectedProductInput] = useState('');
    const [customers, setCustomers] = useState<any[]>([]);

    useEffect(() => {
        const fetchProds = async () => {
            const { data } = await supabase.from('products').select('*').order('name');
            if (data) setProducts(data);
        };
        const fetchCustomers = async () => {
            const { data } = await supabase.from('customers').select('*').order('name');
            if (data) setCustomers(data);
        };
        fetchProds();
        fetchCustomers();
    }, []);

    // Auto-fill customer details when phone changes
    useEffect(() => {
        if (customerPhone && customerPhone.length >= 9) {
            const matched = customers.find(c => c.contact_no === customerPhone || c.contact_no?.includes(customerPhone.replace(/\D/g, '')));
            if (matched) {
                if (!customerName) setCustomerName(matched.name || '');
                if (!customerEmail) setCustomerEmail(matched.email || '');
                if (!customerNuit) setCustomerNuit(matched.nuit || '');
                if (!customerLocation) setCustomerLocation(matched.address || '');
            }
        }
    }, [customerPhone, customers]);

    const handleAddToCart = () => {
        const product = products.find(p => p.name.toLowerCase() === selectedProductInput.trim().toLowerCase());
        if (!product) {
            alert("Artigo não encontrado no catálogo. Selecione uma opção válida da lista.");
            return;
        }
        
        const existing = cart.find(c => c.product.id === product.id);
        if (existing) {
            setCart(cart.map(c => c.product.id === product.id ? { ...c, quantity: c.quantity + 1 } : c));
        } else {
            setCart([...cart, { product, quantity: 1, price: product.price }]);
        }
        setSelectedProductInput('');
    };

    const handleRemoveFromCart = (productId: string) => {
        setCart(cart.filter(c => c.product.id !== productId));
    };

    const handleGenerate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (cart.length === 0) return alert("Selecione pelo menos 1 artigo para a faturação.");

        setLoading(true);
        try {
            const totalAmount = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
            const itemsFormatted = cart.map(c => ({
                id: c.product.id,
                product_id: c.product.id,
                name: c.product.name,
                price: c.price,
                quantity: c.quantity
            }));
            
            // Generate a fake 'order_id' as this is manual
            const fakeOrderId = 'MANUAL-' + Date.now();
            const shortId = Date.now().toString().slice(-5);
            
            const { data } = await supabase.from('customers').insert({
                 name: customerName, 
                 contact_no: customerPhone || `MANUAL-${shortId}`,
                 nuit: customerNuit,
                 address: customerLocation,
                 email: customerEmail
            }).select().single();
            
            const customerId = data?.id || 'manual-customer';
            
            // Paired document constraint
            // If it's a paid Invoice or a Receipt, we generate Paired Document = true!
            const isPaid = status === 'paid';
            const shouldGeneratePaired = isPaid; // Ensures company gets Receipt and client gets Invoice if applicable
            
            const docMetadata = {
                customer_phone: customerPhone,
                customer_nuit: customerNuit,
                customer_address: customerLocation,
                customer_email: customerEmail,
            };

            await generateReceipt(
                fakeOrderId,
                shortId,
                customerId,
                customerName || 'Cliente Consumidor Mz',
                itemsFormatted,
                totalAmount,
                type,
                true, // generate PDF upload
                shouldGeneratePaired,
                docMetadata
            );
            
            alert(`${type === 'Invoice' ? 'Fatura' : 'Recibo'} gerado com sucesso!`);
            onSuccess();
        } catch (error) {
            console.error(error);
            alert("Erro ao emitir o documento.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-[#fcfbf9] rounded-3xl w-full max-w-3xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col">
                <div className="p-6 bg-[#3b2f2f] text-[#d9a65a] flex justify-between items-center">
                    <h3 className="font-serif text-2xl font-bold flex items-center gap-2">
                        <Plus size={24} />
                        Gerar Objeto de Faturação: {type === 'Invoice' ? 'Fatura' : 'Recibo'}
                    </h3>
                    <button onClick={onClose} className="text-white/70 hover:text-white bg-white/10 hover:bg-white/20 p-2 rounded-full transition-all">
                        <X size={20} />
                    </button>
                </div>
                
                <form onSubmit={handleGenerate} className="flex-1 overflow-y-auto p-6 md:p-8 space-y-8">
                    {/* Client Info Section */}
                    <div className="space-y-4">
                        <h4 className="font-bold text-[#3b2f2f] uppercase tracking-widest text-xs border-b border-gray-200 pb-2">Detalhes do Cliente</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Nome do Cliente *</label>
                                <input required list="billing-customers-name-list" type="text" value={customerName} onChange={e => {
                                    setCustomerName(e.target.value);
                                    const matched = customers.find(c => c.name === e.target.value);
                                    if (matched) {
                                        if (!customerPhone) setCustomerPhone(matched.contact_no || '');
                                        if (!customerEmail) setCustomerEmail(matched.email || '');
                                        if (!customerNuit) setCustomerNuit(matched.nuit || '');
                                        if (!customerLocation) setCustomerLocation(matched.address || '');
                                    }
                                }} className="w-full p-3 border border-gray-200 rounded-xl outline-none focus:border-[#d9a65a] bg-white shadow-sm" placeholder="Nome completo" />
                                <datalist id="billing-customers-name-list">
                                    {customers.map(c => (
                                        <option key={c.id} value={c.name || ''}>{c.contact_no}</option>
                                    ))}
                                </datalist>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Telemóvel / WhatsApp</label>
                                <input type="tel" list="billing-customers-phone-list" value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} className="w-full p-3 border border-gray-200 rounded-xl outline-none focus:border-[#d9a65a] bg-white shadow-sm font-bold text-[#d9a65a]" placeholder="Ex: 840000000" />
                                <datalist id="billing-customers-phone-list">
                                    {customers.map(c => (
                                        <option key={c.id} value={c.contact_no || ''}>{c.name}</option>
                                    ))}
                                </datalist>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Localização</label>
                                <input type="text" value={customerLocation} onChange={e => setCustomerLocation(e.target.value)} className="w-full p-3 border border-gray-200 rounded-xl outline-none focus:border-[#d9a65a] bg-white shadow-sm" placeholder="Endereço ou Bairro" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Email</label>
                                <input type="email" value={customerEmail} onChange={e => setCustomerEmail(e.target.value)} className="w-full p-3 border border-gray-200 rounded-xl outline-none focus:border-[#d9a65a] bg-white shadow-sm" placeholder="Email do cliente" />
                            </div>
                            <div className="md:col-span-2">
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">NUIT (Opcional)</label>
                                <input type="text" value={customerNuit} onChange={e => setCustomerNuit(e.target.value)} className="w-full p-3 border border-gray-200 rounded-xl outline-none focus:border-[#d9a65a] bg-white shadow-sm" placeholder="Número Único de Identificação Tributária" />
                            </div>
                        </div>
                    </div>

                    {/* Status if Invoice */}
                    {type === 'Invoice' && (
                        <div className="space-y-4">
                            <h4 className="font-bold text-[#3b2f2f] uppercase tracking-widest text-xs border-b border-gray-200 pb-2">Estado Financeiro</h4>
                            <div className="flex gap-4">
                                <label className="flex items-center gap-2 cursor-pointer bg-white p-3 border border-gray-200 rounded-xl shadow-sm hover:border-[#d9a65a] flex-1">
                                    <input type="radio" checked={status === 'paid'} onChange={() => setStatus('paid')} className="w-4 h-4 accent-[#d9a65a]" />
                                    <span className="font-bold text-sm text-gray-700">Paga (Gera um Recibo automático)</span>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer bg-white p-3 border border-gray-200 rounded-xl shadow-sm hover:border-[#d9a65a] flex-1">
                                    <input type="radio" checked={status === 'pending'} onChange={() => setStatus('pending')} className="w-4 h-4 accent-[#d9a65a]" />
                                    <span className="font-bold text-sm text-gray-700">Pendente de Pagamento</span>
                                </label>
                            </div>
                        </div>
                    )}

                    {/* Items Section */}
                    <div className="space-y-4">
                        <h4 className="font-bold text-[#3b2f2f] uppercase tracking-widest text-xs border-b border-gray-200 pb-2">Catálogo de Artigos Faturados</h4>
                        <div className="flex flex-col sm:flex-row gap-2 relative">
                            <input 
                                list="products-list-form"
                                value={selectedProductInput}
                                onChange={e => setSelectedProductInput(e.target.value)}
                                placeholder="Comece a digitar para pesquisar um artigo..."
                                className="flex-1 p-3 border border-gray-200 rounded-xl outline-none focus:border-[#d9a65a] bg-white shadow-sm"
                            />
                            <datalist id="products-list-form">
                                {products.map(p => (
                                    <option key={p.id} value={p.name} />
                                ))}
                            </datalist>

                            <button type="button" onClick={handleAddToCart} disabled={!selectedProductInput.trim()} className="bg-[#3b2f2f] text-white px-6 py-3 sm:py-0 rounded-xl font-bold hover:bg-black transition-colors disabled:opacity-50 whitespace-nowrap">Adicionar</button>
                        </div>

                        {cart.length > 0 && (
                            <div className="bg-white border rounded-xl shadow-sm overflow-hidden mt-4">
                                <div className="overflow-x-auto">
                                <table className="w-full text-left text-sm min-w-[500px]">
                                    <thead className="bg-gray-50 border-b">
                                        <tr>
                                            <th className="p-3 text-gray-500 font-bold w-1/2">Artigo</th>
                                            <th className="p-3 text-gray-500 font-bold text-center w-20">Qtd</th>
                                            <th className="p-3 text-gray-500 font-bold text-right w-1/4">Preço</th>
                                            <th className="p-3 w-12"></th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50">
                                        {cart.map((c, i) => (
                                            <tr key={i} className="hover:bg-gray-50">
                                                <td className="p-3 font-medium text-gray-800 break-words">{c.product.name}</td>
                                                <td className="p-3 text-center">
                                                    <input 
                                                        type="number" min="1" 
                                                        value={c.quantity} 
                                                        onChange={(e) => {
                                                            const newCart = [...cart];
                                                            newCart[i].quantity = parseInt(e.target.value) || 1;
                                                            setCart(newCart);
                                                        }}
                                                        className="w-16 p-1 border rounded text-center mx-auto"
                                                    />
                                                </td>
                                                <td className="p-3 text-right text-gray-600">{(c.price * c.quantity).toLocaleString()} MT</td>
                                                <td className="p-3 text-center">
                                                    <button type="button" onClick={() => handleRemoveFromCart(c.product.id)} className="text-red-400 hover:text-red-600 p-1">
                                                        <X size={16} />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                                </div>
                                <div className="p-4 bg-gray-50 text-right border-t flex justify-end items-center gap-4">
                                    <span className="text-gray-500 uppercase font-bold text-xs">Total:</span>
                                    <span className="text-2xl font-black text-green-600">{cart.reduce((sum, item) => sum + (item.price * item.quantity), 0).toLocaleString()} MT</span>
                                </div>
                            </div>
                        )}
                    </div>
                    
                    <button type="submit" disabled={loading} className="w-full bg-[#3b2f2f] text-[#d9a65a] py-4 rounded-xl font-bold uppercase tracking-widest hover:shadow-lg transition-all disabled:opacity-50 mt-4 flex justify-center items-center gap-2">
                        {loading && <Loader className="animate-spin" size={18} />} Instanciar Documento PDF Integrado
                    </button>
                </form>
            </motion.div>
        </div>
    );
};

export const AdminBillingView: React.FC = () => {
    const [receipts, setReceipts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterType, setFilterType] = useState<'All' | 'Receipt' | 'Invoice'>('All');

    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [createType, setCreateType] = useState<'Receipt' | 'Invoice'>('Invoice');
    
    const [selectedDoc, setSelectedDoc] = useState<any | null>(null);
    const [generatingRowPdf, setGeneratingRowPdf] = useState<string | null>(null);

    useEffect(() => {
        loadBillingData();
    }, [filterType]);

    const loadBillingData = async () => {
        setLoading(true);
        try {
            let query = supabase.from('receipts').select('*').order('created_at', { ascending: false }).limit(200);
            if (filterType !== 'All') query = query.eq('document_type', filterType);
            
            const { data, error } = await query;
            if (error) throw error;
            if (data) setReceipts(data);
        } catch (e) {
            console.error("Failed to load billing data", e);
        } finally {
            setLoading(false);
        }
    };

    const handleOpenPDF = async (doc: any) => {
        setGeneratingRowPdf(doc.id);
        try {
            const blobUrl = await previewDocumentPDF(doc);
            if (blobUrl) {
                window.open(blobUrl, '_blank');
            } else {
                alert("Não foi possível gerar a pré-visualização. Verifique os dados do documento.");
            }
        } catch (e) {
            console.error(e);
            alert("Ocorreu um erro ao gerar pré-visualização.");
        } finally {
            setGeneratingRowPdf(null);
        }
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('pt-MZ', { style: 'currency', currency: 'MZN' }).format(amount || 0);
    };

    const filteredReceipts = receipts.filter(r => 
        (r.receipt_no && r.receipt_no.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (r.customer_name && r.customer_name.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    return (
        <div className="flex flex-col h-full bg-[#fcfbf9] text-[#3b2f2f] animate-fade-in relative z-10 p-2 sm:p-6 md:p-10 w-full min-h-[70vh]">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-8">
                <div>
                    <h2 className="text-3xl font-serif font-bold text-[#3b2f2f] flex items-center gap-3">
                        <FileText className="text-[#d9a65a]" size={32} />
                        Faturação
                    </h2>
                    <p className="text-gray-500 mt-2">Acompanhe todos os Recibos e Faturas emitidos.</p>
                </div>
                
                <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                    <button 
                        onClick={() => { setCreateType('Invoice'); setIsCreateModalOpen(true); }}
                        className="px-4 py-3 bg-[#d9a65a] text-white rounded-xl font-bold hover:bg-[#c49248] transition-colors shadow-sm flex items-center gap-2"
                    >
                        <Plus size={20} /> Nova Fatura
                    </button>
                    <button 
                        onClick={() => { setCreateType('Receipt'); setIsCreateModalOpen(true); }}
                        className="px-4 py-3 bg-[#3b2f2f] text-[#d9a65a] rounded-xl font-bold hover:bg-[#2a2121] transition-colors shadow-sm flex items-center gap-2"
                    >
                        <Plus size={20} /> Novo Recibo
                    </button>
                    <button 
                        onClick={loadBillingData}
                        className="p-3 bg-white border border-gray-200 text-gray-600 rounded-xl hover:bg-gray-50 transition-colors shadow-sm"
                        title="Atualizar"
                    >
                        <RefreshCw size={20} className={loading ? "animate-spin" : ""} />
                    </button>
                </div>
            </div>

            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden flex flex-col min-h-[500px]">
                {/* Toolbar */}
                <div className="p-4 sm:p-6 border-b border-gray-100 bg-gray-50 flex flex-col lg:flex-row gap-4 justify-between items-center">
                    <div className="relative w-full lg:w-96">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                        <input
                            type="text"
                            placeholder="Buscar por cliente ou n.º documento..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-12 pr-4 py-3 bg-white border border-gray-200 rounded-xl outline-none focus:border-[#d9a65a] transition-colors shadow-sm"
                        />
                    </div>
                    
                    <div className="flex items-center gap-2 w-full lg:w-auto bg-white p-1 rounded-xl border border-gray-200 shadow-sm overflow-w-auto justify-center">
                        <button
                            onClick={() => setFilterType('All')}
                            className={`px-4 sm:px-6 py-2 rounded-lg text-sm font-bold transition-all whitespace-nowrap ${filterType === 'All' ? 'bg-[#3b2f2f] text-white shadow' : 'text-gray-500 hover:bg-gray-50'}`}
                        >
                            Todos
                        </button>
                        <button
                            onClick={() => setFilterType('Invoice')}
                            className={`px-4 sm:px-6 py-2 rounded-lg text-sm font-bold transition-all whitespace-nowrap ${filterType === 'Invoice' ? 'bg-[#d9a65a] text-white shadow' : 'text-gray-500 hover:bg-gray-50'}`}
                        >
                            Faturas
                        </button>
                        <button
                            onClick={() => setFilterType('Receipt')}
                            className={`px-4 sm:px-6 py-2 rounded-lg text-sm font-bold transition-all whitespace-nowrap ${filterType === 'Receipt' ? 'bg-amber-100 text-amber-800 shadow' : 'text-gray-500 hover:bg-gray-50'}`}
                        >
                            Recibos
                        </button>
                    </div>
                </div>

                {/* Data Table */}
                <div className="flex-1 overflow-x-auto">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center h-64 text-gray-400">
                            <Loader size={32} className="animate-spin text-[#d9a65a] mb-4" />
                            <p>Carregando documentos...</p>
                        </div>
                    ) : filteredReceipts.length === 0 ? (
                        <div className="flex flex-col items-center justify-center p-12 text-center text-gray-400">
                            <FileText size={48} className="mb-4 text-gray-300" />
                            <p className="text-lg font-bold text-gray-600 mb-2">Nenhum documento encontrado</p>
                            <p className="max-w-md">Não foram encontrados recibos ou faturas com os filtros atuais.</p>
                        </div>
                    ) : (
                        <table className="w-full text-left border-collapse min-w-[700px]">
                            <thead>
                                <tr className="bg-white border-b border-gray-100">
                                    <th className="p-4 sm:p-6 text-xs font-bold text-gray-400 uppercase tracking-widest whitespace-nowrap">Data</th>
                                    <th className="p-4 sm:p-6 text-xs font-bold text-gray-400 uppercase tracking-widest whitespace-nowrap">Tipo</th>
                                    <th className="p-4 sm:p-6 text-xs font-bold text-gray-400 uppercase tracking-widest whitespace-nowrap">N.º Documento</th>
                                    <th className="p-4 sm:p-6 text-xs font-bold text-gray-400 uppercase tracking-widest">Cliente</th>
                                    <th className="p-4 sm:p-6 text-xs font-bold text-gray-400 uppercase tracking-widest text-right whitespace-nowrap">Total</th>
                                    <th className="p-4 sm:p-6 text-xs font-bold text-gray-400 uppercase tracking-widest text-center">Estado / Ações</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredReceipts.map((r, i) => (
                                    <motion.tr 
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: i * 0.05 }}
                                        key={r.id} 
                                        onDoubleClick={() => setSelectedDoc(r)}
                                        className="border-b border-gray-50 hover:bg-amber-50/30 transition-colors cursor-pointer"
                                        title="Dê um duplo clique para ver os detalhes completos"
                                    >
                                        <td className="p-4 sm:p-6 text-sm text-gray-600 whitespace-nowrap">
                                            {new Date(r.created_at).toLocaleDateString('pt-PT', { day: '2-digit', month: 'short', year: 'numeric' })}
                                        </td>
                                        <td className="p-4 sm:p-6">
                                            <span className={`px-3 py-1 rounded-full text-xs font-bold flex items-center justify-center gap-1 w-20 ${r.document_type === 'Invoice' ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-700'}`}>
                                                {r.document_type === 'Invoice' ? 'Fatura' : 'Recibo'}
                                            </span>
                                        </td>
                                        <td className="p-4 sm:p-6 font-bold text-[#3b2f2f] whitespace-nowrap">
                                            {r.receipt_no}
                                        </td>
                                        <td className="p-4 sm:p-6 text-sm font-semibold text-gray-700">
                                            {r.customer_name || 'Consumidor Final'}
                                        </td>
                                        <td className="p-4 sm:p-6 font-bold text-right text-green-600 whitespace-nowrap">
                                            {formatCurrency(r.total_amount)}
                                        </td>
                                        <td className="p-4 sm:p-6 relative">
                                            <div className="flex justify-center items-center gap-3">
                                                 <span className={`px-2 py-1 rounded w-16 text-center text-[10px] font-bold uppercase tracking-wider ${r.status === 'paid' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                                                    {r.status === 'paid' ? 'Pago' : 'Pendente'}
                                                </span>
                                                <button 
                                                    onClick={(e) => { e.stopPropagation(); handleOpenPDF(r); }}
                                                    disabled={generatingRowPdf === r.id}
                                                    className="p-2 bg-gray-100 text-gray-600 hover:bg-[#d9a65a] hover:text-white rounded-lg transition-colors flex items-center justify-center disabled:opacity-50"
                                                    title={`Abrir e Gerar PDF do Documento`}
                                                >
                                                    {generatingRowPdf === r.id ? <Loader className="animate-spin" size={18} /> : <ExternalLink size={18} />}
                                                </button>
                                            </div>
                                        </td>
                                    </motion.tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>

            <AnimatePresence>
                {selectedDoc && (
                    <BillingDetailsModal 
                        doc={selectedDoc} 
                        onClose={() => setSelectedDoc(null)} 
                        onRefresh={() => {
                            setSelectedDoc(null);
                            loadBillingData();
                        }}
                    />
                )}

                {isCreateModalOpen && (
                    <CreateDocumentModal 
                        type={createType} 
                        onClose={() => setIsCreateModalOpen(false)} 
                        onSuccess={() => {
                            setIsCreateModalOpen(false);
                            loadBillingData();
                        }}
                    />
                )}
            </AnimatePresence>
        </div>
    );
};
