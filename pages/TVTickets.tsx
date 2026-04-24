import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { supabase } from '../services/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import { Megaphone, Volume2, Clock, Info, ShieldCheck, Ticket } from 'lucide-react';
import { useRealtimeTickets } from '../hooks/useRealtimeTickets';

import { translations, Language } from '../translations';

export const TVTickets: React.FC<{ language?: Language }> = ({ language = 'pt' }) => {
    const t = translations[language];
    const { tickets, loading } = useRealtimeTickets();
    const [company, setCompany] = useState<any>(null);
    const [isAudioEnabled, setIsAudioEnabled] = useState(false);
    const lastAnnouncedId = useRef<string | null>(null);
    const audioContext = useRef<AudioContext | null>(null);
    const lastUpdateRef = useRef<string | null>(null);

    // 1. Time-based Reset (24h)
    // The hook now handles timezone correctly for Maputo
    const todayTickets = tickets;

    // 2. State Derivations
    const callingTickets = useMemo(() => 
        todayTickets
            .filter(t => t.status === 'calling')
            .sort((a, b) => {
                const timeA = a.called_at ? new Date(a.called_at).getTime() : 0;
                const timeB = b.called_at ? new Date(b.called_at).getTime() : 0;
                return timeB - timeA;
            })
    , [todayTickets]);

    const lastCalled = callingTickets.length > 0 ? callingTickets[0] : null;

    const waitingNext = useMemo(() => 
        todayTickets
            .filter(t => t.status === 'waiting')
            .sort((a, b) => {
                if (a.is_priority && !b.is_priority) return -1;
                if (!a.is_priority && b.is_priority) return 1;
                const timeA = a.created_at ? new Date(a.created_at).getTime() : 0;
                const timeB = b.created_at ? new Date(b.created_at).getTime() : 0;
                return timeA - timeB;
            })
            .slice(0, 3)
    , [todayTickets]);

    const stats = useMemo(() => {
        const waitingCount = todayTickets.filter(t => t.status === 'waiting').length;
        
        const activeCounters = 1;

        // Calculate actual average service time from last 10 completed tickets today
        const completedToday = todayTickets
            .filter(t => t.status === 'completed' && t.created_at && t.updated_at)
            .sort((a, b) => new Date(b.updated_at!).getTime() - new Date(a.updated_at!).getTime())
            .slice(0, 10);

        let avgServiceMinutes = 5; // Default fallback
        if (completedToday.length > 0) {
            const totalMinutes = completedToday.reduce((acc, t) => {
                const start = new Date(t.created_at).getTime();
                const end = new Date(t.updated_at!).getTime();
                return acc + (end - start) / (1000 * 60);
            }, 0);
            avgServiceMinutes = Math.max(3, Math.min(15, totalMinutes / completedToday.length));
        }
        
        // Total waiting time estimation
        const estMinutes = Math.max(2, Math.ceil((waitingCount / activeCounters) * avgServiceMinutes));
        
        return { waitingCount, estMinutes, activeCounters };
    }, [todayTickets]);

    const announcementQueue = useRef<string[]>([]);
    const isSpeaking = useRef(false);

    // High-Quality Chime Sound
    const playNotificationSound = useCallback(() => {
        const chime = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
        chime.volume = 0.5;
        chime.play().catch(e => console.warn("[Audio] Chime playback blocked:", e));
    }, []);

    const processNextAnnouncement = useCallback(() => {
        if (isSpeaking.current || announcementQueue.current.length === 0 || !isAudioEnabled) return;

        const text = announcementQueue.current.shift()!;
        isSpeaking.current = true;

        // Reset any existing synthesis
        window.speechSynthesis.cancel();

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = language === 'en' ? 'en-US' : 'pt-PT';
        utterance.rate = 0.85;
        utterance.pitch = 1.0;
        utterance.volume = 1.0;

        // Find a natural voice
        const voices = window.speechSynthesis.getVoices();
        const voice = voices.find(v => v.lang.startsWith(language) && v.name.includes('Natural')) || 
                      voices.find(v => v.lang.startsWith(language)) || 
                      voices[0];
        if (voice) utterance.voice = voice;

        utterance.onend = () => {
            isSpeaking.current = false;
            setTimeout(processNextAnnouncement, 1500);
        };

        utterance.onerror = () => {
            isSpeaking.current = false;
            setTimeout(processNextAnnouncement, 1000);
        };

        // Play chime before speaking
        playNotificationSound();
        
        // Wait for chime to breathe before TTS starts
        setTimeout(() => {
            window.speechSynthesis.speak(utterance);
        }, 1200);
    }, [isAudioEnabled, playNotificationSound, language]);

    // Monitor for new calls and add to queue
    useEffect(() => {
        if (lastCalled && isAudioEnabled) {
            const currentUpdate = lastCalled.updated_at || lastCalled.called_at;
            const currentCallKey = `${lastCalled.id}-${currentUpdate}`;
            
            if (currentCallKey !== lastUpdateRef.current) {
                lastUpdateRef.current = currentCallKey;
                
                const ticketLabel = lastCalled.ticket_number;
                const announcementText = language === 'en' 
                    ? `Ticket ${ticketLabel}, please come forward`
                    : `Senha ${ticketLabel}, por favor dirija-se ao atendimento`;
                
                console.log(`[Announcer] Queueing: ${announcementText}`);
                announcementQueue.current.push(announcementText);
                
                if (!isSpeaking.current) {
                    processNextAnnouncement();
                }
            }
        }
    }, [lastCalled?.id, lastCalled?.updated_at, lastCalled?.called_at, processNextAnnouncement, language, isAudioEnabled]);

    useEffect(() => {
        const fetchBranding = async () => {
            const { data: settingsData } = await supabase.from('settings').select('key, value');
            const settingsMap = settingsData?.reduce((acc: any, item: any) => ({ ...acc, [item.key]: item.value }), {}) || {};
            const { data: companyData } = await supabase.from('company_profiles').select('*').limit(1).maybeSingle();
            
            setCompany({
                logo_url: '/logo_on_dark.png',
                office_name: settingsMap.office_name || companyData?.office_name || 'Pão Caseiro',
                slogan: settingsMap.slogan || companyData?.slogan || 'O Sabor que Aquece o Coração'
            });
        };
        fetchBranding();
        
        // Load voices
        window.speechSynthesis.getVoices();
        if (window.speechSynthesis.onvoiceschanged !== undefined) {
            window.speechSynthesis.onvoiceschanged = () => window.speechSynthesis.getVoices();
        }

        const handleFirstInteraction = () => {
            setIsAudioEnabled(true);
            window.removeEventListener('click', handleFirstInteraction);
        };
        window.addEventListener('click', handleFirstInteraction);
        return () => window.removeEventListener('click', handleFirstInteraction);
    }, []);


    if (loading) return (
        <div className="h-screen bg-black flex items-center justify-center">
            <div className="w-16 h-16 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
        </div>
    );

    return (
        <div className="h-screen bg-[#050505] text-white font-sans overflow-hidden flex flex-col select-none">
            {/* Ambient Background */}
            <div className="fixed inset-0 pointer-events-none opacity-30">
                <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-amber-600/10 rounded-full blur-[120px]" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-600/5 rounded-full blur-[100px]" />
            </div>

            {/* Header Area */}
            <header className="relative z-10 bg-white/[0.04] border-b border-white/5 py-6 px-16 flex justify-between items-center backdrop-blur-xl flex-shrink-0">
                <div className="flex items-center gap-12">
                    {company?.logo_url && (
                        <div className="bg-white p-2 rounded-2xl shadow-2xl">
                            <img 
                                src={company.logo_url} 
                                alt="Logo" 
                                className="h-16 w-auto object-contain" 
                            />
                        </div>
                    )}
                    <div className="h-12 w-px bg-white/10" />
                    <div>
                        <h1 className="text-4xl font-black tracking-tighter text-white uppercase leading-[0.8]">
                            {company?.office_name}
                        </h1>
                        <p className="text-amber-500 text-sm uppercase tracking-[0.4em] font-black mt-2 opacity-60">
                            {company?.slogan}
                        </p>
                    </div>
                </div>

                <div className="flex gap-10 items-center">
                    <div className="flex flex-col items-end gap-1">
                        <div className="text-[9px] font-black text-white/20 uppercase tracking-[0.5em]">{t.clientDashboard.queue.waitingPeople}</div>
                        <div className="text-3xl font-black text-amber-500 font-mono tracking-tighter">
                             {stats.waitingCount}
                        </div>
                    </div>
                    <div className="h-8 w-px bg-white/10" />
                    <div className="flex flex-col items-end gap-1">
                        <div className="text-[9px] font-black text-white/20 uppercase tracking-[0.5em]">{t.clientDashboard.queue.avgWaitTime}</div>
                        <div className="text-3xl font-black text-white font-mono tracking-tighter uppercase flex items-center gap-2">
                             {stats.estMinutes} <span className="text-xs text-white/40">Min</span>
                        </div>
                    </div>
                    <div className="h-8 w-px bg-white/10" />
                    <div className="flex flex-col items-end gap-1">
                        <div className="text-[9px] font-black text-white/20 uppercase tracking-[0.5em]">{language === 'en' ? 'Local Time' : 'Hora Local'}</div>
                        <div className="text-5xl font-black font-mono tracking-tighter">
                            <ClockDisplay />
                        </div>
                    </div>
                </div>
            </header>

            {/* Main Content Area */}
            <main className="flex-1 flex p-8 gap-8 relative z-10 overflow-hidden">
                
                {/* Primary Panel: CURRENT TICKET */}
                <div className="flex-[2.5] bg-white/[0.03] rounded-[3rem] border border-white/10 shadow-3xl flex flex-col overflow-hidden relative">
                    <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-transparent via-amber-500/50 to-transparent shadow-[0_0_40px_rgba(245,158,11,0.5)]" />
                    
                    <div className="p-6 text-center border-b border-white/5 bg-white/[0.01] flex-shrink-0">
                        <h2 className="text-2xl font-black text-amber-500 uppercase tracking-[1em] opacity-40">{t.clientDashboard.queue.calling}</h2>
                    </div>
 
                    <div className="flex-1 flex flex-col items-center justify-center p-6 overflow-hidden">
                        <AnimatePresence mode="wait">
                            {lastCalled ? (
                                <motion.div
                                    key={lastCalled.id}
                                    initial={{ opacity: 0, scale: 0.8, y: 50 }}
                                    animate={{ opacity: 1, scale: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 1.2, y: -50 }}
                                    transition={{ type: "spring", stiffness: 100, damping: 20 }}
                                    className="text-center w-full flex flex-col items-center justify-center"
                                >
                                    <div className="text-[clamp(10rem,25vh,18rem)] font-black font-mono leading-[0.7] text-white tracking-tighter filter drop-shadow-[0_20px_60px_rgba(0,0,0,0.4)]">
                                        {lastCalled.ticket_number}
                                    </div>
 
                                    <div className="mt-12 space-y-8">
                                        <div className="text-3xl font-black text-white/30 uppercase tracking-[0.6em]">{t.clientDashboard.queue.dirijaSeAo}</div>
                                        <motion.div 
                                            animate={{ 
                                                scale: [1, 1.02, 1],
                                                boxShadow: ["0 0 50px rgba(245,158,11,0.2)", "0 0 100px rgba(245,158,11,0.5)", "0 0 50px rgba(245,158,11,0.2)"]
                                            }}
                                            transition={{ duration: 2, repeat: Infinity }}
                                            className="inline-block bg-amber-500 text-black px-32 py-8 rounded-[2.5rem] text-[clamp(4rem,10vh,6rem)] font-black uppercase tracking-tight border-[8px] border-white/10"
                                        >
                                            ATENDIMENTO
                                        </motion.div>
                                    </div>
                                </motion.div>
                            ) : (
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    className="text-center flex flex-col items-center"
                                >
                                    <div className="w-32 h-32 bg-[#d9a65a]/10 rounded-full flex items-center justify-center mb-8 border border-[#d9a65a]/20 animate-pulse">
                                        <Ticket className="w-16 h-16 text-[#d9a65a]" />
                                    </div>
                                    <div className="text-white/20 text-5xl font-black uppercase tracking-[0.5em] leading-tight">
                                        {t.clientDashboard.queue.available}
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>
 
                {/* Secondary Panels: Next & History */}
                <div className="flex-1 flex flex-col gap-8">
                     {/* Next in Line Panel */}
                     <div className="flex-1 bg-white/[0.02] rounded-[3rem] border border-white/5 flex flex-col overflow-hidden">
                        <div className="p-4 border-b border-white/5 flex-shrink-0">
                             <h3 className="text-base font-black text-white/40 uppercase tracking-[0.3em] text-center">{t.clientDashboard.queue.nextInLine}</h3>
                        </div>
                        <div className="flex-1 p-5 grid grid-cols-3 gap-4 content-center">
                            {waitingNext.map((t, idx) => (
                                <motion.div 
                                    key={t.id}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: idx * 0.1 }}
                                    className="flex flex-col items-center justify-center bg-white/5 rounded-2xl border border-white/5 py-4"
                                >
                                    <span className="text-3xl font-black font-mono text-white/40">
                                        {t.ticket_number}
                                    </span>
                                    <div className={`mt-2 w-1 h-1 rounded-full ${t.is_priority ? 'bg-amber-500 animate-pulse' : 'bg-white/10'}`} />
                                </motion.div>
                            ))}
                            {waitingNext.length === 0 && (
                                <div className="col-span-3 text-center py-4 text-white/10 text-xs font-black uppercase tracking-widest">
                                    Vazio
                                </div>
                            )}
                        </div>
                     </div>

                     {/* History Panel */}
                     <div className="flex-[1.5] bg-black/40 rounded-[3rem] border border-white/5 flex flex-col overflow-hidden shadow-inner">
                        <div className="p-5 border-b border-white/5 bg-white/[0.01] flex-shrink-0">
                            <h3 className="text-lg font-black text-white/20 uppercase tracking-[0.4em] text-center">{t.clientDashboard.queue.lastCalls}</h3>
                        </div>
                        <div className="flex-1 p-5 space-y-3 overflow-hidden">
                             {callingTickets.slice(1, 5).map((t, idx) => (
                                 <motion.div 
                                    key={t.id}
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: idx * 0.1 }}
                                    className="bg-white/5 rounded-[1.2rem] p-4 flex items-center justify-between border border-white/5"
                                 >
                                     <span className="text-3xl font-black font-mono text-white/70">
                                         {t.ticket_number}
                                     </span>
                                     <div className="h-8 w-px bg-white/10 mx-3" />
                                     <span className="text-lg font-black text-amber-500/50 uppercase tracking-widest truncate">Atendido</span>
                                 </motion.div>
                             ))}
                             {callingTickets.length <= 1 && (
                                  <div className="h-full flex items-center justify-center opacity-10">
                                      <Info className="w-10 h-10" />
                                  </div>
                             )}
                        </div>
                     </div>
                </div>
            </main>

            {/* Bottom Ticker/Status Bar */}
            <footer className="relative z-10 bg-white/[0.02] border-t border-white/5 py-6 px-20 flex justify-between items-center backdrop-blur-3xl flex-shrink-0">
                <div className="flex items-center gap-6">
                    <div className="flex items-center gap-3 bg-black/60 px-5 py-2 rounded-full border border-white/5">
                        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                        <span className="text-[9px] font-black uppercase tracking-[0.3em] text-white/40">{language === 'en' ? 'Operating System' : 'Sistema Operacional'}</span>
                    </div>

                    {!isAudioEnabled && (
                        <motion.button
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => setIsAudioEnabled(true)}
                            className="flex items-center gap-3 bg-amber-500 text-black px-6 py-2 rounded-full border border-white/20 font-black text-[10px] uppercase tracking-widest shadow-[0_0_20px_rgba(245,158,11,0.3)] animate-bounce"
                        >
                            <Volume2 className="w-4 h-4" /> {t.clientDashboard.queue.activateSound}
                        </motion.button>
                    )}
                </div>

                <div className="flex items-center gap-12 text-white/20 font-black text-[10px] uppercase tracking-[0.4em]">
                    <span>© {new Date().getFullYear()} ZYPH INTELLIGENCE</span>
                    <ShieldCheck className="w-4 h-4 opacity-30" />
                </div>
            </footer>

            {/* Audio Overlay - Mandatory for sound activation */}
            <AnimatePresence>
                {!isAudioEnabled && (
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setIsAudioEnabled(true)}
                        className="fixed inset-0 z-[200] bg-black/95 backdrop-blur-2xl flex flex-col items-center justify-center p-20 text-center cursor-pointer"
                    >
                        <motion.div 
                            animate={{ scale: [1, 1.1, 1] }}
                            transition={{ repeat: Infinity, duration: 2 }}
                            className="w-32 h-32 bg-amber-500 rounded-full flex items-center justify-center mb-10 shadow-[0_0_50px_rgba(245,158,11,0.4)]"
                        >
                            <Volume2 className="w-16 h-16 text-black" />
                        </motion.div>
                        <h2 className="text-6xl font-black uppercase tracking-tighter mb-6">{language === 'en' ? 'Sound Required' : 'Ativar Som da TV'}</h2>
                        <p className="text-xl text-white/40 max-w-lg mb-12 uppercase font-bold tracking-widest">
                            {language === 'en' 
                                ? 'Please click anywhere to enable audio notifications for calling tickets.' 
                                : 'Clique em qualquer lugar para ativar o som das chamadas de senhas.'}
                        </p>
                        <button 
                            className="px-16 py-6 bg-white text-black rounded-full font-black uppercase tracking-[0.3em] text-sm hover:bg-amber-500 transition-all active:scale-95 shadow-2xl pointer-events-none"
                        >
                            {language === 'en' ? 'Enable Audio Now' : 'Ativar Agora'}
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

const ClockDisplay: React.FC = () => {
    const [time, setTime] = useState(new Date());
    useEffect(() => {
        const timer = setInterval(() => setTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);
    return <>{time.toLocaleTimeString('pt-PT', { timeZone: 'Africa/Maputo', hour: '2-digit', minute: '2-digit', second: '2-digit' })}</>;
};
