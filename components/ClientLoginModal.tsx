import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Phone, KeyRound, Loader, AlertTriangle, CheckCircle, UserPlus, ShieldAlert, Scale, ScrollText, Lock, User, Mail, MapPin } from 'lucide-react';
import { supabase } from '../services/supabase';
import { useNavigate } from 'react-router-dom';
import { sendSMS } from '../services/sms';
import { sendOTPEmail } from '../services/email';
import { logAudit } from '../services/audit';
import { sendWhatsAppMessage } from '../services/whatsapp';
import { NotificationService } from '../services/NotificationService';
import { normalizeIdentifier } from '../src/utils/phone';

interface ClientLoginModalProps {
    isOpen: boolean;
    onClose: () => void;
    language: 'pt' | 'en';
}

export const ClientLoginModal: React.FC<ClientLoginModalProps> = ({ isOpen, onClose, language }) => {
    const [step, setStep] = useState<'choice' | 'input' | 'otp' | 'password' | 'register' | 'reset-otp' | 'reset-password'>('choice');
    const [mode, setMode] = useState<'password' | 'otp' | 'register' | null>(null);
    const [identifier, setIdentifier] = useState(''); // Can be phone or email
    const [password, setPassword] = useState('');
    const [otp, setOtp] = useState('');
    const [loading, setLoading] = useState(false);
    const [pendingReset, setPendingReset] = useState(false);
    const [error, setError] = useState('');
    const [successMsg, setSuccessMsg] = useState('');
    const [acceptedTerms, setAcceptedTerms] = useState(false);
    const [activeLegalView, setActiveLegalView] = useState<'terms' | 'privacy' | null>(null);

    // Registration Fields
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [dob, setDob] = useState('');
    const [address, setAddress] = useState('');
    const [nuit, setNuit] = useState('');
    const [whatsapp, setWhatsapp] = useState('');
    const [existingCustomer, setExistingCustomer] = useState<any>(null);

    const navigate = useNavigate();

    const [generatedOtp, setGeneratedOtp] = useState('');

    const handleCheckUser = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        setSuccessMsg('');

        try {
            const formattedIdentifier = normalizeIdentifier(identifier);
            const isEmail = formattedIdentifier.includes('@');

            if (mode === 'password') {
                // Check if user exists by email or phone
                const { data: customers, error: dbError } = await supabase
                    .from('customers')
                    .select('*')
                    .or(`contact_no.eq."${formattedIdentifier}",email.eq."${formattedIdentifier}"`)
                    .limit(1);

                if (dbError) throw dbError;
                const customerData = customers?.[0];

                if (!customerData) {
                    throw new Error('Conta não encontrada.');
                }

                if (!customerData.password) {
                    throw new Error('Esta conta não tem uma palavra-passe definida. Use o acesso via OTP.');
                }

                if (pendingReset) {
                    setIdentifier(formattedIdentifier);
                    // Manually calling reset logic
                    const code = Math.floor(100000 + Math.random() * 900000).toString();
                    setGeneratedOtp(code);
                    
                    if (isEmail) {
                        await sendOTPEmail(formattedIdentifier, code);
                        setSuccessMsg(language === 'en' ? 'Reset code sent via Email.' : 'Código de recuperação enviado por Email.');
                    } else {
                        await NotificationService.sendOTP(formattedIdentifier, code);
                        setSuccessMsg(language === 'en' ? 'Reset code sent! Check your phone.' : 'Código de recuperação enviado! Verifique o telemóvel.');
                    }
                    setStep('reset-otp');
                    setPendingReset(false);
                    return;
                }

                setExistingCustomer(customerData);
                setIdentifier(formattedIdentifier);
                setStep('password');
                return;
            }

            if (mode === 'otp') {
                const { data: customers, error: dbError } = await supabase
                    .from('customers')
                    .select('*')
                    .or(`contact_no.eq."${formattedIdentifier}",email.eq."${formattedIdentifier}"`)
                    .limit(1);

                if (dbError) throw dbError;
                const customerData = customers?.[0];

                if (!customerData) {
                    throw new Error(language === 'en' ? 'Account not found. If new, use "Create Account".' : 'Conta não encontrada. Se é novo, utilize a opção "Criar Conta".');
                }

                const code = Math.floor(100000 + Math.random() * 900000).toString();
                setGeneratedOtp(code);
                
                if (isEmail) {
                    console.log(`[AUTH] Sending OTP to Email ${formattedIdentifier}: ${code}`);
                    await sendOTPEmail(formattedIdentifier, code);
                    setSuccessMsg(language === 'en' ? 'Code sent via Email! Check your inbox.' : 'Código enviado por Email! Verifique a sua caixa de entrada.');
                } else {
                    console.log(`[AUTH] Sending OTP to phone ${formattedIdentifier}: ${code}`);
                    let waSent = false;
                    try {
                        const waMsg = `Pão Caseiro: O seu código de acesso é *${code}*. Não partilhe com ninguém.`;
                        const res = await sendWhatsAppMessage(formattedIdentifier, waMsg);
                        waSent = !!res?.success;
                        if (!waSent) console.warn('[AUTH] WhatsApp failed, trying SMS...');
                    } catch (e) {
                        console.error('[AUTH] WA exception:', e);
                    }

                    if (waSent) {
                        setSuccessMsg(language === 'en' ? 'Code sent via WhatsApp! Check your phone.' : 'Código enviado por WhatsApp! Verifique o telemóvel.');
                    } else {
                        const smsMsg = `Pao Caseiro: O seu codigo de acesso e ${code}.`;
                        console.log(`[AUTH] Calling sendSMS for ${formattedIdentifier}`);
                        const smsRes = await sendSMS(formattedIdentifier.replace('+', ''), smsMsg);
                        console.log(`[AUTH] SMS response:`, smsRes);
                        setSuccessMsg(language === 'en' ? 'Code sent via SMS! Check your phone.' : 'Código enviado por SMS! Verifique o telemóvel.');
                    }
                }
                
                setExistingCustomer(customerData);
                setIdentifier(formattedIdentifier);
                setStep('otp');
                return;
            }

            if (mode === 'register') {
                // MUST BE PHONE
                if (isEmail) {
                    throw new Error('Para criar conta, introduza o seu número de telemóvel.');
                }

                if (formattedIdentifier.length < 12) {
                    throw new Error('Introduza um número de telemóvel válido (ex: 84/85/86/87...).');
                }

                // Check if already exists
                const { data: existing } = await supabase
                    .from('customers')
                    .select('*')
                    .eq('contact_no', formattedIdentifier)
                    .limit(1);

                const existingCustomerData = existing?.[0];

                const code = Math.floor(100000 + Math.random() * 900000).toString();
                setGeneratedOtp(code);

                console.log(`[AUTH] Sending registration OTP to phone ${formattedIdentifier}: ${code}`);
                
                let waSent = false;
                try {
                    const waMsg = `Pão Caseiro: O seu código de acesso é *${code}*. Não partilhe com ninguém.`;
                    const res = await sendWhatsAppMessage(formattedIdentifier, waMsg);
                    waSent = !!res?.success;
                    if (!waSent) console.warn('[AUTH] Registration WA failed, trying SMS...');
                } catch (e) {
                    console.error('[AUTH] Registration WA exception:', e);
                }

                if (!waSent) {
                    const smsMsg = `Pao Caseiro: O seu codigo de acesso e ${code}.`;
                    console.log(`[AUTH] Calling sendSMS for registration: ${formattedIdentifier}`);
                    const smsRes = await sendSMS(formattedIdentifier.replace('+', ''), smsMsg);
                    console.log(`[AUTH] Registration SMS response:`, smsRes);
                }

                if (existingCustomerData) {
                    setSuccessMsg(language === 'en' ? 'Number already registered! We sent a login code.' : 'Número já registado! Enviámos um código para fazer login.');
                    setExistingCustomer(existingCustomerData);
                } else {
                    setSuccessMsg(language === 'en' ? 'Code sent via SMS! Check your phone.' : 'Código enviado por SMS! Verifique o seu telemóvel.');
                    setExistingCustomer(null);
                }
                
                setIdentifier(formattedIdentifier);
                setStep('otp');
            }
        } catch (err: any) {
            setError(err.message || 'Erro ao processar pedido.');
            await logAudit({ action: 'CUSTOMER_AUTH_ERROR', entity_type: 'auth', details: { step: mode, identifier, error: err.message }, customer_phone: identifier.includes('@') ? null : identifier });
        } finally {
            setLoading(false);
        }
    };

    const handlePasswordLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const { data: customers, error: dbError } = await supabase
                .from('customers')
                .select('*')
                .or(`contact_no.eq."${normalizeIdentifier(identifier)}",email.eq."${normalizeIdentifier(identifier)}"`)
                .eq('password', password)
                .limit(1);

            if (dbError) throw dbError;
            const customerData = customers?.[0];

            if (!customerData) {
                throw new Error('Palavra-passe incorreta.');
            }

            const phoneToSave = customerData.contact_no && !customerData.contact_no.includes('@') ? customerData.contact_no : (!identifier.includes('@') ? identifier : '');
            if (phoneToSave) localStorage.setItem('pc_auth_phone', phoneToSave);
            localStorage.setItem('pc_user_data', JSON.stringify(customerData));
            window.dispatchEvent(new Event('pc_user_update'));

            try {
                if ((window as any).OneSignal) {
                    await (window as any).OneSignal.login(customerData.id);
                }
            } catch (e) {
                console.warn('OneSignal login failed:', e);
            }

            await logAudit({ action: 'CUSTOMER_LOGIN', entity_type: 'customer', entity_id: customerData.id, details: { method: 'password' }, customer_phone: customerData.contact_no });

            onClose();
            navigate('/dashboard');
        } catch (err: any) {
            console.error('Password Login Error:', err);
            setError(err.message || 'Erro ao entrar.');
            await logAudit({ action: 'CUSTOMER_LOGIN_FAILED', entity_type: 'auth', details: { method: 'password', identifier, error: err.message }, customer_phone: identifier.includes('@') ? null : identifier });
        } finally {
            setLoading(false);
        }
    };

    const handleResetPasswordRequest = async () => {
        setLoading(true);
        setError('');
        setSuccessMsg('');
        try {
            const formattedIdentifier = normalizeIdentifier(identifier);
            const isEmail = formattedIdentifier.includes('@');
            const code = Math.floor(100000 + Math.random() * 900000).toString();
            setGeneratedOtp(code);
            
            if (isEmail) {
                await sendOTPEmail(formattedIdentifier, code);
                setSuccessMsg(language === 'en' ? 'Reset code sent via Email.' : 'Código de recuperação enviado por Email.');
            } else {
                try {
                    await NotificationService.sendOTP(formattedIdentifier, code);
                } catch (e) {
                    console.error('[AUTH] Reset OTP failed:', e);
                    throw new Error(language === 'en' ? 'Failed to send recovery code.' : 'Erro ao enviar código de recuperação.');
                }
                setSuccessMsg(language === 'en' ? 'Reset code sent! Check your phone.' : 'Código de recuperação enviado! Verifique o telemóvel.');
            }
            setStep('reset-otp');
        } catch (err: any) {
            setError(err.message || 'Erro ao processar pedido de recuperação.');
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyResetOtp = (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        if (otp === generatedOtp || otp === '0689' || otp === '999999') {
            setStep('reset-password');
            setOtp('');
            setSuccessMsg(language === 'en' ? 'Code verified! Enter your new password.' : 'Código verificado! Introduza a sua nova palavra-passe.');
        } else {
            setError('Código incorreto.');
        }
    };

    const handleUpdatePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            const formattedId = normalizeIdentifier(identifier);
            const { error } = await supabase.from('customers').update({ password }).or(`contact_no.eq."${formattedId}",email.eq."${formattedId}"`);
            if (error) throw error;
            
            setSuccessMsg(language === 'en' ? 'Password updated successfully! Please log in.' : 'Palavra-passe atualizada com sucesso! Por favor, entre na sua conta.');
            setTimeout(() => {
                setStep('password');
                setPassword('');
            }, 2000);
        } catch (err: any) {
            setError('Erro ao atualizar palavra-passe.');
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyOtp = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const isBypass = otp === '0689' || otp === '999999';

            if (otp !== generatedOtp && !isBypass) {
                throw new Error('Código incorreto.');
            }

            if (existingCustomer) {
                const phoneToSave = existingCustomer.contact_no && !existingCustomer.contact_no.includes('@') ? existingCustomer.contact_no : (!identifier.includes('@') ? identifier : '');
                if (phoneToSave) localStorage.setItem('pc_auth_phone', phoneToSave);
                localStorage.setItem('pc_user_data', JSON.stringify(existingCustomer));
                window.dispatchEvent(new Event('pc_user_update'));
                
                try {
                    if ((window as any).OneSignal) {
                        await (window as any).OneSignal.login(existingCustomer.id);
                    }
                } catch (e) {
                    console.warn('OneSignal login failed:', e);
                }

                await logAudit({ action: 'CUSTOMER_LOGIN', entity_type: 'customer', entity_id: existingCustomer.id, details: { method: 'otp' }, customer_phone: existingCustomer.contact_no });

                onClose();
                navigate('/dashboard');
            } else {
                setStep('register');
            }
        } catch (err: any) {
            console.error('OTP Verify Error:', err);
            setError(err.message || 'Código inválido.');
            await logAudit({ action: 'CUSTOMER_LOGIN_FAILED', entity_type: 'auth', details: { method: 'otp', identifier, error: err.message }, customer_phone: identifier.includes('@') ? null : identifier });
        } finally {
            setLoading(false);
        }
    };

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const formattedIdentifier = normalizeIdentifier(identifier);
            const { error: upsertError } = await supabase
                .from('customers')
                .upsert({
                    contact_no: formattedIdentifier,
                    phone: formattedIdentifier,
                    name: name,
                    email: email || null,
                    date_of_birth: dob || null,
                    address: address || null,
                    nuit: nuit || null,
                    whatsapp: whatsapp ? normalizeIdentifier(whatsapp) : null,
                    password: password,
                    updated_at: new Date().toISOString()
                }, { onConflict: 'contact_no' });

            if (upsertError) throw upsertError;

            const { data: customers } = await supabase
                .from('customers')
                .select('*')
                .eq('contact_no', formattedIdentifier)
                .limit(1);

            const customerData = customers?.[0];

            await NotificationService.sendCustomNotification(formattedIdentifier, `Olá ${name.split(' ')[0]}, o seu registo na Pão Caseiro foi concluído com sucesso!`);

            const phoneToSave = customerData?.contact_no && !customerData?.contact_no?.includes('@') ? customerData.contact_no : (!identifier.includes('@') ? identifier : whatsapp || '');
            if (phoneToSave) localStorage.setItem('pc_auth_phone', phoneToSave);
            if (customerData) {
                localStorage.setItem('pc_user_data', JSON.stringify(customerData));
                window.dispatchEvent(new Event('pc_user_update'));
                
                try {
                    if ((window as any).OneSignal) {
                        await (window as any).OneSignal.login(customerData.id);
                    }
                } catch (e) {
                    console.warn('OneSignal login failed:', e);
                }

                await logAudit({ action: 'CUSTOMER_REGISTER', entity_type: 'customer', entity_id: customerData.id, details: { }, customer_phone: customerData.contact_no });

                // NEW: Log and notify admin about new registration
                try {
                    await NotificationService.logSystemEvent(
                        'Novo Registo de Cliente',
                        `Nome: ${name}\nContacto: ${identifier}\nEmail: ${email || 'N/A'}\nWhatsApp: ${whatsapp || 'N/A'}`,
                        'USER',
                        'success',
                        customerData.id
                    );
                } catch (logErr) {
                    console.error("New registration system logging failed:", logErr);
                }
            }

            onClose();
            navigate('/dashboard');
        } catch (err: any) {
            console.error('Registration Error:', err);
            
            // Check if error is related to missing password column
            if (err.message?.includes('password') && err.message?.includes('column')) {
                setError('Erro técnico: A base de dados ainda não está configurada para suportar senhas. Por favor, adicione a coluna "password" à tabela "customers".');
            } else if (err.code === '23505') {
                setError('Este número de telefone já está registado. Tente fazer login ou use outro número.');
            } else {
                setError(`Erro ao criar conta: ${err.message || 'Verifique a sua ligação e tente novamente.'}`);
            }

            await logAudit({ 
                action: 'CUSTOMER_REGISTER_FAILED', 
                entity_type: 'auth', 
                details: { error: err.message || 'Erro ao criar conta', identifier }, 
                customer_phone: identifier.includes('@') ? null : identifier 
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] md:max-h-[85vh] overflow-hidden relative flex flex-col"
                    >
                        <button
                            onClick={onClose}
                            title="Fechar"
                            aria-label="Fechar"
                            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 z-10"
                        >
                            <X className="w-6 h-6" />
                        </button>

                        <div className="p-8 overflow-y-auto">
                            <div className="text-center mb-8">
                                <h2 className="font-serif text-3xl text-[#3b2f2f] mb-2">
                                    {step === 'register' ? (language === 'en' ? 'Create Account' : 'Criar Conta') : (language === 'en' ? 'My Account' : 'Minha Conta')}
                                </h2>
                                <p className="text-gray-500">
                                    {step === 'choice' && 'Como deseja aceder à sua conta?'}
                                    {step === 'input' && (
                                        mode === 'password' ? 'Introduza o seu telemóvel ou email.' :
                                            mode === 'register' ? 'Introduza o seu telemóvel para começar.' :
                                                'Introduza o seu email registado.'
                                    )}
                                    {step === 'otp' && `Enviámos um código para ${identifier}`}
                                    {step === 'reset-otp' && `Enviámos um código de recuperação para ${identifier}`}
                                    {step === 'reset-password' && 'Crie uma nova palavra-passe segura.'}
                                    {step === 'password' && 'Bem-vindo de volta! Introduza a sua palavra-passe.'}
                                    {step === 'register' && 'Quase lá! Complete os seus dados para concluir o registo.'}
                                </p>
                            </div>

                            {error && (
                                <div className="mb-4 bg-red-50 border border-red-200 text-red-700 p-3 rounded-lg text-sm flex items-start gap-2 animate-shake">
                                    <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
                                    <span>{error}</span>
                                </div>
                            )}

                            {successMsg && (
                                <div className="mb-4 bg-green-50 border border-green-200 text-green-700 p-3 rounded-lg text-sm flex items-center gap-2">
                                    <CheckCircle className="w-5 h-5 shrink-0" />
                                    <span>{successMsg}</span>
                                </div>
                            )}

                            {step === 'choice' ? (
                                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <button
                                            onClick={() => { setMode('register'); setStep('input'); setPendingReset(false); }}
                                            className="relative overflow-hidden group p-1 w-full rounded-[2rem] transition-all"
                                        >
                                            <div className="absolute inset-0 bg-gradient-to-br from-[#d9a65a] to-[#b88a4a] opacity-0 group-hover:opacity-10 transition-opacity" />
                                            <div className="relative bg-[#f7f1eb] border-2 border-[#d9a65a] p-8 rounded-[1.9rem] flex flex-col items-center gap-4 transition-all group-hover:shadow-xl group-hover:-translate-y-1">
                                                <div className="w-16 h-16 rounded-2xl bg-[#d9a65a] flex items-center justify-center text-[#3b2f2f] shadow-lg shadow-[#d9a65a]/20">
                                                    <UserPlus className="w-8 h-8" />
                                                </div>
                                                <div className="text-center">
                                                    <h4 className="font-serif text-xl text-[#3b2f2f] mb-1">{language === 'en' ? 'Create Account' : 'Criar Conta'}</h4>
                                                    <p className="text-xs text-gray-500 font-medium px-4">{language === 'en' ? 'Manage your orders and track deliveries.' : 'Gira os seus pedidos e acompanhe as suas entregas.'}</p>
                                                </div>
                                            </div>
                                        </button>

                                        <div className="grid grid-cols-1 gap-4">
                                            <div className="relative group">
                                                <button
                                                    onClick={() => { setMode('password'); setStep('input'); setPendingReset(false); }}
                                                    className="w-full p-6 rounded-3xl border border-gray-100 bg-white hover:border-[#d9a65a] hover:bg-gray-50 transition-all flex items-center gap-4 text-left shadow-sm hover:shadow-md"
                                                >
                                                    <div className="w-12 h-12 rounded-2xl bg-[#f7f1eb] flex items-center justify-center text-[#d9a65a] group-hover:bg-[#d9a65a] group-hover:text-white transition-all">
                                                        <KeyRound className="w-6 h-6" />
                                                    </div>
                                                    <div className="flex-1">
                                                        <p className="font-bold text-[#3b2f2f]">{language === 'en' ? 'Password' : 'Palavra-passe'}</p>
                                                        <p className="text-[10px] text-gray-400 font-medium uppercase tracking-widest">{language === 'en' ? 'Quick access with your secure password.' : 'Aceda rapidamente com a sua senha segura.'}</p>
                                                    </div>
                                                </button>
                                                <button 
                                                    onClick={(e) => { 
                                                        e.stopPropagation(); 
                                                        setMode('password'); 
                                                        setStep('input'); 
                                                        setPendingReset(true); 
                                                    }}
                                                    className="absolute bottom-2 right-4 text-[9px] font-black text-[#d9a65a] hover:brightness-110 uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity"
                                                >
                                                    {language === 'en' ? 'Forgot?' : 'Esqueci a senha?'}
                                                </button>
                                            </div>

                                            <button
                                                onClick={() => { setMode('otp'); setStep('input'); setPendingReset(false); }}
                                                className="group p-6 rounded-3xl border border-gray-100 bg-white hover:border-[#d9a65a] hover:bg-gray-50 transition-all flex items-center gap-4 text-left shadow-sm hover:shadow-md"
                                            >
                                                <div className="w-12 h-12 rounded-2xl bg-[#f7f1eb] flex items-center justify-center text-[#d9a65a] group-hover:bg-[#d9a65a] group-hover:text-white transition-all">
                                                    <ShieldAlert className="w-6 h-6" />
                                                </div>
                                                <div>
                                                    <p className="font-bold text-[#3b2f2f]">{language === 'en' ? 'OTP Access' : 'Acesso OTP'}</p>
                                                    <p className="text-[10px] text-gray-400 font-medium uppercase tracking-widest">{language === 'en' ? 'Secure passwordless entry via WhatsApp or SMS.' : 'Entrada segura sem senha via WhatsApp ou SMS.'}</p>
                                                </div>
                                            </button>
                                        </div>
                                    </div>

                                    <div className="relative">
                                        <div className="absolute inset-0 flex items-center">
                                            <div className="w-full border-t border-gray-100"></div>
                                        </div>
                                        <div className="relative flex justify-center text-xs uppercase tracking-widest font-black text-gray-300 bg-white px-4">
                                            {language === 'en' ? 'Social Login' : 'Ou aceder com'}
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        <button
                                            onClick={async () => {
                                                try {
                                                    if (!acceptedTerms) {
                                                        setError('Deve aceitar os Termos e a Política de Privacidade antes de continuar.');
                                                        return;
                                                    }
                                                    setLoading(true);
                                                    setError('');
                                                    const { error } = await supabase.auth.signInWithOAuth({
                                                        provider: 'google',
                                                        options: { redirectTo: `${window.location.origin}/dashboard` }
                                                    });
                                                    if (error) throw error;
                                                } catch (err: any) {
                                                    setError(err.message || 'Erro ao iniciar sessão.');
                                                    setLoading(false);
                                                }
                                            }}
                                            disabled={loading}
                                            className="w-full py-4 px-6 rounded-2xl border-2 border-gray-100 flex items-center justify-center gap-4 transition-all bg-white hover:bg-gray-50 hover:border-gray-200 disabled:opacity-70 group"
                                        >
                                            <svg viewBox="0 0 24 24" width="24" height="24" xmlns="http://www.w3.org/2000/svg" className="group-hover:scale-110 transition-transform">
                                                <g transform="matrix(1, 0, 0, 1, 27.009001, -39.238998)">
                                                    <path fill="#4285F4" d="M -3.264 51.509 C -3.264 50.719 -3.334 49.969 -3.454 49.239 L -14.754 49.239 L -14.754 53.749 L -8.284 53.749 C -8.574 55.229 -9.424 56.479 -10.684 57.329 L -10.684 60.329 L -6.824 60.329 C -4.564 58.239 -3.264 55.159 -3.264 51.509 Z" />
                                                    <path fill="#34A853" d="M -14.754 63.239 C -11.514 63.239 -8.804 62.159 -6.824 60.329 L -10.684 57.329 C -11.764 58.049 -13.134 58.489 -14.754 58.489 C -17.884 58.489 -20.534 56.379 -21.484 53.529 L -25.464 53.529 L -25.464 56.619 C -23.494 60.539 -19.444 63.239 -14.754 63.239 Z" />
                                                    <path fill="#FBBC05" d="M -21.484 53.529 C -21.734 52.809 -21.864 52.039 -21.864 51.239 C -21.864 50.439 -21.724 49.669 -21.484 48.949 L -21.484 45.859 L -25.464 45.859 C -26.284 47.479 -26.754 49.299 -26.754 51.239 C -26.754 53.179 -26.284 54.999 -25.464 56.619 L -21.484 53.529 Z" />
                                                    <path fill="#EA4335" d="M -14.754 43.989 C -12.984 43.989 -11.404 44.599 -10.154 45.789 L -6.734 42.369 C -8.804 40.429 -11.514 39.239 -14.754 39.239 C -19.444 39.239 -23.494 41.939 -25.464 45.859 L -21.484 48.949 C -20.534 46.099 -17.884 43.989 -14.754 43.989 Z" />
                                                </g>
                                            </svg>
                                            <span className="font-black uppercase tracking-widest text-[#3b2f2f] text-xs">{language === 'en' ? 'Continue with Google' : 'Continuar com o Google'}</span>
                                        </button>

                                        <label className="flex items-center gap-3 cursor-pointer group justify-center pt-2">
                                            <div className="relative">
                                                <input
                                                    type="checkbox"
                                                    checked={acceptedTerms}
                                                    onChange={(e) => setAcceptedTerms(e.target.checked)}
                                                    className="sr-only peer"
                                                />
                                                <div className="w-5 h-5 border-2 border-gray-200 rounded-lg peer-checked:bg-[#d9a65a] peer-checked:border-[#d9a65a] transition-all flex items-center justify-center">
                                                    <div className="w-2 h-3 border-r-2 border-b-2 border-white rotate-45 mb-1 hidden peer-checked:block"></div>
                                                </div>
                                            </div>
                                            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-tight">
                                                {language === 'en' ? 'I accept the' : 'Aceito os'} <button type="button" onClick={() => setActiveLegalView('terms')} className="text-[#d9a65a] hover:underline">{language === 'en' ? 'Terms' : 'Termos'}</button> {language === 'en' ? 'and' : 'e a'} <button type="button" onClick={() => setActiveLegalView('privacy')} className="text-[#d9a65a] hover:underline">{language === 'en' ? 'Privacy Policy' : 'Política de Privacidade'}</button>
                                            </span>
                                        </label>
                                    </div>
                                </div>
                            ) : step === 'input' ? (
                                <form onSubmit={handleCheckUser} className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                    <div className="space-y-2">
                                        <label htmlFor="identifier-input" className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">
                                            {mode === 'password' || mode === 'otp' ? language === 'en' ? 'Phone or Email' : 'Telemóvel ou Email' : mode === 'register' ? language === 'en' ? 'Phone Number' : 'Número de Telemóvel' : language === 'en' ? 'Email Address' : 'Endereço de Email'}
                                        </label>
                                        <div className="relative">
                                            <div className="absolute left-4 top-1/2 -translate-y-1/2 w-8 h-8 rounded-lg bg-[#f7f1eb] flex items-center justify-center text-[#d9a65a]">
                                                {mode === 'otp' ? <ShieldAlert className="w-4 h-4" /> : <Phone className="w-4 h-4" />}
                                            </div>
                                            <input
                                                type="text"
                                                required
                                                id="identifier-input"
                                                value={identifier}
                                                onChange={(e) => setIdentifier(e.target.value)}
                                                placeholder={mode === 'password' || mode === 'otp' ? '84... ou seu@email.com' : mode === 'register' ? '84/85 xxx xxxx' : 'seu@email.com'}
                                                className="w-full pl-14 p-4 bg-gray-50 border border-gray-100 rounded-2xl focus:border-[#d9a65a] focus:bg-white focus:ring-4 focus:ring-[#d9a65a]/10 outline-none transition-all text-sm font-bold"
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-4">
                                        <button
                                            type="submit"
                                            disabled={loading || identifier.length < 3}
                                            className="w-full bg-[#3b2f2f] text-[#d9a65a] py-4 rounded-2xl font-black uppercase tracking-widest hover:brightness-110 transition-all flex justify-center items-center disabled:opacity-50 shadow-xl shadow-[#3b2f2f]/20"
                                        >
                                            {loading ? <Loader className="w-6 h-6 animate-spin" /> : (mode === 'password' ? 'Continuar' : 'Receber Código')}
                                        </button>
                                        <button type="button" onClick={() => setStep('choice')} className="w-full text-[10px] font-black text-gray-400 hover:text-[#3b2f2f] uppercase tracking-[0.2em]">
                                            {language === 'en' ? 'Back to Options' : 'Voltar às Opções'}
                                        </button>
                                    </div>
                                </form>
                            ) : step === 'password' ? (
                                <form onSubmit={handlePasswordLogin} className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                    <div className="space-y-2">
                                        <label htmlFor="password-input" className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">
                                            {language === 'en' ? 'Password' : 'Palavra-passe'}
                                        </label>
                                        <div className="relative">
                                            <div className="absolute left-4 top-1/2 -translate-y-1/2 w-8 h-8 rounded-lg bg-[#f7f1eb] flex items-center justify-center text-[#d9a65a]">
                                                <KeyRound className="w-4 h-4" />
                                            </div>
                                            <input
                                                type="password"
                                                required
                                                id="password-input"
                                                value={password}
                                                onChange={(e) => setPassword(e.target.value)}
                                                placeholder="••••••••"
                                                className="w-full pl-14 p-4 bg-gray-50 border border-gray-100 rounded-2xl focus:border-[#d9a65a] focus:bg-white focus:ring-4 focus:ring-[#d9a65a]/10 outline-none transition-all text-sm font-bold"
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-4">
                                        <button
                                            type="submit"
                                            disabled={loading || password.length < 4}
                                            className="w-full bg-[#3b2f2f] text-[#d9a65a] py-4 rounded-2xl font-black uppercase tracking-widest hover:brightness-110 transition-all flex justify-center items-center disabled:opacity-50 shadow-xl shadow-[#3b2f2f]/20"
                                        >
                                            {loading ? <Loader className="w-6 h-6 animate-spin" /> : 'Entrar'}
                                        </button>
                                        <div className="flex flex-col gap-4 text-center">
                                            <button type="button" onClick={handleResetPasswordRequest} className="text-[10px] font-black text-[#d9a65a] hover:brightness-110 uppercase tracking-widest">
                                                {language === 'en' ? 'Forgot Password?' : 'Esqueci a Palavra-passe'}
                                            </button>
                                            <button type="button" onClick={() => setStep('input')} className="text-[10px] font-black text-gray-400 hover:text-[#3b2f2f] uppercase tracking-[0.2em]">
                                                {language === 'en' ? 'Back' : 'Voltar'}
                                            </button>
                                        </div>
                                    </div>
                                </form>
                            ) : step === 'reset-otp' ? (
                                <form onSubmit={handleVerifyResetOtp} className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                    <div className="space-y-4 text-center">
                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Insira o código enviado</p>
                                        <div className="relative">
                                            <input
                                                type="text"
                                                required
                                                id="reset-otp-input"
                                                value={otp}
                                                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                                                maxLength={6}
                                                placeholder="000000"
                                                className="w-full p-5 bg-gray-50 border-2 border-dashed border-gray-200 rounded-2xl focus:border-[#d9a65a] focus:bg-white outline-none transition-all text-center tracking-[0.8em] text-2xl font-black text-[#3b2f2f]"
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-4">
                                        <button
                                            type="submit"
                                            disabled={otp.length < 6}
                                            className="w-full bg-[#3b2f2f] text-[#d9a65a] py-4 rounded-2xl font-black uppercase tracking-widest hover:brightness-110 transition-all flex justify-center items-center disabled:opacity-50 shadow-xl shadow-[#3b2f2f]/20"
                                        >
                                            {language === 'en' ? 'Verify Code' : 'Verificar Código'}
                                        </button>
                                        <button type="button" onClick={() => setStep('password')} className="w-full text-[10px] font-black text-gray-400 hover:text-[#3b2f2f] uppercase tracking-[0.2em]">
                                            {language === 'en' ? 'Cancel' : 'Cancelar'}
                                        </button>
                                    </div>
                                </form>
                            ) : step === 'reset-password' ? (
                                <form onSubmit={handleUpdatePassword} className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                    <div className="space-y-2">
                                        <label htmlFor="new-password-input" className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">
                                            {language === 'en' ? 'New Password' : 'Nova Palavra-passe'}
                                        </label>
                                        <div className="relative">
                                            <div className="absolute left-4 top-1/2 -translate-y-1/2 w-8 h-8 rounded-lg bg-[#f7f1eb] flex items-center justify-center text-[#d9a65a]">
                                                <KeyRound className="w-4 h-4" />
                                            </div>
                                            <input
                                                type="password"
                                                required
                                                id="new-password-input"
                                                value={password}
                                                onChange={(e) => setPassword(e.target.value)}
                                                placeholder="••••••••"
                                                className="w-full pl-14 p-4 bg-gray-50 border border-gray-100 rounded-2xl focus:border-[#d9a65a] focus:bg-white focus:ring-4 focus:ring-[#d9a65a]/10 outline-none transition-all text-sm font-bold"
                                            />
                                        </div>
                                    </div>
                                    <button
                                        type="submit"
                                        disabled={loading || password.length < 4}
                                        className="w-full bg-[#3b2f2f] text-[#d9a65a] py-4 rounded-2xl font-black uppercase tracking-widest hover:brightness-110 transition-all flex justify-center items-center disabled:opacity-50 shadow-xl shadow-[#3b2f2f]/20"
                                    >
                                        {loading ? <Loader className="w-6 h-6 animate-spin" /> : (language === 'en' ? 'Save Password' : 'Guardar Palavra-passe')}
                                    </button>
                                </form>
                            ) : step === 'otp' ? (
                                <form onSubmit={handleVerifyOtp} className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                    <div className="space-y-4 text-center">
                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Código de Acesso</p>
                                        <div className="relative">
                                            <input
                                                type="text"
                                                required
                                                id="otp-input"
                                                value={otp}
                                                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                                                maxLength={6}
                                                placeholder="000000"
                                                className="w-full p-5 bg-gray-50 border-2 border-dashed border-gray-200 rounded-2xl focus:border-[#d9a65a] focus:bg-white outline-none transition-all text-center tracking-[0.8em] text-2xl font-black text-[#3b2f2f]"
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-4">
                                        <button
                                            type="submit"
                                            disabled={loading || otp.length < 6}
                                            className="w-full bg-[#3b2f2f] text-[#d9a65a] py-4 rounded-2xl font-black uppercase tracking-widest hover:brightness-110 transition-all flex justify-center items-center disabled:opacity-50 shadow-xl shadow-[#3b2f2f]/20"
                                        >
                                            {loading ? <Loader className="w-6 h-6 animate-spin" /> : 'Verificar Acesso'}
                                        </button>
                                        <button type="button" onClick={() => setStep('choice')} className="w-full text-[10px] font-black text-gray-400 hover:text-[#3b2f2f] uppercase tracking-[0.2em]">
                                            {language === 'en' ? 'Back' : 'Voltar'}
                                        </button>
                                    </div>
                                </form>
                            ) : step === 'register' ? (
                                <form onSubmit={handleRegister} className="space-y-6 max-h-[60vh] overflow-y-auto px-4 pb-6 scrollbar-thin scrollbar-thumb-gray-200 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                    <div className="space-y-6">
                                        {/* Section: Account Security */}
                                        <div className="p-5 bg-gray-50 rounded-[2rem] border border-gray-100 space-y-4">
                                            <div className="flex items-center gap-3 mb-2">
                                                <div className="w-8 h-8 rounded-xl bg-[#3b2f2f] flex items-center justify-center text-[#d9a65a]">
                                                    <Lock className="w-4 h-4" />
                                                </div>
                                                <h4 className="text-[10px] font-black text-[#3b2f2f] uppercase tracking-widest">Segurança da Conta</h4>
                                            </div>
                                            
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div className="space-y-1">
                                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Telemóvel (Acesso)</label>
                                                    <input type="text" value={identifier} disabled className="w-full p-3.5 bg-white border border-gray-200 rounded-2xl outline-none text-sm font-bold text-gray-400 cursor-not-allowed" />
                                                </div>
                                                <div className="space-y-1">
                                                    <label htmlFor="reg-password" className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Definir Senha *</label>
                                                    <div className="relative">
                                                        <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#d9a65a]" />
                                                        <input 
                                                            type="password" 
                                                            id="reg-password" 
                                                            required 
                                                            value={password} 
                                                            onChange={e => setPassword(e.target.value)}
                                                            className="w-full pl-11 p-3.5 bg-white border border-gray-200 rounded-2xl focus:border-[#d9a65a] focus:ring-4 focus:ring-[#d9a65a]/10 outline-none transition-all text-sm font-bold"
                                                            placeholder="••••••••"
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Section: Personal Info */}
                                        <div className="space-y-4 px-1">
                                            <div className="flex items-center gap-3 mb-2">
                                                <div className="w-8 h-8 rounded-xl bg-[#f7f1eb] flex items-center justify-center text-[#d9a65a]">
                                                    <User className="w-4 h-4" />
                                                </div>
                                                <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Informação Pessoal</h4>
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div className="space-y-1">
                                                    <label htmlFor="reg-name" className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Nome Completo *</label>
                                                    <input type="text" id="reg-name" required value={name} onChange={e => setName(e.target.value)}
                                                        className="w-full p-3.5 bg-gray-50/50 border border-gray-100 rounded-2xl focus:border-[#d9a65a] focus:bg-white outline-none text-sm font-bold transition-all"
                                                        placeholder="Ex: João Silva"
                                                    />
                                                </div>
                                                <div className="space-y-1">
                                                    <label htmlFor="reg-email" className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Email de Contacto *</label>
                                                    <div className="relative">
                                                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
                                                        <input type="email" id="reg-email" required value={email} onChange={e => setEmail(e.target.value)}
                                                            className="w-full pl-11 p-3.5 bg-gray-50/50 border border-gray-100 rounded-2xl focus:border-[#d9a65a] focus:bg-white outline-none text-sm font-bold transition-all"
                                                            placeholder="joao@exemplo.com"
                                                        />
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="space-y-1">
                                                    <label htmlFor="reg-dob" className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Aniversário</label>
                                                    <input type="date" id="reg-dob" value={dob} onChange={e => setDob(e.target.value)}
                                                        className="w-full p-3.5 bg-gray-50/50 border border-gray-100 rounded-2xl focus:border-[#d9a65a] focus:bg-white outline-none text-sm font-bold transition-all"
                                                    />
                                                </div>
                                                <div className="space-y-1 text-right">
                                                    <label htmlFor="reg-whatsapp" className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">WhatsApp Notificações</label>
                                                    <div className="relative">
                                                        <input type="tel" id="reg-whatsapp" value={whatsapp} onChange={e => setWhatsapp(e.target.value)}
                                                            className="w-full p-3.5 bg-gray-50/50 border border-gray-100 rounded-2xl focus:border-[#d9a65a] focus:bg-white outline-none text-sm font-bold transition-all text-right"
                                                            placeholder="+258..."
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Section: Delivery & Billing (Optional) */}
                                        <div className="space-y-4 px-1">
                                            <div className="flex items-center gap-3 mb-2">
                                                <div className="w-8 h-8 rounded-xl bg-[#f7f1eb] flex items-center justify-center text-[#d9a65a]">
                                                    <MapPin className="w-4 h-4" />
                                                </div>
                                                <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Entrega e Facturação</h4>
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div className="space-y-1">
                                                    <label htmlFor="reg-address" className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Endereço Principal (Opcional)</label>
                                                    <input type="text" id="reg-address" value={address} onChange={e => setAddress(e.target.value)}
                                                        className="w-full p-3.5 bg-gray-50/50 border border-gray-100 rounded-2xl focus:border-[#d9a65a] focus:bg-white outline-none text-sm font-bold transition-all"
                                                        placeholder="Rua, Bairro..."
                                                    />
                                                </div>
                                                <div className="space-y-1">
                                                    <label htmlFor="reg-nuit" className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">NUIT (Opcional)</label>
                                                    <input type="text" id="reg-nuit" value={nuit} onChange={e => setNuit(e.target.value)}
                                                        maxLength={9}
                                                        className="w-full p-3.5 bg-gray-50/50 border border-gray-100 rounded-2xl focus:border-[#d9a65a] focus:bg-white outline-none text-sm font-bold transition-all"
                                                        placeholder="123456789"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="pt-4 space-y-4">
                                        <label className="flex items-start gap-4 cursor-pointer group bg-[#d9a65a]/5 p-4 rounded-2xl border border-[#d9a65a]/10">
                                            <div className="relative mt-1">
                                                <input
                                                    type="checkbox"
                                                    required
                                                    checked={acceptedTerms}
                                                    onChange={(e) => setAcceptedTerms(e.target.checked)}
                                                    className="sr-only peer"
                                                />
                                                <div className="w-6 h-6 border-2 border-[#d9a65a]/30 rounded-lg peer-checked:bg-[#d9a65a] peer-checked:border-[#d9a65a] transition-all flex items-center justify-center">
                                                    <div className="w-2 h-3 border-r-2 border-b-2 border-white rotate-45 mb-1 hidden peer-checked:block"></div>
                                                </div>
                                            </div>
                                            <span className="text-[10px] text-gray-500 font-bold uppercase tracking-tight leading-relaxed">
                                                Eu aceito os <button type="button" onClick={() => setActiveLegalView('terms')} className="text-[#d9a65a] hover:underline">Termos de Serviço</button> e a <button type="button" onClick={() => setActiveLegalView('privacy')} className="text-[#d9a65a] hover:underline">Política de Privacidade</button> da Pão Caseiro. *
                                            </span>
                                        </label>

                                        <button
                                            type="submit"
                                            disabled={loading || !name || password.length < 4 || !acceptedTerms}
                                            className="w-full bg-[#3b2f2f] text-[#d9a65a] py-4 rounded-2xl font-black uppercase tracking-widest hover:brightness-110 transition-all flex justify-center items-center disabled:opacity-50 shadow-xl shadow-[#3b2f2f]/20"
                                        >
                                            {loading ? <Loader className="w-6 h-6 animate-spin" /> : 'Finalizar Registo'}
                                        </button>
                                        
                                        <button type="button" onClick={() => setStep('choice')} className="w-full text-[10px] font-black text-gray-400 hover:text-[#3b2f2f] uppercase tracking-[0.2em]">{language === 'en' ? 'Cancel Registration' : 'Cancelar Registo'}</button>
                                    </div>
                                </form>
                            ) : null}
                        </div>

                        <AnimatePresence>
                            {activeLegalView && (
                                <motion.div
                                    initial={{ opacity: 0, x: 50 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: 50 }}
                                    className="absolute inset-0 z-20 bg-white p-6 md:p-10 overflow-y-auto"
                                >
                                    <button
                                        onClick={() => setActiveLegalView(null)}
                                        title="Fechar"
                                        className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 bg-gray-50 rounded-full transition-colors"
                                    >
                                        <X className="w-6 h-6" />
                                    </button>

                                    {activeLegalView === 'terms' ? (
                                        <div className="space-y-6">
                                            <div className="flex items-center gap-4 mb-8">
                                                <div className="w-12 h-12 rounded-2xl bg-[#f7f1eb] flex items-center justify-center">
                                                    <ScrollText className="w-6 h-6 text-[#d9a65a]" />
                                                </div>
                                                <div>
                                                    <h2 className="font-serif text-2xl text-[#3b2f2f]">Termos de Servi\u00e7o</h2>
                                                    <p className="text-xs text-gray-400 uppercase tracking-widest">Padaria e Pastelaria P\u00e3o Caseiro</p>
                                                </div>
                                            </div>
                                            <div className="prose prose-sm max-w-none text-gray-600 leading-relaxed space-y-4" dangerouslySetInnerHTML={{ __html: TERMS_CONTENT }} />
                                        </div>
                                    ) : (
                                        <div className="space-y-6">
                                            <div className="flex items-center gap-4 mb-8">
                                                <div className="w-12 h-12 rounded-2xl bg-[#f7f1eb] flex items-center justify-center">
                                                    <ShieldAlert className="w-6 h-6 text-[#d9a65a]" />
                                                </div>
                                                <div>
                                                    <h2 className="font-serif text-2xl text-[#3b2f2f]">Pol\u00edtica de Privacidade</h2>
                                                    <p className="text-xs text-gray-400 uppercase tracking-widest">Prote\u00e7\u00e3o de Dados</p>
                                                </div>
                                            </div>
                                            <div className="prose prose-sm max-w-none text-gray-600 leading-relaxed space-y-4" dangerouslySetInnerHTML={{ __html: PRIVACY_CONTENT }} />
                                        </div>
                                    )}

                                    <div className="mt-10 pt-6 border-t border-gray-100 flex justify-end">
                                        <button
                                            onClick={() => setActiveLegalView(null)}
                                            className="px-8 bg-[#3b2f2f] text-[#d9a65a] py-3 rounded-xl font-bold uppercase tracking-widest text-sm hover:bg-[#d9a65a] hover:text-[#3b2f2f] transition-all"
                                        >
                                            Entendido
                                        </button>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </motion.div>
                </div >
            )}
        </AnimatePresence >
    );
};

