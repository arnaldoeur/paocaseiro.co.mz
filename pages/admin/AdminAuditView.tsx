import React, { useState, useEffect } from 'react';
import { supabase } from '../../services/supabase';
import {
    ShieldCheck,
    Search,
    AlertTriangle,
    Info,
    AlertCircle,
    XCircle,
    ChevronLeft,
    ChevronRight,
    Download,
    Eye,
    Maximize2,
    Calendar,
    User,
    Activity,
    MapPin,
    ChevronDown,
    CheckCircle,
    Smartphone,
    AlertOctagon,
    RefreshCw,
    Zap,
    Server,
    Shield,
    Sparkles,
    Bot
} from 'lucide-react';
import ReactECharts from 'echarts-for-react';

// Define AuditLog type for better type safety
interface AuditLog {
    id: string;
    created_at: string;
    action: string;
    entity_type: string;
    entity_id: string | null;
    user_id: string | null;
    customer_phone: string | null;
    details: any;
    user?: {
        id: string;
        name: string;
        email: string;
        role: string;
    } | null;
    derivedSeverity?: string;
}

export const AdminAuditView: React.FC = () => {
    const [logs, setLogs] = useState<AuditLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [severityFilter, setSeverityFilter] = useState<string>('all');

    // Pagination
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const PAGE_SIZE = 15;

    // View State
    const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [aiReport, setAiReport] = useState<string | null>(null);

    const [stats, setStats] = useState({
        total: 0,
        critical: 0,
        warnings: 0,
        today: 0
    });

    // Global events cache to feed the static chart
    const [allAuditEvents, setAllAuditEvents] = useState<any[]>([]);

    useEffect(() => {
        fetchLogs();
    }, [page, severityFilter]);

    useEffect(() => {
        // Only trigger search after delay when typing
        const timeoutId = setTimeout(() => {
            fetchLogs();
        }, 500);
        return () => clearTimeout(timeoutId);
    }, [searchTerm]);

    const fetchLogs = async () => {
        setLoading(true);
        try {
            let query = supabase
                .from('audit_logs')
                .select('*', { count: 'exact' });

            // audit_logs doesn't have a native severity field, so we skip the severity query filter in DB
            // and filter locally if needed, or map entity_type to severity.

            if (searchTerm.trim()) {
                query = query.or(`action.ilike.%${searchTerm}%,entity_type.ilike.%${searchTerm}%,customer_phone.ilike.%${searchTerm}%`);
            }

            // Pagination limits
            const from = (page - 1) * PAGE_SIZE;
            const to = from + PAGE_SIZE - 1;

            const { data: rawData, count, error } = await query
                .order('created_at', { ascending: false })
                .range(from, to);

            if (error) throw error;

            let finalData: AuditLog[] = rawData || [];

            // Manually stitch users since we don't have a strict FK
            if (finalData.length > 0) {
                const userIds = Array.from(new Set(finalData.map(l => l.user_id).filter(Boolean)));
                if (userIds.length > 0) {
                    const { data: users } = await supabase.from('users').select('id, name, email, role').in('id', userIds);
                    if (users) {
                        finalData = finalData.map(log => ({
                            ...log,
                            user: users.find(u => u.id === log.user_id) || null
                        }));
                    }
                }

                // Fetch customer details to enrich logs where user_id is null but phone exists
                const phones = Array.from(new Set(finalData.map(l => l.customer_phone).filter(Boolean)));
                if (phones.length > 0) {
                    const { data: customers } = await supabase.from('customers').select('contact_no, name, email').in('contact_no', phones as string[]);
                    if (customers) {
                         finalData = finalData.map(log => {
                             if (!log.user && log.customer_phone) {
                                 const c = customers.find(c => c.contact_no === log.customer_phone);
                                 if (c) {
                                     return {
                                         ...log,
                                         user: {
                                            id: c.contact_no, // Mock
                                            name: c.name,
                                            email: c.email || 'Sem Email',
                                            role: 'cliente'
                                         }
                                     };
                                 }
                             }
                             return log;
                         });
                    }
                }
            }

            setLogs(finalData);
            if (count) {
                setTotalPages(Math.ceil(count / PAGE_SIZE));
            }

            // Fetch overall stats on first load
            if (page === 1 && severityFilter === 'all' && !searchTerm) {
                const { data: allLogs } = await supabase.from('audit_logs').select('entity_type, action, created_at');

                if (allLogs) {
                    setAllAuditEvents(allLogs);
                    const today = new Date().toISOString().split('T')[0];
                    setStats({
                        total: allLogs.length,
                        critical: allLogs.filter(l => l.entity_type === 'system' || l.action.includes('ERROR')).length,
                        warnings: allLogs.filter(l => l.entity_type === 'purchase').length,
                        today: allLogs.filter(l => l.created_at.startsWith(today)).length
                    });
                }
            }

        } catch (error) {
            console.error('Error fetching audit logs:', error);
        } finally {
            setLoading(false);
        }
    };

    const getSeverityBadge = (severity: string) => {
        switch (severity) {
            case 'CRITICAL':
                return <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-red-100 text-red-800 text-[10px] font-bold uppercase tracking-widest"><XCircle size={12}/> {severity}</span>;
            case 'ERROR':
                return <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-orange-100 text-orange-800 text-[10px] font-bold uppercase tracking-widest"><AlertTriangle size={12}/> {severity}</span>;
            case 'WARNING':
                return <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-yellow-100 text-yellow-800 text-[10px] font-bold uppercase tracking-widest"><AlertCircle size={12}/> {severity}</span>;
            default:
                return <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-blue-100 text-blue-800 text-[10px] font-bold uppercase tracking-widest"><Info size={12}/> {severity}</span>;
        }
    };

    const getChartOptions = () => {
        const categories = ['08:00', '10:00', '12:00', '14:00', '16:00', '18:00', '20:00'];
        const todayStr = new Date().toLocaleDateString('pt-PT');
        const todaysLogs = allAuditEvents.filter(l => new Date(l.created_at).toLocaleDateString('pt-PT') === todayStr);

        const getBucketCounts = (filterFn: (l: any) => boolean) => {
            const counts = [0, 0, 0, 0, 0, 0, 0];
            todaysLogs.filter(filterFn).forEach(l => {
                const hour = new Date(l.created_at).getHours();
                if (hour < 10) counts[0]++;
                else if (hour < 12) counts[1]++;
                else if (hour < 14) counts[2]++;
                else if (hour < 16) counts[3]++;
                else if (hour < 18) counts[4]++;
                else if (hour < 20) counts[5]++;
                else counts[6]++;
            });
            return counts;
        };

        const sysViews = getBucketCounts(l => l.entity_type === 'system' || l.action.toLowerCase().includes('view') || l.action.toLowerCase().includes('delete'));
        const secEvents = getBucketCounts(l => l.action.toLowerCase().includes('auth') || l.action.toLowerCase().includes('login') || l.action.toLowerCase().includes('fail'));
        const userEvts = getBucketCounts(l => l.entity_type === 'purchase' || l.entity_type === 'website' || l.action.toLowerCase().includes('order') || l.action.toLowerCase().includes('delivery'));

        return {
            animation: false,
            tooltip: { trigger: 'axis' },
            legend: { data: ['Visualizações Internas', 'Eventos de Segurança', 'Eventos de Usuários'], bottom: 0 },
            grid: { left: '3%', right: '4%', bottom: '15%', containLabel: true },
            xAxis: { type: 'category', boundaryGap: false, data: categories },
            yAxis: { type: 'value', minInterval: 1 },
            series: [
                {
                    name: 'Visualizações Internas',
                    type: 'line',
                    smooth: true,
                    data: sysViews,
                    itemStyle: { color: '#3b82f6' },
                    areaStyle: { color: 'rgba(59, 130, 246, 0.1)' }
                },
                {
                    name: 'Eventos de Segurança',
                    type: 'line',
                    smooth: true,
                    data: secEvents,
                    itemStyle: { color: '#ef4444' },
                    areaStyle: { color: 'rgba(239, 68, 68, 0.1)' }
                },
                {
                    name: 'Eventos de Usuários',
                    type: 'line',
                    smooth: true,
                    data: userEvts,
                    itemStyle: { color: '#10b981' }, // green
                    areaStyle: { color: 'rgba(16, 185, 129, 0.1)' }
                }
            ]
        };
    };

    const generateAIReport = async () => {
        setIsAnalyzing(true);
        setAiReport(null);
        try {
            // Filter logs based on current search and severity filter for AI analysis
            const filteredLogs = logs.filter(log => {
                let derivedSeverity = 'INFO';
                if(log.entity_type === 'system') derivedSeverity = 'CRITICAL';
                if(log.entity_type === 'purchase') derivedSeverity = 'WARNING';
                if(log.action?.toLowerCase().includes('error') || log.action?.toLowerCase().includes('fail')) derivedSeverity = 'ERROR';

                return severityFilter === 'all' || derivedSeverity === severityFilter;
            });

            const logsToAnalyze = filteredLogs.slice(0, 50).map(l => ({
                action: l.action,
                entity: l.entity_type,
                phone: l.customer_phone,
                user: l.user?.role || 'visitor',
                details: l.details
            }));

            const systemContext = `Você é o Auditor IA Oficial do sistema 'Pão Caseiro'. A sua função é analisar métricas, eventos de log e o comportamento dos utilizadores da nossa plataforma.
Recebeu uma lista de eventos JSON filtrados recentes. Elabore um relatório analítico direto e conciso, em Markdown.

**Foco:**
1. Resumo da Atividade Global.
2. Identificação de Padrões Críticos ou Suspeitos (ex: Logins falhados sucessivos, Erros de Checkout).
3. Jornada de Utilizadores: O que estão tipicamente a tentar fazer? Quais as ações que repetem mais?

Escreva em Português de Portugal. Assuma um tom analítico, sénior e construtivo.`;

            const prompt = "Logs recentes para análise: \n\n" + JSON.stringify(logsToAnalyze);

            const { data, error } = await supabase.functions.invoke('chat-ai', {
                body: {
                    systemContext: systemContext,
                    messages: [
                        { role: 'user', content: prompt }
                    ]
                }
            });

            if (error) throw new Error(`Edge Error: ${error.message}`);
            if (data?.error) throw new Error(`OpenRouter Error: ${data.error}`);

            if (data?.choices && data.choices.length > 0) {
                setAiReport(data.choices[0].message.content);
            } else {
                setAiReport('Não foi possível gerar avaliação. Sem resposta da IA.');
            }
        } catch (err: any) {
            console.error('AI Error:', err);
            setAiReport('Ocorreu um erro ao invocar a Inteligência Artificial: ' + err.message);
        } finally {
            setIsAnalyzing(false);
        }
    };

    const handleExportCSV = () => {
        const headers = ["TRACE ID", "DATA E HORA", "AÇÃO", "CATEGORIA", "UTILIZADOR", "TIPO DE CONTA", "CONTACTO"];
        const rows = logs.map(l => {
            const date = new Date(l.created_at).toLocaleString('pt-PT');
            let userType = "Visitante Externo";
            let userName = "Anônimo / Visitante";

            if (l.user) {
                userType = ['admin', 'manager', 'cashier'].includes(l.user.role?.toLowerCase())
                    ? "Membro da Equipa" : "Cliente com Conta";
                userName = l.user.name;
            }

            return [
                l.id,
                `"${date}"`,
                `"${l.action}"`,
                `"${l.entity_type || ''}"`,
                `"${userName}"`,
                `"${userType}"`,
                `"${l.customer_phone || ''}"`
            ];
        });

        const csvContent = "data:text/csv;charset=utf-8,\uFEFF"
            + headers.join(",") + "\n"
            + rows.map(r => r.join(",")).join("\n");

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `auditoria_paocaseiro_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="flex flex-col gap-6 animate-fade-in text-[#3b2f2f]">
            {/* Header & Stats Dashboard */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                <div className="lg:col-span-1 flex flex-col gap-4">
                    <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
                        <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mb-4">
                            <ShieldCheck size={24} />
                        </div>
                        <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-1">Total Eventos</h3>
                        <p className="text-4xl font-black">{stats.total}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-red-50 p-6 rounded-3xl shadow-sm border border-red-100 text-red-900 leading-tight">
                            <h3 className="text-[10px] font-bold uppercase tracking-widest mb-2 opacity-70">Críticos</h3>
                            <p className="text-3xl font-black">{stats.critical}</p>
                        </div>
                        <div className="bg-yellow-50 p-6 rounded-3xl shadow-sm border border-yellow-100 text-yellow-900 leading-tight">
                            <h3 className="text-[10px] font-bold uppercase tracking-widest mb-2 opacity-70">Avisos</h3>
                            <p className="text-3xl font-black">{stats.warnings}</p>
                        </div>
                    </div>
                </div>

                <div className="lg:col-span-3 bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
                    <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                        <Activity size={16}/> Padrões de Eventos Hoje
                    </h3>
                    <div className="h-48 w-full">
                        <ReactECharts option={getChartOptions()} style={{ height: '100%', width: '100%' }} />
                    </div>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden flex flex-col min-h-[500px]">

                {/* Toolbar */}
                <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-4 bg-gray-50/50">
                    <div className="flex items-center gap-3 w-full sm:w-auto overflow-x-auto no-scrollbar pb-2 sm:pb-0">
                        <button
                            onClick={() => {setSeverityFilter('all'); setPage(1);}}
                            className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors whitespace-nowrap ${severityFilter === 'all' ? 'bg-[#3b2f2f] text-white shadow-md' : 'bg-white border text-gray-600 hover:bg-gray-100'}`}
                        >
                            Todos
                        </button>
                        <button
                            onClick={() => {setSeverityFilter('INFO'); setPage(1);}}
                            className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors whitespace-nowrap flex items-center gap-2 ${severityFilter === 'INFO' ? 'bg-blue-600 text-white shadow-md' : 'bg-white border text-blue-600 hover:bg-blue-50'}`}
                        >
                            <Info size={14}/> Info
                        </button>
                        <button
                            onClick={() => {setSeverityFilter('WARNING'); setPage(1);}}
                            className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors whitespace-nowrap flex items-center gap-2 ${severityFilter === 'WARNING' ? 'bg-yellow-500 text-white shadow-md' : 'bg-white border text-yellow-600 hover:bg-yellow-50'}`}
                        >
                            <AlertCircle size={14}/> Warning
                        </button>
                        <button
                            onClick={() => {setSeverityFilter('CRITICAL'); setPage(1);}}
                            className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors whitespace-nowrap flex items-center gap-2 ${severityFilter === 'CRITICAL' ? 'bg-red-600 text-white shadow-md' : 'bg-white border text-red-600 hover:bg-red-50'}`}
                        >
                            <XCircle size={14}/> Crítico
                        </button>
                    </div>

                    <div className="flex items-center gap-3 w-full sm:w-auto">
                        <div className="relative flex-1 sm:w-64">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                            <input
                                type="text"
                                placeholder="Buscar transações, usuários, ações..."
                                value={searchTerm}
                                onChange={e => {setSearchTerm(e.target.value); setPage(1);}}
                                className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl outline-none focus:border-[#d9a65a] transition-all text-sm font-medium shadow-inner"
                            />
                        </div>
                        <button
                            onClick={generateAIReport}
                            disabled={isAnalyzing}
                            className="bg-gradient-to-r from-[#3b2f2f] to-[#4a3b3b] p-2 text-[#d9a65a] hover:brightness-110 border border-[#d9a65a]/30 rounded-xl transition-all shadow-md flex items-center justify-center disabled:opacity-50"
                            title="Gerar Análise com IA"
                        >
                            {isAnalyzing ? <div className="w-4 h-4 rounded-full border-2 border-[#d9a65a] border-t-transparent animate-spin" /> : <Bot size={18} />}
                        </button>
                        <button
                            onClick={handleExportCSV}
                            className="p-2.5 border border-gray-200 rounded-xl hover:bg-gray-50 text-gray-500 transition-colors"
                            title="Exportar Filtrados para CSV"
                        >
                            <Download size={18} />
                        </button>
                    </div>
                </div>

                {/* Audit Grid/Table */}
                <div className="overflow-x-auto flex-1">
                    <table className="w-full text-left text-sm">
                        <thead className="text-[10px] text-gray-500 bg-gray-50 uppercase tracking-widest border-b border-gray-100">
                            <tr>
                                <th className="px-6 py-4 font-bold">Trace ID / Data</th>
                                <th className="px-6 py-4 font-bold">Categoria</th>
                                <th className="px-6 py-4 font-bold">Ação</th>
                                <th className="px-6 py-4 font-bold">Utilizador</th>
                                <th className="p-4 hidden md:table-cell">CONTACTO (CLIENTE)</th>
                                <th className="px-6 py-4 font-bold text-center">Inspecionar</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {loading ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center text-gray-400">
                                        <div className="flex justify-center items-center gap-3">
                                            <div className="w-5 h-5 border-2 border-gray-300 border-t-[#d9a65a] rounded-full animate-spin"></div>
                                            Carregando rasto de auditoria...
                                        </div>
                                    </td>
                                </tr>
                            ) : logs.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center text-gray-400">
                                        Nenhum evento de auditoria encontrado com os filtros atuais.
                                    </td>
                                </tr>
                            ) : (
                                logs.map(log => {
                                    // Derive severity from entity_type / action for the legacy schema UI mapping
                                    let derivedSeverity = 'INFO';
                                    if(log.entity_type === 'system') derivedSeverity = 'CRITICAL';
                                    if(log.entity_type === 'purchase') derivedSeverity = 'WARNING';
                                    if(log.action?.toLowerCase().includes('error') || log.action?.toLowerCase().includes('fail')) derivedSeverity = 'ERROR';
                                    
                                    // Local filter fallback since we removed it from the DB query
                                    if(severityFilter !== 'all' && derivedSeverity !== severityFilter) return null;

                                    return (
                                    <tr key={log.id} className="hover:bg-gray-50/50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col gap-1">
                                                <span className="font-mono text-xs text-gray-500">{log.id.toString().split('-')[0].toUpperCase()}</span>
                                                <span className="text-xs font-semibold text-[#3b2f2f]">
                                                    {new Date(log.created_at).toLocaleString('pt-PT', { dateStyle: 'short', timeStyle: 'medium' })}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            {getSeverityBadge(derivedSeverity)}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="font-bold text-[#3b2f2f] uppercase tracking-wider text-[11px] block">{log.action}</span>
                                            <span className="text-xs text-gray-500 truncate max-w-[250px] block mt-0.5">
                                                {log.entity_type} {log.entity_id ? `(${log.entity_id.toString().split('-')[0]})` : ''}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            {log.user ? (
                                                <div className="flex items-center gap-2">
                                                    <div className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-[10px] ${['admin', 'manager', 'cashier'].includes(log.user.role?.toLowerCase()) ? 'bg-indigo-100 text-indigo-700' : 'bg-emerald-100 text-emerald-700'}`}>
                                                        {log.user.name?.charAt(0) || 'U'}
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <span className="font-semibold text-xs text-[#3b2f2f]">{log.user.name}</span>
                                                        <span className="text-[9px] uppercase tracking-widest text-[#d9a65a]">
                                                            {['admin', 'manager', 'cashier'].includes(log.user.role?.toLowerCase()) ? `Equipa: ${log.user.role}` : 'Cliente Registado'}
                                                        </span>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="flex flex-col">
                                                    <span className="text-xs text-gray-400 font-semibold italic">Visitante Web / Checkout</span>
                                                    <span className="text-[9px] uppercase tracking-widest text-gray-400 mt-0.5">Sem Conta Registada</span>
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 font-mono text-[11px] text-gray-500">
                                            {log.customer_phone || '---'}
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <button 
                                                onClick={() => setSelectedLog({...log, derivedSeverity})}
                                                className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors inline-block"
                                            >
                                                <Maximize2 size={16} />
                                            </button>
                                        </td>
                                    </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {!loading && totalPages > 1 && (
                    <div className="p-4 border-t border-gray-100 flex items-center justify-between bg-gray-50/50">
                        <span className="text-xs text-gray-500 font-medium">Página {page} de {totalPages}</span>
                        <div className="flex gap-2">
                            <button 
                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                disabled={page === 1}
                                className="p-2 rounded-xl border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-50 transition-colors"
                            >
                                <ChevronLeft size={16} />
                            </button>
                            <button 
                                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                disabled={page === totalPages}
                                className="p-2 rounded-xl border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-50 transition-colors"
                            >
                                <ChevronRight size={16} />
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* AI Report Modal */}
            {aiReport && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[60] flex items-center justify-center p-4 sm:p-6 animate-fade-in">
                    <div className="bg-white rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl relative border border-[#d9a65a]/20">
                        <div className="px-8 py-6 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-[#3b2f2f] to-[#2a2222]">
                            <div>
                                <h2 className="text-xl font-bold text-[#d9a65a] mb-1 flex items-center gap-3">
                                    <Sparkles size={20} /> Insight de Auditoria com IA
                                </h2>
                                <p className="text-xs text-gray-300 font-mono">Analisando os registos recentes via OpenRouter</p>
                            </div>
                            <button 
                                onClick={() => setAiReport(null)}
                                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 transition-colors flex items-center justify-center text-white"
                            >
                                <XCircle size={18} />
                            </button>
                        </div>
                        <div className="p-8 overflow-y-auto custom-scrollbar flex-1 bg-gray-50">
                            <div className="prose prose-sm max-w-none text-[#3b2f2f] font-medium leading-relaxed">
                                {aiReport.split('\n').map((line, i) => {
                                    // Remove markdown headers
                                    let text = line.replace(/#{1,6}\s?/g, '');
                                    // Map Bold
                                    const parts = text.split(/(\*\*.*?\*\*)/g);
                                    return (
                                        <div key={i} className="mb-2">
                                            {parts.map((p, j) => {
                                                if (p.startsWith('**') && p.endsWith('**')) {
                                                    return <strong key={j} className="font-bold text-[#d9a65a] mr-1">{p.slice(2, -2)}</strong>;
                                                }
                                                // Remove lingering markers like asterisks or code ticks
                                                return <span key={j}>{p.replace(/\*/g, '').replace(/`/g, '')}</span>;
                                            })}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Log Details Modal */}
            {selectedLog && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 sm:p-6 animate-fade-in">
                    <div className="bg-white rounded-3xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl relative">
                        {/* Modal Header */}
                        <div className="px-8 py-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                            <div>
                                <h2 className="text-xl font-bold text-[#3b2f2f] mb-1 flex items-center gap-3">
                                    Inspeção de Payload <span className="text-xs font-mono font-normal text-gray-400">#{selectedLog.id}</span>
                                </h2>
                                <p className="text-sm text-gray-500 flex items-center gap-2 font-mono">
                                    <Calendar size={14}/> {new Date(selectedLog.created_at).toLocaleString('pt-PT')}
                                </p>
                            </div>
                            <button 
                                onClick={() => setSelectedLog(null)}
                                className="w-10 h-10 rounded-full bg-white border shadow-sm flex items-center justify-center text-gray-500 hover:text-red-500 hover:bg-red-50 transition-colors"
                            >
                                <XCircle size={20} />
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div className="p-8 overflow-y-auto custom-scrollbar flex-1 grid grid-cols-1 md:grid-cols-3 gap-8">
                            <div className="md:col-span-1 space-y-6">
                                <div>
                                    <h4 className="text-[10px] uppercase tracking-widest text-gray-400 font-bold mb-2">Evento</h4>
                                    <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
                                        <p className="font-bold text-[#3b2f2f] uppercase text-sm mb-3">{selectedLog.action}</p>
                                        <div className="mb-2">{getSeverityBadge(selectedLog.derivedSeverity || 'INFO')}</div>
                                    </div>
                                </div>
                                
                                <div>
                                    <h4 className="text-[10px] uppercase tracking-widest text-gray-400 font-bold mb-2">Actor (Sessão)</h4>
                                    <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 flex flex-col gap-2 text-sm">
                                        {selectedLog.user ? (
                                            <>
                                                <p className="flex items-center gap-2"><User size={14} className={['admin', 'manager', 'cashier'].includes(selectedLog.user.role?.toLowerCase()) ? 'text-indigo-500' : 'text-emerald-500'}/> <span className="font-semibold text-[#3b2f2f]">{selectedLog.user.name}</span></p>
                                                <p className="text-xs text-gray-500 pl-6">{selectedLog.user.email}</p>
                                                <p className="text-xs text-gray-500 pl-6 uppercase tracking-wider">{['admin', 'manager', 'cashier'].includes(selectedLog.user.role?.toLowerCase()) ? `Equipa Pão Caseiro (${selectedLog.user.role})` : 'Cliente Registado'}</p>
                                            </>
                                        ) : (
                                            <div className="flex flex-col gap-1">
                                                <p className="text-gray-500 font-semibold italic">Visitante do Website</p>
                                                <p className="text-[10px] uppercase tracking-widest text-gray-400">Checkout / Guest API</p>
                                            </div>
                                        )}
                                        <div className="h-px bg-gray-200 my-2"></div>
                                        <p className="font-mono text-xs text-gray-500">Telefone Cliente: {selectedLog.customer_phone || '---'}</p>
                                    </div>
                                </div>

                                <div>
                                    <h4 className="text-[10px] uppercase tracking-widest text-gray-400 font-bold mb-2">Alvo (Categoria)</h4>
                                    <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
                                        <p className="font-semibold text-gray-700">{selectedLog.entity_type}</p>
                                        {selectedLog.entity_id && (
                                            <p className="font-mono text-xs mt-1 text-gray-500 break-all">{selectedLog.entity_id}</p>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="md:col-span-2 flex flex-col gap-4">
                                <h4 className="text-[10px] uppercase tracking-widest text-gray-400 font-bold">Inspecão Avançada de Dados</h4>
                                <div className="bg-white p-6 rounded-3xl h-full flex-1 border border-gray-200 shadow-sm overflow-y-auto custom-scrollbar flex flex-col gap-6">
                                    
                                    {selectedLog.details?.message && (
                                        <div>
                                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Resumo da Ação (Mensagem)</span>
                                            <div className="bg-blue-50/50 p-4 rounded-2xl border border-blue-100 mt-2">
                                                <p className="text-sm font-medium text-blue-900">{selectedLog.details.message}</p>
                                            </div>
                                        </div>
                                    )}

                                    {selectedLog.details?.error && (
                                        <div>
                                            <span className="text-[10px] font-bold text-red-500 uppercase tracking-widest flex items-center gap-1"><AlertTriangle size={12}/> Erro Encontrado</span>
                                            <div className="bg-red-50 p-4 rounded-2xl border border-red-100 mt-2">
                                                <p className="text-sm font-semibold text-red-900">{selectedLog.details.error}</p>
                                            </div>
                                        </div>
                                    )}

                                    {/* Exibir outras chaves/parâmetros do payload que mostram "em que aba estava, o que fez" (baseado em db real) */}
                                    {selectedLog.details && Object.keys(selectedLog.details).filter(k => !['message', 'error'].includes(k)).length > 0 && (
                                        <div>
                                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3 block">Detalhes Adicionais Extraídos</span>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                {Object.entries(selectedLog.details).filter(([k]) => !['message', 'error'].includes(k)).map(([key, val]) => (
                                                    <div key={key} className="p-3 rounded-xl border border-gray-100 bg-gray-50 flex flex-col">
                                                        <span className="text-[9px] uppercase tracking-widest text-gray-400 font-bold mb-2">
                                                            {key.replace(/_/g, ' ')}
                                                        </span>
                                                        {typeof val === 'object' && val !== null ? (
                                                            <pre className="text-xs font-mono text-gray-600 bg-white p-2 border border-gray-100 rounded-lg overflow-x-auto custom-scrollbar">
                                                                {JSON.stringify(val, null, 2)}
                                                            </pre>
                                                        ) : (
                                                            <span className="text-sm font-semibold text-[#3b2f2f] break-words pb-1">
                                                                {String(val)}
                                                            </span>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    <div className="mt-auto pt-4">
                                        <h4 className="text-[10px] uppercase tracking-widest text-gray-400 font-bold mb-2">Payload Bruto (Raw JSON)</h4>
                                        <div className="bg-[#1e1e1e] p-4 rounded-2xl shadow-inner max-h-40 overflow-y-auto custom-scrollbar">
                                            <pre className="text-green-400 font-mono text-[11px] whitespace-pre-wrap break-normal">
                                                {JSON.stringify(selectedLog.details, null, 2)}
                                            </pre>
                                        </div>
                                    </div>

                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
