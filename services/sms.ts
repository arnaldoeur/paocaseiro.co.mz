import { formatProductName } from './stringUtils';
import { supabase } from './supabase';

const TWILIO_ACCOUNT_SID = import.meta.env.VITE_TWILIO_ACCOUNT_SID || 'AC7a59f45b0d408ba109c49780237b45e1';
const TWILIO_AUTH_TOKEN = import.meta.env.VITE_TWILIO_AUTH_TOKEN || 'c50cb41a4c9a303aae6881f7dabb8b21';
const FROM_NUMBER = import.meta.env.VITE_TWILIO_FROM_NUMBER || '+14352536968';
const WHATSAPP_FROM = import.meta.env.VITE_TWILIO_WHATSAPP_FROM || 'whatsapp:+14155238886';

const getTeamNumbers = () => {
    if (typeof window !== 'undefined') {
        const saved = localStorage.getItem('team_numbers');
        if (saved) return JSON.parse(saved);
    }
    return {
        admin1: '258879146662',
        admin2: '258846930960',
        kitchen: '',
        chef: ''
    };
};

const TEAM_NUMBERS = getTeamNumbers();

export const sendSMS = async (to: string, body: string) => {
    try {
        let formattedNumber = to.replace(/[^0-9]/g, ''); // Remove EVERYTHING except digits
        if (!formattedNumber.startsWith('258') && formattedNumber.length === 9) {
            formattedNumber = '258' + formattedNumber;
        }

        console.log(`[SMS] Attempting to send to: ${formattedNumber}`);

        // Use local proxy defined in vite.config.ts to avoid CORS errors
        const url = `/api/turbo/submit`;
        const payload = {
            user_token: 'WTJlMzZpeDNNb25WR3hZK0NhcG1DUT09',
            origin: '99950',
            message: body.normalize("NFD").replace(/[\u0300-\u036f]/g, ""), // Remove accents for best compatibility
            numbers: [formattedNumber]
        };

        console.log(`[SMS] Payload:`, JSON.stringify(payload));

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        const data = await response.json();
        console.log(`[SMS] Response:`, data);

        if (data.status === 'error' || data.error === true) {
            console.error('Turbo Host SMS Error:', data);

            // Log Error
            Promise.resolve().then(async () => {
                await supabase.from('sms_logs').insert([{
                    type: 'sms', recipient: formattedNumber, content: body, status: 'error', cost: 0
                }]);
            }).catch(() => { });

            throw new Error(data.message || 'Failed to send SMS via Turbo Host');
        }

        // --- Asynchronous Logging of Communication ---
        Promise.resolve().then(async () => {
            try {
                const { data: settings } = await supabase.from('system_settings').select('value').eq('key', 'sms_pricing').single();
                const cost = settings?.value?.cost_per_sms || 1.62;
                await supabase.from('sms_logs').insert([{
                    type: 'sms',
                    recipient: formattedNumber,
                    content: body,
                    status: 'sent',
                    cost: cost
                }]);
            } catch (e) {
                console.error("Failed to log sms communication", e);
            }
        });

        return data;
    } catch (error: any) {
        console.error('SMS Send Failed:', error);
        Promise.resolve().then(async () => {
            await supabase.from('sms_logs').insert([{
                type: 'sms', recipient: to, content: body, status: 'error', cost: 0
            }]);
        }).catch(() => { });
        return { status: 'error', message: error.message };
    }
};



