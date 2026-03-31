import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { supabase } from '../services/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import { Megaphone, Volume2, Clock, Info, ShieldCheck } from 'lucide-react';
import { useRealtimeTickets } from '../hooks/useRealtimeTickets';

export const TVTickets: React.FC = () => {
    const { tickets, loading } = useRealtimeTickets();
    const [company, setCompany] = useState<any>(null);
    const [isAudioEnabled, setIsAudioEnabled] = useState(false);
    const lastAnnouncedId = useRef<string | null>(null);
    const audioContext = useRef<AudioContext | null>(null);
    const lastUpdateRef = useRef<string | null>(null);

    // 1. Time-based Reset (24h)
    const today = new Date().toISOString().split('T')[0];
    const todayTickets = useMemo(() => 
        tickets.filter(t => t.created_at?.startsWith(today))
    , [tickets, today]);

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

    const historyTickets = useMemo(() => 
        todayTickets
            .filter(t => t.status === 'completed' || t.status === 'skipped')
            .sort((a, b) => {
                const timeA = a.updated_at ? new Date(a.updated_at).getTime() : 0;
                const timeB = b.updated_at ? new Date(b.updated_at).getTime() : 0;
                return timeB - timeA;
            })
            .slice(0, 5)
    , [todayTickets]);

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
        // Estimated 3 mins per person as a starting point
        const estMinutes = waitingCount * 3;
        return { waitingCount, estMinutes };
    }, [todayTickets]);

    const announcementQueue = useRef<string[]>([]);
    const isSpeaking = useRef(false);

    // Funções de Áudio Robustas (Web Audio API - Offline)
    const playNotificationSound = useCallback(() => {
        if (!audioContext.current) {
            audioContext.current = new (window.AudioContext || (window as any).webkitAudioContext)();
        }
        
        const ctx = audioContext.current;
        if (ctx.state === 'suspended') ctx.resume();

        const playTone = (freq: number, start: number, duration: number) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, start);
            
            gain.gain.setValueAtTime(0, start);
            gain.gain.linearRampToValueAtTime(0.2, start + 0.05);
            gain.gain.linearRampToValueAtTime(0, start + duration);
            
            osc.connect(gain);
            gain.connect(ctx.destination);
            
            osc.start(start);
            osc.stop(start + duration);
        };

        const now = ctx.currentTime;
        playTone(880, now, 0.4); // A5
        playTone(1108.73, now + 0.1, 0.4); // C#6
    }, []);

    const processNextAnnouncement = useCallback(() => {
        if (isSpeaking.current || announcementQueue.current.length === 0 || !isAudioEnabled) return;

        const text = announcementQueue.current.shift()!;
        isSpeaking.current = true;

        // Reset any existing synthesis
        window.speechSynthesis.cancel();

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'pt-PT';
        utterance.rate = 0.85;
        utterance.pitch = 1.0;
        utterance.volume = 1.0;

        // Find a natural PT voice
        const voices = window.speechSynthesis.getVoices();
        const ptVoice = voices.find(v => v.lang.startsWith('pt')) || voices[0];
        if (ptVoice) utterance.voice = ptVoice;

        utterance.onend = () => {
            isSpeaking.current = false;
            // Delay before next one to sound natural
            setTimeout(processNextAnnouncement, 1000);
        };

        utterance.onerror = () => {
            isSpeaking.current = false;
            setTimeout(processNextAnnouncement, 1000);
        };

        // Play chime before speaking
        playNotificationSound();
        
        setTimeout(() => {
            window.speechSynthesis.speak(utterance);
        }, 800);
    }, [isAudioEnabled, playNotificationSound]);

    // Monitor for new calls and add to queue
    useEffect(() => {
        if (lastCalled) {
            const currentUpdate = lastCalled.updated_at || lastCalled.called_at;
            if (currentUpdate !== lastUpdateRef.current) {
                lastUpdateRef.current = currentUpdate;
                
                const ticketLabel = (lastCalled.is_priority && !lastCalled.ticket_number.startsWith('P')) 
                    ? `P${lastCalled.ticket_number}` 
                    : lastCalled.ticket_number;
                const counterLabel = lastCalled.counter || 'Balcão';
                const announcementText = `Senha ${ticketLabel}, dirija-se ao ${counterLabel}`;
                
                console.log(`[Announcer] Queueing: ${announcementText}`);
                announcementQueue.current.push(announcementText);
                processNextAnnouncement();
            }
        }
    }, [lastCalled, processNextAnnouncement]);

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
            if (audioContext.current?.state === 'suspended') {
                audioContext.current.resume();
            }
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
            <header className="relative z-10 bg-white/[0.04] border-b border-white/5 py-8 px-16 flex justify-between items-center backdrop-blur-xl">
                <div className="flex items-center gap-12">
                    {company?.logo_url && (
                        <div className="bg-white p-3 rounded-2xl shadow-2xl">
                            <img 
                                src={company.logo_url} 
                                alt="Logo" 
                                className="h-20 w-auto object-contain" 
                            />
                        </div>
                    )}
                    <div className="h-16 w-px bg-white/10" />
                    <div>
                        <h1 className="text-5xl font-black tracking-tighter text-white uppercase leading-[0.8]">
                            {company?.office_name}
                        </h1>
                        <p className="text-amber-500 text-lg uppercase tracking-[0.4em] font-black mt-2 opacity-60">
                            {company?.slogan}
                        </p>
                    </div>
                </div>

                <div className="flex gap-12 items-center">
                    <div className="flex flex-col items-end gap-1">
                        <div className="text-[10px] font-black text-white/20 uppercase tracking-[0.5em]">Pessoas a aguardar</div>
                        <div className="text-4xl font-black text-amber-500 font-mono tracking-tighter">
                             {stats.waitingCount}
                        </div>
                    </div>
                    <div className="h-10 w-px bg-white/10" />
                    <div className="flex flex-col items-end gap-1">
                        <div className="text-[10px] font-black text-white/20 uppercase tracking-[0.5em]">Tempo Médio Espera</div>
                        <div className="text-4xl font-black text-white font-mono tracking-tighter uppercase flex items-center gap-2">
                             {stats.estMinutes} <span className="text-xs text-white/40">Min</span>
                        </div>
                    </div>
                    <div className="h-10 w-px bg-white/10" />
                    <div className="flex flex-col items-end gap-2">
                        <div className="text-[10px] font-black text-white/20 uppercase tracking-[0.5em]">Hora Local</div>
                        <div className="text-6xl font-black font-mono tracking-tighter">
                            <ClockDisplay />
                        </div>
                    </div>
                </div>
            </header>

            {/* Main Content Area */}
            <main className="flex-1 flex p-10 gap-10 relative z-10">
                
                {/* Primary Panel: CURRENT TICKET */}
                <div className="flex-[2.5] bg-white/[0.03] rounded-[4rem] border border-white/10 shadow-3xl flex flex-col overflow-hidden relative">
                    <div className="absolute inset-x-0 top-0 h-2 bg-gradient-to-r from-transparent via-amber-500/50 to-transparent shadow-[0_0_40px_rgba(245,158,11,0.5)]" />
                    
                    <div className="p-10 text-center border-b border-white/5 bg-white/[0.01]">
                        <h2 className="text-3xl font-black text-amber-500 uppercase tracking-[1em] opacity-40">A Chamar</h2>
                    </div>
 
                    <div className="flex-1 flex flex-col items-center justify-center p-8">
                        <AnimatePresence mode="wait">
                            {lastCalled ? (
                                <motion.div
                                    key={lastCalled.id}
                                    initial={{ opacity: 0, scale: 0.8, y: 50 }}
                                    animate={{ opacity: 1, scale: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 1.2, y: -50 }}
                                    transition={{ type: "spring", stiffness: 100, damping: 20 }}
                                    className="text-center w-full"
                                >
                                    <div className="text-[32rem] font-black font-mono leading-[0.7] text-white tracking-tighter filter drop-shadow-[0_20px_60px_rgba(0,0,0,0.8)]">
                                        {lastCalled.is_priority && !lastCalled.ticket_number.startsWith('P') ? 'P' : ''}{lastCalled.ticket_number}
                                    </div>
 
                                    <div className="mt-16 space-y-10">
                                        <div className="text-4xl font-black text-white/30 uppercase tracking-[0.6em]">Dirija-se ao</div>
                                        <motion.div 
                                            animate={{ 
                                                scale: [1, 1.02, 1],
                                                boxShadow: ["0 0 50px rgba(245,158,11,0.2)", "0 0 100px rgba(245,158,11,0.5)", "0 0 50px rgba(245,158,11,0.2)"]
                                            }}
                                            transition={{ duration: 2, repeat: Infinity }}
                                            className="inline-block bg-amber-500 text-black px-40 py-10 rounded-[3rem] text-[7rem] font-black uppercase tracking-tight border-[10px] border-white/10"
                                        >
                                            {lastCalled.counter || 'BALCÃO'}
                                        </motion.div>
                                    </div>
                                </motion.div>
                            ) : (
                                <div className="text-white/5 text-5xl font-black uppercase tracking-[1em] text-center leading-relaxed">
                                    Disponível para<br/>Atendimento
                                </div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>
 
                {/* Secondary Panels: Next & History */}
                <div className="flex-1 flex flex-col gap-10">
                     {/* Next in Line Panel */}
                     <div className="flex-1 bg-white/[0.02] rounded-[3.5rem] border border-white/5 flex flex-col overflow-hidden">
                        <div className="p-6 border-b border-white/5">
                             <h3 className="text-lg font-black text-white/40 uppercase tracking-[0.3em] text-center">Seguintes em Linha</h3>
                        </div>
                        <div className="flex-1 p-6 grid grid-cols-3 gap-6">
                            {waitingNext.map((t, idx) => (
                                <motion.div 
                                    key={t.id}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: idx * 0.1 }}
                                    className="flex flex-col items-center justify-center bg-white/5 rounded-3xl border border-white/5 py-4"
                                >
                                    <span className="text-4xl font-black font-mono text-white/40">
                                        {t.is_priority && !t.ticket_number.startsWith('P') ? 'P' : ''}{t.ticket_number}
                                    </span>
                                    <div className={`mt-2 w-1.5 h-1.5 rounded-full ${t.is_priority ? 'bg-amber-500 animate-pulse' : 'bg-white/10'}`} />
                                </motion.div>
                            ))}
                        </div>
                     </div>

                     {/* History Panel */}
                     <div className="flex-[1.5] bg-black/40 rounded-[3.5rem] border border-white/5 flex flex-col overflow-hidden shadow-inner">
                        <div className="p-6 border-b border-white/5 bg-white/[0.01]">
                            <h3 className="text-xl font-black text-white/20 uppercase tracking-[0.4em] text-center">Últimas Chamadas</h3>
                        </div>
                        <div className="flex-1 p-6 space-y-4 overflow-hidden">
                             {callingTickets.slice(1, 5).map((t, idx) => (
                                 <motion.div 
                                    key={t.id}
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: idx * 0.1 }}
                                    className="bg-white/5 rounded-[1.5rem] p-5 flex items-center justify-between border border-white/5"
                                 >
                                     <span className="text-4xl font-black font-mono text-white/70">
                                         {t.is_priority && !t.ticket_number.startsWith('P') ? 'P' : ''}{t.ticket_number}
                                     </span>
                                     <div className="h-10 w-px bg-white/10 mx-4" />
                                     <span className="text-xl font-black text-amber-500/50 uppercase tracking-widest">{t.counter}</span>
                                 </motion.div>
                             ))}
                             {callingTickets.length <= 1 && (
                                  <div className="h-full flex items-center justify-center opacity-10">
                                      <Info className="w-12 h-12" />
                                  </div>
                             )}
                        </div>
                     </div>
                </div>
            </main>

            {/* Bottom Ticker/Status Bar */}
            <footer className="relative z-10 bg-white/[0.02] border-t border-white/5 py-8 px-20 flex justify-between items-center backdrop-blur-3xl">
                <div className="flex items-center gap-6">
                    <div className="flex items-center gap-3 bg-black/60 px-5 py-2 rounded-full border border-white/5">
                        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                        <span className="text-[10px] font-black uppercase tracking-[0.3em] text-white/40">Sistema Operacional</span>
                    </div>

                    {!isAudioEnabled && (
                        <motion.button
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => {
                                if (audioContext.current?.state === 'suspended') {
                                    audioContext.current.resume();
                                }
                                setIsAudioEnabled(true);
                            }}
                            className="flex items-center gap-3 bg-amber-500 text-black px-6 py-2 rounded-full border border-white/20 font-black text-[10px] uppercase tracking-widest shadow-[0_0_20px_rgba(245,158,11,0.3)] animate-bounce"
                        >
                            <Volume2 className="w-4 h-4" /> Ativar Som para Chamadas
                        </motion.button>
                    )}
                </div>

                <div className="flex items-center gap-12 text-white/20 font-black text-[10px] uppercase tracking-[0.4em]">
                    <span>© {new Date().getFullYear()} ZYPH INTELLIGENCE</span>
                    <ShieldCheck className="w-4 h-4 opacity-30" />
                </div>
            </footer>

            {/* No splash screen - auto-active */}
        </div>
    );
};

const ClockDisplay: React.FC = () => {
    const [time, setTime] = useState(new Date());
    useEffect(() => {
        const timer = setInterval(() => setTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);
    return <>{time.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</>;
};
