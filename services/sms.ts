const TWILIO_ACCOUNT_SID = import.meta.env.VITE_TWILIO_ACCOUNT_SID || 'AC7a59f45b0d408ba109c49780237b45e1';
const TWILIO_AUTH_TOKEN = import.meta.env.VITE_TWILIO_AUTH_TOKEN || 'c50cb41a4c9a303aae6881f7dabb8b21';
const FROM_NUMBER = import.meta.env.VITE_TWILIO_FROM_NUMBER || '+14352536968';
const WHATSAPP_FROM = import.meta.env.VITE_TWILIO_WHATSAPP_FROM || 'whatsapp:+14155238886';

const TEAM_NUMBERS = {
    company: import.meta.env.VITE_TEAM_COMPANY_NUMBER || '258846930960',
    kitchen: import.meta.env.VITE_TEAM_KITCHEN_NUMBER || '', // To be filled
    chef: import.meta.env.VITE_TEAM_CHEF_NUMBER || '' // To be filled
};

export const sendSMS = async (to: string, body: string) => {
    try {
        const url = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`;
        const headers = new Headers();
        headers.set('Authorization', 'Basic ' + btoa(TWILIO_ACCOUNT_SID + ':' + TWILIO_AUTH_TOKEN));
        headers.set('Content-Type', 'application/x-www-form-urlencoded');

        const params = new URLSearchParams();
        params.append('To', to);
        params.append('From', FROM_NUMBER);
        params.append('Body', body);

        const response = await fetch(url, {
            method: 'POST',
            headers: headers,
            body: params
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.error('Twilio Error:', errorData);
            throw new Error(errorData.message || 'Failed to send SMS');
        }

        return await response.json();
    } catch (error) {
        console.error('SMS Send Failed:', error);
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
            throw new Error(errorData.message || 'Failed to send WhatsApp');
        }

        return await response.json();
    } catch (error) {
        console.error('WhatsApp Send Failed:', error);
        return null;
    }
};

export const notifyTeam = async (order: any, type: 'new_order' | 'delivery_update') => {
    const recipients = Object.values(TEAM_NUMBERS).filter(n => n !== '');
    if (recipients.length === 0) return;

    const domain = window.location.origin;
    let message = '';
    if (type === 'new_order') {
        const itemsList = order.items.map((i: any) => `- ${i.quantity}x ${i.name}`).join('\n');
        message = `*NOVO PEDIDO - Pão Caseiro*\n\nPedido: #${order.orderId}\nCliente: ${order.customer.name}\nTotal: ${order.total} MT\n\n*Items:*\n${itemsList}\n\n*Ver Detalhes (Admin):*\n${domain}/admin`;
    } else {
        message = `*ATUALIZAÇÃO DE PEDIDO*\n\nPedido #${order.orderId} status alterado para: ${order.status}`;
    }

    // Send to all team members
    const results = await Promise.all(recipients.map(number => sendWhatsApp(number, message)));
    return results;
};

export const notifyCustomer = async (order: any, type: 'order_confirmed' | 'status_update') => {
    if (!order.customer.phone) return;

    const domain = window.location.origin;
    const receiptLink = `${domain}/order-receipt/${order.orderId}`;
    let message = '';

    if (type === 'order_confirmed') {
        message = `*Olá ${order.customer.name}!*\n\nSeu pedido na *Pão Caseiro* foi recebido com sucesso!\n\nPedido: #${order.orderId}\nTotal: ${order.total} MT\n\n*Visualize seu recibo:* \n${receiptLink}\n\nObrigado pela preferência!`;
    } else {
        const statusEmoji = order.status === 'completed' ? '✅' : order.status === 'cancelled' ? '❌' : '🍞';
        const statusText = order.status === 'completed' ? 'Concluído/Entregue' : order.status === 'cancelled' ? 'Cancelado' : order.status;

        message = `*ATUALIZAÇÃO DO PEDIDO #${order.orderId}*\n\nStatus: ${statusEmoji} ${statusText}\n\n*Acompanhe aqui:* \n${receiptLink}`;
    }

    return await sendWhatsApp(order.customer.phone, message);
};