export const sendWhatsApp = async (to: string, message: string, isTemplate = false) => {
    try {
        const url = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`;
        const headers = new Headers();
        headers.set('Authorization', 'Basic ' + btoa(TWILIO_ACCOUNT_SID + ':' + TWILIO_AUTH_TOKEN));
        headers.set('Content-Type', 'application/x-www-form-urlencoded');

        const params = new URLSearchParams();
        params.append('To', `whatsapp:${to}`);
        params.append('From', WHATSAPP_FROM);

        if (isTemplate) {
            params.append('ContentSid', 'HX229f5a04fd0510ce1b071852155d3e75');
            params.append('ContentVariables', JSON.stringify({ "1": message }));
        } else {
            params.append('Body', message);
        }

        const response = await fetch(url, {
            method: 'POST',
            headers: headers,
            body: params
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.error('Twilio WhatsApp Error:', errorData);

            // Log Error
            Promise.resolve().then(async () => {
                await supabase.from('sms_logs').insert([{
                    type: 'whatsapp', recipient: to, content: message, status: 'error', cost: 0
                }]);
            }).catch(() => { });

            throw new Error(errorData.message || 'Failed to send WhatsApp');
        }

        const responseData = await response.json();

        // --- Asynchronous Logging of Communication ---
        Promise.resolve().then(async () => {
            try {
                const { data: settings } = await supabase.from('system_settings').select('value').eq('key', 'sms_pricing').single();
                const cost = settings?.value?.cost_per_whatsapp || 0.50; // default for Whatsapp if set
                await supabase.from('sms_logs').insert([{
                    type: 'whatsapp',
                    recipient: to,
                    content: message,
                    status: 'sent',
                    cost: cost
                }]);
            } catch (e) {
                console.error("Failed to log whatsapp communication", e);
            }
        });

        return responseData;
    } catch (error: any) {
        console.error('WhatsApp Send Failed:', error);
        Promise.resolve().then(async () => {
            await supabase.from('sms_logs').insert([{
                type: 'whatsapp', recipient: to, content: message, status: 'error', cost: 0
            }]);
        }).catch(() => { });
        return null;
    }
};

export const notifyTeam = async (order: any, type: 'new_order' | 'delivery_update') => {
    const recipients = (Object.values(TEAM_NUMBERS) as string[]).filter(n => n !== '');
    if (recipients.length === 0) return;

    const domain = window.location.origin;
    let message = '';
    if (type === 'new_order') {
        const itemsList = order.items.map((i: any) => `- ${i.quantity}x ${formatProductName(i.name)}`).join('\n');
        message = `Pão Caseiro (NOVO): #${order.orderId}\nCliente: ${order.customer.name}\nTotal: ${order.total} MT\nPainel: ${domain}/admin`;
    } else {
        message = `Pão Caseiro: Pedido #${order.orderId} agora está ${order.status}.`;
    }

    const results = await Promise.all(recipients.map(number => sendSMS(number, message.substring(0, 160))));
    return results;
};

export const notifyDriverNewDelivery = async (driver: any, order: any) => {
    if (!driver.phone) return;

    const itemsList = order.items.map((i: any) => `- ${i.quantity}x ${formatProductName(i.name)}`).join('\n');
    const message = `Pão Caseiro (ENTREGA): #${order.short_id || order.orderId}\nCliente: ${order.customer_name || order.customer?.name}\nEndereço: ${order.customer_address || order.customer?.address}\nItems:\n${itemsList}\nOTP: ${order.otp}\nO sabor que aquece o coração!`;

    // Send via SMS
    await sendSMS(driver.phone, message.substring(0, 160));

    // Return WhatsApp link for manual alternative if needed
    const whatsappMsg = window.encodeURIComponent(message);
    return `https://wa.me/258${driver.phone.replace(/[^0-9]/g, '').slice(-9)}?text=${whatsappMsg}`;
};

export const notifyCustomer = async (order: any, type: 'order_confirmed' | 'status_update', driver?: any) => {
    if (!order.customer_phone && (!order.customer || !order.customer.phone)) return;
    const phone = order.customer_phone || order.customer.phone;

    const domain = window.location.host;
    const receiptLink = `${domain}/order-receipt/${order.short_id || order.orderId}`;
    let message = '';

    if (type === 'order_confirmed') {
        message = `Pão Caseiro: Pedido #${order.short_id || order.orderId} recebido! O sabor que aquece o coração na sua mesa. Recibo: ${receiptLink}`;
    } else {
        if (order.status === 'delivering') {
            message = `Pão Caseiro: O seu pedido #${order.short_id || order.orderId} já saiu e está a caminho! Sabor que aquece o coração a chegar.`;
        } else if (order.status === 'arrived') {
            message = `Pão Caseiro: O nosso entregador ${driver?.name || ''} já chegou à sua localização! Pode ligar para ${driver?.phone || ''}.`;
        } else if (order.status === 'completed') {
            message = `Pão Caseiro: Pedido #${order.short_id || order.orderId} entregue com sucesso. Bom apetite com o sabor que aquece o nosso coração!`;
        } else {
            const statusText = order.status === 'cancelled' ? 'Cancelado' : order.status;
            message = `Pão Caseiro: Pedido #${order.short_id || order.orderId} atualizado para ${statusText}. Detalhes: ${receiptLink}`;
        }
    }

    return await sendSMS(phone, message.substring(0, 160));
};

