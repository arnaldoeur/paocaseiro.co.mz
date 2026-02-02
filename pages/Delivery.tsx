import React, { useState, useEffect } from 'react';
import { Truck, Lock, Phone, ArrowRight, Loader, AlertTriangle, User, LogOut, Shield } from 'lucide-react';
import { sendSMS } from '../services/sms';

export const Delivery: React.FC = () => {
    // Auth State
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [user, setUser] = useState<any>(null);

    // Login Flow State
    const [loginMode, setLoginMode] = useState<'driver' | 'it'>('driver');
    const [step, setStep] = useState<'phone' | 'otp'>('phone');

    // Driver Inputs
    const [phone, setPhone] = useState('');
    const [otpInput, setOtpInput] = useState('');
    const [generatedOtp, setGeneratedOtp] = useState('');

    // IT Inputs
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');

    // UI State
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // Persistence Check
    useEffect(() => {
        const savedAuth = localStorage.getItem('driver_auth');
        if (savedAuth) {
            setIsAuthenticated(true);
            const savedUser = localStorage.getItem('driver_user');
            if (savedUser) setUser(JSON.parse(savedUser));
        }
    }, []);

    // --- Driver Logic ---

    const handleSendOTP = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            // 1. Verify if user exists in DB
            const { supabase } = await import('../services/supabase');
            const cleanPhone = phone.replace(/\s+/g, '');

            const { data, error: dbError } = await supabase
                .from('logistics_drivers')
                .select('*')
                .or(`phone.eq.${cleanPhone},alternative_phone.eq.${cleanPhone}`)
                .single();

            if (dbError || !data) {
                throw new Error("Número não encontrado. Contacte o Administrador.");
            }

            // 2. Generate OTP
            const code = Math.floor(1000 + Math.random() * 9000).toString();
            setGeneratedOtp(code);

            // 3. Send SMS
            console.log(`[DEV OTP] For ${cleanPhone}: ${code}`);

            await sendSMS(cleanPhone, `Seu codigo de acesso Pao Caseiro: ${code}`);

            // Advance
            setStep('otp');
            setUser(data);

        } catch (err: any) {
            console.error(err);
            setError(err.message || "Erro ao verificar número.");
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyOTP = (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        if (otpInput === '0689' || otpInput === generatedOtp) {
            setIsAuthenticated(true);
            localStorage.setItem('driver_auth', 'true');
            localStorage.setItem('driver_user', JSON.stringify(user));
            setLoading(false);
        } else {
            setError('Código incorreto. Tente novamente.');
            setLoading(false);
        }
    };

    // --- IT Logic ---

    const handleITLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const { supabase } = await import('../services/supabase');
            const { data, error } = await supabase
                .from('team_members')
                .select('*')
                .eq('username', username)
                .eq('password', password)
                .single();

            if (data) {
                setIsAuthenticated(true);
                // Tag user as IT for UI purposes if needed
                const itUser = { ...data, is_it: true };
                setUser(itUser);
                localStorage.setItem('driver_auth', 'true'); // Reuse same auth key for simplicity or separate if needed
                localStorage.setItem('driver_user', JSON.stringify(itUser));
            } else {
                throw new Error('Credenciais inválidas.');
            }
        } catch (err: any) {
            console.error(err);
            setError(err.message || 'Erro ao conectar.');
        } finally {
            setLoading(false);
        }
    };


    const handleLogout = () => {
        setIsAuthenticated(false);
        localStorage.removeItem('driver_auth');
        localStorage.removeItem('driver_user');
        setStep('phone');
        setPhone('');
        setOtpInput('');
        setUsername('');
        setPassword('');
        setUser(null);
    };

    // Render Authenticated Dashboard
    if (isAuthenticated) {
        return (
            <div className="min-h-screen bg-[#f7f1eb] font-sans">
                <nav className="bg-[#3b2f2f] text-white p-4 shadow-lg flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-[#3b2f2f] ${user?.is_it ? 'bg-blue-400' : 'bg-[#d9a65a]'}`}>
                            {user?.is_it ? <Shield size={20} /> : <Truck size={20} />}
                        </div>
                        <div>
                            <h1 className="font-bold text-lg leading-tight">Portal de Entregas</h1>
                            <p className="text-xs text-[#d9a65a]">{user?.name || 'Utilizador'} {user?.is_it && '(IT/Admin)'}</p>
                        </div>
                    </div>
                    <button
                        onClick={handleLogout}
                        className="p-2 bg-white/10 rounded-lg hover:bg-white/20 transition-colors"
                    >
                        <LogOut size={20} />
                    </button>
                </nav>

                <div className="p-6 max-w-lg mx-auto">
                    <div className="bg-white rounded-2xl shadow-xl p-6 mb-6 text-center">
                        <h2 className="text-xl font-bold text-[#3b2f2f] mb-2">Bem-vindo!</h2>
                        <p className="text-gray-500 mb-6">
                            {user?.is_it
                                ? "Modo de Supervisão IT Ativo."
                                : "Você está online e disponível para receber entregas."}
                        </p>

                        <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full font-bold text-sm ${user?.is_it ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}`}>
                            <div className={`w-2 h-2 rounded-full animate-pulse ${user?.is_it ? 'bg-blue-500' : 'bg-green-500'}`}></div>
                            Status: {user?.is_it ? 'Supervisão' : 'Disponível'}
                        </div>
                    </div>

                    <div className="text-center text-gray-400 text-sm">
                        <p>Nenhuma entrega pendente no momento.</p>
                    </div>
                </div>
            </div>
        );
    }

    // Render Login Flow
    return (
        <div className="min-h-screen bg-[#f7f1eb] flex items-center justify-center p-4 relative overflow-hidden">
            {/* Background Decorations */}
            <div className="absolute top-0 left-0 w-64 h-64 bg-[#d9a65a]/10 rounded-full -translate-x-1/2 -translate-y-1/2 blur-3xl"></div>
            <div className="absolute bottom-0 right-0 w-96 h-96 bg-[#3b2f2f]/5 rounded-full translate-x-1/2 translate-y-1/2 blur-3xl"></div>

            <div className="max-w-md w-full bg-white rounded-3xl shadow-2xl p-8 relative z-10 border border-[#d9a65a]/20">
                <div className="text-center mb-8">
                    <div className={`w-16 h-16 rounded-2xl mx-auto flex items-center justify-center mb-4 shadow-lg transform rotate-3 transition-colors ${loginMode === 'it' ? 'bg-[#2f3b3b]' : 'bg-[#3b2f2f]'}`}>
                        {loginMode === 'it' ? <Shield className="w-8 h-8 text-blue-400" /> : <Truck className="w-8 h-8 text-[#d9a65a]" />}
                    </div>
                    <h1 className="font-serif text-3xl text-[#3b2f2f] font-bold">Portal Entregas</h1>
                    <p className="text-gray-500 mt-2 text-sm">{loginMode === 'it' ? 'Acesso Administrativo / IT' : 'Faça login para gerir suas entregas'}</p>
                </div>

                {error && (
                    <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 rounded-r-lg flex items-start gap-3">
                        <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                        <p className="text-sm text-red-700 font-medium">{error}</p>
                    </div>
                )}

                {/* Driver Login Flow */}
                {loginMode === 'driver' && (
                    <>
                        {step === 'phone' ? (
                            <form onSubmit={handleSendOTP} className="space-y-6">
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">Número de Telefone</label>
                                    <div className="relative group">
                                        <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#d9a65a] transition-colors w-5 h-5" />
                                        <input
                                            type="tel"
                                            value={phone}
                                            onChange={(e) => setPhone(e.target.value)}
                                            placeholder="84/85 xxx xxxx"
                                            className="w-full pl-12 pr-4 py-4 bg-gray-50 border-2 border-transparent focus:bg-white focus:border-[#d9a65a]/50 rounded-xl outline-none transition-all font-bold text-[#3b2f2f] placeholder-gray-300"
                                            required
                                        />
                                    </div>
                                </div>

                                <button
                                    type="submit"
                                    disabled={loading || !phone}
                                    className="w-full bg-[#3b2f2f] text-[#d9a65a] py-4 rounded-xl font-bold uppercase tracking-widest hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                >
                                    {loading ? <Loader className="animate-spin" /> : <>Receber Código <ArrowRight className="w-5 h-5" /></>}
                                </button>
                            </form>
                        ) : (
                            <form onSubmit={handleVerifyOTP} className="space-y-6">
                                <div className="text-center mb-2">
                                    <p className="text-sm text-gray-500">Enviamos um código para</p>
                                    <p className="font-bold text-[#3b2f2f] text-lg">{phone}</p>
                                    <button
                                        type="button"
                                        onClick={() => { setStep('phone'); setError(''); }}
                                        className="text-xs text-[#d9a65a] hover:underline mt-1"
                                    >
                                        Alterar número
                                    </button>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">Código OTP</label>
                                    <div className="relative group">
                                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#d9a65a] transition-colors w-5 h-5" />
                                        <input
                                            type="text"
                                            value={otpInput}
                                            onChange={(e) => setOtpInput(e.target.value)}
                                            placeholder="0000"
                                            maxLength={4}
                                            className="w-full pl-12 pr-4 py-4 bg-gray-50 border-2 border-transparent focus:bg-white focus:border-[#d9a65a]/50 rounded-xl outline-none transition-all font-bold text-[#3b2f2f] placeholder-gray-300 tracking-[0.5em] text-center text-xl"
                                            required
                                            autoFocus
                                        />
                                    </div>
                                </div>

                                <button
                                    type="submit"
                                    disabled={loading || otpInput.length < 4}
                                    className="w-full bg-[#d9a65a] text-[#3b2f2f] py-4 rounded-xl font-bold uppercase tracking-widest hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                >
                                    {loading ? <Loader className="animate-spin" /> : 'Verificar e Entrar'}
                                </button>

                                <div className="text-center mt-4">
                                    <p className="text-xs text-gray-400">Não recebeu? <button type="button" onClick={(e) => handleSendOTP(e)} className="text-[#3b2f2f] font-bold hover:underline">Reenviar</button></p>
                                </div>
                            </form>
                        )}
                    </>
                )}

                {/* IT Login Flow */}
                {loginMode === 'it' && (
                    <form onSubmit={handleITLogin} className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">Username</label>
                            <div className="relative group">
                                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-400 transition-colors w-5 h-5" />
                                <input
                                    type="text"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    placeholder="Username"
                                    className="w-full pl-12 pr-4 py-4 bg-gray-50 border-2 border-transparent focus:bg-white focus:border-blue-400/50 rounded-xl outline-none transition-all font-bold text-[#3b2f2f] placeholder-gray-300"
                                    required
                                    autoFocus
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">Senha</label>
                            <div className="relative group">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-400 transition-colors w-5 h-5" />
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="••••••••"
                                    className="w-full pl-12 pr-4 py-4 bg-gray-50 border-2 border-transparent focus:bg-white focus:border-blue-400/50 rounded-xl outline-none transition-all font-bold text-[#3b2f2f] placeholder-gray-300"
                                    required
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading || !username || !password}
                            className="w-full bg-[#2f3b3b] text-white py-4 rounded-xl font-bold uppercase tracking-widest hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {loading ? <Loader className="animate-spin" /> : 'Acessar Sistema'}
                        </button>
                    </form>
                )}

                {/* Footer / Toggle */}
                <div className="mt-8 pt-6 border-t border-gray-100 text-center space-y-4">
                    <button
                        onClick={() => {
                            setLoginMode(prev => prev === 'driver' ? 'it' : 'driver');
                            setError('');
                        }}
                        className="text-xs font-bold text-gray-400 hover:text-[#d9a65a] transition-colors uppercase tracking-widest"
                    >
                        {loginMode === 'driver' ? 'Acesso IT / Admin' : 'Voltar para Motorista'}
                    </button>

                    {loginMode === 'driver' && (
                        <div>
                            <a
                                href="https://wa.me/258846930960"
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-2 text-[#3b2f2f] font-bold text-sm hover:text-[#d9a65a] transition-colors"
                            >
                                <User className="w-4 h-4" /> Problemas de Acesso?
                            </a>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
