import { formatProductName } from './stringUtils';
import * as whatsapp from './whatsapp';

const DISABLE_SMS = false; // WhatsApp is primary, but SMS is enabled as fallback

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

import { hostingerService } from './hostingerService';

/**
 * Send an SMS via Hostinger Bridge (Turbo Host API)
 */
export const sendSMS = async (to: string, body: string) => {
    if (DISABLE_SMS) {
        return { status: 'success', message: 'SMS disabled temporarily' };
    }
    try {
        let formattedNumber = to.replace(/[^0-9]/g, ''); // Remove EVERYTHING except digits
        if (!formattedNumber.startsWith('258') && formattedNumber.length === 9) {
            formattedNumber = '258' + formattedNumber;
        }


        const data = await hostingerService.fetch('send_sms', {
            number: formattedNumber,
            message: body.normalize("NFD").replace(/[\u0300-\u036f]/g, "") // Remove accents
        });

        // Log to local DB
        hostingerService.logNotification('sms', formattedNumber, body, 'sent')
            .catch(e => console.error('[SMS Log Error]', e));

        return data;
    } catch (error: any) {
        console.error('SMS Send Failed:', error);
        
        // Log error to local DB
        hostingerService.logNotification('sms', to, error.message, 'error')
            .catch(e => console.error('[SMS Log Error]', e));

        return { status: 'error', message: error.message };
    }
};

/**
 * Legacy wrapper for WhatsApp - redirects to the new Evolution API service
 */
export const sendWhatsApp = async (to: string, message: string, isTemplate = false) => {
    // Migrated from Twilio to Evolution API via notify-whatsapp Edge Function
    return await whatsapp.sendWhatsAppMessage(to, message);
};

export const notifyTeam = async (order: any, type: 'new_order' | 'delivery_update') => {
    // Get unique recipients to avoid sending multiple messages to the same person
    const rawRecipients = (Object.values(TEAM_NUMBERS) as string[]).filter(n => n !== '');
    const recipients = [...new Set(rawRecipients)];
    if (recipients.length === 0) return;

    const domain = 'https://paocaseiro.co.mz';
    let message = '';
    if (type === 'new_order') {
        const itemsList = order.items.map((i: any) => `- ${i.quantity}x ${formatProductName(i.name)}`).join('\n');
        message = `🍞 *NOVO PEDIDO: Pão Caseiro*\n\nPedido: *#${order.orderId}*\nCliente: ${order.customer.name}\nTotal: ${order.total} MT\n\nResumo:\n${itemsList}\n\n➡️ Painel: ${domain}/admin\n_O sabor que aquece o seu coração!_`;
    } else {
        message = `🍞 *Pão Caseiro:* Pedido *#${order.orderId}* agora está: *${order.status}*.`;
    }

    if (DISABLE_SMS) {
        const results = await Promise.all(recipients.map(number => whatsapp.sendWhatsAppMessage(number, message)));
        return results;
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

    const baseUrl = 'https://paocaseiro.co.mz';
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

    // Bridge to WhatsApp if SMS is disabled
    if (DISABLE_SMS) {
        return await whatsapp.notifyCustomerOrderStatusWhatsApp(order, type === 'order_confirmed' ? 'order_confirmed' : order.status);
    }

    // Pass the full message string
    return await sendSMS(phone, message);
};

export const notifyCustomerDelay = async (order: any, delayMinutes: string, reason: string) => {
    const phone = order.customer_phone || order.phone || order.customer?.phone;
    if (!phone) return;

    if (DISABLE_SMS) {
        return await whatsapp.notifyCustomerDelayWhatsApp(order, delayMinutes, reason);
    }

    const shortId = order.short_id || order.orderId || order.id?.slice(-6).toUpperCase() || '';
    const message = `Pao Caseiro: Pedido N. ${shortId}\nSinceras desculpas, o seu pedido vai demorar mais ${delayMinutes} minutos devido a: ${reason}.\nAgradecemos a compreensao!\nO sabor que aquece o seu coracao!`;
    return await sendSMS(phone, message);
};

export const notifyPaymentConfirmed = async (order: any, customPhone?: string) => {
    const phone = customPhone || order.customer_phone || order.customer?.phone || order.customer?.contact_no;
    if (!phone) return;

    const shortId = order.short_id || order.orderId || order.id?.slice(-6).toUpperCase() || '';
    const total = order.total_amount || order.total || order.amount_paid || 0;
    const ref = order.payment_ref || order.paymentRef || order.transaction_id || 'N/A';
    
    // Create a short summary of items to fit in SMS
    const items = order.items || [];
    let itemsSummary = items.map((i: any) => `${i.quantity}x ${i.name || i.product_name}`).join(', ');
    if (itemsSummary.length > 50) itemsSummary = itemsSummary.substring(0, 47) + '...';

    const domain = 'paocaseiro.co.mz';
    const receiptLink = `${domain}/order-receipt/${shortId}`;
    
    const message = `PaoCaseiro: Pagamento Confirmado!\nPedido #${shortId}\nTotal Pago: ${total} MT\nRef: ${ref}\nItens: ${itemsSummary}\nRecibo: ${receiptLink}`;
    
    if (DISABLE_SMS) {
        return await whatsapp.sendWhatsAppMessage(phone, message);
    }
    
    return await sendSMS(phone, message.substring(0, 160));
};

export const notifyRegistration = async (phone: string, name: string) => {
    const firstName = name.split(' ')[0] || 'Cliente';
    const message = `🍞 *Bem-vindo à Pão Caseiro, ${firstName}!*\n\nO seu registo foi concluído com sucesso. Agora pode fazer os seus pedidos com todo o conforto.\n\n_O sabor que aquece o seu coração!_ 🤎`;
    
    if (DISABLE_SMS) {
        return await whatsapp.sendWhatsAppMessage(phone, message);
    }
    
    return await sendSMS(phone, message.substring(0, 160));
};

/**
 * Sends a rich notification to the driver when an order is assigned.
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
    
    if (!DISABLE_SMS) {
        await sendSMS(driver.phone, smsMsg);
    }

    // Rich WhatsApp message with full details
    const domain = 'https://paocaseiro.co.mz';
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