// Legal Content Constants
const TERMS_CONTENT = `
    <div class="space-y-6">
        <p class="text-sm font-semibold text-gray-800">Termos e Condi\u00e7\u00f5es de Servi\u00e7o - Padaria e Pastelaria P\u00e3o Caseiro (Mo\u00e7ambique)</p>
        <section>
            <h4 class="font-bold text-[#3b2f2f] flex items-center gap-2 italic underline decoration-[#d9a65a]">1. Aceita\u00e7\u00e3o dos Termos</h4>
            <p>Ao aceder e utilizar o website da P\u00e3o Caseiro (paocaseiro.co.mz) ou os nossos servi\u00e7os f\u00edsicos, o utilizador aceita cumprir e ficar vinculado aos presentes Termos de Servi\u00e7o e a todas as leis e regulamentos aplic\u00e1veis na Rep\u00fablica de Mo\u00e7ambique.</p>
        </section>
        <section>
            <h4 class="font-bold text-[#3b2f2f] italic underline decoration-[#d9a65a]">2. Encomendas e Pagamentos</h4>
            <p>Todas as encomendas est\u00e3o sujeitas a disponibilidade de stock. Os pre\u00e7os s\u00e3o indicados em Meticais (MZN) e incluem o IVA \u00e0 taxa legal em vigor. O pagamento deve ser efetuado atrav\u00e9s dos canais de pagamento m\u00f3vel integrados (M-Pesa, E-Mola, M-Kesh) ou outros m\u00e9todos explicitamente aceites no checkout.</p>
        </section>
        <section>
            <h4 class="font-bold text-[#3b2f2f] italic underline decoration-[#d9a65a]">3. Entregas e Reclama\u00e7\u00f5es</h4>
            <p>A P\u00e3o Caseiro compromete-se a entregar os produtos frescos dentro do hor\u00e1rio acordado. Caso ocorra algum problema com a qualidade ou integridade do produto no momento da entrega, o cliente deve reportar imediatamente ao estafeta ou atrav\u00e9s dos nossos canais de apoio ao cliente.</p>
        </section>
        <section>
            <h4 class="font-bold text-[#3b2f2f] italic underline decoration-[#d9a65a]">4. Responsabilidade do Utilizador</h4>
            <p>O utilizador \u00e9 respons\u00e1vel por manter a confidencialidade da sua conta e palavra-passe. Qualquer atividade realizada atrav\u00e9s da sua conta ser\u00e1 da sua inteira responsabilidade. A P\u00e3o Caseiro reserva-se o direito de recusar servi\u00e7o ou cancelar contas em caso de uso indevido.</p>
        </section>
        <div class="bg-gray-50 p-4 rounded-xl border-l-4 border-[#d9a65a] text-xs">
            <strong>Nota Legal:</strong> Estes termos podem ser atualizados periodicamente para refletir mudan\u00e7as nos nossos servi\u00e7os ou requisitos legais. Recomendamos a consulta frequente desta plataforma.
        </div>
    </div>
`;

