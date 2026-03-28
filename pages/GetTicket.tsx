import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import { Ticket, Clock, CheckCircle, Smartphone, UserCheck, Search, X, Printer, Bell } from 'lucide-react';
import { queueService } from '../services/queue';
import { printerService } from '../services/printer';
import { notifyQueueTicketGenerated } from '../services/sms';

export const GetTicket: React.FC = () => {
    const [step, setStep] = useState<'category' | 'type' | 'phone' | 'otp' | 'ticket'>('category');
    const [selectedCategory, setSelectedCategory] = useState<string>('');
    const [ticket, setTicket] = useState<any>(null);
    const [peopleAhead, setPeopleAhead] = useState(0);
    const [company, setCompany] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    
    // Priority & OTP State
    const [phoneValue, setPhoneValue] = useState('');
    const [phoneError, setPhoneError] = useState('');
    const [isPriorityMode, setIsPriorityMode] = useState(false);
    const [otpInput, setOtpInput] = useState('');
    const [generatedOtp, setGeneratedOtp] = useState('');

    useEffect(() => {
        const fetchBranding = async () => {
            const { data: settingsData } = await supabase.from('settings').select('key, value');
            const settingsMap = settingsData?.reduce((acc: any, item: any) => ({ ...acc, [item.key]: item.value }), {}) || {};
            const { data: companyData } = await supabase.from('company_profiles').select('*').limit(1).maybeSingle();
            
            setCompany({
                logo_url: settingsMap.logo_url || companyData?.logo_url || '/images/logo_receipt.png',
                office_name: settingsMap.office_name || companyData?.office_name || 'Pão Caseiro',
                slogan: settingsMap.slogan || companyData?.slogan || 'O Sabor que Aquece o Coração'
            });
        };
        fetchBranding();
    }, []);

    useEffect(() => {
        if (!ticket) return;
        const channel = supabase
            .channel(`ticket-${ticket.id}`)
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'queue_tickets', filter: `id=eq.${ticket.id}` }, 
            (payload) => setTicket(payload.new))
            .subscribe();
        return () => { supabase.removeChannel(channel); };
    }, [ticket?.id]);

    useEffect(() => {
        if (ticket?.status !== 'waiting') return;
        const checkAhead = async () => {
             const today = new Date().toISOString().split('T')[0];
             const { count } = await supabase
                .from('queue_tickets')
                .select('*', { count: 'exact', head: true })
                .eq('status', 'waiting')
                .gte('created_at', today)
                .lt('created_at', ticket.created_at);
             if (count !== null) setPeopleAhead(count);
        };
        checkAhead();
        const interval = setInterval(checkAhead, 10000);
        return () => clearInterval(interval);
    }, [ticket]);

    const handleGetTicket = async (priority: boolean = false, phone?: string) => {
        setLoading(true);
        try {
            const data = await queueService.generateTicket(priority, phone, selectedCategory);
            setTicket(data);
            setStep('ticket');
            
            // Trigger automatic printing
            try {
                await printerService.printTicket(data);
            } catch (printErr) {
                console.warn("Print attempt failed:", printErr);
            }

            // Trigger SMS notification
            if (phone) {
                try {
                    await notifyQueueTicketGenerated(data, phone);
                } catch (smsErr) {
                    console.warn("SMS notification failed:", smsErr);
                }
            }
        } catch (error) {
            console.error("Error creating ticket:", error);
            alert("Erro ao gerar senha. Tente novamente.");
        } finally {
            setLoading(false);
        }
    };

    const startOtpFlow = async () => {
        if (phoneValue.length < 9) {
            setPhoneError('Introduza um número válido (9 dígitos).');
            return;
        }

        setLoading(true);
        setPhoneError('');
        try {
            // 1. Check Eligibility First (Must be registered > 7 days)
            const eligibility = await queueService.checkPriorityEligibility(phoneValue);
            if (!eligibility.eligible) {
                setPhoneError(eligibility.message || 'Não elegível para prioridade.');
                setLoading(false);
                return;
            }

            // 2. Generate and Send OTP
            const code = Math.floor(1000 + Math.random() * 9000).toString();
            setGeneratedOtp(code);
            
            const smsBody = `Pao Caseiro: O seu codigo de verificacao para senha prioritaria e: ${code}. Valido por 5 minutos.`;
            const { sendSMS } = await import('../services/sms');
            await sendSMS(phoneValue, smsBody);
            
            setStep('otp');
        } catch (error) {
            setPhoneError('Erro ao enviar SMS. Verifique o número.');
        } finally {
            setLoading(false);
        }
    };

    const verifyOtp = async () => {
        if (otpInput === generatedOtp) {
            await handleGetTicket(true, phoneValue);
        } else {
            setPhoneError('Código incorreto. Tente novamente.');
        }
    };

    return (
        <div className="min-h-screen bg-[#050505] text-white font-sans flex flex-col items-center justify-center p-8 relative overflow-hidden select-none">
            {/* Ambient Background Glows */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
                <div className="absolute top-[-10%] right-[-10%] w-[70%] h-[70%] bg-[#d9a65a]/10 rounded-full blur-[120px]" />
                <div className="absolute bottom-[-10%] left-[-10%] w-[60%] h-[60%] bg-amber-500/5 rounded-full blur-[100px]" />
            </div>

            <div className="w-full max-w-lg relative z-10 flex flex-col items-center">
                <motion.img 
                    initial={{ opacity: 0, scale: 0.8 }} 
                    animate={{ opacity: 1, scale: 1 }} 
                    src={company?.logo_url || "/logo.png"} 
                    alt={company?.office_name || "Pão Caseiro"} 
                    className="h-28 w-auto object-contain mb-12 filter drop-shadow-[0_0_30px_rgba(255,255,255,0.1)]" 
                />

                <AnimatePresence mode="wait">
                    {step === 'category' && (
                        <motion.div 
                            key="categories" 
                            initial={{ opacity: 0, scale: 0.9 }} 
                            animate={{ opacity: 1, scale: 1 }} 
                            exit={{ opacity: 0, scale: 1.1, filter: "blur(20px)" }} 
                            className="bg-white/[0.03] backdrop-blur-3xl p-10 rounded-[4rem] shadow-3xl w-full text-center border border-white/10"
                        >
                            <h1 className="text-4xl font-black mb-10 tracking-tighter uppercase">Escolha o Serviço</h1>
                            <div className="grid grid-cols-2 gap-4">
                                {[
                                    { id: 'Padaria', icon: Ticket, color: 'hover:bg-[#d9a65a]' },
                                    { id: 'Confeitaria', icon: Bell, color: 'hover:bg-amber-500' },
                                    { id: 'Café', icon: Clock, color: 'hover:bg-orange-500' },
                                    { id: 'Lanches', icon: Smartphone, color: 'hover:bg-amber-600' }
                                ].map((cat) => (
                                    <button
                                        key={cat.id}
                                        onClick={() => { setSelectedCategory(cat.id); setStep('type'); }}
                                        className={`flex flex-col items-center justify-center p-8 bg-white/5 rounded-3xl border border-white/5 transition-all active:scale-95 group ${cat.color}`}
                                    >
                                        <cat.icon className="w-10 h-10 mb-4 text-[#d9a65a] group-hover:text-black" />
                                        <span className="font-black uppercase tracking-widest text-[10px] group-hover:text-black">{cat.id}</span>
                                    </button>
                                ))}
                            </div>
                        </motion.div>
                    )}

                    {step === 'type' && (
                        <motion.div 
                            key="type-selection" 
                            initial={{ opacity: 0, x: 50 }} 
                            animate={{ opacity: 1, x: 0 }} 
                            exit={{ opacity: 0, x: -50 }} 
                            className="bg-white/[0.03] backdrop-blur-3xl p-12 rounded-[4rem] shadow-3xl w-full text-center border border-white/10"
                        >
                            <button onClick={() => setStep('category')} className="absolute top-8 left-8 text-white/20 hover:text-white flex items-center gap-2 text-[10px] font-black uppercase tracking-widest transition-colors">
                                <X className="w-4 h-4" /> Voltar
                            </button>
                            
                            <div className="w-20 h-20 bg-[#d9a65a]/20 rounded-2xl flex items-center justify-center mx-auto mb-8 border border-[#d9a65a]/20">
                                <Ticket className="w-10 h-10 text-[#d9a65a]" />
                            </div>
                            <h2 className="text-3xl font-black mb-2 uppercase tracking-tighter">{selectedCategory}</h2>
                            <p className="text-white/40 mb-10 text-[10px] font-bold uppercase tracking-widest">Selecione o tipo de atendimento</p>
                            
                            <div className="space-y-6">
                                <button 
                                    onClick={() => handleGetTicket(false)} 
                                    className="w-full bg-[#d9a65a] hover:bg-white text-[#0f0d0d] py-8 rounded-[2.5rem] font-black uppercase tracking-widest text-xl shadow-2xl transition-all active:scale-[0.98]"
                                >
                                    Senha Normal
                                </button>
                                <button 
                                    onClick={() => { setIsPriorityMode(true); setStep('phone'); }} 
                                    className="w-full bg-white/5 hover:bg-white/10 text-white/60 py-6 rounded-[2rem] font-black uppercase tracking-widest text-xs transition-all border border-white/5 flex items-center justify-center gap-3"
                                >
                                    <UserCheck className="w-5 h-5 text-amber-500" />
                                    Atendimento Prioritário
                                </button>
                            </div>
                        </motion.div>
                    )}

                    {step === 'phone' && (
                        <motion.div 
                            key="phone-input" 
                            className="bg-white/[0.03] backdrop-blur-3xl p-10 rounded-[4rem] border border-white/10 w-full text-center"
                        >
                            <h3 className="text-3xl font-black text-white mb-2 uppercase tracking-tighter">Validar Prioridade</h3>
                            <p className="text-white/40 text-[10px] font-bold uppercase tracking-widest mb-10">Introduza o seu número de telefone</p>
                            
                            <input 
                                type="tel" 
                                value={phoneValue}
                                onChange={(e) => setPhoneValue(e.target.value)}
                                className="w-full bg-white/5 border border-white/10 p-6 rounded-2xl text-2xl font-mono font-black text-center text-white outline-none focus:border-amber-500 mb-6"
                                placeholder="258..."
                            />
                            
                            {phoneError && <p className="text-red-500 text-[10px] font-black uppercase mb-6">{phoneError}</p>}
                            
                            <div className="flex gap-4">
                                <button onClick={() => setStep('type')} className="flex-1 py-6 bg-white/5 font-black rounded-2xl uppercase tracking-widest text-[10px]">Cancelar</button>
                                <button onClick={startOtpFlow} disabled={loading} className="flex-[2] py-6 bg-[#d9a65a] text-black font-black rounded-2xl uppercase tracking-widest text-sm shadow-xl flex items-center justify-center gap-2">
                                    {loading ? <div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin" /> : 'Enviar SMS'}
                                </button>
                            </div>
                        </motion.div>
                    )}

                    {step === 'otp' && (
                        <motion.div key="otp-input" className="bg-white/[0.03] backdrop-blur-3xl p-10 rounded-[4rem] border border-white/10 w-full text-center">
                            <h3 className="text-3xl font-black text-white mb-2 uppercase tracking-tighter">Verificar SMS</h3>
                            <p className="text-white/40 text-[10px] font-bold uppercase tracking-widest mb-10">Introduza o código de 4 dígitos enviado para {phoneValue}</p>
                            
                            <input 
                                type="text" 
                                value={otpInput}
                                onChange={(e) => setOtpInput(e.target.value)}
                                maxLength={4}
                                className="w-full bg-white/5 border border-white/10 p-6 rounded-2xl text-4xl font-mono font-black text-center text-white outline-none focus:border-amber-500 mb-6"
                                placeholder="0000"
                            />
                            
                            {phoneError && <p className="text-red-500 text-[10px] font-black uppercase mb-6">{phoneError}</p>}
                            
                            <div className="flex gap-4">
                                <button onClick={() => setStep('phone')} className="flex-1 py-6 bg-white/5 font-black rounded-2xl uppercase tracking-widest text-[10px]">Mudar Número</button>
                                <button onClick={verifyOtp} disabled={loading} className="flex-[2] py-6 bg-green-500 text-black font-black rounded-2xl uppercase tracking-widest text-sm shadow-xl">Confirmar</button>
                            </div>
                        </motion.div>
                    )}

                    {step === 'ticket' && ticket && (
                        <motion.div 
                            key="ticket-view" 
                            initial={{ opacity: 0, scale: 0.9 }} 
                            animate={{ opacity: 1, scale: 1 }} 
                            className="w-full flex flex-col items-center"
                        >
                            <div className="bg-white/[0.03] backdrop-blur-3xl rounded-[4rem] shadow-4xl w-full overflow-hidden border border-white/10 relative group">
                                <div className="p-10 text-center border-b border-dashed border-white/10 relative">
                                    <p className="text-[10px] font-black tracking-[0.5em] text-[#d9a65a] uppercase mb-4 opacity-60">A SUA SENHA</p>
                                    <h2 className="text-[10rem] font-mono font-black text-white tracking-tighter my-2 leading-none">{ticket.ticket_number}</h2>
                                    <div className="flex justify-center items-center gap-3 mt-8">
                                        {ticket.status === 'waiting' && (
                                            <span className="inline-flex items-center gap-2 px-6 py-2 rounded-full bg-white/5 text-white/40 text-xs font-black uppercase tracking-widest border border-white/5">
                                                <Clock className="w-4 h-4" /> Em Espera
                                            </span>
                                        )}
                                        {ticket.status === 'calling' && (
                                            <span className="inline-flex items-center gap-2 px-6 py-2 rounded-full bg-amber-500/20 text-amber-500 text-xs font-black uppercase tracking-[0.2em] border border-amber-500/20 animate-pulse">
                                                <Ticket className="w-4 h-4" /> Dirija-se ao {ticket.counter || 'Balcão'}
                                            </span>
                                        )}
                                    </div>
                                </div>
                                
                                {ticket.status === 'waiting' && (
                                    <div className="p-10 bg-white/[0.02] flex flex-col gap-8">
                                        <div className="flex justify-around items-center">
                                            <div className="text-center">
                                                <p className="text-[10px] font-black text-white/20 uppercase tracking-[0.3em] mb-2">Posição</p>
                                                <p className="text-5xl font-black text-white">{peopleAhead + 1}º</p>
                                            </div>
                                            <div className="w-px h-16 bg-white/5" />
                                            <div className="text-center">
                                                <p className="text-[10px] font-black text-white/20 uppercase tracking-[0.3em] mb-2">Espera Est.</p>
                                                <p className="text-5xl font-black text-[#d9a65a]">~{(peopleAhead + 1) * 2}m</p>
                                            </div>
                                        </div>

                                        {/* QR Code for sharing/digital ticket */}
                                        <div className="flex flex-col items-center gap-4 py-4 border-t border-white/5">
                                            <div className="p-3 bg-white rounded-2xl shadow-2xl">
                                                <img 
                                                    src={`https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(`${company?.office_name} - Senha: ${ticket.ticket_number}\nEstado: Em Espera`)}`}
                                                    alt="Ticket QR Code"
                                                    className="w-24 h-24"
                                                />
                                            </div>
                                            <p className="text-[8px] font-black text-white/30 uppercase tracking-[0.2em] max-w-[200px] text-center">
                                                Digitalize para partilhar ou guardar a sua senha
                                            </p>
                                        </div>
                                    </div>
                                )}
                            </div>
                            
                            <button 
                                onClick={() => setStep('category')} 
                                className="mt-12 text-[#d9a65a] font-black uppercase tracking-widest text-xs hover:text-white transition-colors"
                            >
                                Retirar nova senha
                            </button>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Branding/Dev info at bottom */}
            <div className="absolute bottom-10 text-center w-full px-6 opacity-20">
                <p className="text-[10px] uppercase font-black tracking-[0.4em] mb-1">Zyph Intelligence • Portal de Senhas</p>
                <p className="text-[8px] uppercase tracking-widest">{company?.office_name}</p>
            </div>
        </div>
    );
};
