import React, { useState, useEffect } from 'react';
import { useCart } from '../context/CartContext';
import { ShoppingCart, ShoppingBag, X, Trash2, MessageCircle, MapPin, Phone, User, CreditCard, Banknote, CheckCircle, ArrowLeft, Loader, Store, ArrowRight, AlertTriangle, Clock, Info, Mail, Calendar, FileText, Sparkles, Lock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { initiatePayment, verifyPayment } from '../services/paySuite';
import { LocationPicker } from './LocationPicker';
import { Receipt } from './Receipt';
import { AddressAutocomplete } from './AddressAutocomplete'; // Import the new component
import { translations, Language } from '../translations';
import { notifyTeam } from '../services/sms';
import { NotificationService } from '../services/NotificationService';
import { saveOrderToSupabase, supabase } from '../services/supabase';
import { formatProductName, getEnglishProductName } from '../services/stringUtils';
import { ClientLoginModal } from './ClientLoginModal';
import { logAudit } from '../services/audit';


type CheckoutStep = 'cart' | 'details' | 'payment' | 'processing' | 'receipt';
type OrderType = 'delivery' | 'pickup' | 'dine_in';
type PaymentMethod = 'mpesa' | 'emola' | 'mkesh' | 'cash' | 'card';

// Bakery Location (Lichinga Center / Av. Acordo de Lusaka approx)
const BAKERY_LOCATION = { lat: -13.3139, lng: 35.2409 };

const PREFIXES = {
    mpesa: ['84', '85'],
    emola: ['86', '87'],
    mkesh: ['82', '83']
};

interface CartProps {
    language: Language;
}

export const Cart: React.FC<CartProps> = ({ language }) => {
    const { cart, addToCart, removeFromCart, total, clearCart } = useCart();
    const t = translations[language];
    const [isOpen, setIsOpen] = useState(false);
    const [step, setStep] = useState<CheckoutStep>('cart');
    const isInitialLoad = React.useRef(true);
    
    // Auth State
    const [user, setUser] = useState<any>(null);
    const [manualUserPhone, setManualUserPhone] = useState<string | null>(null);
    const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);

    // Form State
    const [details, setDetails] = useState({
        name: '',
        phone: '',
        email: '',
        whatsapp: '',
        dateOfBirth: '',
        nuit: '',
        address: '',
        street: '',
        referencePoint: '',
        notes: '', // New Field
        tableZone: 'Sala Interior', // New Field for Dine-in
        tablePeople: 1, // New Field for Dine-in
        type: 'delivery' as OrderType,
        isScheduled: false // Scheduled items flag 70%
    });
    const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('mpesa');
    const [paymentPhone, setPaymentPhone] = useState('');
    const [error, setError] = useState('');
    
    // Frictionless Auth
    const [createAccount, setCreateAccount] = useState(true);
    const [checkoutPassword, setCheckoutPassword] = useState('');
    const [isCreatingAccount, setIsCreatingAccount] = useState(false);

    // Delivery & Fees
    const [deliveryLocation, setDeliveryLocation] = useState<{ lat: number; lng: number; confirmed: boolean } | null>(null);
    const [deliveryFee, setDeliveryFee] = useState(0);
    const [distance, setDistance] = useState(0);
    const [paymentUrl, setPaymentUrl] = useState<string | null>(null); // State for Iframe URL
    const [overridePosition, setOverridePosition] = useState<{ lat: number; lng: number } | null>(null); // To move map
    const [saveToProfile, setSaveToProfile] = useState(false);
    const [hasChanges, setHasChanges] = useState(false);

    // Deposit Logic
    const hasSpecialItems = cart.some(item => item.isSpecial);
    const [payDeposit, setPayDeposit] = useState(false);

    // Order Metadata for Receipt
    const [completedOrder, setCompletedOrder] = useState<any>(null);
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [isInitiating, setIsInitiating] = useState(false);

    // Global listener to open cart from modals
    useEffect(() => {
        const handleOpenCart = () => setIsOpen(true);
        window.addEventListener('open-cart', handleOpenCart);
        
        // Setup Auth Listeners
        supabase.auth.getSession().then(({ data: { session } }) => {
            setUser(session?.user ?? null);
        });
        setManualUserPhone(localStorage.getItem('pc_auth_phone'));

        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            setUser(session?.user ?? null);
        });

        const checkManual = () => {
            setManualUserPhone(localStorage.getItem('pc_auth_phone'));
        };
        window.addEventListener('storage', checkManual);
        window.addEventListener('pc_user_update', checkManual);

        return () => {
            window.removeEventListener('open-cart', handleOpenCart);
            subscription.unsubscribe();
            window.removeEventListener('storage', checkManual);
            window.removeEventListener('pc_user_update', checkManual);
        };
    }, []);

    // Load saved details on mount
    useEffect(() => {
        const saved = localStorage.getItem('checkout_details');
        const userData = localStorage.getItem('pc_user_data');

        let initialDetails = { ...details };

        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                initialDetails = { ...initialDetails, ...parsed };
            } catch (e) { console.error("Error loading saved details", e); }
        }

        if (userData) {
            try {
                const user = JSON.parse(userData);
                initialDetails = {
                    ...initialDetails,
                    name: user.name || initialDetails.name,
                    phone: user.contact_no || initialDetails.phone,
                    email: user.email || initialDetails.email,
                    whatsapp: user.whatsapp || initialDetails.whatsapp,
                    address: user.address || initialDetails.address,
                    street: user.street || initialDetails.street,
                    referencePoint: user.reference_point || initialDetails.referencePoint,
                    nuit: user.nuit || initialDetails.nuit,
                    dateOfBirth: user.date_of_birth || initialDetails.dateOfBirth
                };
            } catch (e) { console.error("Error loading user data", e); }
        }

        setDetails(initialDetails);
    }, []);

    // Sync Details when user logs in via ClientLoginModal
    useEffect(() => {
        const userData = localStorage.getItem('pc_user_data');
        if (userData) {
            try {
                const userObj = JSON.parse(userData);
                setDetails(prev => ({
                    ...prev,
                    name: userObj.name || prev.name,
                    phone: userObj.contact_no || prev.phone,
                    email: userObj.email || prev.email,
                    whatsapp: userObj.whatsapp || prev.whatsapp,
                    address: userObj.address || prev.address,
                    street: userObj.street || prev.street,
                    referencePoint: userObj.reference_point || prev.referencePoint,
                    nuit: userObj.nuit || prev.nuit,
                    dateOfBirth: userObj.date_of_birth || prev.dateOfBirth
                }));
            } catch(e) {}
        }
    }, [user, manualUserPhone]);

    // Save details on change
    useEffect(() => {
        if (details.name || details.phone) {
            localStorage.setItem('checkout_details', JSON.stringify({
                name: details.name,
                phone: details.phone,
                email: details.email,
                whatsapp: details.whatsapp,
                dateOfBirth: details.dateOfBirth,
                nuit: details.nuit,
                address: details.address,
                street: details.street,
                referencePoint: details.referencePoint,
                notes: details.notes,
                type: details.type,
                isScheduled: details.isScheduled
            }));
        }
    }, [details]);

    // Check for changes relative to profile
    useEffect(() => {
        const userData = localStorage.getItem('pc_user_data');
        if (userData) {
            try {
                const user = JSON.parse(userData);

                // Normalization helper
                const normalize = (val: any) => (val || '').toString().trim();

                const isChanged =
                    normalize(details.name) !== normalize(user.name) ||
                    normalize(details.phone) !== normalize(user.contact_no) ||
                    normalize(details.email) !== normalize(user.email) ||
                    normalize(details.whatsapp) !== normalize(user.whatsapp) ||
                    normalize(details.address) !== normalize(user.address) ||
                    normalize(details.street) !== normalize(user.street) ||
                    normalize(details.referencePoint) !== normalize(user.reference_point);

                // Prevent showing prompt on the very first load if data matches or is being synced
                if (isInitialLoad.current) {
                    isInitialLoad.current = false;
                    setHasChanges(false);
                } else {
                    setHasChanges(isChanged);
                }
            } catch (e) { console.error("Error comparing profile", e); }
        }
    }, [details]);

    useEffect(() => {
        // If no special items, cannot pay deposit.
        if (!hasSpecialItems) setPayDeposit(false);
    }, [hasSpecialItems]);

    // Calculate Distance & Fee
    const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
        const R = 6371; // Radius of the earth in km
        const dLat = deg2rad(lat2 - lat1);
        const dLon = deg2rad(lon2 - lon1);
        const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        const d = R * c; // Distance in km
        return d;
    };

    const deg2rad = (deg: number) => {
        return deg * (Math.PI / 180);
    };

    useEffect(() => {
        if (details.type === 'delivery' && deliveryLocation) {
            const dist = calculateDistance(BAKERY_LOCATION.lat, BAKERY_LOCATION.lng, deliveryLocation.lat, deliveryLocation.lng);
            setDistance(dist);

            let fee = 0;
            if (dist <= 7) fee = 100;
            else if (dist <= 15) fee = 250;
            else if (dist <= 30) fee = 500; // New tier for 15-30km
            else {
                // > 30km
                fee = -1; // Flag for Out of Range
            }
            setDeliveryFee(fee);
        } else {
            setDeliveryFee(0);
            setDistance(0);
        }
    }, [deliveryLocation, details.type]);


    // Handle Return from Payment (Redirect fallback)
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        if (params.get('payment_return') === 'true') {
            setIsOpen(true);
            const status = params.get('status');
            const orderId = params.get('orderId') || localStorage.getItem('last_order_id');

            if (status === 'success' || status === 'approved') {
                // Clean URL
                window.history.replaceState({}, document.title, window.location.pathname);
                
                // If we have an order in state, finish it. 
                // In a redirect, we might have lost state, so we might need to verify via orderId
                if (orderId) {
                    finishOrder(orderId);
                } else {
                    finishOrder();
                }
                setShowSuccessModal(true);
            } else {
                setStep('payment');
                setError('Pagamento não concluído ou cancelado.');
                window.history.replaceState({}, document.title, window.location.pathname);
            }
        }
    }, []);

    useEffect(() => {
        // Auto-sync payment phone with contact phone initially
        if (details.phone && !paymentPhone) {
            let cleanPhone = details.phone.replace(/\D/g, '');
            if (cleanPhone.startsWith('258') && cleanPhone.length > 3) {
                cleanPhone = cleanPhone.substring(3);
            }
            setPaymentPhone(cleanPhone);
        }
    }, [details.phone]);

    // Financials
    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
    const packagingFee = details.type === 'delivery' && totalItems > 0 ? Math.ceil(totalItems / 3) * 20 : 0;

    const finalTotal = total + (deliveryFee > 0 ? deliveryFee : 0) + packagingFee;
    let amountToPay = payDeposit ? finalTotal / 2 : finalTotal;
    
    // Scheduled orders require 70% upfront
    if (details.isScheduled) {
        amountToPay = finalTotal * 0.7;
    }
    
    const remainingBalance = finalTotal - amountToPay;

    // Manual Verification Helper
    const [isVerifyingManual, setIsVerifyingManual] = useState(false);
    const handleManualVerify = async () => {
        if (!currentTxId) return;
        setIsVerifyingManual(true);
        try {
            const status = await verifyPayment(currentTxId);
            if (status.success) {
                finishOrder();
                setShowSuccessModal(true);
            } else {
                setError('Pagamento ainda não detectado. Se já pagou, aguarde 30 segundos e tente novamente.');
            }
        } catch (e) {
            setError('Erro ao verificar pagamento. Tente novamente.');
        } finally {
            setIsVerifyingManual(false);
        }
    };

    const handleNextStep = async () => {
        if (!navigator.onLine) {
            setError(
                language === 'pt' 
                    ? 'Você está offline. Verifique a sua conexão à internet para prosseguir com a encomenda.' 
                    : 'You are offline. Please check your internet connection to proceed with your order.'
            );
            return;
        }

        if (step === 'cart') {
            // Check Shop Hours
            const now = new Date();
            const currentHour = now.getHours();
            const currentMinute = now.getMinutes();
            const currentTime = currentHour * 60 + currentMinute;

            const openTime = 6 * 60; // 06:00
            const closeTime = 22 * 60; // 22:00

            const isOpen = (currentTime >= openTime && currentTime < closeTime) || localStorage.getItem('pc_bypass_hours') === 'true'; // Removed hardcoded bypass for production

            if (!isOpen) {
                setError(
                    language === 'pt'
                        ? 'Desculpe, estamos fechados. Encomendas apenas entre 06:00 e 22:00.'
                        : 'Sorry, we are closed. Orders only between 06:00 and 22:00.'
                );
                return;
            }

            // Check moved to 'details' step to know the order type? 
            // Or assume delivery is default or check later?
            // Actually, type is set in 'details' step. 
            // So we should check min amount when moving FROM 'details' OR check generally but allow pass if pickup?
            // User requirement: "Minimum 100 MT for Delivery". "Pickup/Table no minimum".
            // Since 'type' is chosen in 'details' step (step 2), we can only strictly validate there.
            // BUT, if the user starts with an empty cart or very low value, maybe warn them?
            // Default type is 'delivery'.
            // Let's allow proceeding to details, but validate BEFORE payment or when selecting type?
            // Current flow: Cart -> Details (User picks Type) -> Payment.
            // So validation must happen when leaving 'details' step if type is 'delivery'.

            setStep('details');
            setError('');
        } else if (step === 'details') {
            if (!details.name || !details.phone || !details.email) {
                setError('Por favor preencha os dados obrigatórios: Nome, Telefone e Email.');
                return;
            }
            if (details.phone.replace(/\D/g, '').length < 9) {
                setError('O celular é obrigatório e deve conter um número válido de no mínimo 9 dígitos.');
                return;
            }
            if (details.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(details.email)) {
                setError('Por favor introduza um endereço de Email válido.');
                return;
            }

            // [NEW] Frictionless Registration Check
            if (!user && !manualUserPhone) {
                if (!createAccount) {
                    setError('Tem de marcar a opção de criar conta ou fazer login para prosseguir.');
                    return;
                }
                if (checkoutPassword.length < 6) {
                    setError(language === 'en' ? 'Password must be at least 6 characters.' : 'A senha para criar a conta deve ter pelo menos 6 caracteres.');
                    return;
                }
                
                setIsCreatingAccount(true);
                setError('');
                try {
                    // Pre-check if email or phone already exists
                    let phoneFormatted = details.phone.replace(/\D/g, '');
                    if (phoneFormatted.length >= 9 && !phoneFormatted.startsWith('258')) {
                        phoneFormatted = '258' + phoneFormatted;
                    }
                    phoneFormatted = '+' + phoneFormatted;

                    const { data: existing } = await supabase
                        .from('customers')
                        .select('id')
                        .or(`contact_no.eq."${phoneFormatted}",email.eq."${details.email}"`)
                        .limit(1);

                    if (existing && existing.length > 0) {
                        setIsCreatingAccount(false);
                        setError(language === 'en' ? 'This Email or Phone is already registered! Please click "Already have an account" at the top to Log In and continue your order.' : 'Este Telemóvel ou Email já está registado! Por favor clique em "Já tenho conta" no topo para fazer Log In e prosseguir com a compra.');
                        return;
                    }

                    const { data: authData, error: authError } = await supabase.auth.signUp({
                        email: details.email,
                        password: checkoutPassword,
                        options: {
                            data: {
                                full_name: details.name,
                                phone: phoneFormatted
                            }
                        }
                    });
                    
                    if (authError) {
                        setIsCreatingAccount(false);
                        if (authError.message.includes('already registered')) {
                            setError(language === 'en' ? 'Email already registered. Please Log In.' : 'Este email já está registado. Por favor clique em "Já tenho conta" para fazer login.');
                        } else {
                            setError('Erro ao criar conta: Ocorreu uma incompatibilidade na plataforma (' + authError.message + '). Tente no painel de Log In.');
                        }
                        return;
                    }
                    
                    // Proceed: Account created successfully! supabase.auth will automatically sign them in shortly.
                    setManualUserPhone(phoneFormatted); // temporary local bypass
                    setIsCreatingAccount(false);
                } catch (err: any) {
                    setIsCreatingAccount(false);
                    setError('Falha de conexão ao verificar a conta.');
                    return;
                }
            }

            // [NEW] Minimum Order Validation
            if (details.type === 'delivery' && total < 100) {
                setError('Para entregas, o valor mínimo do pedido é 100 MT. Por favor adicione mais itens ou escolha Levantar.');
                return;
            }

            if (details.type === 'delivery') {
                // Relax check: If address is filled but location not confirmed, user might rely on text.
                // But for fee calculation we need location.
                if (!details.address) {
                    setError('Por favor preencha o endereço.');
                    return;
                }
                if (!deliveryLocation || !deliveryLocation.confirmed) {
                    setError('Por favor confirme sua localização no mapa (ou pesquise o local).');
                    return;
                }
                if (deliveryFee === -1) {
                    const msg = 'Localização fora do raio de entrega (30km). Por favor contacte-nos para verificar disponibilidade.';
                    // alert(msg); // Removed as per user request
                    setError(msg);
                    return;
                }
            }
            if (details.type === 'pickup') {
                if (!details.notes || details.notes.trim().length < 3) {
                    setError('Por favor indique a hora prevista ou detalhes para o levantamento nas notas.');
                    return;
                }
            }
            if (details.type === 'dine_in') {
                if (!details.tableZone || !details.tablePeople) {
                    setError('Por favor selecione a zona e o número de pessoas.');
                    return;
                }
            }
            setError('');
            setStep('payment');
        }
    };

    // State for Payment Reference Consistency
    const [currentPaymentRef, setCurrentPaymentRef] = useState<string | null>(null);
    const [currentOrderId, setCurrentOrderId] = useState<string | null>(null);
    const [currentTxId, setCurrentTxId] = useState<string | undefined>(undefined);

    const handlePayment = async () => {
        if (!navigator.onLine) {
            setError(
                language === 'pt' 
                    ? 'Você está offline. A página de pagamento não pode ser aberta sem ligação à internet.' 
                    : 'You are offline. The payment page cannot be opened without an internet connection.'
            );
            return;
        }

        // Generate consistent IDs
        const timestamp = Date.now();
        const shortId = `PC-${timestamp.toString().slice(-4)}`; // Short ID for User (e.g. PC-1234)
        const refId = `ORD${timestamp}`; // Long ID for System/PaySuite (e.g. ORD176...)

        setCurrentPaymentRef(refId);
        setCurrentOrderId(shortId);
        localStorage.setItem('last_order_id', shortId); // Store for redirect recovery
        setStep('processing');
        setError('');

        // Test bypass removed for production phase

        try {
            // PaySuite bloqueia Iframes (X-Frame-Options), por isso usamos um Popup Window
            const width = 500;
            const height = 700;
            const left = window.screen.width / 2 - width / 2;
            const top = window.screen.height / 2 - height / 2;
            
            // Open window SYNCHRONOUSLY before await to bypass mobile popup blockers
            const paymentWindow = window.open(
                '', 
                'PaySuiteCheckout', 
                `width=${width},height=${height},top=${top},left=${left},scrollbars=yes,resizable=yes,status=no,location=no,toolbar=no`
            );
            
            if (!paymentWindow || paymentWindow.closed || typeof paymentWindow.closed === 'undefined') {
                setError(language === 'pt' ? 'O seu navegador bloqueou o portal de pagamento. Por favor, permita popups.' : 'Popup blocked. Please allow popups for this site.');
                return;
            }

            paymentWindow.document.write(`
                <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100vh;font-family:sans-serif;background:#fffbf5;color:#3b2f2f;padding:20px;text-align:center;">
                    <div style="border: 4px solid #f3f3f3; border-top: 4px solid #d9a65a; border-radius: 50%; width: 40px; height: 40px; animation: spin 1s linear infinite; margin-bottom: 20px;"></div>
                    <h2 style="margin:0; font-size: 1.5rem;">Pão Caseiro</h2>
                    <p style="margin:10px 0 0 0; opacity: 0.8;">${language === 'en' ? 'Connecting to secure payment server...' : 'A ligar ao servidor de pagamento seguro...'}</p>
                    <p style="margin:20px 0 0 0; font-size: 0.8rem; opacity: 0.5;">${language === 'en' ? 'Please do not close this window.' : 'Por favor não feche esta janela.'}</p>
                    <style>
                        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
                    </style>
                </div>
            `);

            setIsInitiating(true);
            const result = await initiatePayment({
                amount: amountToPay,
                msisdn: details.phone || '000000000', 
                reference: refId,
                customerName: details.name,
                customerEmail: details.email
            });
            setIsInitiating(false);

            if (result.success && result.checkout_url) {
                paymentWindow.location.href = result.checkout_url;
                setCurrentTxId(result.transaction_id);
                setStep('processing'); 
            } else {
                paymentWindow.close();
                setStep('payment');
                const errMsg = result.message || 'Falha no pagamento. Tente novamente.';
                setError(errMsg);
            }
        } catch (e: any) {
            setStep('payment');
            setError('Erro de conexão com o sistema de pagamento.');
            await logAudit({
                action: 'PAYMENT_FAILED',
                entity_type: 'order',
                entity_id: currentOrderId || 'unknown',
                details: { reason: 'Connection Error: ' + (e.message || 'Unknown'), amount: amountToPay, customer: details.contact_no },
                customer_phone: details.phone
            });
        }
    };


    // Polling Effect
    useEffect(() => {
        let interval: any;
        if ((step === 'processing' || paymentUrl) && currentTxId) {
            let attempts = 0;
            interval = setInterval(async () => {
                attempts++;
                // If the user is on receipt step, stop polling
                if (step === 'receipt') {
                    clearInterval(interval);
                    return;
                }

                if (attempts > 24) { // 2m timeout (24 * 5s)
                    clearInterval(interval);
                    setStep('payment');
                    setCurrentTxId(undefined);
                    setError(
                        language === 'pt' 
                            ? 'O tempo de espera para o pagamento expirou. Por favor, tente novamente.'
                            : 'Payment timeout. Please try again.'
                    );
                    return;
                }

                try {
                    const status = await verifyPayment(currentTxId);
                    if (status.success) {
                        clearInterval(interval);
                        finishOrder();
                        setShowSuccessModal(true);
                    } else if (status.status === 'FAILED' || status.status === 'CANCELLED' || status.status === 'REJECTED') {
                        clearInterval(interval);
                        setError(language === 'pt' ? 'Pagamento falhou ou foi cancelado.' : 'Payment failed or was cancelled.');
                        setCurrentTxId(undefined);
                        setStep('payment');
                    }
                } catch (e) {
                    console.error("Polling error", e);
                }
            }, 5000); // Check every 5s
        }
        return () => clearInterval(interval);
    }, [step, paymentUrl, currentTxId]);

    const finishOrder = (manualOrderId?: string, manualRef?: string, manualTxId?: string) => {
        // Use manual IDs if provided (Cash case), otherwise use state (PaySuite case)
        const orderId = manualOrderId || currentOrderId || `PC-${Date.now().toString().slice(-4)}`;
        const refId = manualRef || currentPaymentRef || `ORD${Date.now()}`;
        const txId = manualTxId || currentTxId;

        const newOrder = {
            orderId: orderId, // Short ID
            paymentRef: refId, // Long ID
            transactionId: txId,
            date: new Date().toLocaleString(),
            amountPaid: amountToPay,
            balance: remainingBalance,
            items: [...cart], // Save items snapshot for Receipt and Admin
            customer: { ...details }, // Save customer details snapshot
            status: 'pending', // Initial status
            total: finalTotal,
            subtotal: total,
            deliveryFee: deliveryFee > 0 ? deliveryFee : 0
        };



        setCompletedOrder(newOrder);
        setStep('receipt');
        setPaymentUrl(null);
        clearCart(); // clear cart after successful order

        // Notify Team & Customer
        notifyTeam(newOrder, 'new_order').catch(err => console.error("Team notification failed", err));
        NotificationService.notifyOrderStatus(newOrder, 'pending')
            .catch(err => console.error("Customer notification failed", err));


        // Save to Supabase
        const supabaseOrder = {
            short_id: orderId,
            payment_ref: refId,
            transaction_id: txId,
            customer_phone: details.phone,
            customer_name: details.name,
            customer_email: details.email,
            customer_whatsapp: details.whatsapp,
            customer_nuit: details.nuit,
            customer_dob: details.dateOfBirth,
            delivery_type: details.type,
            delivery_address: details.address,
            customer_street: details.street,
            customer_reference_point: details.referencePoint,
            delivery_coordinates: deliveryLocation ? `(${deliveryLocation.lat},${deliveryLocation.lng})` : null,
            table_zone: details.tableZone,
            table_people: details.tablePeople,
            notes: details.notes,
            total_amount: finalTotal,
            delivery_fee: deliveryFee > 0 ? deliveryFee : 0,
            packaging_fee: packagingFee,
            amount_paid: amountToPay,
            balance: remainingBalance,
            status: details.isScheduled ? 'pending' : 'pending' // Agendamentos mantêm-se pending para Admin ver
        };

        // If user wants to save changes to profile
        const userData = localStorage.getItem('pc_user_data');
        if (saveToProfile && userData) {
            try {
                const user = JSON.parse(userData);
                supabase.from('customers').update({
                    name: details.name,
                    contact_no: details.phone,
                    email: details.email,
                    whatsapp: details.whatsapp,
                    address: details.address,
                    street: details.street,
                    reference_point: details.referencePoint,
                    updated_at: new Date().toISOString()
                }).eq('id', user.id).then(({ data: updated, error }) => {
                    if (!error) {
                        // Refresh local storage
                        supabase.from('customers').select('*').eq('id', user.id).single().then(({ data }) => {
                            if (data) {
                                localStorage.setItem('pc_user_data', JSON.stringify(data));
                                window.dispatchEvent(new Event('pc_user_update'));
                            }
                        });
                    }
                });
            } catch (e) { console.error("Error updating profile during checkout", e); }
        }

        const supabaseItems = cart.map(item => ({
            name: item.name,
            quantity: item.quantity,
            price: item.price
        }));

        saveOrderToSupabase(supabaseOrder, supabaseItems)
            .then(res => {
                if (!res.success) {
                    console.error("Database save failed", res.error);
                } else {
                    logAudit({
                        action: 'ORDER_PLACED',
                        entity_type: 'order',
                        entity_id: orderId,
                        details: { total: supabaseOrder.total_amount, method: 'online' },
                        customer_phone: details.phone
                    });
                    
                    const invoiceLink = `${window.location.origin}/order-receipt/${orderId}`;
                    let msg = '';

                    if (remainingBalance > 0) {
                        msg = `A sua Fatura PaoCaseiro gerada c/sucesso! Fatura online em: ${invoiceLink}. Aguarda pagamento do valor restante.`;
                    } else {
                        msg = `A sua encomenda #${orderId} foi paga c/sucesso! Consulte o Recibo da Encomenda no seu E-mail ou em: ${invoiceLink}.`;
                    }

                    // Enforce 160 char limit
                    msg = msg.substring(0, 160);
                    NotificationService.sendCustomNotification(details.phone, msg)
                        .catch(err => console.error("Invoice notification failed", err));
                }
            })
            .catch(err => console.error("Database save exception", err));
    };

    const renderStepContent = () => {
        switch (step) {
            case 'cart':
                return (
                    <>
                        <div className="flex-1 overflow-y-auto p-6 space-y-4">
                            {error && step === 'cart' && (
                                <div className="bg-red-50 border border-red-200 p-4 rounded-xl flex items-center gap-3 animate-shake sticky top-0 z-10 shadow-sm">
                                    <AlertTriangle className="w-6 h-6 text-red-500 shrink-0" />
                                    <p className="text-red-700 font-bold text-sm">{error}</p>
                                </div>
                            )}
                            {cart.length === 0 ? (
                                <div className="text-center opacity-50 flex flex-col items-center justify-center h-full">
                                    <ShoppingCart className="w-16 h-16 mb-4 opacity-20" />
                                    <p className="text-lg">{t.cart.empty}</p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    <div className="flex justify-end">
                                        <button
                                            onClick={() => {
                                                if (window.confirm(language === 'en' ? 'Are you sure you want to clear your cart?' : 'Tem certeza que deseja limpar o seu carrinho?')) {
                                                    clearCart();
                                                }
                                            }}
                                            className="text-xs font-bold text-red-500 flex items-center gap-1 hover:text-red-700 transition-colors bg-white/50 px-3 py-1.5 rounded-full border border-red-100 shadow-sm"
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
                                            {language === 'en' ? 'Clear all' : 'Limpar tudo'}
                                        </button>
                                    </div>
                                    {cart.map((item) => (
                                    <div key={item.name} className="bg-white p-3 rounded-xl shadow-sm border border-[#d9a65a]/20 flex gap-4 items-center">
                                        {/* Image Thumbnail */}
                                        <div className="w-16 h-16 bg-gray-100 rounded-lg shrink-0 overflow-hidden">
                                            {item.image ? (
                                                <img src={item.image} alt={formatProductName(item.name)} className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-xs text-gray-400 font-bold">IMG</div>
                                            )}
                                        </div>

                                        <div className="flex-1 min-w-0">
                                            <h3 className="font-bold text-[#3b2f2f] truncate">{language === 'en' ? formatProductName(item.name_en || getEnglishProductName(item.name)) : formatProductName(item.name)}</h3>
                                            <p className="text-[#d9a65a] text-sm font-bold">{item.price} MT</p>
                                        </div>

                                        <div className="flex items-center gap-2 bg-[#f7f1eb] rounded-lg p-1">
                                            <button
                                                onClick={() => addToCart({ ...item, quantity: -1 })}
                                                className="w-8 h-8 flex items-center justify-center hover:bg-[#d9a65a] hover:text-[#3b2f2f] rounded-md transition-colors font-bold"
                                            >
                                                -
                                            </button>
                                            <span className="font-bold w-4 text-center text-sm">{item.quantity}</span>
                                            <button
                                                onClick={() => addToCart({ ...item, quantity: 1 })}
                                                className="w-8 h-8 flex items-center justify-center hover:bg-[#d9a65a] hover:text-[#3b2f2f] rounded-md transition-colors font-bold"
                                            >
                                                +
                                            </button>
                                        </div>
                                    </div>
                                    ))}
                                </div>
                            )}
                        </div>
                        {cart.length > 0 && (
                            <div className="p-6 bg-white border-t border-[#d9a65a]/20 space-y-4">
                                {/* Wait Time Notification */}
                                {(() => {
                                    // Parse time strings (e.g., "30 min", "1h") to minutes for comparison
                                    const parseTime = (str?: string) => {
                                        if (!str) return 0;
                                        const num = parseInt(str.replace(/\D/g, ''));
                                        return isNaN(num) ? 0 : num;
                                    };

                                    const maxPrep = Math.max(0, ...cart.map(i => parseTime(i.prepTime)));
                                    const maxDelivery = Math.max(0, ...cart.map(i => parseTime(i.deliveryTime)));

                                    // Heuristic: Delivery usually includes prep, but if separate we might sum them?
                                    // For now let's show the longest single time estimate found.
                                    const maxTime = Math.max(maxPrep, maxDelivery);

                                    if (maxTime > 0) {
                                        return (
                                            <div className="bg-blue-50 p-3 rounded-lg flex items-center gap-3 text-blue-700 text-sm">
                                                <div className="bg-white p-1 rounded-full"><Clock className="w-4 h-4" /></div>
                                                <div>
                                                    <span className="font-bold block">Tempo Estimado</span>
                                                    <span>Aprox. {maxTime} min para preparar/entregar.</span>
                                                </div>
                                            </div>
                                        );
                                    }
                                    return null;
                                })()}

                                <div className="space-y-2">
                                    <div className="flex justify-between items-center text-gray-600">
                                        <span>{language === 'en' ? 'Subtotal' : 'Subtotal'}</span>
                                        <span>{total} MT</span>
                                    </div>
                                    <div className="flex justify-between items-center text-2xl font-bold text-[#3b2f2f] pt-2 border-t">
                                        <span>{t.cart.total}</span>
                                        <span>{total} MT</span>
                                    </div>
                                </div>
                                
                                <button
                                    onClick={handleNextStep}
                                    className="w-full bg-[#d9a65a] text-[#3b2f2f] py-4 rounded-xl font-bold uppercase tracking-widest hover:bg-[#3b2f2f] hover:text-[#d9a65a] transition-all flex items-center justify-center gap-2 shadow-lg"
                                >
                                    {t.menu.checkout_btn}
                                </button>
                            </div>
                        )
                        }
                    </>
                );

            case 'details':
                return (
                    <div className="p-6 space-y-6 overflow-y-auto h-full">
                        <div className="space-y-4">
                            <h3 className="font-serif text-2xl text-[#3b2f2f]">{t.checkout.details}</h3>

                            {(!user && !manualUserPhone) && (
                                <div className="bg-red-50 border border-red-200 p-4 rounded-xl flex flex-col gap-3 shadow-sm animate-fade-in mb-4">
                                    <div className="flex items-center gap-2 text-red-700 font-bold">
                                        <Lock className="w-5 h-5" />
                                        <span>Conta Obrigatória</span>
                                    </div>
                                    <p className="text-red-600 text-sm leading-relaxed">
                                        Para processar uma encomenda tem que ter conta connosco. Vamos criar uma rapidamente preenchendo os dados abaixo!
                                    </p>
                                    <button 
                                        onClick={() => setIsLoginModalOpen(true)}
                                        className="bg-white text-red-600 border border-red-200 py-2 rounded-lg font-bold hover:bg-red-50 transition-colors flex items-center justify-center gap-2"
                                    >
                                        <User className="w-4 h-4" /> Já tenho conta (Entrar Rápido)
                                    </button>
                                </div>
                            )}

                            {details.isScheduled && (
                                <div className="bg-blue-50 border border-blue-200 p-4 rounded-xl flex items-start gap-3 text-blue-800 shadow-sm animate-fade-in relative overflow-hidden">
                                    <div className="absolute top-0 right-0 w-16 h-16 bg-blue-100 rounded-bl-full -z-10 opacity-50"></div>
                                    <Clock className="w-6 h-6 shrink-0 mt-0.5" />
                                    <div>
                                        <span className="font-bold text-base block mb-1">
                                            Pedido Agendado
                                        </span>
                                        <p className="text-sm">
                                            O sistema requer um sinal obrigatório de <b>70%</b> do total da fatura para confirmar a sua reserva.<br/>
                                            A restante quantia será paga no ato de entrega.
                                        </p>
                                    </div>
                                </div>
                            )}

                            <div className="space-y-2">
                                <label className="text-sm font-bold text-[#3b2f2f]/80">{t.checkout.name}</label>
                                <div className="relative">
                                    <User className="absolute left-3 top-3 text-[#d9a65a] w-5 h-5" />
                                    <input
                                        type="text"
                                        value={details.name}
                                        onChange={(e) => setDetails({ ...details, name: e.target.value })}
                                        className="w-full pl-10 p-3 rounded-lg border border-[#d9a65a]/30 focus:border-[#d9a65a] outline-none bg-white"
                                        placeholder="Seu nome"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-bold text-[#3b2f2f]/80">Telefone/Whatsapp</label>
                                <div className="relative">
                                    <Phone className="absolute left-3 top-3 text-[#d9a65a] w-5 h-5" />
                                    <input
                                        type="tel"
                                        id="cart-phone"
                                        title="Seu Telemóvel e WhatsApp"
                                        value={details.phone}
                                        onChange={(e) => setDetails({ ...details, phone: e.target.value, whatsapp: e.target.value })}
                                        className="w-full pl-10 p-3 rounded-lg border border-[#d9a65a]/30 focus:border-[#d9a65a] outline-none bg-white"
                                        placeholder="+258 8x xxx xxxx"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label htmlFor="cart-email" className="text-sm font-bold text-[#3b2f2f]/80">Email <span className="text-red-500">*</span></label>
                                <div className="relative">
                                    <Mail className="absolute left-3 top-3 text-[#d9a65a] w-5 h-5" />
                                    <input
                                        type="email"
                                        id="cart-email"
                                        title="Seu Email"
                                        value={details.email}
                                        onChange={(e) => setDetails({ ...details, email: e.target.value })}
                                        className="w-full pl-10 p-3 rounded-lg border border-[#d9a65a]/30 focus:border-[#d9a65a] outline-none bg-white"
                                        placeholder="Seu email"
                                    />
                                </div>
                            </div>

                            {/* NUIT and DOB removed from checkout as they are collected during registration */}

                            <div className="space-y-2">
                                <label className="text-sm font-bold text-[#3b2f2f]/80">{t.checkout.orderType}</label>
                                <div className="grid grid-cols-3 gap-2">
                                    <button
                                        onClick={() => setDetails({ ...details, type: 'delivery' })}
                                        title={t.checkout.delivery}
                                        className={`flex flex-col items-center gap-1 p-3 rounded-lg text-xs font-bold transition-all border ${details.type === 'delivery' ? 'bg-[#d9a65a] text-[#3b2f2f] border-[#d9a65a]' : 'bg-white border-gray-200'}`}
                                    >
                                        <MapPin className="w-5 h-5" /> {t.checkout.delivery}
                                    </button>
                                    <button
                                        onClick={() => setDetails({ ...details, type: 'pickup' })}
                                        title={t.checkout.pickup}
                                        className={`flex flex-col items-center gap-1 p-3 rounded-lg text-xs font-bold transition-all border ${details.type === 'pickup' ? 'bg-[#d9a65a] text-[#3b2f2f] border-[#d9a65a]' : 'bg-white border-gray-200'}`}
                                    >
                                        <ShoppingBag className="w-5 h-5" /> {t.checkout.pickup}
                                    </button>
                                    <button
                                        onClick={() => setDetails({ ...details, type: 'dine_in' })}
                                        title={t.checkout.dine_in}
                                        className={`flex flex-col items-center gap-1 p-3 rounded-lg text-xs font-bold transition-all border ${details.type === 'dine_in' ? 'bg-[#d9a65a] text-[#3b2f2f] border-[#d9a65a]' : 'bg-white border-gray-200'}`}
                                    >
                                        <Store className="w-5 h-5" /> {t.checkout.dine_in}
                                    </button>
                                </div>
                            </div>


                            {/* Minimum Order Alert */}
                            {details.type === 'delivery' && total < 100 && (
                                <div className="bg-orange-50 border border-orange-200 p-3 rounded-lg flex items-center gap-2 text-orange-700 text-sm animate-pulse">
                                    <AlertTriangle className="w-5 h-5 shrink-0" />
                                    <span>
                                        <b>Atenção:</b> O valor mínimo para entrega é <b>100 MT</b>.
                                        <br />Por favor adicione mais itens ou escolha "Levantar".
                                    </span>
                                </div>
                            )}

                            {details.type === 'delivery' && (
                                <div className="space-y-4 animate-fade-in">
                                    <div className="space-y-2">
                                        <label htmlFor="address-autocomplete" className="text-sm font-bold text-[#3b2f2f]/80">{t.checkout.address}</label>
                                        <AddressAutocomplete
                                            value={details.address}
                                            onChange={(val) => setDetails({ ...details, address: val })}
                                            onSelect={(result) => {
                                                setDetails({ ...details, address: result.label });
                                                setOverridePosition({ lat: result.y, lng: result.x });
                                            }}
                                        />
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <label className="text-sm font-bold text-[#3b2f2f]/80">Rua / Av</label>
                                            <input
                                                type="text"
                                                value={details.street}
                                                onChange={(e) => setDetails({ ...details, street: e.target.value })}
                                                className="w-full p-3 rounded-xl border border-[#d9a65a]/30 focus:border-[#d9a65a] outline-none bg-white"
                                                placeholder="Ex: Av. Eduardo Mondlane"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-sm font-bold text-[#3b2f2f]/80">Ponto de Referência</label>
                                            <input
                                                type="text"
                                                value={details.referencePoint}
                                                onChange={(e) => setDetails({ ...details, referencePoint: e.target.value })}
                                                className="w-full p-3 rounded-xl border border-[#d9a65a]/30 focus:border-[#d9a65a] outline-none bg-white"
                                                placeholder="Ex: Perto do Millennium BIM"
                                            />
                                        </div>
                                    </div>

                                    {/* Location Picker */}
                                    <LocationPicker
                                        overridePosition={overridePosition} // Pass the selected position
                                        onConfirm={(loc) => {
                                            setDeliveryLocation(loc);
                                            setError('');
                                        }}
                                    />

                                    {distance > 0 && (
                                        <div className="text-xs text-gray-500 text-center" title="Distância estimada">
                                            Distância da Padaria: <span className="font-bold">{distance.toFixed(2)} km</span>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Dine-In Specific Fields */}
                            {details.type === 'dine_in' && (
                                <div className="grid grid-cols-2 gap-3 animate-fade-in">
                                    <div className="space-y-2">
                                        <label htmlFor="cart-table-zone" className="text-sm font-bold text-[#3b2f2f]/80">Zona</label>
                                        <select
                                            id="cart-table-zone"
                                            title="Zona da Mesa"
                                            value={details.tableZone}
                                            onChange={(e) => setDetails({ ...details, tableZone: e.target.value })}
                                            className="w-full p-3 rounded-lg border border-[#d9a65a]/30 focus:border-[#d9a65a] outline-none bg-white font-serif"
                                        >
                                            <option value="Sala Interior">Sala Interior</option>
                                            <option value="Esplanada">Esplanada</option>
                                            <option value="Quiosque">Quiosque</option>
                                        </select>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-bold text-[#3b2f2f]/80">Pessoas</label>
                                        <div className="flex items-center gap-2 bg-white border border-[#d9a65a]/30 rounded-lg p-1">
                                            <button
                                                onClick={() => setDetails(prev => ({ ...prev, tablePeople: Math.max(1, prev.tablePeople - 1) }))}
                                                title="Diminuir Pessoas"
                                                className="w-10 h-10 flex items-center justify-center font-bold text-[#d9a65a] hover:bg-[#d9a65a]/10 rounded"
                                            >
                                                -
                                            </button>
                                            <span className="flex-1 text-center font-bold text-[#3b2f2f]">{details.tablePeople}</span>
                                            <button
                                                onClick={() => setDetails(prev => ({ ...prev, tablePeople: prev.tablePeople + 1 }))}
                                                title="Aumentar Pessoas"
                                                className="w-10 h-10 flex items-center justify-center font-bold text-[#d9a65a] hover:bg-[#d9a65a]/10 rounded"
                                            >
                                                +
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}

                            <label htmlFor="cart-notes" className="text-sm font-bold text-[#3b2f2f]/80">
                                {details.type === 'dine_in' ? 'Pedido Especial (Opcional)' : 'Notas de Entrega/Preparo'}
                            </label>
                            <div className="relative">
                                <MessageCircle className="absolute left-3 top-3 text-[#d9a65a] w-5 h-5" />
                                <textarea
                                    id="cart-notes"
                                    title="Notas Adicionais"
                                    value={details.notes}
                                    onChange={(e) => setDetails({ ...details, notes: e.target.value })}
                                    className="w-full pl-10 p-3 rounded-lg border border-[#d9a65a]/30 focus:border-[#d9a65a] outline-none bg-white h-20 resize-none"
                                    placeholder={
                                        details.type === 'dine_in'
                                            ? "Ex: Mesa no canto, precisamos de cadeirinha de bebé..."
                                            : details.type === 'pickup'
                                                ? "Ex: Passo às 17h para levantar..."
                                                : "Ex: Perto da Escola X, portão azul..."
                                    }
                                />
                            </div>

                            {hasChanges && localStorage.getItem('pc_user_data') && (
                                <div className="p-4 bg-[#f7f1eb] rounded-2xl border border-[#d9a65a]/20 space-y-3">
                                    <div className="flex items-center gap-3">
                                        <CheckCircle className="w-5 h-5 text-[#d9a65a]" />
                                        <p className="text-xs font-bold text-[#3b2f2f]">Detectamos alterações nos seus dados.</p>
                                    </div>
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={saveToProfile}
                                            onChange={(e) => setSaveToProfile(e.target.checked)}
                                            className="w-4 h-4 rounded text-[#d9a65a] focus:ring-[#d9a65a]"
                                        />
                                        <span className="text-xs text-gray-600">Actualizar dados no meu perfil permanentemente?</span>
                                    </label>
                                </div>
                            )}

                            {error && (
                                <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm font-bold border border-red-200 animate-shake">
                                    {error}
                                </div>
                            )}

                            {(!user && !manualUserPhone) && (
                                <div className="p-4 bg-red-50 rounded-2xl border border-red-200 space-y-3 mt-4 animate-fade-in">
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={createAccount}
                                            onChange={(e) => setCreateAccount(e.target.checked)}
                                            className="w-4 h-4 rounded text-red-600 focus:ring-red-500"
                                        />
                                        <span className="text-sm font-bold text-red-700">Criar uma conta rapidamente com estes dados</span>
                                    </label>
                                    
                                    {createAccount && (
                                        <div className="space-y-2 mt-2 pl-6">
                                            <label className="text-xs font-bold text-red-700">Senha para a nova conta (mín. 6 caretéres)</label>
                                            <div className="relative">
                                                <Lock className="absolute left-3 top-3 text-red-400 w-4 h-4" />
                                                <input
                                                    type="password"
                                                    value={checkoutPassword}
                                                    onChange={(e) => setCheckoutPassword(e.target.value)}
                                                    className="w-full pl-9 p-2 rounded-lg border border-red-200 focus:border-red-400 outline-none bg-white text-sm"
                                                    placeholder="Sua senha secreta"
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            <button
                                onClick={handleNextStep}
                                disabled={isCreatingAccount}
                                title={t.checkout.continue}
                                className="w-full bg-[#3b2f2f] text-[#d9a65a] py-4 rounded-xl font-bold uppercase tracking-widest hover:bg-[#d9a65a] hover:text-[#3b2f2f] transition-all shadow-lg mt-4 disabled:opacity-50 flex justify-center items-center gap-2"
                            >
                                {isCreatingAccount ? <Loader className="w-5 h-5 animate-spin" /> : t.checkout.continue}
                            </button>
                        </div>
                    </div>
                );



            case 'payment':
                return (
                    <div className="p-6 space-y-6 overflow-y-auto h-full">
                        <div className="space-y-4">
                            <h3 className="font-serif text-2xl text-[#3b2f2f]">{t.checkout.payment}</h3>

                            {/* Summary Card */}
                            <div className="bg-[#f7f1eb] p-4 rounded-xl border border-[#d9a65a]/20 space-y-2">
                                <div className="flex justify-between text-sm">
                                    <span>{t.cart.subtotal}:</span>
                                    <span className="font-bold">{total} MT</span>
                                </div>
                                {deliveryFee > 0 && (
                                    <div className="flex justify-between text-sm text-blue-600">
                                        <span>Taxa de Entrega:</span>
                                        <span className="font-bold">+{deliveryFee} MT</span>
                                    </div>
                                )}
                                {packagingFee > 0 && (
                                    <div className="flex justify-between text-sm text-orange-600">
                                        <span>Taxa de Embalagem:</span>
                                        <span className="font-bold">+{packagingFee} MT</span>
                                    </div>
                                )}
                                <div className="flex justify-between text-xl font-bold text-[#3b2f2f] pt-2 border-t">
                                    <span>{t.cart.total}:</span>
                                    <span>{finalTotal} MT</span>
                                </div>

                                {hasSpecialItems && (
                                    <div className="flex items-center gap-3 pt-2 border-t border-dashed border-[#d9a65a]">
                                        <input
                                            type="checkbox"
                                            id="special-order-deposit"
                                            checked={payDeposit}
                                            onChange={(e) => setPayDeposit(e.target.checked)}
                                            className="w-5 h-5 accent-[#d9a65a]"
                                        />
                                        <label htmlFor="special-order-deposit" className="text-sm font-bold leading-tight">
                                            Encomenda Especial? <br />
                                            <span className="text-xs font-normal text-gray-600">Pagar apenas 50% de sinal agora.</span>
                                        </label>
                                    </div>
                                )}

                                <div className="flex justify-between text-lg font-bold text-[#d9a65a] pt-2 border-t border-[#d9a65a]">
                                    <span>A Pagar Agora:</span>
                                    <span>{amountToPay} MT</span>
                                </div>
                                {remainingBalance > 0 && (
                                    <div className="flex justify-between text-sm text-gray-500">
                                        <span>Restante (na entrega):</span>
                                        <span>{remainingBalance} MT</span>
                                    </div>
                                )}
                            </div>


                            <div className="bg-[#fffbf5] border border-[#d9a65a]/30 p-4 rounded-xl space-y-2 shadow-sm relative overflow-hidden">
                                <div className="absolute top-0 left-0 w-2 h-full bg-[#d9a65a]"></div>
                                <div className="flex gap-3 items-start pl-2">
                                    <Lock className="w-6 h-6 text-[#d9a65a] shrink-0 mt-0.5" />
                                    <div>
                                        <p className="font-bold text-[#3b2f2f] text-sm">Pagamento Seguro (Cartões e Mobile)</p>
                                        <p className="text-sm text-gray-600 mt-1 leading-relaxed">
                                            Ao clicar em <b>{language === 'en' ? 'Pay Now' : 'Pagar Agora'}</b>, abrirá de forma segura o portal oficial da PaySuite onde poderá escolher como prefere pagar (Cartão Visa/Mastercard, M-Pesa, E-Mola ou mKesh).
                                        </p>
                                        <p className="mt-2 text-xs font-bold text-red-500 opacity-90 flex items-center gap-1">
                                            <Clock className="w-3 h-3" />
                                            O nosso sistema terá apenas 2 minutos de espera.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {error && <p className="text-red-500 text-sm font-bold animate-shake">{error}</p>}

                        <div className="pt-2">
                            <button
                                onClick={handlePayment}
                                disabled={isInitiating}
                                title="Pagar Agora"
                                className={`w-full bg-[#3b2f2f] text-[#d9a65a] py-4 rounded-xl font-bold uppercase tracking-widest transition-all shadow-lg flex items-center justify-center gap-2 ${isInitiating ? 'opacity-70 cursor-not-allowed' : 'hover:bg-[#d9a65a] hover:text-[#3b2f2f]'}`}
                            >
                                {isInitiating ? (
                                    <>
                                        <Loader className="w-5 h-5 animate-spin" />
                                        <span>{language === 'en' ? 'Initializing...' : 'A iniciar...'}</span>
                                    </>
                                ) : (
                                    <>
                                        <span>{language === 'en' ? 'Pay Now' : 'Pagar Agora'}</span>
                                        <Lock className="w-5 h-5" />
                                    </>
                                )}
                            </button>
                            
                            <button
                                onClick={() => setStep('details')}
                                title="Voltar aos Dados"
                                className="w-full text-gray-500 font-bold hover:text-[#3b2f2f] py-3 mt-2"
                            >
                                Voltar
                            </button>
                        </div>
                    </div >

                );

            case 'processing':
                return (
                    <div className="flex flex-col items-center justify-center h-full p-8 text-center space-y-6">
                        <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                        >
                            <Loader className="w-16 h-16 text-[#d9a65a]" />
                        </motion.div>
                        <div>
                            <h3 className="text-xl font-bold text-[#3b2f2f] mb-2">{language === 'en' ? 'Processing secure payment...' : 'A processar pagamento seguro...'}</h3>
                            <p className="text-[#3b2f2f]/80">{language === 'en' ? 'You will be redirected to the secure payment environment.' : 'Você será redirecionado para o ambiente seguro de pagamento.'}</p>
                            <div className="mt-4 bg-white p-4 rounded-lg border border-gray-200 text-left text-sm space-y-2">
                                <p className="font-bold flex items-center gap-2"><Lock className="w-4 h-4 text-green-600" /> {language === 'en' ? 'Step-by-step:' : 'Passo a Passo:'}</p>
                                <ol className="list-decimal pl-5 space-y-1 text-gray-600">
                                    <li>{language === 'en' ? 'Complete payment in the secure window (M-Pesa, E-Mola, or Cards).' : 'Complete o pagamento na janela segura aberta (M-Pesa, E-Mola ou Cartões).'}</li>
                                    <li>{language === 'en' ? 'Wait for automatic confirmation here.' : 'Aguarde a confirmação automática aqui no site.'}</li>
                                </ol>
                            </div>
                        </div>

                        <button
                            onClick={() => {
                                setStep('payment');
                                setCurrentTxId(undefined);
                                setPaymentUrl(null);
                            }}
                            title="Cancelar"
                            className="bg-gray-100 text-gray-500 py-3 px-8 rounded-xl font-bold hover:bg-gray-200 transition-all flex items-center gap-2 border border-gray-300"
                        >
                            <X className="w-4 h-4" />
                            {language === 'pt' ? 'Cancelar e Tentar Novamente' : 'Cancel and Try Again'}
                        </button>
                    </div>
                );

            case 'receipt':
                return (
                    <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-4">
                        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center">
                            <CheckCircle className="w-10 h-10 text-green-600" />
                        </div>
                        <h3 className="text-2xl font-bold text-[#3b2f2f] font-serif">Tudo Pronto!</h3>
                        <p className="text-[#3b2f2f]/80">Sua encomenda foi confirmada e já vamos começar a preparar tudo.</p>
                        <button
                            onClick={() => {
                                clearCart();
                                setIsOpen(false);
                                setStep('cart');
                            }}
                            title="Fechar Carrinho"
                            className="text-[#d9a65a] underline"
                        >
                            Fechar Carrinho
                        </button>
                    </div>
                );
        }
    };

    return (
        <>
            {/* Floating Button */}
            <button
                onClick={() => setIsOpen(true)}
                title="Ver Carrinho"
                className="fixed bottom-6 right-6 z-50 bg-[#d9a65a] text-[#3b2f2f] p-4 rounded-full shadow-2xl hover:scale-110 transition-transform flex items-center justify-center border-4 border-[#fff]"
            >
                <ShoppingCart className="w-6 h-6" />
                {totalItems > 0 && (
                    <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center border-2 border-[#f7f1eb]">
                        {totalItems}
                    </span>
                )}
            </button>

            {/* Cart Drawer/Modal */}
            <AnimatePresence>
                {isOpen && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsOpen(false)}
                            className="fixed inset-0 bg-black/60 z-[60] backdrop-blur-sm"
                        />
                        <motion.div
                            initial={{ x: '100%' }}
                            animate={{ x: 0 }}
                            exit={{ x: '100%' }}
                            className="fixed top-0 right-0 h-full w-full max-w-md bg-[#f7f1eb] z-[70] shadow-2xl flex flex-col border-l border-[#d9a65a]/20"
                        >
                            <div className="p-6 bg-[#3b2f2f] text-[#f7f1eb] flex justify-between items-center shadow-md shrink-0">
                                <div className="flex items-center gap-3">
                                    {(step === 'details' || step === 'payment') && (
                                        <button
                                            onClick={() => setStep(step === 'payment' ? 'details' : 'cart')}
                                            title="Voltar"
                                            aria-label="Voltar"
                                            className="mr-2 hover:text-[#d9a65a]"
                                        >
                                            <ArrowLeft className="w-5 h-5" />
                                        </button>
                                    )}
                                    <ShoppingCart className="w-6 h-6 text-[#d9a65a]" />
                                    <h2 className="text-xl font-serif">
                                        {step === 'cart' ? 'Carrinho' : step === 'details' ? 'Dados' : step === 'payment' ? 'Pagamento' : 'Status'}
                                    </h2>
                                </div>
                                <button onClick={() => setIsOpen(false)} title="Fechar Carrinho" className="hover:text-[#d9a65a] transition-colors">
                                    <X className="w-6 h-6" />
                                </button>
                            </div>

                            {renderStepContent()}
                        </motion.div>
                    </>
                )}
            </AnimatePresence>



            {/* Receipt Modal */}
            {
                step === 'receipt' && completedOrder && (
                    <Receipt
                        autoSaveToDrive={true}
                        documentType="Invoice"
                        orderId={completedOrder.orderId}
                        paymentRef={completedOrder.paymentRef}
                        transactionId={completedOrder.transactionId}
                        date={completedOrder.date}
                        details={completedOrder.customer}
                        cart={completedOrder.items}
                        subtotal={completedOrder.subtotal}
                        deliveryFee={completedOrder.deliveryFee}
                        total={completedOrder.total}
                        amountPaid={completedOrder.amountPaid}
                        balance={completedOrder.balance}
                        onClose={() => {
                            clearCart();
                            setIsOpen(false);
                            setStep('cart');
                            setCompletedOrder(null);
                        }}
                    />
                )
            }

                {/* Payment Success Modal */}
                <AnimatePresence>
                    {showSuccessModal && (
                        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="absolute inset-0 bg-[#3b2f2f]/80 backdrop-blur-md"
                                onClick={() => setShowSuccessModal(false)}
                            />
                            <motion.div
                                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                                className="bg-white rounded-[2.5rem] p-8 md:p-12 max-w-md w-full relative z-10 shadow-2xl border border-[#d9a65a]/20 text-center"
                            >
                                <div className="w-24 h-24 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-8 relative">
                                    <motion.div
                                        initial={{ scale: 0 }}
                                        animate={{ scale: 1 }}
                                        transition={{ delay: 0.2, type: 'spring' }}
                                    >
                                        <CheckCircle className="w-16 h-16 text-green-500" />
                                    </motion.div>
                                    <motion.div
                                        animate={{ scale: [1, 1.2, 1] }}
                                        transition={{ repeat: Infinity, duration: 2 }}
                                        className="absolute inset-0 bg-green-500/10 rounded-full"
                                    />
                                </div>

                                <h2 className="font-serif text-3xl text-[#3b2f2f] mb-2">
                                    {language === 'en' ? 'Payment Successful!' : 'Pagamento Confirmado!'}
                                </h2>
                                <p className="text-gray-500 mb-8 font-medium">
                                    {language === 'en' 
                                        ? 'Your order is being prepared with love.' 
                                        : 'A sua encomenda está a ser preparada com todo o carinho.'}
                                </p>

                                <div className="bg-[#f7f1eb] p-6 rounded-3xl mb-8">
                                    <p className="text-[#3b2f2f]/60 text-xs font-bold uppercase tracking-widest mb-1">
                                        {language === 'en' ? 'Order Number' : 'Número do Pedido'}
                                    </p>
                                    <p className="text-3xl font-black text-[#d9a65a] tracking-tighter">
                                        #{completedOrder?.orderId || currentOrderId}
                                    </p>
                                </div>

                                <div className="space-y-3">
                                    <button
                                        onClick={() => {
                                            setShowSuccessModal(false);
                                            setIsOpen(false);
                                            window.location.href = '/dashboard';
                                        }}
                                        className="w-full bg-[#3b2f2f] text-[#d9a65a] py-4 rounded-2xl font-bold uppercase tracking-widest hover:bg-[#d9a65a] hover:text-[#3b2f2f] transition-all flex items-center justify-center gap-3 group shadow-lg"
                                    >
                                        <Clock className="w-5 h-5 group-hover:rotate-12 transition-transform" />
                                        {language === 'en' ? 'Track Order' : 'Acompanhar Pedido'}
                                    </button>
                                    <button
                                        onClick={() => setShowSuccessModal(false)}
                                        className="w-full py-4 text-gray-500 font-bold hover:text-[#3b2f2f] transition-colors"
                                    >
                                        {language === 'en' ? 'Close' : 'Fechar'}
                                    </button>
                                </div>
                            </motion.div>
                        </div>
                    )}
                </AnimatePresence>

            <ClientLoginModal
                isOpen={isLoginModalOpen}
                onClose={() => setIsLoginModalOpen(false)}
                language={language}
                isCheckoutFlow={true}
            />

        </>
    );
};