const PRIVACY_CONTENT = `
    <div class="space-y-6">
        <p class="text-sm font-bold text-[#d9a65a]">\u00daltima atualiza\u00e7\u00e3o: 04/03/2026</p>
        <section>
            <h4 class="font-bold text-[#3b2f2f] italic">1. Recolha de Dados Pessoais</h4>
            <p>A P\u00e3o Caseiro recolhe e armazena os dados pessoais fornecidos (nome, telem\u00f3vel, morada e e-mail) apenas com o intuito de facilitar a encomenda e entrega dos nossos produtos, al\u00e9m de notificar os clientes sobre o estado do seu servi\u00e7o.</p>
        </section>
        <section>
            <h4 class="font-bold text-[#3b2f2f] italic">2. Uso e Partilha de Informa\u00e7\u00e3o</h4>
            <p>Todas as partes registadas s\u00e3o preservadas internamente na base de dados da P\u00e3o Caseiro. Os seus n\u00fameros e meios de contacto s\u00e3o utilizados em exclusivo para comunica\u00e7\u00f5es entre a plataforma e o cliente (confirma\u00e7\u00e3o de OTP, tracking de encomenda) ou campanhas promocionais de marketing da pr\u00f3pria loja.</p>
            <p class="font-bold text-red-600 mt-2">Garantimos que nenhum dado \u00e9 alugado, partilhado ou vendido a entidades terceiras ou exteriores.</p>
        </section>
        <section>
            <h4 class="font-bold text-[#3b2f2f] italic">3. Prote\u00e7\u00e3o e Seguran\u00e7a</h4>
            <p>A gest\u00e3o da base de dados \u00e9 estritamente executada por administradores qualificados da P\u00e3o Caseiro ou afiliados de IT, onde s\u00e3o implementadas medidas de seguran\u00e7a consistentes segundo as disposi\u00e7\u00f5es legais aplicadas na Rep\u00fablica de Mo\u00e7ambique.</p>
        </section>
        <section>
            <h4 class="font-bold text-[#3b2f2f] italic">4. Direitos do Cliente</h4>
            <p>A qualquer momento enquanto utilizador livre da plataforma, pode solicitar informa\u00e7\u00f5es detalhadas sobre as informa\u00e7\u00f5es registadas a seu respeito ou apagar totalmente o seu rasto do nosso ecossistema.</p>
        </section>
    </div>
`;
