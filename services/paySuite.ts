/// <reference types="vite/client" />
export interface PaymentRequest {
    amount: number;
    msisdn: string; // Phone number (e.g. 25884...)
    method?: 'mpesa' | 'emola' | 'mkesh'; // Optional
    reference: string;
    customerName?: string;
    customerEmail?: string;
    customerPhone?: string;
}

export interface PaymentResponse {
    success: boolean;
    message?: string;
    checkout_url?: string;
    transaction_id?: string;
    status?: string;
}

// Documentation Endpoint: https://paysuite.tech/api/v1/payments
// Use local proxy to avoid CORS in Dev, and PHP proxy in Prod
const API_URL = import.meta.env.DEV ? '/api/paysuite' : '/api/paysuite_proxy.php';

// API Key
const API_KEY = '1298|OxFmkooNPDC14WPRIjomqAyJ0np4wp22Fm12j1pt76fd238e';

export const initiatePayment = async (data: PaymentRequest): Promise<PaymentResponse> => {

    // Ensure phone number starts with 258 and contains only digits
    let formattedPhone = data.msisdn ? data.msisdn.replace(/\D/g, '') : '';
    if (formattedPhone && !formattedPhone.startsWith('258') && formattedPhone !== '000000000') {
        formattedPhone = `258${formattedPhone}`;
    }

    const payload: any = {
        amount: String(data.amount.toFixed(2)),
        reference: data.reference,
        description: `Pagamento ${data.reference}`,
        first_name: data.customerName?.split(' ')[0] || 'Cliente',
        last_name: data.customerName?.split(' ').slice(1).join(' ') || 'Pão Caseiro',
        email: data.customerEmail || 'geral@paocaseiro.co.mz',
        return_url: typeof window !== 'undefined' ? window.location.origin : 'https://paocaseiro.co.mz',
        cancel_url: typeof window !== 'undefined' ? window.location.origin : 'https://paocaseiro.co.mz'
    };

    // Só enviamos os campos de telemóvel se formos forçar um número real.
    // O número '000000000' é usado no frontend para evitar que a API force
    // apenas o canal compatível com o prefixo. Enviando VAZIO, a página da PaySuite
    // mostra logo tudos os métodos disponíveis.
    if (formattedPhone && formattedPhone !== '258000000000' && formattedPhone !== '000000000') {
        payload.mobile = formattedPhone;
        payload.msisdn = formattedPhone;
        payload.phone = formattedPhone;
        payload.customer_msisdn = formattedPhone;
        payload.customer_phone = formattedPhone;
    }

    if (data.method) {
        payload.channel = data.method;
        payload.payment_method = data.method;
    }

    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'Authorization': `Bearer ${API_KEY}`
            },
            body: JSON.stringify(payload)
        });

        const result = await response.json();

        if (response.ok && result.data?.checkout_url) {
            return {
                success: true,
                message: 'Redirecionando para pagamento...',
                checkout_url: result.data.checkout_url,
                transaction_id: result.data.id,
                status: result.data.status
            };
        } else {
            return {
                success: false,
                message: result.message || 'Falha no pagamento'
            };
        }
    } catch (error) {
        return {
            success: false,
            message: 'Erro de conexão com PaySuite'
        };
    }
};

export const verifyPayment = async (txId: string): Promise<{ success: boolean; status: string; message?: string }> => {
    // Uses the same proxy endpoint but GET (or customized param)
    // Note: The proxy is currently set for POST only in the PHP file.
    // We should probably update valid methods or just use POST with an action field? 
    // Actually, PaySuite API for status is usually GET /payments/{id}.
    // Our PROXY is simple POST forwarding. We need to handle this.
    // Let's modify the PROXY to handle GET or specific path?
    // OR: We send a POST to proxy with `action: 'verify'` and it handles the internal GET.

    // Changing strategy: Simpler to update Proxy to allow specifying endpoint/method?
    // No, keep it safe. Let's update Proxy to handle Verification.
    // But for now, let's assume we update proxy next.

    // For now, let's assume we send a POST with `check_status: txId` to the proxy?

    // Let's stick to standard REST. I'll update the Proxy to support appending path or `_method`.
    // But to be quick, let's make the JS send a POST to local proxy, and local proxy forwards it.

    try {
        const response = await fetch(API_URL + '?action=verify&id=' + txId, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            }
        });
        const result = await response.json();
        console.log('PAYSUITE VERIFY RAW:', result);

        // Normalize state strings (PaySuite can return "APPROVED", "SUCCESSFUL", "PAID", "COMPLETED")
        const rawStatus = result.data?.status || result.status || '';
        const statusString = rawStatus.toString().toUpperCase();

        const successStates = ['SUCCESSFUL', 'PAID', 'COMPLETED', 'APPROVED', 'SUCCESS'];
        const isSuccess = successStates.includes(statusString) || result.success === true;

        if (response.ok && isSuccess) {
            return { success: true, status: 'successful' };
        } else if (statusString === 'FAILED' || statusString === 'CANCELLED') {
            return { success: false, status: 'failed' };
        }

        return { success: false, status: statusString || 'pending', message: JSON.stringify(result) };
    } catch (e) {
        return { success: false, status: 'error' };
    }
};
