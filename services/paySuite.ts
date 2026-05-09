import { hostingerService } from './hostingerService';

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

/**
 * Initiates a payment session via Hostinger API (proxying PaySuite)
 */
export const initiatePayment = async (data: PaymentRequest): Promise<PaymentResponse> => {
    // Ensure phone number starts with 258 and contains only digits
    let formattedPhone = data.msisdn ? data.msisdn.replace(/\D/g, '') : '';
    if (formattedPhone && !formattedPhone.startsWith('258') && formattedPhone !== '000000000') {
        formattedPhone = `258${formattedPhone}`;
    }

    const payload: any = {
        action: 'initiate',
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
    if (formattedPhone && formattedPhone !== '258000000000' && formattedPhone !== '000000000') {
        payload.mobile = formattedPhone;
        payload.msisdn = formattedPhone;
    }

    if (data.method) {
        payload.channel = data.method;
    }

    try {
        const result = await hostingerService.processPayment(payload);

        if (result.success && result.data?.checkout_url) {
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
    } catch (error: any) {
        console.error('Payment initiation error:', error);
        return {
            success: false,
            message: error.message || 'Erro de conexão com serviço de pagamento'
        };
    }
};

/**
 * Verifies the status of a payment transaction via Hostinger API
 */
export const verifyPayment = async (txId: string): Promise<{ success: boolean; status: string; message?: string }> => {
    try {
        const result = await hostingerService.processPayment({ 
            action: 'verify',
            id: txId
        });
        
        // Use the normalized data from the API
        const data = result.data || result;
        const statusString = (data.status || '').toString().toUpperCase();

        // Terminal success states for the transaction itself
        const successStates = ['SUCCESSFUL', 'PAID', 'COMPLETED', 'APPROVED'];
        const isSuccess = successStates.includes(statusString);

        if (isSuccess) {
            return { success: true, status: 'successful' };
        } else if (statusString === 'FAILED' || statusString === 'CANCELLED' || statusString === 'REJECTED') {
            return { success: false, status: 'failed' };
        }

        return { success: false, status: statusString || 'pending', message: JSON.stringify(result) };
    } catch (e: any) {
        console.error('Payment verification error:', e);
        return { success: false, status: 'error', message: e.message };
    }
};