export const notifyPaymentConfirmed = async (orderId: string, phone: string, shortId?: string) => {
    const domain = window.location.host;
    const receiptLink = `${domain}/order-receipt/${shortId || orderId}`;
    const message = `Pão Caseiro: Pagamento #${shortId || orderId} confirmado! Obrigado por escolher a nossa qualidade. Recibo: ${receiptLink}`;
    return await sendSMS(phone, message.substring(0, 160));
};

export const notifyRegistration = async (phone: string, name: string) => {
    const firstName = name.split(' ')[0] || 'Cliente';
    const message = `Bem-vindo à Pão Caseiro, ${firstName}! Registo concluído. O melhor pão de Lichinga agora a um clique!`;
    return await sendSMS(phone, message.substring(0, 160));
};

/**
 * Sends a rich notification to the driver when an order is assigned.
 * Includes all order details: items, OTP, address, and a WhatsApp link.
 */
export const notifyDriverAssigned = async (driver: any, order: any) => {
    if (!driver?.phone) return null;

    const items = order.items || [];
    const itemsList = items.length > 0
        ? items.map((i: any) => `${i.quantity}x ${formatProductName(i.name || i.product_name)}`).join(', ')
        : 'Ver painel';

    const address = order.customer_address || order.delivery_address || order.customer?.address || 'Ver painel';
    const orderId = order.short_id || order.orderId || order.id;
    const customerName = order.customer_name || order.customer?.name || 'Cliente';
    const customerPhone = order.customer_phone || order.customer?.phone || '';

    // Short SMS (160 chars)
    const smsMsg = `Pão Caseiro: Nova entrega #${orderId}. Cliente: ${customerName} (${customerPhone}). OTP: ${order.otp}. Acesse o portal para detalhes.`.substring(0, 160);
    await sendSMS(driver.phone, smsMsg);

    // Rich WhatsApp message with full details
    const domain = typeof window !== 'undefined' ? window.location.origin : 'https://paocaseiro.co.mz';
    const portalLink = `${domain}/delivery`;
    const waMsg = `🍞 *Pão Caseiro — Nova Entrega Atribuída*\n\n📦 Pedido: *#${orderId}*\n👤 Cliente: ${customerName}\n📞 Tel: ${customerPhone}\n📍 Endereço: ${address}\n\n🛒 *Itens:*\n${itemsList}\n\n🔑 *OTP de Entrega: ${order.otp}*\n\n➡️ Acesse o portal: ${portalLink}\n\n_O sabor que aquece o coração!_ 🤎`;

    const encoded = encodeURIComponent(waMsg);
    const driverPhone = driver.phone.replace(/[^0-9]/g, '');
    const formattedPhone = driverPhone.startsWith('258') ? driverPhone : '258' + driverPhone.slice(-9);
    return `https://wa.me/${formattedPhone}?text=${encoded}`;
};

/**
 * Sends an automatic SMS to the customer when the driver is approaching (~500m).
 */
export const notifyCustomerApproaching = async (order: any, driver: any) => {
    const phone = order.customer_phone || order.customer?.phone;
    if (!phone) return;

    const driverName = driver?.name || 'o nosso entregador';
    const driverPhone = driver?.phone || '';
    const orderId = order.short_id || order.orderId;
    const message = `Pão Caseiro: #${orderId} está a chegar! ${driverName} já está próximo. Contacte: ${driverPhone}. Fique perto do telemóvel!`.substring(0, 160);

    return await sendSMS(phone, message);
};

