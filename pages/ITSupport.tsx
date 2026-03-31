import React, { useState, useEffect } from 'react';
import { Lock, Server, MessageSquare, CheckCircle, Clock, LayoutDashboard, Settings, Mail, ShoppingCart, Users, Trash2, Download, RefreshCw, FileText, Check, X, Smartphone, DollarSign, AlertTriangle, Send, Megaphone, Edit, Plus } from 'lucide-react';
import { supabase } from '../services/supabase';
import { sendEmail } from '../services/email';
import { sendSMS } from '../services/sms';

export const ITSupport: React.FC = () => {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [currentUser, setCurrentUser] = useState<any>(null);

    const [activeTab, setActiveTab] = useState('dashboard');
    const [loading, setLoading] = useState(false);
    const [isMaintenance, setIsMaintenance] = useState(false);
    const [isPanic, setIsPanic] = useState(false);
    const [replyingTo, setReplyingTo] = useState<string | null>(null);
    const [replyText, setReplyText] = useState('');
    const [replyFile, setReplyFile] = useState<File | null>(null);
    const [sendingReply, setSendingReply] = useState(false);
    
    // Broadcast State
    const [broadcastSubject, setBroadcastSubject] = useState('');
    const [broadcastText, setBroadcastText] = useState('');
    const [broadcastChannel, setBroadcastChannel] = useState<'email' | 'sms'>('email');
    const [isBroadcasting, setIsBroadcasting] = useState(false);
    const [broadcastProgress, setBroadcastProgress] = useState({ current: 0, total: 0 });

    // Blog & Team Edit State
    const [editingComment, setEditingComment] = useState<string | null>(null);
    const [editCommentText, setEditCommentText] = useState('');
    
    const [showTeamModal, setShowTeamModal] = useState(false);
    const [editingTeam, setEditingTeam] = useState<any | null>(null);
    const [teamForm, setTeamForm] = useState({ name: '', username: '', role: 'Admin', password: '', email: '', phone: '' });

    // Data States
    const [stats, setStats] = useState({ activeTickets: 0, totalOrders: 0, totalSmsCost: 0, failedOrders: 0, totalSentMsgs: 0 });
    const [smsLogs, setSmsLogs] = useState<any[]>([]);
    const [smsConfig, setSmsConfig] = useState({ sms: 1.62, whatsapp: 0.50, email: 0 });
    const [orders, setOrders] = useState<any[]>([]);
    const [messages, setMessages] = useState<any[]>([]);
    const [comments, setComments] = useState<any[]>([]);
    const [team, setTeam] = useState<any[]>([]);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const { data, error } = await supabase
                .from('team_members')
                .select('*')
                .eq('username', username)
                .eq('password', password)
                .in('role', ['admin', 'support'])
                .single();

            if (data) {
                setCurrentUser(data);
                setIsAuthenticated(true);
                fetchAllData();
            } else {
                alert('Acesso negado ou credenciais inválidas.');
            }
        } catch (err) {
            alert('Erro ao conectar ao sistema.');
        }
    };

    const fetchAllData = async () => {
        setLoading(true);
        try {
            // Stats & Logs
            const { data: logs } = await supabase.from('sms_logs').select('*').order('created_at', { ascending: false }).limit(200);
            if (logs) setSmsLogs(logs);

            const { data: configData } = await supabase.from('system_settings').select('*').in('key', ['sms_pricing', 'maintenance_mode', 'panic_mode']);
            if (configData) {
                const smsP = configData.find(c => c.key === 'sms_pricing');
                if (smsP && smsP.value) {
                    setSmsConfig({
                        sms: smsP.value.cost_per_sms || 1.62,
                        whatsapp: smsP.value.cost_per_whatsapp || 0.50,
                        email: smsP.value.cost_per_email || 0
                    });
                }
                const maintP = configData.find(c => c.key === 'maintenance_mode');
                if (maintP && maintP.value) {
                    setIsMaintenance(maintP.value.active || false);
                }
                const panicP = configData.find(c => c.key === 'panic_mode');
                if (panicP && panicP.value) {
                    setIsPanic(panicP.value.active || false);
                }
            }

            // Orders
            const { data: ords } = await supabase.from('orders').select('*').order('created_at', { ascending: false }).limit(200);
            if (ords) {
                setOrders(ords);
                setStats(s => ({ ...s, totalOrders: ords.length, failedOrders: ords.filter(o => o.status === 'failed_payment').length }));
            }

            // Messages
            const { data: msgs } = await supabase.from('contact_messages').select('*').order('created_at', { ascending: false });
            if (msgs) {
                setMessages(msgs);
                setStats(s => ({ ...s, activeTickets: msgs.filter(m => m.status === 'unread' || m.status === 'pending').length }));
            }

            // Comments
            const { data: cmmts } = await supabase.from('blog_comments').select('*').order('created_at', { ascending: false });
            if (cmmts) setComments(cmmts);

            // Team
            const { data: tm } = await supabase.from('team_members').select('*').order('name');
            if (tm) setTeam(tm);

            // Calculate costs
            if (logs) {
                const total = logs.reduce((acc, l) => acc + (Number(l.cost) || 0), 0);
                const totalSent = logs.filter(l => l.status === 'sent').length;
                setStats(s => ({ ...s, totalSmsCost: total, totalSentMsgs: totalSent }));
            }

        } catch (error) {
            console.error("Error fetching IT Dashboard data:", error);
        }
        setLoading(false);
    };

    const updateSmsConfig = async () => {
        const payload = { cost_per_sms: smsConfig.sms, cost_per_whatsapp: smsConfig.whatsapp, cost_per_email: smsConfig.email };
        const { error } = await supabase.from('system_settings').upsert({ key: 'sms_pricing', value: payload });
        if (error) alert("Failed to save config");
        else alert("Configurações de custo atualizadas!");
    };

    const toggleMaintenance = async () => {
        const newState = !isMaintenance;
        if (newState) {
            if (!window.confirm("ATENÇÃO: MODO MANUTENÇÃO.\nIrá colocar a loja online em manutenção, mas o painel Admin e o sistema operacional irão continuar ativos. Deseja prosseguir?")) return;
        }
        const { error } = await supabase.from('system_settings').upsert({ key: 'maintenance_mode', value: { active: newState } });
        if (!error) {
            setIsMaintenance(newState);
            alert(newState ? "Website em Manutenção!" : "Website restaurado (Online)!");
        }
    };

    const togglePanic = async () => {
        const newState = !isPanic;
        if (newState) {
            if (!window.confirm("🔴 ALERTA VERMELHO: BOTÃO DE PÂNICO 🔴\nIrá encerrar e bloquear TOTALMENTE o site e o Painel de Administradores instantaneamente. Apenas o IT Console ficará ativo. Tens a certeza?")) return;
        }
        const { error } = await supabase.from('system_settings').upsert({ key: 'panic_mode', value: { active: newState } });
        if (!error) {
            setIsPanic(newState);
            alert(newState ? "SISTEMA TOTALMENTE ENCERRADO!" : "Pânico desativado. Serviços em reativação.");
        }
    };

    const remarcarPedido = async (id: string) => {
        if (!window.confirm("Deseja remarcar este pedido para Pendente?")) return;
        const { error } = await supabase.from('orders').update({ status: 'pending', payment_id: null }).eq('id', id);
        if (!error) {
            alert("Pedido remarcado!");
            fetchAllData();
        }
    };

    const exportarOrdersCSV = () => {
        const headers = "ID,Cliente,Telemóvel,Total,Estado,Data\n";
        const rows = orders.map(o => `${o.short_id || o.id},"${o.customer_name || 'N/A'}","${o.customer_phone || 'N/A'}",${o.total},${o.status},${new Date(o.created_at).toLocaleString()}`).join("\n");
        const blob = new Blob([headers + rows], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `pedidos_${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
    };

    const updateMessageStatus = async (id: string, newStatus: string) => {
        await supabase.from('contact_messages').update({ status: newStatus }).eq('id', id);
        fetchAllData();
    };

    const fileToBase64 = (file: File): Promise<string> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve((reader.result as string).split(',')[1]);
            reader.onerror = error => reject(error);
        });
    };

    const handleSendReply = async (msg: any) => {
        if (!replyText.trim()) return;
        setSendingReply(true);
        const htmlBody = `<p>Olá ${msg.name},</p><p>${replyText.replace(/\n/g, '<br/>')}</p><br/><br/><hr/><p><em>A sua mensagem original: "${msg.message}"</em></p>`;
        
        let attachments: any[] = [];
        if (replyFile) {
            try {
                const b64 = await fileToBase64(replyFile);
                attachments.push({
                    filename: replyFile.name,
                    content: b64
                });
            } catch (err) {
                console.error("Failed to parse attachment");
            }
        }

        const result = await sendEmail([msg.email], 'RE: Pão Caseiro - Apoio ao Cliente', htmlBody, undefined, undefined, [], attachments);
        
        if (result.success) {
            await updateMessageStatus(msg.id, 'replied');
            setReplyingTo(null);
            setReplyText('');
            setReplyFile(null);
            alert('Resposta oficial enviada com sucesso para o e-mail do cliente!');
        } else {
            alert('Falha ao enviar a resposta: ' + result.error);
        }
        setSendingReply(false);
    };

    const handleBroadcast = async () => {
        if (!broadcastText.trim()) { alert("Escreve uma mensagem!"); return; }
        if (broadcastChannel === 'email' && !broadcastSubject.trim()) { alert("Emails precisam de assunto!"); return; }
        if (!window.confirm(`Tens a certeza absoluta que queres iniciar o disparo massivo por ${broadcastChannel.toUpperCase()}?`)) return;

        setIsBroadcasting(true);
        let contacts: string[] = [];
        
        try {
            const { data: ords } = await supabase.from('orders').select('customer_email, customer_phone');
            if (ords) {
                if(broadcastChannel === 'email') {
                    contacts = Array.from(new Set(ords.map(o => (o as any).customer_email as string).filter(e => e && e.includes('@'))));
                } else {
                    contacts = Array.from(new Set(ords.map(o => (o as any).customer_phone as string).filter(p => p && p.length > 5)));
                }
            }
            
            setBroadcastProgress({ current: 0, total: contacts.length });
            
            if (contacts.length === 0) {
                alert("Nenhum contacto válido encontrado no histórico de encomendas.");
                setIsBroadcasting(false);
                return;
            }

            let sentCount = 0;
            for (const contact of contacts) {
                try {
                    if (broadcastChannel === 'email') {
                        await sendEmail([contact], broadcastSubject, `<p>${broadcastText.replace(/\n/g, '<br/>')}</p>`);
                    } else {
                        await sendSMS(contact, broadcastText);
                    }
                    sentCount++;
                } catch(e) {
                    console.error("Broadcast failed for", contact, e);
                }
                setBroadcastProgress({ current: sentCount, total: contacts.length });
            }
            
            alert(`Broadcast finalizado! Enviado com sucesso para ${sentCount} de ${contacts.length} contactos válidos.`);
        } catch (err) {
            alert("Erro fatal ao iniciar broadcast.");
        }
        
        setIsBroadcasting(false);
        setBroadcastSubject('');
        setBroadcastText('');
        setBroadcastProgress({ current: 0, total: 0 });
    };

    const updateCommentStatus = async (id: string, newStatus: string) => {
        await supabase.from('blog_comments').update({ status: newStatus }).eq('id', id);
        fetchAllData();
    };

    const deleteComment = async (id: string) => {
        if (!window.confirm("Apagar comentário?")) return;
        await supabase.from('blog_comments').delete().eq('id', id);
        fetchAllData();
    };

    const saveEditedComment = async (id: string) => {
        if(!editCommentText.trim()) return;
        await supabase.from('blog_comments').update({ content: editCommentText }).eq('id', id);
        setEditingComment(null);
        fetchAllData();
    };

    const handleSaveTeam = async () => {
        if (!teamForm.name.trim() || !teamForm.username.trim()) { alert("Preenche todos os campos obrigatórios"); return; }
        
        const payload = {
            name: teamForm.name,
            username: teamForm.username,
            role: teamForm.role,
            password: teamForm.password,
            email: teamForm.email,
            phone: teamForm.phone
        };

        if (editingTeam) {
            await supabase.from('team_members').update(payload).eq('id', editingTeam.id);
        } else {
            await supabase.from('team_members').insert([payload]);
        }
        setShowTeamModal(false);
        setEditingTeam(null);
        setTeamForm({ name: '', username: '', role: 'Admin', password: '', email: '', phone: '' });
        fetchAllData();
    };

    const handleDeleteTeam = async (id: string) => {
        if (!window.confirm("Remover este membro da equipa Zyph?")) return;
        await supabase.from('team_members').delete().eq('id', id);
        fetchAllData();
    };

    const getChartData = () => {
        const days = [...Array(7)].map((_, i) => {
            const d = new Date();
            d.setDate(d.getDate() - i);
            return d.toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit' });
        }).reverse();

        return days.map(dateStr => {
            const logsForDay = smsLogs.filter(l => l.created_at && new Date(l.created_at).toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit' }) === dateStr && l.status === 'sent');
            return {
                date: dateStr,
                sms: logsForDay.filter(l => l.type === 'sms').length,
                email: logsForDay.filter(l => l.type === 'email').length,
                whatsapp: logsForDay.filter(l => l.type === 'whatsapp').length,
                total: logsForDay.length
            };
        });
    };

    if (!isAuthenticated) {
        return (
            <div className="min-h-screen bg-[#1a1a1a] flex items-center justify-center p-4">
                <div className="bg-[#2a2a2a] p-8 rounded-2xl shadow-2xl w-full max-w-md border border-gray-700">
                    <div className="text-center mb-8">
                        <div className="w-16 h-16 bg-blue-500 rounded-2xl mx-auto flex items-center justify-center mb-4 shadow-lg shadow-blue-500/20">
                            <Server className="w-8 h-8 text-white" />
                        </div>
                        <h1 className="text-2xl font-bold text-white mb-2">Zyph Tech, Lda</h1>
                        <p className="text-gray-400">IT Super Admin Console</p>
                    </div>
                    <form onSubmit={handleLogin} className="space-y-4">
                        <div>
                            <label className="text-xs font-bold text-gray-500 uppercase tracking-widest block mb-2">Username / Email</label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-3 text-gray-500 w-5 h-5" />
                                <input type="text" required value={username} onChange={(e) => setUsername(e.target.value)} className="w-full bg-[#1a1a1a] border border-gray-700 text-white pl-10 p-3 rounded-xl focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all" placeholder="Enter email..." />
                            </div>
                        </div>
                        <div>
                            <label className="text-xs font-bold text-gray-500 uppercase tracking-widest block mb-2">Access Key</label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-3 text-gray-500 w-5 h-5" />
                                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full bg-[#1a1a1a] border border-gray-700 text-white pl-10 p-3 rounded-xl focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all" placeholder="Enter secure key..." />
                            </div>
                        </div>
                        <button type="submit" className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-xl transition-all shadow-lg shadow-blue-600/20">
                            Authenticate
                        </button>
                    </form>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#1a1a1a] text-white flex">
            {/* Sidebar */}
            <aside className="w-64 bg-[#2a2a2a] border-r border-gray-800 flex flex-col h-screen sticky top-0">
                <div className="p-6 border-b border-gray-800">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 bg-blue-500 rounded-xl flex items-center justify-center">
                            <Server className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h1 className="font-bold text-lg leading-tight">Zyph Tech</h1>
                            <p className="text-xs text-blue-400">Super Admin</p>
                        </div>
                    </div>
                </div>
                <nav className="p-4 space-y-2 flex-1 overflow-y-auto">
                    {[
                        { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard' },
                        { id: 'broadcast', icon: Megaphone, label: 'Broadcast Em Massa' },
                        { id: 'communications', icon: Smartphone, label: 'Comunicações & Custos' },
                        { id: 'orders', icon: ShoppingCart, label: 'Gestão de Pedidos' },
                        { id: 'support', icon: MessageSquare, label: 'Mensagens / Suporte' },
                        { id: 'blog', icon: FileText, label: 'Moderação Blog' },
                        { id: 'team', icon: Users, label: 'Equipa Zyph' },
                    ].map(item => (
                        <button key={item.id} onClick={() => setActiveTab(item.id)} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-sm font-semibold ${activeTab === item.id ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'text-gray-400 hover:bg-[#333] hover:text-white'}`}>
                            <item.icon className="w-5 h-5" />
                            {item.label}
                        </button>
                    ))}
                </nav>
                <div className="p-4 border-t border-gray-800">
                    <button onClick={() => setIsAuthenticated(false)} className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-red-500/10 text-red-500 hover:bg-red-500/20 rounded-xl transition-all text-sm font-bold">
                        Logout
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 overflow-y-auto h-screen relative">
                <header className="bg-[#1a1a1a]/80 backdrop-blur-md sticky top-0 z-10 p-6 border-b border-gray-800 flex justify-between items-center">
                    <h2 className="text-2xl font-bold capitalize">{activeTab.replace('-', ' ')}</h2>
                    <div className="flex items-center gap-4">
                        <span className="flex items-center gap-2 text-xs font-mono bg-green-500/10 text-green-500 px-3 py-1 rounded-full border border-green-500/20">
                            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                            SYSTEM OPTIMAL
                        </span>
                        <button onClick={fetchAllData} className="p-2 bg-[#2a2a2a] rounded-lg hover:bg-[#333] transition-all" disabled={loading}>
                            <RefreshCw className={`w-5 h-5 text-gray-400 ${loading ? 'animate-spin' : ''}`} />
                        </button>
                    </div>
                </header>

                <div className="p-6">
                    {activeTab === 'dashboard' && (
                        <div className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
                                <div className="bg-[#2a2a2a] p-6 rounded-2xl border border-gray-800">
                                    <h3 className="text-gray-400 text-sm font-bold mb-2">Custos Telecom (MT)</h3>
                                    <p className="text-3xl font-bold text-red-400">{stats.totalSmsCost?.toFixed(2)} MT</p>
                                </div>
                                <div className="bg-[#2a2a2a] p-6 rounded-2xl border border-gray-800">
                                    <h3 className="text-gray-400 text-sm font-bold mb-2">Mensagens Enviadas</h3>
                                    <p className="text-3xl font-bold text-green-400">{stats.totalSentMsgs}</p>
                                </div>
                                <div className="bg-[#2a2a2a] p-6 rounded-2xl border border-gray-800">
                                    <h3 className="text-gray-400 text-sm font-bold mb-2">Pedidos Realizados</h3>
                                    <p className="text-3xl font-bold">{stats.totalOrders}</p>
                                </div>
                                <div className="bg-[#2a2a2a] p-6 rounded-2xl border border-gray-800">
                                    <h3 className="text-gray-400 text-sm font-bold mb-2">Falhas de Pagamento</h3>
                                    <p className="text-3xl font-bold text-orange-400">{stats.failedOrders}</p>
                                </div>
                                <div className="bg-[#2a2a2a] p-6 rounded-2xl border border-gray-800">
                                    <h3 className="text-gray-400 text-sm font-bold mb-2">Tickets Suporte Ativos</h3>
                                    <p className="text-3xl font-bold text-blue-400">{stats.activeTickets}</p>
                                </div>
                                <div className="bg-[#2a2a2a] p-6 rounded-2xl border border-gray-800 col-span-1 md:col-span-5 flex flex-col md:flex-row justify-between items-center gap-4">
                                    <div>
                                        <h3 className="font-bold text-lg text-white mb-1">Manutenção e Pânico</h3>
                                        <p className="text-sm text-gray-400">Controla de forma independente a loja pública (Manutenção) e a segurança de emergência geral (Pânico).</p>
                                    </div>
                                    <div className="flex gap-4">
                                        <button onClick={toggleMaintenance} className={`px-6 py-3 rounded-xl font-bold flex items-center gap-2 transition-all ${isMaintenance ? 'bg-orange-600 hover:bg-orange-500 text-white shadow-lg shadow-orange-600/20' : 'bg-[#1a1a1a] border border-orange-600/50 text-orange-500 hover:bg-orange-600/10'}`}>
                                            <Settings className="w-5 h-5" />
                                            {isMaintenance ? 'Loja em Manutenção' : 'Ativar Manutenção'}
                                        </button>
                                        <button onClick={togglePanic} className={`px-6 py-3 rounded-xl font-bold flex items-center gap-2 transition-all ${isPanic ? 'bg-red-600 hover:bg-red-500 text-white shadow-lg shadow-red-600/50 ring-4 ring-red-600/20' : 'bg-[#1a1a1a] border border-red-600/50 text-red-500 hover:bg-red-600/10'}`}>
                                            <AlertTriangle className="w-5 h-5" />
                                            {isPanic ? '🔴 RESTAURAR SISTEMA' : 'BOTÃO DE PÂNICO'}
                                        </button>
                                    </div>
                                </div>
                                
                                <div className="bg-[#2a2a2a] p-6 rounded-2xl border border-gray-800 col-span-1 md:col-span-5">
                                    <h3 className="font-bold text-lg mb-6 flex items-center gap-2">
                                        <Megaphone className="w-5 h-5 text-indigo-500" /> Volume de Envios Automáticos (Eficiência - 7 Dias)
                                    </h3>
                                    <div className="flex items-end gap-3 h-56 mt-4 pt-10 border-b border-gray-700">
                                        {getChartData().map((day, i) => {
                                            const chartData = getChartData();
                                            const max = Math.max(1, ...chartData.map(d => d.total));
                                            const heightRaw = (day.total / max) * 100;
                                            const height = heightRaw < 5 && day.total > 0 ? 5 : heightRaw;
                                            
                                            // Email proportion
                                            const emailH = day.total > 0 ? (day.email / day.total) * 100 : 0;
                                            // SMS/WA proportion
                                            const smsH = day.total > 0 ? ((day.sms + day.whatsapp) / day.total) * 100 : 0;

                                            return (
                                                <div key={i} className="flex-1 flex flex-col items-center gap-3 group relative h-full">
                                                    <div className="w-full relative flex flex-col justify-end items-center h-full bg-[#1e1e1e] rounded-t-xl overflow-hidden border-x border-t border-gray-700 hover:bg-[#252525] transition-colors">
                                                        <div style={{ height: `${height}%` }} className="w-full flex flex-col justify-end transition-all cursor-pointer opacity-90 group-hover:opacity-100">
                                                            {emailH > 0 && <div style={{ height: `${emailH}%` }} className="w-full bg-blue-500 rounded-t-sm shadow-[0_0_10px_rgba(59,130,246,0.3)]"></div>}
                                                            {smsH > 0 && <div style={{ height: `${smsH}%` }} className="w-full bg-indigo-500 rounded-t-sm shadow-[0_0_10px_rgba(99,102,241,0.3)]"></div>}
                                                        </div>
                                                        <div className="absolute opacity-0 group-hover:opacity-100 transition-opacity bg-black border border-gray-700 text-xs p-3 rounded-xl -top-16 shadow-2xl whitespace-nowrap z-20 pointer-events-none">
                                                            <div className="font-bold text-white mb-1 border-b border-gray-700 pb-1">{day.total} Envios Totais</div>
                                                            <div className="flex gap-4 text-gray-300">
                                                                <span>E-mails: <strong className="text-blue-400 font-black">{day.email}</strong></span>
                                                                <span>SMS/WA: <strong className="text-indigo-400 font-black">{day.sms + day.whatsapp}</strong></span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <span className="text-[11px] text-gray-400 font-semibold">{day.date}</span>
                                                </div>
                                            )
                                        })}
                                    </div>
                                    <div className="flex gap-4 mt-6 text-xs text-gray-400 font-bold justify-center">
                                        <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-blue-500"></div> Emails</div>
                                        <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-indigo-500"></div> SMS & WhatsApp</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'broadcast' && (
                        <div className="bg-[#2a2a2a] rounded-2xl border border-gray-800 p-8 max-w-2xl mx-auto shadow-xl">
                            <h3 className="font-bold text-2xl mb-2 flex items-center justify-center gap-3">
                                <Megaphone className="w-6 h-6 text-indigo-500" /> Marketing & Broadcast
                            </h3>
                            <p className="text-gray-400 text-sm mb-6">
                                Envia uma mensagem massiva para todos os clientes do sistema. O sistema extrai automaticamente os contactos únicos do histórico de encomendas.
                            </p>
                            
                            <div className="space-y-4">
                                <div>
                                    <label className="text-xs font-bold text-gray-500 uppercase block mb-2">Canal de Envio</label>
                                    <div className="flex gap-4">
                                        <button onClick={() => setBroadcastChannel('email')} className={`flex-1 py-3 rounded-xl font-bold flex items-center justify-center gap-2 border ${broadcastChannel === 'email' ? 'bg-indigo-600/20 border-indigo-500 text-indigo-400' : 'bg-[#1a1a1a] border-gray-700 text-gray-400 hover:bg-[#333]'}`}>
                                            <Mail className="w-5 h-5" /> Via Email
                                        </button>
                                        <button onClick={() => setBroadcastChannel('sms')} className={`flex-1 py-3 rounded-xl font-bold flex items-center justify-center gap-2 border ${broadcastChannel === 'sms' ? 'bg-indigo-600/20 border-indigo-500 text-indigo-400' : 'bg-[#1a1a1a] border-gray-700 text-gray-400 hover:bg-[#333]'}`}>
                                            <Smartphone className="w-5 h-5" /> Via SMS
                                        </button>
                                    </div>
                                </div>

                                {broadcastChannel === 'email' && (
                                    <div>
                                        <label className="text-xs font-bold text-gray-500 uppercase block mb-2">Assunto do Email</label>
                                        <input type="text" value={broadcastSubject} onChange={e => setBroadcastSubject(e.target.value)} className="w-full bg-[#1a1a1a] text-white border border-gray-700 rounded-lg p-3 outline-none focus:border-indigo-500" placeholder="Ex: Novidade na Pão Caseiro!" />
                                    </div>
                                )}

                                <div>
                                    <label className="text-xs font-bold text-gray-500 uppercase block mb-2">Mensagem</label>
                                    <textarea value={broadcastText} onChange={e => setBroadcastText(e.target.value)} className="w-full bg-[#1a1a1a] text-white border border-gray-700 rounded-lg p-3 outline-none focus:border-indigo-500 min-h-[150px]" placeholder="Escreve a tua campanha aqui..." />
                                </div>

                                {isBroadcasting && broadcastProgress.total > 0 && (
                                    <div className="bg-[#1a1a1a] p-4 rounded-xl border border-indigo-500/30">
                                        <div className="flex justify-between text-xs font-bold text-indigo-400 mb-2">
                                            <span>A processar envio...</span>
                                            <span>{broadcastProgress.current} / {broadcastProgress.total} Contactos</span>
                                        </div>
                                        <div className="w-full bg-gray-800 rounded-full h-2 overflow-hidden">
                                            <div className="bg-indigo-500 h-2 transition-all duration-300" style={{ width: `${(broadcastProgress.current / broadcastProgress.total) * 100}%` }}></div>
                                        </div>
                                    </div>
                                )}

                                <button disabled={isBroadcasting} onClick={handleBroadcast} className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 disabled:bg-gray-700 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-all">
                                    {isBroadcasting ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                                    {isBroadcasting ? 'A Enviar Broadcast...' : `Disparar para Todos os Clientes`}
                                </button>
                            </div>
                        </div>
                    )}

                    {activeTab === 'communications' && (
                        <div className="space-y-6">
                            {/* SMS Pricing Config */}
                            <div className="bg-[#2a2a2a] p-6 rounded-2xl border border-gray-800 flex items-end gap-4">
                                <div className="flex-1">
                                    <label className="text-xs text-gray-400 font-bold uppercase mb-1 block">Custo por SMS (MT)</label>
                                    <input type="number" step="0.01" value={smsConfig.sms} onChange={e => setSmsConfig(c => ({...c, sms: parseFloat(e.target.value)}))} className="w-full bg-[#1a1a1a] border border-gray-700 p-2 rounded-lg text-white" />
                                </div>
                                <div className="flex-1">
                                    <label className="text-xs text-gray-400 font-bold uppercase mb-1 block">Custo por WhatsApp (MT)</label>
                                    <input type="number" step="0.01" value={smsConfig.whatsapp} onChange={e => setSmsConfig(c => ({...c, whatsapp: parseFloat(e.target.value)}))} className="w-full bg-[#1a1a1a] border border-gray-700 p-2 rounded-lg text-white" />
                                </div>
                                <div className="flex-1">
                                    <label className="text-xs text-gray-400 font-bold uppercase mb-1 block">Custo por Email (MT)</label>
                                    <input type="number" step="0.01" value={smsConfig.email} onChange={e => setSmsConfig(c => ({...c, email: parseFloat(e.target.value)}))} className="w-full bg-[#1a1a1a] border border-gray-700 p-2 rounded-lg text-white" />
                                </div>
                                <button onClick={updateSmsConfig} className="bg-blue-600 hover:bg-blue-500 text-white font-bold px-6 py-2 rounded-lg h-[42px]">
                                    Guardar
                                </button>
                            </div>

                            {/* Logs Table */}
                            <div className="bg-[#2a2a2a] rounded-2xl border border-gray-800 overflow-hidden">
                                <table className="w-full text-left text-sm">
                                    <thead className="bg-[#333] text-gray-400">
                                        <tr>
                                            <th className="p-4">Data</th>
                                            <th className="p-4">Tipo</th>
                                            <th className="p-4">Destinatário</th>
                                            <th className="p-4">Mensagem</th>
                                            <th className="p-4">Custo</th>
                                            <th className="p-4">Estado</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-800">
                                        {smsLogs.map(log => (
                                            <tr key={log.id} className="hover:bg-[#333]/50">
                                                <td className="p-4 text-gray-400">{new Date(log.created_at).toLocaleString()}</td>
                                                <td className="p-4 uppercase text-xs font-bold">{log.type}</td>
                                                <td className="p-4">{log.recipient}</td>
                                                <td className="p-4 text-gray-400 max-w-xs truncate">{log.content}</td>
                                                <td className="p-4 font-mono text-red-400">-{log.cost} MT</td>
                                                <td className="p-4">
                                                    <span className={`px-2 py-1 rounded-full text-xs font-bold ${log.status === 'sent' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                                                        {log.status}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {activeTab === 'orders' && (
                        <div className="bg-[#2a2a2a] rounded-2xl border border-gray-800 overflow-hidden">
                            <div className="p-4 border-b border-gray-800 flex justify-between items-center">
                                <h3 className="font-bold">Todos os Pedidos do Sistema</h3>
                                <button onClick={exportarOrdersCSV} className="bg-[#1a1a1a] border border-gray-700 hover:bg-[#333] px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-bold">
                                    <Download className="w-4 h-4" /> Exportar CSV
                                </button>
                            </div>
                            <table className="w-full text-left text-sm">
                                <thead className="bg-[#333] text-gray-400">
                                    <tr>
                                        <th className="p-4">ID</th>
                                        <th className="p-4">Cliente</th>
                                        <th className="p-4">Total</th>
                                        <th className="p-4">Estado</th>
                                        <th className="p-4 text-right">Ações</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-800">
                                    {orders.map(order => (
                                        <tr key={order.id} className="hover:bg-[#333]/50">
                                            <td className="p-4 font-mono text-blue-400">#{order.short_id || order.id.slice(0, 8)}</td>
                                            <td className="p-4">
                                                <div className="font-bold">{order.customer_name}</div>
                                                <div className="text-xs text-gray-500">{order.customer_phone}</div>
                                            </td>
                                            <td className="p-4 font-bold">{order.total} MT</td>
                                            <td className="p-4">
                                                <span className={`px-2 py-1 rounded-full text-xs font-bold ${order.status === 'failed_payment' ? 'bg-red-500/10 text-red-500' : 'bg-gray-700 text-gray-300'}`}>
                                                    {order.status.replace('_', ' ')}
                                                </span>
                                            </td>
                                            <td className="p-4 text-right">
                                                {order.status === 'failed_payment' && (
                                                    <button onClick={() => remarcarPedido(order.id)} className="text-xs bg-orange-500/20 text-orange-400 px-3 py-1 rounded-lg hover:bg-orange-500/30">
                                                        Remarcar (Pendente)
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {activeTab === 'support' && (
                        <div className="grid grid-cols-1 gap-4">
                            {messages.length === 0 && <p className="text-gray-500 p-8 text-center bg-[#2a2a2a] rounded-2xl">Sem mensagens de suporte no momento.</p>}
                            {messages.map(msg => (
                                <div key={msg.id} className={`bg-[#2a2a2a] p-6 rounded-2xl border ${msg.status === 'unread' || msg.status === 'pending' ? 'border-blue-500/50' : 'border-gray-800'}`}>
                                    <div className="flex justify-between items-start mb-4">
                                        <div>
                                            <h4 className="font-bold text-lg">{msg.name} <span className="text-sm font-normal text-gray-400">({msg.email} | {msg.phone})</span></h4>
                                            <p className="text-xs text-gray-500">{new Date(msg.created_at).toLocaleString()}</p>
                                        </div>
                                        <div className="flex gap-2">
                                            {msg.status !== 'replied' && (
                                                <button onClick={() => { setReplyingTo(msg.id); setReplyText(''); }} className="text-xs bg-indigo-500/20 text-indigo-400 px-3 py-1 rounded-lg font-bold flex items-center gap-1 hover:bg-indigo-500/30">
                                                    <Mail className="w-3 h-3" /> Responder
                                                </button>
                                            )}
                                            {msg.status !== 'read' && msg.status !== 'replied' && (
                                                <button onClick={() => updateMessageStatus(msg.id, 'read')} className="text-xs bg-blue-500/20 text-blue-400 px-3 py-1 rounded-lg font-bold">Marcar Lido</button>
                                            )}
                                        </div>
                                    </div>
                                    <p className="text-gray-300 bg-[#1a1a1a] p-4 rounded-xl">{msg.message}</p>
                                    
                                    {/* Modal Resposta Inline */}
                                    {replyingTo === msg.id && (
                                        <div className="mt-4 bg-[#1a1a1a] border border-indigo-500/30 rounded-xl p-4 animate-fade-in-up">
                                            <h5 className="text-xs text-indigo-400 font-bold uppercase mb-2">Responder a {msg.name}</h5>
                                            <textarea 
                                                autoFocus
                                                value={replyText}
                                                onChange={(e) => setReplyText(e.target.value)}
                                                className="w-full bg-[#2a2a2a] text-white border border-gray-700 rounded-lg p-3 outline-none focus:border-indigo-500 text-sm min-h-[100px]"
                                                placeholder="Escreve a tua resposta oficial..."
                                            />
                                            <div className="flex items-center gap-2 mt-2 mb-3 bg-[#2a2a2a] px-3 py-2 rounded-lg border border-gray-700">
                                                <input type="file" id={`file_${msg.id}`} onChange={(e) => setReplyFile(e.target.files?.[0] || null)} className="hidden" />
                                                <label htmlFor={`file_${msg.id}`} className="cursor-pointer text-xs font-bold bg-indigo-600/20 text-indigo-400 py-1 px-3 rounded-md hover:bg-indigo-600 hover:text-white transition-colors">
                                                     Anexar Ficheiro
                                                </label>
                                                <span className="text-xs text-gray-500 flex-1 truncate">{replyFile ? replyFile.name : 'Nenhum anexo...'}</span>
                                                {replyFile && <button onClick={() => setReplyFile(null)}><X className="w-4 h-4 text-red-400 cursor-pointer" /></button>}
                                            </div>
                                            <div className="flex justify-end gap-2 mt-3">
                                                <button disabled={sendingReply} onClick={() => setReplyingTo(null)} className="px-4 py-2 text-xs font-bold text-gray-500 hover:text-white">Cancelar</button>
                                                <button disabled={sendingReply || !replyText.trim()} onClick={() => handleSendReply(msg)} className="px-6 py-2 text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg flex items-center gap-2">
                                                    {sendingReply ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                                                    {sendingReply ? 'A enviar...' : 'Enviar Resposta'}
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}

                    {activeTab === 'blog' && (
                        <div className="bg-[#2a2a2a] rounded-2xl border border-gray-800 overflow-hidden">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-[#333] text-gray-400">
                                    <tr>
                                        <th className="p-4">Autor</th>
                                        <th className="p-4">Comentário</th>
                                        <th className="p-4">Estado</th>
                                        <th className="p-4 text-right">Ações</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-800">
                                    {comments.map(comment => (
                                        <tr key={comment.id} className={`hover:bg-[#333]/50 ${comment.status === 'pending' ? 'bg-orange-500/5' : ''}`}>
                                            <td className="p-4 font-bold">{comment.author}</td>
                                            <td className="p-4 text-gray-300">
                                                {editingComment === comment.id ? (
                                                    <div className="flex flex-col gap-2">
                                                        <textarea 
                                                            value={editCommentText} 
                                                            onChange={e => setEditCommentText(e.target.value)} 
                                                            className="w-full bg-[#1a1a1a] border border-gray-700 rounded p-2 text-white outline-none focus:border-indigo-500"
                                                        />
                                                        <div className="flex gap-2">
                                                            <button onClick={() => saveEditedComment(comment.id)} className="text-xs bg-indigo-500 text-white px-3 py-1 rounded">Guardar</button>
                                                            <button onClick={() => setEditingComment(null)} className="text-xs bg-gray-700 text-white px-3 py-1 rounded">Cancelar</button>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <span>{comment.content}</span>
                                                )}
                                            </td>
                                            <td className="p-4">
                                                <span className={`px-2 py-1 rounded-full text-xs font-bold ${comment.status === 'approved' ? 'bg-green-500/10 text-green-500' : 'bg-orange-500/10 text-orange-500'}`}>
                                                    {comment.status}
                                                </span>
                                            </td>
                                            <td className="p-4 text-right flex justify-end gap-2">
                                                {comment.status === 'pending' && (
                                                    <button onClick={() => updateCommentStatus(comment.id, 'approved')} className="p-2 bg-green-500/20 text-green-500 rounded-lg hover:bg-green-500/30"><Check className="w-4 h-4" /></button>
                                                )}
                                                <button onClick={() => { setEditingComment(comment.id); setEditCommentText(comment.content); }} className="p-2 bg-blue-500/20 text-blue-400 rounded-lg hover:bg-blue-500/30"><Edit className="w-4 h-4" /></button>
                                                <button onClick={() => deleteComment(comment.id)} className="p-2 bg-red-500/20 text-red-500 rounded-lg hover:bg-red-500/30"><Trash2 className="w-4 h-4" /></button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {activeTab === 'team' && (
                        <div className="bg-[#2a2a2a] rounded-2xl border border-gray-800 p-6 relative">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="font-bold text-xl">Diretório de Equipa (Zyph)</h3>
                                <button onClick={() => { setEditingTeam(null); setTeamForm({ name: '', username: '', role: 'Admin', password: '', email: '', phone: '' }); setShowTeamModal(true); }} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg flex items-center gap-2 font-bold text-sm">
                                    <Plus className="w-4 h-4" /> Adicionar Membro
                                </button>
                            </div>
                            
                            {showTeamModal && (
                                <div className="mb-8 p-6 bg-[#1a1a1a] border border-indigo-500/50 rounded-xl">
                                    <h4 className="font-bold mb-4">{editingTeam ? 'Editar Membro' : 'Novo Membro na Zyph'}</h4>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                                        <input type="text" placeholder="Nome Completo" value={teamForm.name} onChange={e => setTeamForm({...teamForm, name: e.target.value})} className="bg-[#2a2a2a] border border-gray-700 rounded-lg p-3 text-white outline-none focus:border-indigo-500" />
                                        <input type="text" placeholder="Username / Handle" value={teamForm.username} onChange={e => setTeamForm({...teamForm, username: e.target.value})} className="bg-[#2a2a2a] border border-gray-700 rounded-lg p-3 text-white outline-none focus:border-indigo-500" />
                                        <input type="password" placeholder="Access Key / Password" value={teamForm.password || ''} onChange={e => setTeamForm({...teamForm, password: e.target.value})} className="bg-[#2a2a2a] border border-gray-700 rounded-lg p-3 text-white outline-none focus:border-indigo-500" />
                                        <input type="email" placeholder="E-mail" value={teamForm.email || ''} onChange={e => setTeamForm({...teamForm, email: e.target.value})} className="bg-[#2a2a2a] border border-gray-700 rounded-lg p-3 text-white outline-none focus:border-indigo-500" />
                                        <input type="text" placeholder="Telemóvel" value={teamForm.phone || ''} onChange={e => setTeamForm({...teamForm, phone: e.target.value})} className="bg-[#2a2a2a] border border-gray-700 rounded-lg p-3 text-white outline-none focus:border-indigo-500" />
                                        <select value={teamForm.role} onChange={e => setTeamForm({...teamForm, role: e.target.value})} className="bg-[#2a2a2a] border border-gray-700 rounded-lg p-3 text-white outline-none focus:border-indigo-500">
                                            <option value="Admin">Admin</option>
                                            <option value="Suporte">Suporte</option>
                                            <option value="Gestor">Gestor</option>
                                            <option value="Mecânico">Mecânico IT</option>
                                        </select>
                                    </div>
                                    <div className="flex gap-2 justify-end">
                                        <button onClick={() => setShowTeamModal(false)} className="px-4 py-2 font-bold text-gray-500 hover:text-white">Cancelar</button>
                                        <button onClick={handleSaveTeam} className="px-6 py-2 bg-green-600 hover:bg-green-500 text-white rounded-lg font-bold">Guardar Membro</button>
                                    </div>
                                </div>
                            )}

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {team.map(member => (
                                    <div key={member.id} className="bg-[#1a1a1a] p-6 rounded-2xl border border-gray-800 hover:border-blue-500/50 transition-all relative group">
                                        <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2 bg-[#2a2a2a] p-1 rounded-lg">
                                            <button onClick={() => { setEditingTeam(member); setTeamForm(member); setShowTeamModal(true); }} className="p-2 text-blue-400 hover:bg-blue-500/20 rounded"><Edit className="w-4 h-4" /></button>
                                            <button onClick={() => handleDeleteTeam(member.id)} className="p-2 text-red-500 hover:bg-red-500/20 rounded"><Trash2 className="w-4 h-4" /></button>
                                        </div>
                                        <div className="w-12 h-12 bg-blue-500/20 text-blue-500 rounded-xl flex items-center justify-center mb-4 text-xl font-bold uppercase">
                                            {member.name ? member.name.substring(0,2) : 'IT'}
                                        </div>
                                        <h4 className="font-bold text-lg">{member.name}</h4>
                                        <p className="text-gray-400 text-sm mb-1">@{member.username}</p>
                                        <div className="flex flex-col gap-1 mb-4">
                                            {member.email && <p className="text-gray-500 text-xs flex items-center gap-1"><Mail className="w-3 h-3" /> {member.email}</p>}
                                            {member.phone && <p className="text-gray-500 text-xs flex items-center gap-1"><Smartphone className="w-3 h-3" /> {member.phone}</p>}
                                        </div>
                                        <span className="bg-[#333] px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">{member.role}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
};
