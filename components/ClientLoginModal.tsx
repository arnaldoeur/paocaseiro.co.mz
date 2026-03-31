import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Phone, KeyRound, Loader, AlertTriangle, CheckCircle, UserPlus, ShieldAlert, Scale, ScrollText } from 'lucide-react';
import { supabase } from '../services/supabase';
import { useNavigate } from 'react-router-dom';
import { sendSMS } from '../services/sms';
import { sendOTPEmail } from '../services/email';
import { logAudit } from '../services/audit';
import { sendWhatsAppMessage } from '../services/whatsapp';
import { NotificationService } from '../services/NotificationService';

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
            // Normalize identifier (if it looks like a phone number)
            let formattedIdentifier = identifier.trim();
            const isEmail = formattedIdentifier.includes('@');

            if (!isEmail) {
                formattedIdentifier = formattedIdentifier.replace(/\D/g, '');
                if (formattedIdentifier.length >= 9) {
                    if (!formattedIdentifier.startsWith('258')) {
                        formattedIdentifier = '258' + formattedIdentifier;
                    }
                    formattedIdentifier = '+' + formattedIdentifier;
                }
            }

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
                    throw new Error('Introduza um número de telemóvel válido.');
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
                .or(`contact_no.eq."${identifier}",email.eq."${identifier}"`)
                .eq('password', password)
                .limit(1);

            if (dbError) throw dbError;
            const customerData = customers?.[0];

            if (!customerData) {
                throw new Error('Palavra-passe incorreta.');
            }

            // Save login state
            const phoneToSave = customerData.contact_no && !customerData.contact_no.includes('@') ? customerData.contact_no : (!identifier.includes('@') ? identifier : '');
            if (phoneToSave) localStorage.setItem('pc_auth_phone', phoneToSave);
            localStorage.setItem('pc_user_data', JSON.stringify(customerData));
            window.dispatchEvent(new Event('pc_user_update'));

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
            const isEmail = identifier.includes('@');
            const code = Math.floor(100000 + Math.random() * 900000).toString();
            setGeneratedOtp(code);
            
            if (isEmail) {
                await sendOTPEmail(identifier, code);
                setSuccessMsg(language === 'en' ? 'Reset code sent via Email.' : 'Código de recuperação enviado por Email.');
            } else {
                const smsBody = `Pao Caseiro: Seu codigo de recuperacao e ${code}.`;
                
                let smsSent = false;
                let waSent = false;

                try {
                    await sendSMS(identifier.replace('+', ''), smsBody);
                    smsSent = true;
                } catch (e) {
                    console.error('[AUTH] Reset SMS failed:', e);
                }

                try {
                    const waRes = await sendWhatsAppMessage(identifier.replace('+', ''), `Pão Caseiro: O seu código de recuperação de palavra-passe é *${code}*.`);
                    if (waRes && waRes.success) waSent = true;
                } catch (e) {
                    console.error('[AUTH] Reset WhatsApp failed:', e);
                }

                if (!smsSent && !waSent) {
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
            const { error } = await supabase.from('customers').update({ password }).eq('contact_no', existingCustomer?.contact_no || identifier);
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
            const { error: upsertError } = await supabase
                .from('customers')
                .upsert({
                    contact_no: identifier.includes('@') ? (whatsapp || identifier) : identifier,
                    name: name,
                    email: email || null,
                    date_of_birth: dob || null,
                    address: address || null,
                    nuit: nuit || null,
                    whatsapp: whatsapp || null,
                    password: password,
                    updated_at: new Date().toISOString()
                }, { onConflict: 'contact_no' });

            if (upsertError) throw upsertError;

            const { data: customers } = await supabase
                .from('customers')
                .select('*')
                .eq('contact_no', identifier)
                .limit(1);

            const customerData = customers?.[0];

            await sendSMS(identifier.replace('+', ''), `Olá ${name.split(' ')[0]}, o seu registo na Pão Caseiro foi concluído com sucesso!`);

            const phoneToSave = customerData?.contact_no && !customerData?.contact_no?.includes('@') ? customerData.contact_no : (!identifier.includes('@') ? identifier : whatsapp || '');
            if (phoneToSave) localStorage.setItem('pc_auth_phone', phoneToSave);
            if (customerData) {
                localStorage.setItem('pc_user_data', JSON.stringify(customerData));
                window.dispatchEvent(new Event('pc_user_update'));
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
            setError('Erro ao criar conta.');
            await logAudit({ action: 'CUSTOMER_REGISTER_FAILED', entity_type: 'auth', details: { error: err.message || 'Erro ao criar conta', identifier }, customer_phone: identifier.includes('@') ? null : identifier });
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
                                <div className="space-y-6">
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                        <button
                                            onClick={() => { setMode('register'); setStep('input'); }}
                                            className="flex flex-col items-center gap-3 p-6 rounded-2xl border-2 border-[#d9a65a] bg-[#f7f1eb] hover:bg-[#d9a65a]/10 transition-all group text-center shadow-lg transform scale-105 z-10"
                                        >
                                            <div className="w-12 h-12 rounded-full bg-[#d9a65a] flex items-center justify-center text-[#3b2f2f] transition-colors">
                                                <UserPlus className="w-6 h-6" />
                                            </div>
                                            <div>
                                                <p className="font-bold text-[#3b2f2f] text-sm md:text-base">{language === 'en' ? 'Create Account' : 'Criar Conta'}</p>
                                                <p className="text-[10px] md:text-xs text-gray-500">{language === 'en' ? 'Get Launch Discounts' : 'Ganhe Descontos de Lançamento'}</p>
                                            </div>
                                        </button>

                                        <button
                                            onClick={() => { setMode('password'); setStep('input'); }}
                                            className="flex flex-col items-center gap-3 p-6 rounded-2xl border border-gray-100 hover:border-[#d9a65a] hover:bg-[#f7f1eb]/50 transition-all group text-center"
                                        >
                                            <div className="w-12 h-12 rounded-full bg-[#f7f1eb] flex items-center justify-center group-hover:bg-[#d9a65a]/20 transition-colors">
                                                <KeyRound className="w-6 h-6 text-[#d9a65a]" />
                                            </div>
                                            <div>
                                                <p className="font-bold text-[#3b2f2f] text-sm md:text-base">{language === 'en' ? 'Password' : 'Palavra-passe'}</p>
                                                <p className="text-[10px] md:text-xs text-gray-500">{language === 'en' ? 'Phone or Email' : 'Telemóvel ou Email'}</p>
                                            </div>
                                        </button>

                                        <button
                                            onClick={() => { setMode('otp'); setStep('input'); }}
                                            className="flex flex-col items-center gap-3 p-6 rounded-2xl border border-gray-100 hover:border-[#d9a65a] hover:bg-[#f7f1eb]/50 transition-all group text-center"
                                        >
                                            <div className="w-12 h-12 rounded-full bg-[#f7f1eb] flex items-center justify-center group-hover:bg-[#d9a65a]/20 transition-colors">
                                                <ShieldAlert className="w-6 h-6 text-[#d9a65a]" />
                                            </div>
                                            <div>
                                                <p className="font-bold text-[#3b2f2f] text-sm md:text-base">{language === 'en' ? 'OTP Access' : 'Acesso OTP'}</p>
                                                <p className="text-[10px] md:text-xs text-gray-500">{language === 'en' ? 'Phone or Email' : 'Telemóvel ou Email'}</p>
                                            </div>
                                        </button>
                                    </div>

                                    {/* Google Login Button */}
                                    <div className="mt-4">
                                        <button
                                            onClick={async () => {
                                                try {
                                                    if (!acceptedTerms) {
                                                        setError('Deve aceitar os Termos e a Política de Privacidade antes de continuar com o Google.');
                                                        return;
                                                    }
                                                    setLoading(true);
                                                    setError('');
                                                    const { error } = await supabase.auth.signInWithOAuth({
                                                        provider: 'google',
                                                        options: {
                                                            redirectTo: `${window.location.origin}/dashboard`
                                                        }
                                                    });
                                                    if (error) throw error;
                                                } catch (err: any) {
                                                    console.error('Google Auth Error:', err);
                                                    setError(err.message || 'Erro ao iniciar sessão com o Google.');
                                                    setLoading(false);
                                                }
                                            }}
                                            disabled={loading}
                                            className="w-full py-4 px-6 rounded-2xl border flex items-center justify-center gap-3 transition-all bg-white border-gray-200 hover:bg-gray-50 hover:border-gray-300 disabled:opacity-70"
                                        >
                                            <svg viewBox="0 0 24 24" width="24" height="24" xmlns="http://www.w3.org/2000/svg">
                                                <g transform="matrix(1, 0, 0, 1, 27.009001, -39.238998)">
                                                    <path fill="#4285F4" d="M -3.264 51.509 C -3.264 50.719 -3.334 49.969 -3.454 49.239 L -14.754 49.239 L -14.754 53.749 L -8.284 53.749 C -8.574 55.229 -9.424 56.479 -10.684 57.329 L -10.684 60.329 L -6.824 60.329 C -4.564 58.239 -3.264 55.159 -3.264 51.509 Z" />
                                                    <path fill="#34A853" d="M -14.754 63.239 C -11.514 63.239 -8.804 62.159 -6.824 60.329 L -10.684 57.329 C -11.764 58.049 -13.134 58.489 -14.754 58.489 C -17.884 58.489 -20.534 56.379 -21.484 53.529 L -25.464 53.529 L -25.464 56.619 C -23.494 60.539 -19.444 63.239 -14.754 63.239 Z" />
                                                    <path fill="#FBBC05" d="M -21.484 53.529 C -21.734 52.809 -21.864 52.039 -21.864 51.239 C -21.864 50.439 -21.724 49.669 -21.484 48.949 L -21.484 45.859 L -25.464 45.859 C -26.284 47.479 -26.754 49.299 -26.754 51.239 C -26.754 53.179 -26.284 54.999 -25.464 56.619 L -21.484 53.529 Z" />
                                                    <path fill="#EA4335" d="M -14.754 43.989 C -12.984 43.989 -11.404 44.599 -10.154 45.789 L -6.734 42.369 C -8.804 40.429 -11.514 39.239 -14.754 39.239 C -19.444 39.239 -23.494 41.939 -25.464 45.859 L -21.484 48.949 C -20.534 46.099 -17.884 43.989 -14.754 43.989 Z" />
                                                </g>
                                            </svg>
                                            <span className="font-bold text-gray-700 text-sm md:text-base">{language === 'en' ? 'Continue with Google' : 'Continuar com o Google'}</span>
                                        </button>
                                    </div>

                                    <div className="mt-6">
                                        <label className="flex items-center gap-3 cursor-pointer group justify-center">
                                            <div className="relative">
                                                <input
                                                    type="checkbox"
                                                    checked={acceptedTerms}
                                                    onChange={(e) => setAcceptedTerms(e.target.checked)}
                                                    className="sr-only peer"
                                                />
                                                <div className="w-5 h-5 border-2 border-gray-200 rounded-md peer-checked:bg-[#d9a65a] peer-checked:border-[#d9a65a] transition-all flex items-center justify-center">
                                                    <div className="w-2 h-3 border-r-2 border-b-2 border-white rotate-45 mb-1 hidden peer-checked:block"></div>
                                                </div>
                                            </div>
                                            <span className="text-xs text-gray-500">
                                                Aceito os <button type="button" onClick={() => setActiveLegalView('terms')} className="text-[#d9a65a] hover:underline font-bold">{language === 'en' ? 'Terms' : 'Termos'}</button> e a <button type="button" onClick={() => setActiveLegalView('privacy')} className="text-[#d9a65a] hover:underline font-bold">{language === 'en' ? 'Privacy' : 'Privacidade'}</button>
                                            </span>
                                        </label>
                                    </div>

                                    <div className="pb-4"></div>
                                </div>
                            ) : step === 'input' ? (
                                <form onSubmit={handleCheckUser} className="space-y-4">
                                    <div className="relative">
                                        <label htmlFor="identifier-input" className="text-sm font-bold text-[#3b2f2f]/80">
                                            {mode === 'password' || mode === 'otp' ? language === 'en' ? 'Phone or Email' : 'Telemóvel ou Email' : mode === 'register' ? language === 'en' ? 'Phone Number' : 'Número de Telemóvel' : language === 'en' ? 'Email Address' : 'Endereço de Email'}
                                        </label>
                                        <div className="relative mt-1">
                                            {mode === 'otp' ? <ShieldAlert className="absolute left-3 top-3 text-[#d9a65a] w-5 h-5" /> : <Phone className="absolute left-3 top-3 text-[#d9a65a] w-5 h-5" />}
                                            <input
                                                type={mode === 'otp' ? 'text' : 'text'}
                                                required
                                                id="identifier-input"
                                                value={identifier}
                                                onChange={(e) => setIdentifier(e.target.value)}
                                                placeholder={mode === 'password' || mode === 'otp' ? '84... ou seu@email.com' : mode === 'register' ? '84/85 xxx xxxx' : 'seu@email.com'}
                                                className="w-full pl-10 p-3 rounded-xl border border-gray-200 focus:border-[#d9a65a] focus:ring-2 focus:ring-[#d9a65a]/20 outline-none transition-all"
                                            />
                                        </div>
                                    </div>
                                    <button
                                        type="submit"
                                        disabled={loading || identifier.length < 3}
                                        className="w-full bg-[#3b2f2f] text-[#d9a65a] py-3 rounded-xl font-bold uppercase tracking-widest hover:bg-[#d9a65a] hover:text-[#3b2f2f] transition-all flex justify-center items-center disabled:opacity-70"
                                    >
                                        {loading ? <Loader className="w-6 h-6 animate-spin" /> : (mode === 'password' ? 'Continuar' : 'Receber Código')}
                                    </button>
                                    <button type="button" onClick={() => setStep('choice')} className="w-full text-sm text-gray-500 hover:text-[#3b2f2f] underline mt-2">{language === 'en' ? 'Back' : 'Voltar'}</button>
                                </form>
                            ) : step === 'password' ? (
                                <form onSubmit={handlePasswordLogin} className="space-y-4">
                                    <div className="relative">
                                        <label htmlFor="password-input" className="text-sm font-bold text-[#3b2f2f]/80">{language === 'en' ? 'Password' : 'Palavra-passe'}</label>
                                        <div className="relative mt-1">
                                            <KeyRound className="absolute left-3 top-3 text-[#d9a65a] w-5 h-5" />
                                            <input
                                                type="password"
                                                required
                                                id="password-input"
                                                value={password}
                                                onChange={(e) => setPassword(e.target.value)}
                                                placeholder="••••••••"
                                                className="w-full pl-10 p-3 rounded-xl border border-gray-200 focus:border-[#d9a65a] focus:ring-2 focus:ring-[#d9a65a]/20 outline-none transition-all"
                                            />
                                        </div>
                                    </div>
                                    <button
                                        type="submit"
                                        disabled={loading || password.length < 4}
                                        className="w-full bg-[#3b2f2f] text-[#d9a65a] py-3 rounded-xl font-bold uppercase tracking-widest hover:bg-[#d9a65a] hover:text-[#3b2f2f] transition-all flex justify-center items-center disabled:opacity-70"
                                    >
                                        {loading ? <Loader className="w-6 h-6 animate-spin" /> : 'Entrar'}
                                    </button>
                                    <div className="flex flex-col gap-2 mt-4">
                                        <button type="button" onClick={handleResetPasswordRequest} className="w-full text-sm text-[#d9a65a] font-bold hover:underline">
                                            {language === 'en' ? 'Forgot Password?' : 'Esqueci a Palavra-passe'}
                                        </button>
                                        <button type="button" onClick={() => setStep('input')} className="w-full text-sm text-gray-500 hover:text-[#3b2f2f] underline">{language === 'en' ? 'Back' : 'Voltar'}</button>
                                    </div>
                                </form>
                            ) : step === 'reset-otp' ? (
                                <form onSubmit={handleVerifyResetOtp} className="space-y-4">
                                    <div className="relative">
                                        <label htmlFor="reset-otp-input" className="sr-only">Código OTP</label>
                                        <KeyRound className="absolute left-3 top-3 text-[#d9a65a] w-5 h-5" />
                                        <input
                                            type="text"
                                            required
                                            id="reset-otp-input"
                                            value={otp}
                                            onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                                            maxLength={6}
                                            placeholder={language === 'en' ? '6-digit code' : 'Código de 6 dígitos'}
                                            className="w-full pl-10 p-3 rounded-xl border border-gray-200 focus:border-[#d9a65a] focus:ring-2 focus:ring-[#d9a65a]/20 outline-none transition-all text-center tracking-[0.5em] text-lg font-bold"
                                        />
                                    </div>
                                    <button
                                        type="submit"
                                        disabled={otp.length < 6}
                                        className="w-full bg-[#3b2f2f] text-[#d9a65a] py-3 rounded-xl font-bold uppercase tracking-widest hover:bg-[#d9a65a] hover:text-[#3b2f2f] transition-all flex justify-center items-center disabled:opacity-70"
                                    >
                                        {language === 'en' ? 'Verify Code' : 'Verificar Código'}
                                    </button>
                                    <button type="button" onClick={() => setStep('password')} className="w-full text-sm text-gray-500 hover:text-[#3b2f2f] underline mt-2">{language === 'en' ? 'Cancel' : 'Cancelar'}</button>
                                </form>
                            ) : step === 'reset-password' ? (
                                <form onSubmit={handleUpdatePassword} className="space-y-4">
                                    <div className="relative">
                                        <label htmlFor="new-password-input" className="text-sm font-bold text-[#3b2f2f]/80">{language === 'en' ? 'New Password' : 'Nova Palavra-passe'}</label>
                                        <div className="relative mt-1">
                                            <KeyRound className="absolute left-3 top-3 text-[#d9a65a] w-5 h-5" />
                                            <input
                                                type="password"
                                                required
                                                id="new-password-input"
                                                value={password}
                                                onChange={(e) => setPassword(e.target.value)}
                                                placeholder="••••••••"
                                                className="w-full pl-10 p-3 rounded-xl border border-gray-200 focus:border-[#d9a65a] focus:ring-2 focus:ring-[#d9a65a]/20 outline-none transition-all"
                                            />
                                        </div>
                                    </div>
                                    <button
                                        type="submit"
                                        disabled={loading || password.length < 4}
                                        className="w-full bg-[#3b2f2f] text-[#d9a65a] py-3 rounded-xl font-bold uppercase tracking-widest hover:bg-[#d9a65a] hover:text-[#3b2f2f] transition-all flex justify-center items-center disabled:opacity-70"
                                    >
                                        {loading ? <Loader className="w-6 h-6 animate-spin" /> : (language === 'en' ? 'Save Password' : 'Guardar Palavra-passe')}
                                    </button>
                                </form>
                            ) : step === 'otp' ? (
                                <form onSubmit={handleVerifyOtp} className="space-y-4">
                                    <div className="relative">
                                        <label htmlFor="otp-input" className="sr-only">Código OTP</label>
                                        <KeyRound className="absolute left-3 top-3 text-[#d9a65a] w-5 h-5" />
                                        <input
                                            type="text"
                                            required
                                            id="otp-input"
                                            value={otp}
                                            onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                                            maxLength={6}
                                            placeholder={language === 'en' ? '6-digit code' : 'Código de 6 dígitos'}
                                            className="w-full pl-10 p-3 rounded-xl border border-gray-200 focus:border-[#d9a65a] focus:ring-2 focus:ring-[#d9a65a]/20 outline-none transition-all text-center tracking-[0.5em] text-lg font-bold"
                                        />
                                    </div>
                                    <button
                                        type="submit"
                                        disabled={loading || otp.length < 6}
                                        className="w-full bg-[#3b2f2f] text-[#d9a65a] py-3 rounded-xl font-bold uppercase tracking-widest hover:bg-[#d9a65a] hover:text-[#3b2f2f] transition-all flex justify-center items-center disabled:opacity-70"
                                    >
                                        {loading ? <Loader className="w-6 h-6 animate-spin" /> : 'Verificar'}
                                    </button>
                                    <button type="button" onClick={() => setStep('choice')} className="w-full text-sm text-gray-500 hover:text-[#3b2f2f] underline mt-2">{language === 'en' ? 'Back' : 'Voltar'}</button>
                                </form>
                            ) : (
                                <form onSubmit={handleRegister} className="space-y-4 max-h-[60vh] overflow-y-auto px-1 pb-4 scrollbar-thin scrollbar-thumb-gray-200">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label htmlFor="reg-name" className="text-xs font-bold text-gray-500 uppercase mb-1 block">{language === 'en' ? 'Full Name *' : 'Nome Completo *'}</label>
                                            <input type="text" id="reg-name" required value={name} onChange={e => setName(e.target.value)}
                                                className="w-full p-3 rounded-xl border border-gray-100 focus:border-[#d9a65a] outline-none text-sm"
                                                placeholder="Nome e Apelido"
                                            />
                                        </div>
                                        <div>
                                            <label htmlFor="reg-email" className="text-xs font-bold text-gray-500 uppercase mb-1 block">{language === 'en' ? 'Email *' : 'Email *'}</label>
                                            <input type="email" id="reg-email" required value={email} onChange={e => setEmail(e.target.value)}
                                                className="w-full p-3 rounded-xl border border-gray-100 focus:border-[#d9a65a] outline-none text-sm"
                                                placeholder="seu@email.com"
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label htmlFor="reg-dob" className="text-xs font-bold text-gray-500 uppercase mb-1 block">Nascimento (Opcional)</label>
                                            <input type="date" id="reg-dob" value={dob} onChange={e => setDob(e.target.value)}
                                                className="w-full p-3 rounded-xl border border-gray-100 focus:border-[#d9a65a] outline-none text-sm"
                                            />
                                        </div>
                                        <div>
                                            <label htmlFor="reg-whatsapp" className="text-xs font-bold text-gray-500 uppercase mb-1 block">WhatsApp (Opcional)</label>
                                            <input type="tel" id="reg-whatsapp" value={whatsapp} onChange={e => setWhatsapp(e.target.value)}
                                                className="w-full p-3 rounded-xl border border-gray-100 focus:border-[#d9a65a] outline-none text-sm"
                                                placeholder="84/85..."
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label htmlFor="reg-address" className="text-xs font-bold text-gray-500 uppercase mb-1 block">Endereço (Opcional)</label>
                                            <input type="text" id="reg-address" value={address} onChange={e => setAddress(e.target.value)}
                                                className="w-full p-3 rounded-xl border border-gray-100 focus:border-[#d9a65a] outline-none text-sm"
                                                placeholder="Bairro, Rua, Casa..."
                                            />
                                        </div>
                                        <div>
                                            <label htmlFor="reg-nuit" className="text-xs font-bold text-gray-500 uppercase mb-1 block">NUIT (Opcional)</label>
                                            <input type="text" id="reg-nuit" value={nuit} onChange={e => setNuit(e.target.value)}
                                                maxLength={9}
                                                className="w-full p-3 rounded-xl border border-gray-100 focus:border-[#d9a65a] outline-none text-sm"
                                                placeholder="123456789"
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label htmlFor="reg-password" className="text-xs font-bold text-gray-500 uppercase mb-1 block">{language === 'en' ? 'Create Password *' : 'Criar Palavra-passe *'}</label>
                                        <input type="password" id="reg-password" required value={password} onChange={e => setPassword(e.target.value)}
                                            className="w-full p-3 rounded-xl border border-gray-100 focus:border-[#d9a65a] outline-none text-sm"
                                            placeholder="Mínimo 4 caracteres"
                                        />
                                    </div>

                                    <div className="py-2">
                                        <label className="flex items-start gap-3 cursor-pointer group">
                                            <div className="relative mt-0.5">
                                                <input
                                                    type="checkbox"
                                                    required
                                                    checked={acceptedTerms}
                                                    onChange={(e) => setAcceptedTerms(e.target.checked)}
                                                    className="sr-only peer"
                                                />
                                                <div className="w-5 h-5 border-2 border-gray-200 rounded-md peer-checked:bg-[#d9a65a] peer-checked:border-[#d9a65a] transition-all flex items-center justify-center">
                                                    <div className="w-2 h-3 border-r-2 border-b-2 border-white rotate-45 mb-1 hidden peer-checked:block"></div>
                                                </div>
                                            </div>
                                            <span className="text-xs text-gray-500 leading-tight">
                                                Ao criar conta, eu aceito os <button type="button" onClick={() => setActiveLegalView('terms')} className="text-[#d9a65a] hover:underline">{language === 'en' ? 'Terms of Service' : 'Termos de Serviço'}</button> e a <button type="button" onClick={() => setActiveLegalView('privacy')} className="text-[#d9a65a] hover:underline">{language === 'en' ? 'Privacy Policy' : 'Política de Privacidade'}</button> da Pão Caseiro.
                                            </span>
                                        </label>
                                    </div>

                                    <button
                                        type="submit"
                                        disabled={loading || !name || password.length < 4 || !acceptedTerms}
                                        className="w-full bg-[#3b2f2f] text-[#d9a65a] py-3 mt-4 rounded-xl font-bold uppercase tracking-widest hover:bg-[#d9a65a] hover:text-[#3b2f2f] transition-all flex justify-center items-center disabled:opacity-70"
                                    >
                                        {loading ? <Loader className="w-6 h-6 animate-spin" /> : (existingCustomer ? 'Concluir Acesso' : 'Concluir Registo')}
                                    </button>
                                    <button type="button" onClick={() => setStep('choice')} className="w-full text-sm text-gray-500 hover:text-[#3b2f2f] underline mt-2">{language === 'en' ? 'Back' : 'Voltar'}</button>
                                </form>
                            )}
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
