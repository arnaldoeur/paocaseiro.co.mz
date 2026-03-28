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
    let addressStr = order.customer_address || order.customer?.address || 'Ver painel';
    const coords = order.delivery_coordinates?.replace(/[()]/g, '');
    const mapLink = coords ? `\nMapa: https://maps.google.com/?q=${coords}` : '';
    
    const message = `Pão Caseiro (ENTREGA): #${order.short_id || order.orderId}\nCliente: ${order.customer_name || order.customer?.name}\nEndereço: ${addressStr}${mapLink}\nItems:\n${itemsList}\nOTP: ${order.otp}\nO sabor que aquece o seu coracao!`;

    // Send via SMS
    await sendSMS(driver.phone, message.substring(0, 160));

    // Return WhatsApp link for manual alternative if needed
    const whatsappMsg = window.encodeURIComponent(message);
    return `https://wa.me/258${driver.phone.replace(/[^0-9]/g, '').slice(-9)}?text=${whatsappMsg}`;
};

const getFirstName = (order: any) => {
    const fullName = order.customer_name || order.customer?.name || 'Cliente';
    if (fullName.toLowerCase() === 'cliente') return 'Cliente';
    return fullName.trim().split(' ')[0];
};

export const notifyCustomer = async (order: any, type: 'order_confirmed' | 'status_update', driver?: any) => {
    if (!order.customer_phone && (!order.customer || !order.customer.phone)) return;
    const phone = order.customer_phone || order.customer.phone;

    let baseUrl = 'https://paocaseiro.co.mz';
    if (typeof window !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1' && !window.location.hostname.startsWith('192.168.')) {
        baseUrl = window.location.origin;
    }
    const receiptLink = `${baseUrl}/order-receipt/${order.short_id || order.orderId || order.id}`;
    let message = '';
    
    const firstName = getFirstName(order);
    const shortId = order.short_id || order.orderId || order.id?.slice(-6).toUpperCase() || '';

    if (type === 'order_confirmed') {
        const total = order.total_amount || order.total || 0;
        const items = order.items || [];
        const itemsText = items.length > 0 ? items.map((i: any) => `${i.quantity}x ${i.name || i.product_name} - ${i.price} MT`).join('\n') : '';
        
        message = `Ola ${firstName},\n\nMuito obrigado.\nA sua encomenda foi confirmada com sucesso.\n\nDetalhes do Pedido N. ${shortId}\n\nArtigos:\n${itemsText}\n\nTotal do recibo: ${total} MT\n\nVerifique o recibo atraves do link:\n${receiptLink}`;
    } else {
        let statusText = order.status;
        let extra = '';
        if (order.status === 'kitchen') { 
            statusText = 'Na Cozinha'; 
            extra = '\nO seu pedido ja esta na cozinha a ser preparado.'; 
        }
        else if (order.status === 'processing') { 
            statusText = 'Em Preparacao'; 
            extra = order.prep_time 
                ? `\nO seu pedido estara pronto em aproximadamente ${order.prep_time} minutos.`
                : '\nA sua encomenda esta a ser preparada.'; 
        }
        else if (order.status === 'ready') { statusText = 'Pronto'; extra = order.delivery_type === 'delivery' ? '\nA sua encomenda ja esta a caminho de si!' : '\nA sua encomenda ja se encontra pronta e a sua espera!'; }
        else if (order.status === 'delivering') { statusText = 'Em Transito'; extra = '\nO motorista ja esta a caminho.'; }
        else if (order.status === 'arrived') { statusText = 'O Motorista Chegou'; extra = '\nPor favor, prepare-se para o receber com o seu Codigo PIN.'; }
        else if (order.status === 'completed') { statusText = 'Concluido'; extra = '\nA sua encomenda foi entregue. Bom apetite.'; }
        else if (order.status === 'cancelled') { statusText = 'Cancelado'; extra = '\nA sua encomenda foi cancelada.'; }

        message = `O estado do seu pedido da Pao Caseiro foi atualizado:\n\nPedido N. ${shortId}\nNovo Estado: ${statusText}${extra}\n\nAcompanhe: ${receiptLink}`;
    }

    // Pass the full message string (no hard 160 char limit as modern SMS providers support long SMS concatenation)
    return await sendSMS(phone, message);
};

