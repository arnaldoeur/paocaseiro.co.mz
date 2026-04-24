import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { 
    Ticket, 
    UserCheck, 
    RefreshCcw, 
    Monitor, 
    Volume2, 
    User, 
    ArrowRight, 
    Play, 
    Pause, 
    CheckCircle, 
    XCircle, 
    SkipForward,
    Smartphone,
    Copy,
    ExternalLink,
    History,
    Settings,
    LayoutDashboard,
    AlertTriangle,
    TrendingUp,
    Clock,
    Wifi
} from 'lucide-react';
import { useRealtimeTickets } from '../../hooks/useRealtimeTickets';
import { queueService, QueueTicket } from '../../services/queue';
import { NotificationService } from '../../services/NotificationService';
import { motion, AnimatePresence } from 'framer-motion';
import { getConnectionMode, setConnectionMode, refreshSupabaseClient, type ConnectionMode } from '../../services/supabase';

export const QueueManager: React.FC = () => {
    const { tickets, loading, error, status, refresh } = useRealtimeTickets();
    const [counter] = useState('Balcão Único');
    const [audioEnabled, setAudioEnabled] = useState(() => {
        const saved = localStorage.getItem('queueAudioEnabled');
        return saved === null ? true : saved === 'true'; // Default to true if not set
    });
    const [isAutoMode, setIsAutoMode] = useState(false);
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'panel' | 'history' | 'config'>('panel');
    const [stats, setStats] = useState<any>(null);
    const [connectionMode, setConnectionModeState] = useState<ConnectionMode>(getConnectionMode());

    // Local Stats Calculation (Meticulous & Instant)
    const derivedStats = useMemo(() => {
        return {
            total: tickets.length,
            completed: tickets.filter(t => t.status === 'completed').length,
            cancelled: tickets.filter(t => t.status === 'cancelled').length,
            skipped: tickets.filter(t => t.status === 'skipped').length,
            waiting: tickets.filter(t => t.status === 'waiting').length,
        };
    }, [tickets]);

    useEffect(() => {
        setStats(derivedStats);
    }, [derivedStats]);

    // Filter tickets
    const waitingTickets = tickets.filter(t => t.status === 'waiting');
    const currentlyCalling = tickets.find(t => t.status === 'calling');
    const otherCalling = tickets.filter(t => t.status === 'calling' && t.counter !== counter);
    const completedTickets = tickets.filter(t => t.status === 'completed' || t.status === 'skipped' || t.status === 'cancelled')
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 3);
    
    // Get next 3
    const nextThree = waitingTickets.slice(0, 3);

    // Audio Logic
    const speak = useCallback((text: string) => {
        if (!audioEnabled) return;
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'pt-PT';
        utterance.rate = 0.9;
        window.speechSynthesis.speak(utterance);
    }, [audioEnabled]);

    const lastAnnouncedRef = useRef<string | null>(null);

    useEffect(() => {
        if (currentlyCalling && audioEnabled) {
            const announcementKey = `${currentlyCalling.id}-${currentlyCalling.status}`;
            if (lastAnnouncedRef.current !== announcementKey) {
                lastAnnouncedRef.current = announcementKey;
                speak(`Senha ${currentlyCalling.ticket_number}, dirija-se ao atendimento`);
                
                // Integrated SMS Notification
                if (currentlyCalling.customer_phone) {
                    NotificationService.notifyTicketCalling(
                        currentlyCalling, 
                        'Balcão Único', 
                        currentlyCalling.customer_phone
                    ).catch(err => console.error("Queue SMS failed:", err));
                }
            }
        }
    }, [currentlyCalling?.id, currentlyCalling?.status, audioEnabled, speak]);

    // Auto Mode Logic: 30s cycle (Call -> Wait 30s -> Complete -> Wait 3s -> Call Next)
    const isProcessingRef = useRef(false);

    useEffect(() => {
        let timer: any;
        if (isAutoMode && !isProcessingRef.current) {
            if (currentlyCalling) {
                // If a ticket is currently being called, wait 30s then mark it as complete
                timer = setTimeout(async () => {
                    if (!isAutoMode) return;
                    try {
                        isProcessingRef.current = true;
                        await queueService.completeTicket(currentlyCalling.id);
                    } catch (err) {
                        console.error("Auto-complete error:", err);
                    } finally {
                        isProcessingRef.current = false;
                    }
                }, 30000); // 30 seconds wait
            } else if (waitingTickets.length > 0) {
                // If no ticket is being called but others are waiting, wait 3s then call next
                timer = setTimeout(async () => {
                    if (!isAutoMode) return;
                    try {
                        isProcessingRef.current = true;
                        await queueService.callNext(counter);
                    } catch (err) {
                        console.error("Auto-call error:", err);
                    } finally {
                        isProcessingRef.current = false;
                    }
                }, 3000); // 3 second gap
            }
        }
        return () => clearTimeout(timer);
    }, [isAutoMode, currentlyCalling?.id, waitingTickets.length, counter]);

    const handleAction = async (action: () => Promise<any>, id: string) => {
        setActionLoading(id);
        try {
            await action();
        } catch (err: any) {
            console.error("Action error:", err);
            alert("Erro na operação: " + err.message);
        } finally {
            setActionLoading(null);
        }
    };

    const toggleAudio = () => {
        const newState = !audioEnabled;
        setAudioEnabled(newState);
        localStorage.setItem('queueAudioEnabled', String(newState));
        if (newState) {
            speak("Áudio ativado");
        }
    };

    const [shareTicket, setShareTicket] = useState<QueueTicket | null>(null);
    const [isDownloading, setIsDownloading] = useState(false);
    const handleDownloadQR = async (data: string, filename: string) => {
        setIsDownloading(true);
        try {
            const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(data)}`;
            const response = await fetch(qrUrl);
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `${filename}.png`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
        } finally {
            setIsDownloading(false);
        }
    };

    const handleResetQueue = async () => {
        if (!confirm("Tem a certeza que deseja reiniciar a fila de hoje? Todas as senhas pendentes serão canceladas.")) return;
        setActionLoading('reset');
        try {
            await queueService.resetTodayQueue();
            alert("Fila reiniciada com sucesso!");
            refresh();
        } catch (err) {
            alert("Erro ao reiniciar fila.");
        } finally {
            setActionLoading(null);
        }
    };

    const handleClearCalling = async () => {
        if (!confirm("Deseja limpar todas as senhas que estão a chamar agora? Isso parará o som e limpará a TV.")) return;
        setActionLoading('clear-calling');
        try {
            const calling = tickets.filter(t => t.status === 'calling');
            await Promise.all(calling.map(t => queueService.completeTicket(t.id)));
            alert("Chamadas limpas com sucesso!");
            refresh();
        } catch (err) {
            alert("Erro ao limpar chamadas.");
        } finally {
            setActionLoading(null);
        }
    };

    const kioskUrl = typeof window !== 'undefined' ? `${window.location.origin}/get-ticket` : '';

    const handleConnectionToggle = (mode: ConnectionMode) => {
        setConnectionMode(mode);
        setConnectionModeState(mode);
        refreshSupabaseClient();
        alert(`Modo de conexão alterado para: ${mode.toUpperCase()}. A recarregar...`);
        refresh();
    };

    const getFriendlyError = (err: any) => {
        if (!err) return null;
        let msg = err.message || String(err);
        if (msg.includes('Failed to fetch')) {
            return "Sem Internet ou Erro de DNS no Backend. Verifique a sua ligação ou mude para o modo PROXY nas configurações.";
        }
        return msg;
    };

    if (loading) return (
        <div className="flex items-center justify-center min-h-[400px]">
            <RefreshCcw className="w-8 h-8 animate-spin text-[#d9a65a]/50" />
        </div>
    );

    return (
        <div className="p-6 bg-[#f7f1eb] min-h-screen text-[#3b2f2f]">
            {/* Header Barra Superior */}
            <div className="flex items-center justify-between mb-8 bg-white p-4 rounded-3xl border border-white shadow-xl">
                <div className="flex items-center gap-4">
                    <div className="bg-[#d9a65a]/10 p-2.5 rounded-2xl border border-[#d9a65a]/20">
                        <User className="w-6 h-6 text-[#d9a65a]" />
                    </div>
                    <div>
                        <h2 className="text-sm font-black uppercase tracking-tighter text-[#3b2f2f]">Painel Operador</h2>
                        <div className="flex items-center gap-2">
                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest leading-none">Balcão Único</p>
                            <div className="h-2 w-px bg-gray-200" />
                            <div className="flex items-center gap-1.5">
                                <div className={`w-1.5 h-1.5 rounded-full ${
                                    status === 'SUBSCRIBED' ? 'bg-green-500 animate-pulse' : 
                                    status === 'CONNECTING' ? 'bg-amber-500 animate-bounce' : 
                                    'bg-red-500'
                                }`} />
                                <span className="text-[8px] font-black uppercase tracking-widest text-gray-400">
                                    {status === 'SUBSCRIBED' ? 'Ligado' : status === 'CONNECTING' ? 'A Ligar...' : 'Desligado'}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    {/* Botão Auto-Call */}
                    <button 
                        onClick={() => setIsAutoMode(!isAutoMode)}
                        className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all ${
                            isAutoMode ? 'bg-[#3b2f2f] text-[#d9a65a] shadow-lg' : 'bg-gray-100 text-gray-400 border border-gray-200'
                        }`}
                    >
                        {isAutoMode ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                        {isAutoMode ? 'Auto-Chamada Ativo' : 'Ativar Auto-Chamada'}
                    </button>

                    <button 
                        onClick={toggleAudio}
                        className={`p-2.5 rounded-xl transition-all ${audioEnabled ? 'bg-[#d9a65a]/20 text-[#d9a65a]' : 'bg-gray-100 text-gray-300'}`}
                        title={audioEnabled ? "Desativar Áudio" : "Ativar Áudio"}
                    >
                        <Volume2 className="w-5 h-5" />
                    </button>
                    <button 
                        onClick={handleClearCalling}
                        className="p-2.5 bg-red-50 text-red-500 rounded-xl hover:bg-red-100 transition-all border border-red-100"
                        title="Limpar Chamadas Presas"
                    >
                        <XCircle className="w-5 h-5" />
                    </button>
                    <button 
                        onClick={() => refresh()}
                        className="p-2.5 bg-gray-100 text-gray-400 rounded-xl hover:bg-gray-200 active:scale-95 transition-all"
                    >
                        <RefreshCcw className="w-5 h-5" />
                    </button>
                    <div className="flex items-center bg-gray-100 rounded-xl px-4 py-2">
                        <UserCheck className="w-3.5 h-3.5 text-[#d9a65a] mr-2" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-[#3b2f2f]">Balcão Único</span>
                    </div>
                    <button 
                        onClick={() => window.open('/tv-senhas', '_blank')}
                        className="p-2.5 bg-gray-100 text-gray-400 rounded-xl hover:bg-gray-200 transition-all"
                        title="Ver TV de Senhas"
                    >
                        <Monitor className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {/* Tab Navigation */}
            <div className="flex gap-2 mb-8 bg-gray-100/50 p-1.5 rounded-2xl w-fit border border-gray-200">
                <button 
                    onClick={() => setActiveTab('panel')}
                    className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all ${
                        activeTab === 'panel' ? 'bg-white text-[#3b2f2f] shadow-md border border-gray-100' : 'text-gray-400 hover:text-gray-600'
                    }`}
                >
                    <LayoutDashboard size={14} />
                    Painel Operador
                </button>
                <button 
                    onClick={() => setActiveTab('history')}
                    className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all ${
                        activeTab === 'history' ? 'bg-white text-[#3b2f2f] shadow-md border border-gray-100' : 'text-gray-400 hover:text-gray-600'
                    }`}
                >
                    <History size={14} />
                    Histórico & Stats
                </button>
                <button 
                    onClick={() => setActiveTab('config')}
                    className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all ${
                        activeTab === 'config' ? 'bg-white text-[#3b2f2f] shadow-md border border-gray-100' : 'text-gray-400 hover:text-gray-600'
                    }`}
                >
                    <Settings size={14} />
                    Configuração
                </button>
            </div>

            <AnimatePresence mode="wait">
                {activeTab === 'panel' && (
                    <motion.div 
                        key="panel"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="grid grid-cols-12 gap-8"
                    >
                {/* Coluna Central - Atendimento Atual */}
                <div className="col-span-12 lg:col-span-8 space-y-8">
                    {currentlyCalling ? (
                        <motion.div 
                            initial={{ y: 20, opacity: 0 }} 
                            animate={{ y: 0, opacity: 1 }}
                            className="bg-white border-2 border-[#d9a65a]/20 rounded-[3rem] p-10 relative overflow-hidden shadow-2xl"
                        >
                            <div className="absolute top-0 right-0 w-64 h-64 bg-[#d9a65a]/5 rounded-full blur-[80px] -mr-32 -mt-32" />
                            
                            <div className="flex flex-col items-center text-center relative z-10">
                                <p className="text-[10px] font-black uppercase tracking-[0.4em] text-[#d9a65a] mb-6">Em Atendimento</p>
                                <div className="flex items-center gap-6 mb-4">
                                    <h1 className="text-9xl font-black text-[#3b2f2f] tracking-tighter leading-none">{currentlyCalling.ticket_number}</h1>
                                    <button 
                                        onClick={() => setShareTicket(currentlyCalling)}
                                        className="p-4 bg-gray-50 text-[#d9a65a] rounded-2xl border border-gray-100 hover:bg-[#d9a65a] hover:text-white transition-all shadow-sm"
                                        title="Partilhar Senha"
                                    >
                                        <Smartphone className="w-8 h-8" />
                                    </button>
                                </div>
                                
                                <div className="flex gap-4 mt-8">
                                    <button 
                                        disabled={!!actionLoading}
                                        onClick={() => handleAction(() => queueService.completeTicket(currentlyCalling.id), currentlyCalling.id)}
                                        className="px-10 py-5 bg-emerald-600 text-white font-black rounded-[2rem] uppercase tracking-widest text-xs flex items-center gap-3 shadow-xl shadow-emerald-600/20 hover:scale-105 active:scale-95 transition-all disabled:opacity-50"
                                    >
                                        <CheckCircle className="w-5 h-5" />
                                        Atendido
                                    </button>
                                    <button 
                                        disabled={!!actionLoading}
                                        onClick={() => handleAction(() => queueService.skipTicket(currentlyCalling.id), currentlyCalling.id)}
                                        className="px-10 py-5 bg-gray-100 text-gray-500 font-black rounded-[2rem] uppercase tracking-widest text-xs flex items-center gap-3 border border-gray-200 hover:bg-gray-200 transition-all font-bold"
                                    >
                                        <SkipForward className="w-5 h-5" />
                                        Ausência
                                    </button>
                                    <button 
                                        disabled={!!actionLoading}
                                        onClick={() => handleAction(() => queueService.cancelTicket(currentlyCalling.id), currentlyCalling.id)}
                                        className="px-10 py-5 bg-red-50 text-white font-black rounded-[2rem] uppercase tracking-widest text-xs flex items-center gap-3 shadow-xl shadow-red-500/20 hover:scale-105 active:scale-95 transition-all"
                                    >
                                        <XCircle className="w-5 h-5" />
                                        Cancelar
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    ) : (
                        <div 
                            onClick={() => waitingTickets.length > 0 && queueService.callNext(counter)}
                            className={`bg-white border border-gray-100 rounded-[3rem] p-12 text-center group transition-all duration-500 relative overflow-hidden shadow-xl ${
                                waitingTickets.length > 0 ? 'cursor-pointer hover:border-[#d9a65a]/30' : 'opacity-50'
                            }`}
                        >
                            <div className="absolute inset-0 bg-gradient-to-br from-[#d9a65a]/[0.05] to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                            <div className={`w-24 h-24 bg-[#d9a65a]/10 rounded-3xl flex items-center justify-center mx-auto mb-8 border border-[#d9a65a]/10 transition-transform duration-500 ${waitingTickets.length > 0 ? 'group-hover:scale-110 group-hover:rotate-6 group-hover:bg-[#d9a65a]/20 group-hover:border-[#d9a65a]/20' : ''}`}>
                                <Volume2 className={`w-12 h-12 ${waitingTickets.length > 0 ? 'text-[#d9a65a]' : 'text-gray-300'}`} />
                            </div>
                            <h2 className="text-3xl font-black text-[#3b2f2f] uppercase tracking-tighter mb-4">Chamar Próximo</h2>
                            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-400">
                                {waitingTickets.length > 0 ? `${waitingTickets.length} clientes na fila` : 'Nenhum cliente em espera'}
                            </p>
                            
                            {waitingTickets.length > 0 && (
                                <motion.div animate={{ x: [0, 10, 0] }} transition={{ repeat: Infinity, duration: 2 }} className="mt-8">
                                    <ArrowRight className="w-8 h-8 mx-auto text-[#d9a65a]/40" />
                                </motion.div>
                            )}
                        </div>
                    )}

                    {/* Próximas 3 Senhas */}
                    <div className="bg-white border border-gray-100 rounded-[2rem] p-8 shadow-lg">
                        <div className="flex items-center justify-between mb-8">
                            <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-gray-400">PRÓXIMAS SENHAS</h3>
                            <span className="text-[10px] font-black text-[#d9a65a] font-bold px-3 py-1 bg-[#d9a65a]/10 rounded-full">{waitingTickets.length} em espera</span>
                        </div>
                        
                        <div className="grid grid-cols-3 gap-6">
                            {nextThree.length > 0 ? nextThree.map((t, i) => (
                                <div key={t.id} className="bg-gray-50 border border-gray-100 rounded-2xl p-6 text-center group hover:bg-white hover:shadow-md transition-all relative">
                                    <button 
                                        onClick={() => setShareTicket(t)}
                                        className="absolute top-4 right-4 text-gray-300 hover:text-[#d9a65a] transition-colors"
                                        title="Partilhar QR Code"
                                    >
                                        <Smartphone size={16} />
                                    </button>
                                    <div className="flex flex-col items-center gap-1 mb-2">
                                        <span className={`px-2 py-0.5 rounded-full text-[6px] font-black uppercase tracking-widest ${
                                            t.is_priority ? 'bg-amber-100 text-amber-600' : 'bg-gray-100 text-gray-400'
                                        }`}>
                                            {t.is_priority ? 'Prioritária' : 'Normal'}
                                        </span>
                                        <span className="text-[7px] font-black text-[#d9a65a] uppercase tracking-widest">{t.category || 'Geral'}</span>
                                    </div>
                                    <p className="text-4xl font-black text-[#3b2f2f] mb-4 tracking-tighter">{t.ticket_number}</p>
                                    <button 
                                        onClick={() => queueService.callTicket(t.id, counter)}
                                        className="w-full py-2.5 bg-[#3b2f2f] text-[8px] font-black uppercase text-[#d9a65a] rounded-lg hover:brightness-110 active:scale-95 transition-all shadow-md"
                                    >
                                        Chamar Esta
                                    </button>
                                </div>
                            )) : (
                                <div className="col-span-3 py-10 text-center opacity-30">
                                    <p className="text-xs font-black uppercase text-gray-400">Nenhuma senha na fila</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* QR de Acesso Clientes */}
                    <div className="bg-white border border-gray-100 rounded-[3rem] p-10 shadow-xl relative overflow-hidden group transition-all">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-[#d9a65a]/5 rounded-full blur-[80px] -mr-32 -mt-32 group-hover:bg-[#d9a65a]/10 transition-all opacity-50" />
                        
                        <div className="flex flex-col md:flex-row items-center gap-10 relative z-10">
                            <div className="bg-gray-50 p-6 rounded-[2rem] border border-gray-100 group-hover:scale-105 transition-transform duration-500 shadow-inner">
                                <img 
                                    src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(kioskUrl)}`}
                                    alt="QR Kiosk"
                                    className="w-40 h-40"
                                />
                            </div>
                            
                            <div className="flex-1 space-y-6">
                                <div>
                                    <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-[#d9a65a] mb-2 leading-none">Auto-Atendimento</h3>
                                    <h2 className="text-2xl font-black text-[#3b2f2f] uppercase tracking-tighter">Acesso Clientes (QR)</h2>
                                    <p className="text-[10px] text-gray-400 mt-2 font-bold max-w-sm leading-relaxed">Mostre este código para que os clientes possam gerar senhas diretamente nos seus próprios smartphones.</p>
                                </div>

                                <div className="flex flex-wrap gap-4">
                                    <button 
                                        disabled={isDownloading}
                                        onClick={() => handleDownloadQR(kioskUrl, 'qrcode-acesso-clientes')}
                                        className="flex items-center justify-center gap-3 px-6 py-4 bg-[#3b2f2f] text-[#d9a65a] rounded-2xl text-[10px] font-black uppercase tracking-widest hover:brightness-110 active:scale-95 transition-all shadow-xl disabled:opacity-50"
                                    >
                                        <Smartphone size={14} className={isDownloading ? 'animate-spin' : ''} />
                                        {isDownloading ? 'Baixando...' : 'Baixar QR Code'}
                                    </button>
                                    <button 
                                        onClick={() => {
                                            navigator.clipboard.writeText(kioskUrl);
                                            alert("Link copiado!");
                                        }}
                                        className="flex items-center justify-center gap-3 px-6 py-4 bg-gray-50 border border-gray-200 text-gray-400 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-gray-100 active:scale-95 transition-all"
                                    >
                                        <Copy size={14} />
                                        Copiar Link
                                    </button>
                                    <a 
                                        href="/get-ticket" 
                                        target="_blank" 
                                        className="flex items-center gap-2 text-[10px] font-black uppercase text-[#d9a65a]/60 hover:text-[#d9a65a] transition-colors ml-2 group/link"
                                    >
                                        Abrir Kiosk
                                        <ExternalLink size={12} className="group-hover/link:translate-x-0.5 group-hover/link:-translate-y-0.5 transition-transform" />
                                    </a>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Coluna Direita - Stats e Gerador */}
                <div className="col-span-12 lg:col-span-4 space-y-8">
                    {/* Gerador Manual */}
                    <div className="bg-[#3b2f2f] border border-[#d9a65a]/20 rounded-[2rem] p-8 shadow-2xl relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-[#d9a65a]/5 rounded-full blur-3xl -mr-16 -mt-16" />
                        <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-[#d9a65a] mb-6 relative z-10">Emitir Senha Manual</h3>
                        
                        <div className="space-y-4 relative z-10">
                            <div className="grid grid-cols-2 gap-3">
                                {['Padaria', 'Confeitaria', 'Café', 'Lanches'].map(cat => (
                                    <button 
                                        key={cat}
                                        onClick={() => queueService.generateTicket(false, undefined, cat)}
                                        className="p-4 bg-white/5 border border-white/10 rounded-xl flex flex-col items-center group hover:bg-white text-white/40 hover:text-[#3b2f2f] transition-all"
                                    >
                                        <span className="text-[7px] font-black uppercase tracking-widest">{cat}</span>
                                    </button>
                                ))}
                            </div>
                            
                            <button 
                                onClick={() => queueService.generateTicket(true)}
                                className="w-full p-4 bg-[#d9a65a]/10 border border-[#d9a65a]/20 rounded-xl flex items-center justify-center gap-3 group hover:bg-[#d9a65a] text-[#d9a65a] hover:text-[#3b2f2f] transition-all"
                            >
                                <UserCheck className="w-5 h-5 opacity-60 group-hover:opacity-100" />
                                <span className="text-[8px] font-black uppercase tracking-widest">Prioridade Geral</span>
                            </button>
                        </div>
                    </div>

                    {/* Histórico Recente */}
                    <div className="bg-white border border-gray-100 rounded-[2rem] p-8 shadow-lg">
                        <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-gray-400 mb-8">Últimas Atendidas</h3>
                        <div className="space-y-4">
                            {completedTickets.map(t => (
                                <div key={t.id} className="flex justify-between items-center text-[10px] font-black text-gray-400">
                                    <span className="text-[#3b2f2f]">{t.ticket_number}</span>
                                    <span className={`uppercase tracking-widest text-[8px] ${
                                        t.status === 'completed' ? 'text-emerald-600' : 'text-gray-300'
                                    }`}>{t.status === 'completed' ? 'Finalizado' : t.status === 'skipped' ? 'Ausência' : 'Cancelado'}</span>
                                </div>
                            ))}
                            {completedTickets.length === 0 && (
                                <p className="text-[8px] font-black uppercase text-center text-gray-300 py-10">Sem histórico recente</p>
                            )}
                        </div>
                    </div>
                </div>
            </motion.div>
        )}

                {activeTab === 'history' && (
                    <motion.div 
                        key="history"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="space-y-8"
                    >
                        {/* Stats Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                            {[
                                { label: 'Total Hoje', value: stats?.total || 0, icon: Ticket, color: 'text-blue-600' },
                                { label: 'Atendidos', value: stats?.completed || 0, icon: CheckCircle, color: 'text-emerald-600' },
                                { label: 'Aguardando', value: stats?.waiting || 0, icon: Clock, color: 'text-amber-600' },
                                { label: 'Faltas/Canc.', value: (stats?.cancelled || 0) + (stats?.skipped || 0), icon: XCircle, color: 'text-red-600' }
                            ].map((s, i) => (
                                <div key={i} className="bg-white p-6 rounded-3xl border border-white shadow-xl flex items-center gap-6">
                                    <div className={`${s.color} bg-current/10 p-4 rounded-2xl`}>
                                        <s.icon size={24} />
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">{s.label}</p>
                                        <p className="text-3xl font-black text-[#3b2f2f]">{s.value}</p>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Full History List */}
                        <div className="bg-white rounded-[2.5rem] border border-white shadow-2xl overflow-hidden">
                            <div className="p-8 border-b border-gray-50 flex items-center justify-between">
                                <h3 className="text-sm font-black uppercase tracking-tighter text-[#3b2f2f]">Histórico Detalhado (Hoje)</h3>
                                <div className="flex items-center gap-2 text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-full">
                                    <TrendingUp size={14} />
                                    <span className="text-[10px] font-black uppercase tracking-widest">Atividade em tempo real</span>
                                </div>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead>
                                        <tr className="bg-gray-50/50">
                                            <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400">Senha</th>
                                            <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400">Tempo Criação</th>
                                            <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400">Estado</th>
                                            <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400">Ações</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50">
                                        {[...tickets].reverse().map(t => (
                                            <tr key={t.id} className="hover:bg-gray-50/30 transition-colors">
                                                <td className="px-8 py-6">
                                                    <span className="text-lg font-black text-[#3b2f2f]">{t.ticket_number}</span>
                                                    {t.is_priority && <span className="ml-2 text-[8px] font-black bg-amber-100 text-amber-600 px-2 py-0.5 rounded-full uppercase">PRIO</span>}
                                                </td>
                                                <td className="px-8 py-6 text-xs text-gray-500 font-medium">
                                                    {new Date(t.created_at).toLocaleTimeString()}
                                                </td>
                                                <td className="px-8 py-6">
                                                    <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full ${
                                                        t.status === 'completed' ? 'bg-emerald-50 text-emerald-600' :
                                                        t.status === 'waiting' ? 'bg-amber-50 text-amber-600' :
                                                        t.status === 'calling' ? 'bg-blue-50 text-blue-600' :
                                                        'bg-gray-50 text-gray-400'
                                                    }`}>
                                                        {t.status}
                                                    </span>
                                                </td>
                                                <td className="px-8 py-6">
                                                    <button 
                                                        onClick={() => setShareTicket(t)}
                                                        className="p-2 text-gray-300 hover:text-[#d9a65a] transition-colors"
                                                    >
                                                        <Smartphone size={16} />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </motion.div>
                )}

                {activeTab === 'config' && (
                    <motion.div 
                        key="config"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="max-w-2xl"
                    >
                        <div className="bg-white rounded-[2.5rem] border border-white shadow-2xl p-10 space-y-10">
                            <div>
                                <h3 className="text-xl font-black text-[#3b2f2f] uppercase tracking-tighter mb-4">Configuração do Sistema</h3>
                                <p className="text-sm text-gray-500 leading-relaxed">Gerencie o estado global das filas e restaure o atendimento caso necessário.</p>
                            </div>

                            <div className="space-y-6">
                                <div className="p-8 bg-red-50 rounded-3xl border border-red-100 flex items-center justify-between gap-8">
                                    <div className="flex items-center gap-6">
                                        <div className="bg-red-500/10 p-4 rounded-2xl">
                                            <AlertTriangle className="text-red-500" size={24} />
                                        </div>
                                        <div>
                                            <h4 className="text-[11px] font-black uppercase tracking-widest text-[#3b2f2f] mb-1">Reiniciar Fila Diária</h4>
                                            <p className="text-[10px] text-gray-400 font-bold leading-normal">Cancela todas as senhas pendentes de hoje. Use com cautela.</p>
                                        </div>
                                    </div>
                                    <button 
                                        onClick={handleResetQueue}
                                        disabled={!!actionLoading}
                                        className="px-6 py-4 bg-red-600 text-white text-[10px] font-black uppercase tracking-widest rounded-2xl hover:bg-red-700 active:scale-95 transition-all shadow-xl shadow-red-600/20 disabled:opacity-50"
                                    >
                                        Reiniciar Agora
                                    </button>
                                </div>

                                <div className="p-8 bg-gray-50 rounded-3xl border border-gray-100 flex items-center justify-between gap-8">
                                    <div className="flex items-center gap-6">
                                        <div className="bg-gray-200 p-4 rounded-2xl">
                                            <Volume2 className="text-gray-500" size={24} />
                                        </div>
                                        <div>
                                            <h4 className="text-[11px] font-black uppercase tracking-widest text-[#3b2f2f] mb-1">Áudio do Painel</h4>
                                            <p className="text-[10px] text-gray-400 font-bold leading-normal">Ative ou desative as notificações de voz para este computador.</p>
                                        </div>
                                    </div>
                                    <button 
                                        onClick={toggleAudio}
                                        className={`px-6 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${
                                            audioEnabled ? 'bg-amber-100 text-amber-600 border border-amber-200' : 'bg-gray-200 text-gray-400'
                                        }`}
                                    >
                                        {audioEnabled ? 'Áudio Ativo' : 'Áudio Mudo'}
                                    </button>
                                </div>

                                {/* Connection Mode Toggle */}
                                <div className="p-8 bg-blue-50 rounded-3xl border border-blue-100 flex items-center justify-between gap-8">
                                    <div className="flex items-center gap-6">
                                        <div className="bg-blue-500/10 p-4 rounded-2xl">
                                            <Wifi className="text-blue-500" size={24} />
                                        </div>
                                        <div>
                                            <h4 className="text-[11px] font-black uppercase tracking-widest text-[#3b2f2f] mb-1">Modo de Conexão</h4>
                                            <p className="text-[10px] text-gray-400 font-bold leading-normal">Se estiver a ter erros de rede (Failed to fetch), experimente o Modo PROXY.</p>
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        {(['direct', 'proxy'] as ConnectionMode[]).map((mode) => (
                                            <button 
                                                key={mode}
                                                onClick={() => handleConnectionToggle(mode)}
                                                className={`px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                                                    connectionMode === mode ? 'bg-blue-600 text-white shadow-lg' : 'bg-white text-gray-400 border border-gray-100'
                                                }`}
                                            >
                                                {mode === 'direct' ? 'Direto' : 'Proxy'}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div className="pt-6 border-t border-gray-50">
                                <p className="text-[8px] font-black text-gray-300 uppercase tracking-[0.4em] text-center">Zyph Intelligence • v2.0</p>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* QR Code Share Modal */}
            <AnimatePresence>
                {shareTicket && (
                    <div className="fixed inset-0 bg-[#3b2f2f]/60 backdrop-blur-sm z-[200] flex items-center justify-center p-6">
                        <motion.div 
                            initial={{ scale: 0.9, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.9, opacity: 0, y: 20 }}
                            className="bg-white rounded-[3rem] p-10 w-full max-w-sm text-center shadow-4xl relative"
                        >
                            <button 
                                onClick={() => setShareTicket(null)}
                                className="absolute top-6 right-6 text-gray-300 hover:text-red-500 transition-colors"
                            >
                                <XCircle size={24} />
                            </button>

                            <p className="text-[10px] font-black text-[#d9a65a] uppercase tracking-[0.4em] mb-4">Senha Cliente</p>
                            <h3 className="text-6xl font-black text-[#3b2f2f] mb-8 leading-none tracking-tighter">{shareTicket.ticket_number}</h3>
                            
                            <div className="bg-gray-50 p-6 rounded-3xl border border-gray-100 mb-8 mx-auto w-fit">
                                <img 
                                    src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(`Senha: ${shareTicket.ticket_number}`)}`}
                                    alt="QR Code"
                                    className="w-40 h-40"
                                />
                            </div>

                            <button 
                                onClick={() => handleDownloadQR(`Pão Caseiro - Senha: ${shareTicket.ticket_number}`, `senha-${shareTicket.ticket_number}`)}
                                disabled={isDownloading}
                                className="w-full py-4 bg-[#3b2f2f] text-[#d9a65a] font-black rounded-2xl uppercase tracking-widest text-xs flex items-center justify-center gap-3 shadow-xl active:scale-95 transition-all disabled:opacity-50"
                            >
                                <RefreshCcw className={`w-4 h-4 ${isDownloading ? 'animate-spin' : 'hidden'}`} />
                                <Ticket className={`w-4 h-4 ${isDownloading ? 'hidden' : 'block'}`} />
                                {isDownloading ? 'A baixar...' : 'Descarregar QR Code'}
                            </button>
                            <p className="text-[8px] font-black text-gray-300 uppercase mt-6 tracking-widest">Digitalize para partilhar com o cliente</p>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};
