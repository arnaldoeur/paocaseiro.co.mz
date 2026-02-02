import React, { useState, useEffect } from 'react';
import { useCart } from '../context/CartContext';
import { ShoppingCart, ShoppingBag, X, Trash2, MessageCircle, MapPin, Phone, User, CreditCard, Banknote, CheckCircle, ArrowLeft, Loader, Store, ArrowRight, AlertTriangle, Clock, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { initiatePayment, verifyPayment } from '../services/paySuite';
import { LocationPicker } from './LocationPicker';
import { Receipt } from './Receipt';
import { AddressAutocomplete } from './AddressAutocomplete'; // Import the new component
import { translations, Language } from '../translations';
import { notifyTeam, notifyCustomer } from '../services/sms';
import { saveOrderToSupabase } from '../services/supabase';

type CheckoutStep = 'cart' | 'details' | 'payment' | 'processing' | 'receipt';
type OrderType = 'delivery' | 'pickup' | 'dine_in';
type PaymentMethod = 'mpesa' | 'emola' | 'mkesh' | 'cash';

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

    // Form State
    const [details, setDetails] = useState({
        name: '',
        phone: '',
        address: '',
        notes: '', // New Field
        tableZone: 'Sala Interior', // New Field for Dine-in
        tablePeople: 1, // New Field for Dine-in
        type: 'delivery' as OrderType
    });
    const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('mpesa');
    const [paymentPhone, setPaymentPhone] = useState('');
    const [error, setError] = useState('');

    // Delivery & Fees
    const [deliveryLocation, setDeliveryLocation] = useState<{ lat: number; lng: number; confirmed: boolean } | null>(null);
    const [deliveryFee, setDeliveryFee] = useState(0);
    const [distance, setDistance] = useState(0);
    const [paymentUrl, setPaymentUrl] = useState<string | null>(null); // State for Iframe URL
    const [overridePosition, setOverridePosition] = useState<{ lat: number; lng: number } | null>(null); // To move map

    // Deposit Logic
    const hasSpecialItems = cart.some(item => item.isSpecial);
    const [payDeposit, setPayDeposit] = useState(false);

    // Order Metadata for Receipt
    const [completedOrder, setCompletedOrder] = useState<any>(null);

    // Load saved details on mount
    useEffect(() => {
        const saved = localStorage.getItem('checkout_details');
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                setDetails(prev => ({ ...prev, ...parsed }));
            } catch (e) { console.error("Error loading saved details", e); }
        }
    }, []);

    // Save details on change
    useEffect(() => {
        if (details.name || details.phone) {
            localStorage.setItem('checkout_details', JSON.stringify({
                name: details.name,
                phone: details.phone,
                address: details.address,
                notes: details.notes,
                type: details.type
            }));
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

            if (status === 'success' || status === 'approved' || !status) {
                // Clean URL
                window.history.replaceState({}, document.title, window.location.pathname);
                finishOrder();
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
    const finalTotal = total + (deliveryFee > 0 ? deliveryFee : 0);
    const amountToPay = payDeposit ? finalTotal / 2 : finalTotal;
    const remainingBalance = finalTotal - amountToPay;

    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);

    const handleNextStep = () => {
        if (step === 'cart') {
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
            if (!details.name || !details.phone) {
                setError('Por favor preencha todos os campos.');
                return;
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
        // Generate consistent IDs
        const timestamp = Date.now();
        const shortId = `PC-${timestamp.toString().slice(-4)}`; // Short ID for User (e.g. PC-1234)
        const refId = `ORD${timestamp}`; // Long ID for System/PaySuite (e.g. ORD176...)

        setCurrentPaymentRef(refId);
        setCurrentOrderId(shortId);

        if (paymentMethod === 'cash') {
            if (details.type === 'dine_in') {
                // Pass IDs directly to finishOrder for cash (Dine-in no deposit needed usually, or handle as full cash)
                finishOrder(shortId, refId);
                return;
            } else {
                // Delivery/Pickup: Require 30% Deposit
                // We must initiate an electronic payment for the deposit amount.
                const depositAmount = finalTotal * 0.30;

                // We default to M-Pesa if they selected Cash but need to pay online.
                // Or we can assume they want to use the 'paymentPhone' they entered?
                // The UI for "Numerário" should ask for the Deposit Phone Number.
                // We will treat this as a "Deposit Payment".

                const depositRef = `${refId}-DEP`;

                setStep('processing');
                setError('');

                // Use default 'mpesa' for deposit if not set (or could prompt user, but simpler to default)
                // Actually, if 'cash' is selected, 'paymentMethod' is 'cash'. 
                // We need to send 'mpesa' (or 'emola'?) to initiatePayment.
                // Let's assume M-Pesa for simplicity or try to detect from prefix.
                let depositMethod: 'mpesa' | 'emola' | 'mkesh' = 'mpesa';
                const prefix = details.phone?.replace(/\D/g, '').substring(0, 2); // Use contact phone or payment phone?
                // For deposit, we should use the Payment Phone input we show in the Cash section.
                // But in the UI currently, we might not show Payment Phone if Cash is selected.
                // We WILL update the UI to show it.

                if (paymentPhone) {
                    const p = paymentPhone.replace(/\D/g, '').substring(0, 2);
                    if (PREFIXES.emola.includes(p)) depositMethod = 'emola';
                    if (PREFIXES.mkesh.includes(p)) depositMethod = 'mkesh';
                }

                try {
                    const result = await initiatePayment({
                        amount: depositAmount,
                        msisdn: paymentPhone || details.phone, // fallback to contact phone
                        method: depositMethod,
                        reference: depositRef
                    });

                    if (result.success && result.checkout_url) {
                        window.location.href = result.checkout_url;
                        setCurrentTxId(result.transaction_id);
                        // Note: Poll check matches logic steps
                    } else {
                        setStep('payment');
                        setError(result.message || 'Falha ao iniciar pagamento do sinal.');
                    }
                } catch (e) {
                    setStep('payment');
                    setError('Erro de conexão.');
                }
                return;
            }
        }

        setStep('processing');
        setError('');

        const result = await initiatePayment({
            amount: amountToPay,
            msisdn: paymentMethod === 'cash' ? details.phone : paymentPhone,
            method: paymentMethod as any,
            reference: refId // Use consistent Ref
        });

        if (result.success && result.checkout_url) {
            // Redirect to PaySuite instead of Iframe to avoid CSRF/Cookie issues
            window.location.href = result.checkout_url;
            setCurrentTxId(result.transaction_id);
        } else {
            setStep('payment');
            setError(result.message || 'Falha no pagamento. Tente novamente.');
        }
    };


    // Polling Effect
    useEffect(() => {
        let interval: any;
        if ((step === 'processing' || paymentUrl) && currentTxId) {
            let attempts = 0;
            interval = setInterval(async () => {
                attempts++;
                if (attempts > 30) { // 2.5 minutes timeout
                    clearInterval(interval);
                    setError('Tempo de espera excedido. Verifique se recebeu a mensagem no telemóvel.');
                    return;
                }

                try {
                    const status = await verifyPayment(currentTxId);
                    if (status.success) {
                        clearInterval(interval);
                        finishOrder();
                    } else if (status.status === 'failed') {
                        clearInterval(interval);
                        setError('Pagamento falhou ou foi cancelado.');
                        setPaymentUrl(null);
                        setStep('payment');
                    }
                } catch (e) {
                    console.error("Polling error", e);
                }
            }, 5000); // Check every 5s
        }
        return () => clearInterval(interval);
    }, [step, paymentUrl, currentTxId]);

    const finishOrder = (manualOrderId?: string, manualRef?: string) => {
        // Use manual IDs if provided (Cash case), otherwise use state (PaySuite case)
        const orderId = manualOrderId || currentOrderId || `PC-${Date.now().toString().slice(-4)}`;
        const refId = manualRef || currentPaymentRef || `ORD${Date.now()}`;

        const newOrder = {
            orderId: orderId, // Short ID
            paymentRef: refId, // Long ID
            transactionId: currentTxId,
            date: new Date().toLocaleString(),
            amountPaid: amountToPay,
            balance: remainingBalance,
            items: cart, // Save items for Admin
            customer: details, // Save customer details
            status: 'pending', // Initial status
            total: finalTotal
        };



        setCompletedOrder(newOrder);
        setStep('receipt');
        setPaymentUrl(null);
        clearCart(); // clear cart after successful order

        // Notify Team & Customer
        notifyTeam(newOrder, 'new_order').catch(err => console.error("Team notification failed", err));
        notifyCustomer(newOrder, 'order_confirmed').catch(err => console.error("Customer notification failed", err));


        // Save to Supabase
        const supabaseOrder = {
            short_id: orderId,
            payment_ref: refId,
            transaction_id: currentTxId,
            customer_phone: details.phone,
            customer_name: details.name,
            delivery_type: details.type,
            delivery_address: details.address,
            delivery_coordinates: deliveryLocation ? `(${deliveryLocation.lat},${deliveryLocation.lng})` : null,
            table_zone: details.tableZone,
            table_people: details.tablePeople,
            notes: details.notes,
            total_amount: finalTotal,
            amount_paid: amountToPay,
            balance: remainingBalance,
            status: 'pending'
        };

        const supabaseItems = cart.map(item => ({
            name: item.name,
            quantity: item.quantity,
            price: item.price
        }));

        saveOrderToSupabase(supabaseOrder, supabaseItems)
            .then(res => {
                if (!res.success) console.error("Database save failed", res.error);
            })
            .catch(err => console.error("Database save exception", err));
    };

    const renderStepContent = () => {
        switch (step) {
            case 'cart':
                return (
                    <>
                        <div className="flex-1 overflow-y-auto p-6 space-y-4">
                            {cart.length === 0 ? (
                                <div className="text-center opacity-50 flex flex-col items-center justify-center h-full">
                                    <ShoppingCart className="w-16 h-16 mb-4 opacity-20" />
                                    <p className="text-lg">{t.cart.empty}</p>
                                </div>
                            ) : (
                                cart.map((item) => (
                                    <div key={item.name} className="bg-white p-3 rounded-xl shadow-sm border border-[#d9a65a]/20 flex gap-4 items-center">
                                        {/* Image Thumbnail */}
                                        <div className="w-16 h-16 bg-gray-100 rounded-lg shrink-0 overflow-hidden">
                                            {item.image ? (
                                                <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-xs text-gray-400 font-bold">IMG</div>
                                            )}
                                        </div>

                                        <div className="flex-1 min-w-0">
                                            <h3 className="font-bold text-[#3b2f2f] truncate">{(language === 'en' && item.name_en) ? item.name_en : item.name}</h3>
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
                                ))
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
                                        <span>Subtotal</span>
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
                                <label className="text-sm font-bold text-[#3b2f2f]/80">{t.checkout.phone}</label>
                                <div className="relative">
                                    <Phone className="absolute left-3 top-3 text-[#d9a65a] w-5 h-5" />
                                    <input
                                        type="tel"
                                        value={details.phone}
                                        onChange={(e) => setDetails({ ...details, phone: e.target.value })}
                                        className="w-full pl-10 p-3 rounded-lg border border-[#d9a65a]/30 focus:border-[#d9a65a] outline-none bg-white"
                                        placeholder="84/85..."
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-bold text-[#3b2f2f]/80">{t.checkout.orderType}</label>
                                <div className="grid grid-cols-3 gap-2">
                                    <button
                                        onClick={() => setDetails({ ...details, type: 'delivery' })}
                                        className={`flex flex-col items-center gap-1 p-3 rounded-lg text-xs font-bold transition-all border ${details.type === 'delivery' ? 'bg-[#d9a65a] text-[#3b2f2f] border-[#d9a65a]' : 'bg-white border-gray-200'}`}
                                    >
                                        <MapPin className="w-5 h-5" /> {t.checkout.delivery}
                                    </button>
                                    <button
                                        onClick={() => setDetails({ ...details, type: 'pickup' })}
                                        className={`flex flex-col items-center gap-1 p-3 rounded-lg text-xs font-bold transition-all border ${details.type === 'pickup' ? 'bg-[#d9a65a] text-[#3b2f2f] border-[#d9a65a]' : 'bg-white border-gray-200'}`}
                                    >
                                        <ShoppingBag className="w-5 h-5" /> {t.checkout.pickup}
                                    </button>
                                    <button
                                        onClick={() => setDetails({ ...details, type: 'dine_in' })}
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
                                        <label className="text-sm font-bold text-[#3b2f2f]/80">{t.checkout.address}</label>
                                        {/* Using Autocomplete */}
                                        <AddressAutocomplete
                                            value={details.address}
                                            onChange={(val) => setDetails({ ...details, address: val })}
                                            onSelect={(result) => {
                                                // When result selected, set address and override map position
                                                setDetails({ ...details, address: result.label });
                                                setOverridePosition({ lat: result.y, lng: result.x });
                                            }}
                                        />
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
                                        <div className="text-xs text-gray-500 text-center">
                                            Distância da Padaria: <span className="font-bold">{distance.toFixed(2)} km</span>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Dine-In Specific Fields */}
                            {details.type === 'dine_in' && (
                                <div className="grid grid-cols-2 gap-3 animate-fade-in">
                                    <div className="space-y-2">
                                        <label className="text-sm font-bold text-[#3b2f2f]/80">Zona</label>
                                        <select
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
                                                className="w-10 h-10 flex items-center justify-center font-bold text-[#d9a65a] hover:bg-[#d9a65a]/10 rounded"
                                            >
                                                -
                                            </button>
                                            <span className="flex-1 text-center font-bold text-[#3b2f2f]">{details.tablePeople}</span>
                                            <button
                                                onClick={() => setDetails(prev => ({ ...prev, tablePeople: prev.tablePeople + 1 }))}
                                                className="w-10 h-10 flex items-center justify-center font-bold text-[#d9a65a] hover:bg-[#d9a65a]/10 rounded"
                                            >
                                                +
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div className="space-y-2">
                                <label className="text-sm font-bold text-[#3b2f2f]/80">
                                    {details.type === 'dine_in' ? 'Pedido Especial (Opcional)' : 'Notas de Entrega/Preparo'}
                                </label>
                                <div className="relative">
                                    <MessageCircle className="absolute left-3 top-3 text-[#d9a65a] w-5 h-5" />
                                    <textarea
                                        value={details.notes}
                                        onChange={(e) => setDetails({ ...details, notes: e.target.value })}
                                        className="w-full pl-10 p-3 rounded-lg border border-[#d9a65a]/30 focus:border-[#d9a65a] outline-none bg-white h-20 resize-none"
                                        placeholder={
                                            details.type === 'dine_in'
                                                ? "Ex: Mesa no canto, precisamos de cadeirinha de bebé... Faremos o possível para a melhor experiência!"
                                                : details.type === 'pickup'
                                                    ? "Ex: Passo às 17h para levantar. Gosto bem tostado! (Deixaremos pronto com carinho)"
                                                    : "Ex: Perto da Escola X, portão azul. Por favor, liguem quando estiverem a chegar para receber quentinho!"
                                        }
                                    />
                                </div>

                                {error && (
                                    <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm font-bold border border-red-200 animate-shake">
                                        {error}
                                    </div>
                                )}

                                <button
                                    onClick={handleNextStep}
                                    className="w-full bg-[#3b2f2f] text-[#d9a65a] py-4 rounded-xl font-bold uppercase tracking-widest hover:bg-[#d9a65a] hover:text-[#3b2f2f] transition-all shadow-lg mt-4"
                                >
                                    {t.checkout.continue}
                                </button>
                            </div>
                        </div>
                    </div >
                );

            case 'summary_confirmation':
                return (
                    <div className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
                        <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-scale-in">
                            <div className="p-4 bg-[#f7f1eb] border-b border-[#d9a65a]/20 flex justify-between items-center">
                                <h3 className="font-serif text-xl font-bold text-[#3b2f2f]">{t.checkout.title}</h3>
                                <button onClick={() => setStep('payment')} className="text-gray-500 hover:text-red-500">
                                    <X className="w-6 h-6" />
                                </button>
                            </div>

                            <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
                                <div className="space-y-2">
                                    <p className="text-sm text-gray-500 uppercase tracking-widest font-bold">Resumo</p>
                                    <div className="bg-gray-50 p-3 rounded-lg text-sm space-y-1">
                                        <div className="flex justify-between">
                                            <span>Itens ({cart.length}):</span>
                                            <span className="font-bold">{total} MT</span>
                                        </div>
                                        {deliveryFee > 0 && (
                                            <div className="flex justify-between text-blue-600">
                                                <span>Taxa de Entrega:</span>
                                                <span>+{deliveryFee} MT</span>
                                            </div>
                                        )}
                                        <div className="flex justify-between text-lg font-bold text-[#3b2f2f] pt-2 border-t">
                                            <span>Total Final:</span>
                                            <span>{finalTotal} MT</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <p className="text-sm text-gray-500 uppercase tracking-widest font-bold">Seus Dados</p>
                                    <div className="bg-gray-50 p-3 rounded-lg text-sm space-y-1">
                                        <p><span className="font-bold">Nome:</span> {details.name}</p>
                                        <p><span className="font-bold">Telefone:</span> {details.phone}</p>
                                        <p><span className="font-bold">Tipo:</span> {details.type === 'delivery' ? 'Entrega' : details.type === 'pickup' ? 'Levantamento' : 'Mesa'}</p>
                                        {details.type === 'delivery' && details.address && (
                                            <p><span className="font-bold">Endereço:</span> {details.address}</p>
                                        )}
                                        {details.type === 'dine_in' && (
                                            <>
                                                <p><span className="font-bold">Mesa:</span> {details.tableZone}</p>
                                                <p><span className="font-bold">Pessoas:</span> {details.tablePeople}</p>
                                            </>
                                        )}
                                        {details.notes && <p className="italic text-gray-600 mt-2"><span className="font-bold not-italic text-[#3b2f2f]">Nota:</span> "{details.notes}"</p>}
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <p className="text-sm text-gray-500 uppercase tracking-widest font-bold">Pagamento</p>

                                    {/* Prefix Mismatch Warning */}
                                    {/* Prefix Mismatch Warning */}
                                    {(() => {
                                        // Clean phone number for validation
                                        let cleanPhone = paymentPhone.replace(/\D/g, '');
                                        if (cleanPhone.startsWith('258') && cleanPhone.length > 3) {
                                            cleanPhone = cleanPhone.substring(3);
                                        }

                                        const prefix = cleanPhone.substring(0, 2);
                                        let methodMatch = true;
                                        if (paymentMethod === 'mpesa' && !PREFIXES.mpesa.includes(prefix)) methodMatch = false;
                                        if (paymentMethod === 'emola' && !PREFIXES.emola.includes(prefix)) methodMatch = false;
                                        if (paymentMethod === 'mkesh' && !PREFIXES.mkesh.includes(prefix)) methodMatch = false;

                                        if (!methodMatch && paymentMethod !== 'cash' && cleanPhone.length >= 2) return (
                                            <div className="bg-orange-50 border border-orange-200 p-3 rounded-lg flex gap-3 items-start animate-pulse">
                                                <AlertTriangle className="w-5 h-5 text-orange-500 shrink-0" />
                                                <div className="text-xs text-orange-700">
                                                    <p className="font-bold">Atenção!</p>
                                                    <p>O número <b>{paymentPhone}</b> parece não ser de <b>{paymentMethod === 'mpesa' ? 'M-Pesa' : paymentMethod === 'emola' ? 'E-Mola' : 'mKesh'}</b>.</p>
                                                    <p className="mt-1">Por favor verifique para evitar falha no pagamento.</p>
                                                </div>
                                            </div>
                                        );
                                        return null;
                                    })()}

                                    <div className="bg-[#fffbf5] border border-[#d9a65a]/30 p-3 rounded-lg text-sm flex items-center gap-3">
                                        <div className="w-10 h-10 bg-white rounded-lg border p-1 flex items-center justify-center">
                                            {paymentMethod === 'mpesa' && <img src="/images/payments/mpesa.png" className="w-full h-full object-contain" />}
                                            {paymentMethod === 'emola' && <img src="/images/payments/emola.png" className="w-full h-full object-contain" />}
                                            {paymentMethod === 'mkesh' && <img src="/images/payments/mkesh.png" className="w-full h-full object-contain" />}
                                            {paymentMethod === 'cash' && <Banknote className="w-6 h-6 text-green-600" />}
                                        </div>
                                        <div>
                                            <p className="font-bold text-[#3b2f2f]">
                                                {paymentMethod === 'mpesa' ? 'M-Pesa' : paymentMethod === 'emola' ? 'E-Mola' : paymentMethod === 'mkesh' ? 'mKesh' : 'Numerário'}
                                            </p>
                                            {paymentMethod !== 'cash' && <p className="text-xs text-gray-600">Conta: {paymentPhone}</p>}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="p-4 bg-white border-t space-y-3">
                                <button
                                    onClick={handlePayment}
                                    className="w-full bg-[#3b2f2f] text-[#d9a65a] py-3 rounded-xl font-bold uppercase tracking-widest hover:bg-[#d9a65a] hover:text-[#3b2f2f] transition-all shadow-lg flex items-center justify-center gap-2"
                                >
                                    <span>{t.checkout.pay_now}</span>
                                    <ArrowRight className="w-5 h-5" />
                                </button>
                                <button
                                    onClick={() => setStep('payment')}
                                    className="w-full text-gray-500 font-bold hover:text-[#3b2f2f] py-2"
                                >
                                    {t.checkout.back}
                                </button>
                            </div>
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
                                <div className="flex justify-between text-xl font-bold text-[#3b2f2f] pt-2 border-t">
                                    <span>{t.cart.total}:</span>
                                    <span>{finalTotal} MT</span>
                                </div>

                                {hasSpecialItems && (
                                    <div className="flex items-center gap-3 pt-2 border-t border-dashed border-[#d9a65a]">
                                        <input
                                            type="checkbox"
                                            checked={payDeposit}
                                            onChange={(e) => setPayDeposit(e.target.checked)}
                                            className="w-5 h-5 accent-[#d9a65a]"
                                        />
                                        <label className="text-sm font-bold leading-tight">
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


                            <div className="space-y-3">
                                <label className="text-sm font-bold text-[#3b2f2f]/80">Como prefere pagar?</label>
                                <div className="grid grid-cols-1 gap-3">
                                    <button
                                        onClick={() => setPaymentMethod('mpesa')}
                                        className={`group relative p-4 rounded-xl border-2 transition-all flex items-center gap-4 overflow-hidden ${paymentMethod === 'mpesa' ? 'border-[#d9a65a] bg-[#fffbf5] shadow-md' : 'border-gray-100 bg-white hover:border-[#d9a65a]/50'}`}
                                    >
                                        <div className="w-14 h-14 shrink-0 rounded-lg overflow-hidden border border-gray-100 flex items-center justify-center bg-white p-1">
                                            <img src="/images/payments/mpesa.png" alt="M-Pesa" className="w-full h-full object-contain" />
                                        </div>
                                        <div className="text-left">
                                            <span className="block font-bold text-[#3b2f2f] group-hover:text-[#d9a65a] transition-colors">M-Pesa</span>
                                            <span className="text-xs text-gray-500">Vodacom</span>
                                        </div>
                                        {paymentMethod === 'mpesa' && <div className="absolute right-4"><CheckCircle className="w-6 h-6 text-green-500" /></div>}
                                    </button>

                                    <button
                                        onClick={() => setPaymentMethod('emola')}
                                        className={`group relative p-4 rounded-xl border-2 transition-all flex items-center gap-4 overflow-hidden ${paymentMethod === 'emola' ? 'border-[#d9a65a] bg-[#fffbf5] shadow-md' : 'border-gray-100 bg-white hover:border-[#d9a65a]/50'}`}
                                    >
                                        <div className="w-14 h-14 shrink-0 rounded-lg overflow-hidden border border-gray-100 flex items-center justify-center bg-white p-1">
                                            <img src="/images/payments/emola.png" alt="E-Mola" className="w-full h-full object-contain" />
                                        </div>
                                        <div className="text-left">
                                            <span className="block font-bold text-[#3b2f2f] group-hover:text-[#d9a65a] transition-colors">E-Mola</span>
                                            <span className="text-xs text-gray-500">Movitel</span>
                                        </div>
                                        {paymentMethod === 'emola' && <div className="absolute right-4"><CheckCircle className="w-6 h-6 text-green-500" /></div>}
                                    </button>

                                    <button
                                        onClick={() => setPaymentMethod('mkesh')}
                                        className={`group relative p-4 rounded-xl border-2 transition-all flex items-center gap-4 overflow-hidden ${paymentMethod === 'mkesh' ? 'border-[#d9a65a] bg-[#fffbf5] shadow-md' : 'border-gray-100 bg-white hover:border-[#d9a65a]/50'}`}
                                    >
                                        <div className="w-14 h-14 shrink-0 rounded-lg overflow-hidden border border-gray-100 flex items-center justify-center bg-white p-1">
                                            <img src="/images/payments/mkesh.png" alt="mKesh" className="w-full h-full object-contain" />
                                        </div>
                                        <div className="text-left">
                                            <span className="block font-bold text-[#3b2f2f] group-hover:text-[#d9a65a] transition-colors">mKesh</span>
                                            <span className="text-xs text-gray-500">Tmcel</span>
                                        </div>
                                        {paymentMethod === 'mkesh' && <div className="absolute right-4"><CheckCircle className="w-6 h-6 text-green-500" /></div>}
                                    </button>

                                    <button
                                        onClick={() => setPaymentMethod('cash')}
                                        className={`group relative p-4 rounded-xl border-2 transition-all flex items-center gap-4 overflow-hidden ${paymentMethod === 'cash' ? 'border-[#d9a65a] bg-[#fffbf5] shadow-md' : 'border-gray-100 bg-white hover:border-[#d9a65a]/50'}`}
                                    >
                                        <div className="w-14 h-14 shrink-0 rounded-lg overflow-hidden border border-gray-100 flex items-center justify-center bg-green-50 text-green-600">
                                            <Banknote className="w-8 h-8" />
                                        </div>
                                        <div className="text-left">
                                            <span className="block font-bold text-[#3b2f2f] group-hover:text-[#d9a65a] transition-colors">Numerário (com Sinal)</span>
                                            <span className="text-xs text-gray-500">Pague 30% Agora + Resto na Entrega</span>
                                        </div>
                                        {paymentMethod === 'cash' && <div className="absolute right-4"><CheckCircle className="w-6 h-6 text-green-500" /></div>}
                                    </button>
                                </div>
                            </div>

                        </div>

                        {/* Info for Cash Deposit */}
                        {paymentMethod === 'cash' && (
                            <div className="bg-blue-50 border border-blue-200 p-4 rounded-xl space-y-2 animate-fade-in">
                                <div className="flex gap-3">
                                    <Info className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                                    <div className="text-sm text-blue-800">
                                        <p className="font-bold">Sinal de 30% Obrigatório</p>
                                        <p>Para confirmar sua encomenda, pedimos um sinal de <span className="font-bold">{(finalTotal * 0.30).toFixed(2)} MT</span> via M-Pesa/E-Mola.</p>
                                        <p className="mt-1">O restante ({(finalTotal * 0.70).toFixed(2)} MT) você paga em numerário na entrega.</p>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="space-y-2 animate-fade-in">
                            <label className="text-sm font-bold text-[#3b2f2f]/80">
                                {paymentMethod === 'cash'
                                    ? 'Número para Pagar o Sinal (M-Pesa/E-Mola)'
                                    : `Número para Pagamento (${paymentMethod === 'mpesa' ? 'M-Pesa' : paymentMethod === 'emola' ? 'E-Mola' : 'mKesh'})`
                                }
                            </label>
                            <div className="relative">
                                <Phone className="absolute left-3 top-3 text-[#d9a65a] w-5 h-5" />
                                <input
                                    type="tel"
                                    value={paymentPhone}
                                    onChange={(e) => {
                                        let val = e.target.value.replace(/\D/g, ''); // Digits only

                                        // If starts with 258, strip it to get the actual 9 digit number
                                        if (val.startsWith('258') && val.length > 3) {
                                            val = val.substring(3);
                                        }

                                        setPaymentPhone(val);

                                        // Auto-detect method based on prefix
                                        if (val.length >= 2) {
                                            const prefix = val.substring(0, 2);
                                            if (PREFIXES.mpesa.includes(prefix) && paymentMethod !== 'mpesa') {
                                                setPaymentMethod('mpesa');
                                                setError('')
                                            } else if (PREFIXES.emola.includes(prefix) && paymentMethod !== 'emola') {
                                                setPaymentMethod('emola');
                                                setError('')
                                            } else if (PREFIXES.mkesh.includes(prefix) && paymentMethod !== 'mkesh') {
                                                setPaymentMethod('mkesh');
                                                setError('')
                                            }
                                        }
                                    }}
                                    className="w-full pl-10 p-3 rounded-lg border border-[#d9a65a]/30 focus:border-[#d9a65a] outline-none bg-white"
                                    placeholder={paymentMethod === 'mpesa' ? "84/85..." : paymentMethod === 'emola' ? "86/87..." : "82/83..."}
                                    maxLength={9}
                                />
                            </div>
                            <p className="text-xs text-gray-500">
                                O pedido será enviado para este número para aprovação.
                            </p>
                        </div>


                        {error && <p className="text-red-500 text-sm font-bold">{error}</p>}

                        <button
                            onClick={() => setStep('summary_confirmation')}
                            className="w-full bg-[#3b2f2f] text-[#d9a65a] py-4 rounded-xl font-bold uppercase tracking-widest hover:bg-[#d9a65a] hover:text-[#3b2f2f] transition-all shadow-lg mt-4 flex items-center justify-center gap-2"
                        >
                            Confirmar Pedido
                        </button>
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
                            <h3 className="text-xl font-bold text-[#3b2f2f] mb-2">A processar pagamento seguro...</h3>
                            <p className="text-[#3b2f2f]/80">Você será redirecionado para o ambiente seguro de pagamento.</p>
                            <div className="mt-4 bg-white p-4 rounded-lg border border-gray-200 text-left text-sm space-y-2">
                                <p className="font-bold flex items-center gap-2"><Lock className="w-4 h-4 text-green-600" /> Passo a Passo:</p>
                                <ol className="list-decimal pl-5 space-y-1 text-gray-600">
                                    <li>Verifique a notificação no seu telemóvel ({paymentPhone}).</li>
                                    <li>Insira seu PIN do M-Pesa/E-Mola para confirmar.</li>
                                    <li>Aguarde a confirmação automática aqui no site.</li>
                                </ol>
                            </div>
                        </div>
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
                            onClick={() => setIsOpen(false)} // Or clearCart logic handled in Receipt close
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
                                        <button onClick={() => setStep(step === 'payment' ? 'details' : 'cart')} className="mr-2 hover:text-[#d9a65a]">
                                            <ArrowLeft className="w-5 h-5" />
                                        </button>
                                    )}
                                    <ShoppingCart className="w-6 h-6 text-[#d9a65a]" />
                                    <h2 className="text-xl font-serif">
                                        {step === 'cart' ? 'Carrinho' : step === 'details' ? 'Dados' : step === 'payment' ? 'Pagamento' : 'Status'}
                                    </h2>
                                </div>
                                <button onClick={() => setIsOpen(false)} className="hover:text-[#d9a65a] transition-colors">
                                    <X className="w-6 h-6" />
                                </button>
                            </div>

                            {renderStepContent()}
                        </motion.div>
                    </>
                )}
            </AnimatePresence>

            {/* Payment Iframe Modal */}
            <AnimatePresence>
                {paymentUrl && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[80] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
                    >
                        <div className="bg-white rounded-2xl w-full max-w-md h-[80vh] flex flex-col overflow-hidden shadow-2xl relative">
                            <div className="p-4 border-b flex justify-between items-center bg-[#3b2f2f] text-[#d9a65a]">
                                <h3 className="font-bold">Finalizar Pagamento</h3>
                                <button
                                    onClick={() => setPaymentUrl(null)}
                                    className="p-1 hover:bg-white/10 rounded-full transition-colors"
                                >
                                    <X className="w-6 h-6" />
                                </button>
                            </div>
                            <div className="flex-1 relative bg-gray-50">
                                <iframe
                                    src={paymentUrl}
                                    title="Pagamento PaySuite"
                                    className="w-full h-full border-0"
                                    allow="payment"
                                />
                            </div>
                            <div className="p-4 bg-white border-t text-center space-y-2">
                                <p className="text-xs text-gray-500">
                                    Aguarde, estamos confirmando seu pagamento automaticamente...
                                </p>
                                <div className="flex justify-center py-2">
                                    <Loader className="w-8 h-8 text-[#d9a65a] animate-spin" />
                                </div>
                                <button
                                    onClick={async () => {
                                        if (currentTxId) {
                                            const status = await verifyPayment(currentTxId);
                                            if (status.success) finishOrder();
                                            else alert('Pagamento ainda não confirmado. Aguarde ou verifique no telemóvel.');
                                        }
                                    }}
                                    className="w-full bg-[#f7f1eb] text-[#d9a65a] py-3 rounded-xl font-bold hover:bg-[#d9a65a]/10 transition-colors text-sm"
                                >
                                    Verificar Manualmente
                                </button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence >

            {/* Receipt Modal */}
            {
                step === 'receipt' && completedOrder && (
                    <Receipt
                        orderId={completedOrder.orderId}
                        paymentRef={completedOrder.paymentRef}
                        transactionId={completedOrder.transactionId}
                        date={completedOrder.date}
                        details={details}
                        cart={cart}
                        subtotal={cart.reduce((sum, item) => sum + item.price * item.quantity, 0)}
                        deliveryFee={deliveryFee > 0 ? deliveryFee : 0}
                        total={total + (deliveryFee > 0 ? deliveryFee : 0)}
                        amountPaid={completedOrder.amountPaid}
                        balance={completedOrder.balance}
                        onClose={() => {
                            setIsOpen(false);
                            setStep('cart');
                            clearCart();
                            setCompletedOrder(null);
                        }}
                    />
                )
            }

        </>
    );
};