export const notifyCustomerDelay = async (order: any, delayMinutes: string, reason: string) => {
    const phone = order.customer_phone || order.phone || order.customer?.phone;
    if (!phone) return;
    const shortId = order.short_id || order.orderId || order.id?.slice(-6).toUpperCase() || '';

    const message = `Pao Caseiro: Pedido N. ${shortId}\nSinceras desculpas, o seu pedido vai demorar mais ${delayMinutes} minutos devido a: ${reason}.\nAgradecemos a compreensao!\nO sabor que aquece o seu coracao!`;
    return await sendSMS(phone, message);
};

export const notifyPaymentConfirmed = async (orderId: string, phone: string, shortId?: string) => {
    const domain = window.location.host;
    const receiptLink = `${domain}/order-receipt/${shortId || orderId}`;
    const message = `Pão Caseiro: Pagamento #${shortId || orderId} confirmado! Obrigado por escolher a nossa qualidade. Recibo: ${receiptLink}`;
    return await sendSMS(phone, message.substring(0, 160));
};

export const notifyRegistration = async (phone: string, name: string) => {
    const firstName = name.split(' ')[0] || 'Cliente';
    const message = `Bem-vindo a Pao Caseiro, ${firstName}! Registo concluido com sucesso.\nO sabor que aquece o seu coracao!`;
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
    const coords = order.delivery_coordinates?.replace(/[()]/g, '');
    const mapLink = coords ? ` Mapa: https://maps.google.com/?q=${coords}` : '';
    
    const smsMsg = `Pão Caseiro: Entrega #${orderId} atribuida! Cliente: ${customerName} (${customerPhone}). OTP: ${order.otp}.${mapLink} O sabor que aquece o seu coracao!`.substring(0, 160);
    await sendSMS(driver.phone, smsMsg);

    // Rich WhatsApp message with full details
    const domain = typeof window !== 'undefined' ? window.location.origin : 'https://paocaseiro.co.mz';
    const portalLink = `${domain}/delivery`;
    const waMsg = `🍞 *Pão Caseiro — Nova Entrega Atribuída*\n\n📦 Pedido: *#${orderId}*\n👤 Cliente: ${customerName}\n📞 Tel: ${customerPhone}\n📍 Endereço: ${address}${coords ? `\n🗺️ Mapa: https://maps.google.com/?q=${coords}` : ''}\n\n🛒 *Itens:*\n${itemsList}\n\n🔑 *OTP de Entrega: ${order.otp}*\n\n➡️ Acesse o portal: ${portalLink}\n\n_O sabor que aquece o seu coração!_ 🤎`;

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
    const message = `Pao Caseiro: #${orderId} esta a chegar! ${driverName} ja esta proximo. Contacte: ${driverPhone}.\nO sabor que aquece o seu coracao!`.substring(0, 160);

    return await sendSMS(phone, message);
};


/**
 * Notifies the customer that their ticket is now being called to a specific counter.
 */
export const notifyQueueTicketCalling = async (ticket: any, counter: string, phone?: string) => {
    if (!phone) return null;
    const message = `Pão Caseiro: Senha ${ticket.ticket_number} - Dirija-se ao ${counter}. Bom atendimento!\nO sabor que aquece o seu coracao!`;
    return await sendSMS(phone, message.substring(0, 160));
};

/**
 * Sends a confirmation when a ticket is generated.
 */
export const notifyQueueTicketGenerated = async (ticket: any, phone: string) => {
    const message = `Pão Caseiro: Senha ${ticket.ticket_number} gerada com sucesso. Acompanhe a sua posição no local.\nO sabor que aquece o seu coracao!`;
    return await sendSMS(phone, message.substring(0, 160));
};
