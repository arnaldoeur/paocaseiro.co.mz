import { supabase } from './supabase';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

const EVOLUTION_API_URL = import.meta.env.VITE_WHATSAPP_API_URL || 'https://wa.zyphtech.com';
const INSTANCE_NAME = import.meta.env.VITE_WHATSAPP_INSTANCE_NAME || 'Zyph Tech, Lda';
const API_KEY = import.meta.env.VITE_WHATSAPP_API_KEY || '24724DC5AA2F-4CBF-9013-9C645CF4E565';

/**
 * Format the phone number to E.164 required by Evolution API (e.g. 25884xxxxxxx)
 */
const formatPhone = (phone: string) => {
    let clean = phone.replace(/[^\d+]/g, '');
    if (clean.startsWith('+')) clean = clean.substring(1);
    
    // Auto-prefix Mozambique code if not present (assuming local numbers start with 8)
    if (clean.startsWith('8') && clean.length === 9) {
        clean = '258' + clean;
    }
    
    return clean;
};

/**
 * Send a Text Message via WhatsApp
 */
export const sendWhatsAppMessage = async (to: string, text: string) => {
    if (!to) return { success: false, error: 'No phone number provided' };
    
    const formattedNumber = formatPhone(to);
    
    try {
        const payload = {
            number: formattedNumber,
            options: {
                delay: 1000,
                presence: 'composing'
            },
            text: text
        };

        const response = await fetch(`${EVOLUTION_API_URL}/message/sendText/${encodeURIComponent(INSTANCE_NAME)}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'apikey': API_KEY
            },
            body: JSON.stringify(payload)
        });

        const data = await response.json();

        if (!response.ok) {
            console.error('WhatsApp API Error:', data);
            throw new Error(data.message || 'Failed to send WhatsApp message');
        }

        // Log to Supabase
        Promise.resolve().then(async () => {
            try {
                await supabase.from('sms_logs').insert([{
                    type: 'whatsapp',
                    recipient: formattedNumber,
                    content: 'Text Notification',
                    status: 'sent',
                    cost: 0
                }]);
            } catch (e) { }
        });

        return { success: true, data };
    } catch (error: any) {
        console.error('WhatsApp Service Error:', error);
        
        Promise.resolve().then(async () => {
            try {
                await supabase.from('sms_logs').insert([{
                    type: 'whatsapp_error',
                    recipient: formattedNumber,
                    content: error.message,
                    status: 'error',
                    cost: 0
                }]);
            } catch (e) { }
        });

        return { success: false, error: error.message };
    }
};

/**
 * Send Media (PDF/Image) via WhatsApp
 * @param media Content via Base64 or direct Web URL
 * @param mediatype eg. "document", "image", "video", "audio"
 * @param fileName fileName of the media
 */
export const sendWhatsAppMedia = async (to: string, mediatype: string, fileName: string, caption: string, media: string) => {
    if (!to) return { success: false, error: 'No phone number provided' };
    
    const formattedNumber = formatPhone(to);
    
    try {
        const payload = {
            number: formattedNumber,
            options: {
                delay: 1500,
                presence: 'composing'
            },
            mediatype: mediatype,
            fileName: fileName,
            caption: caption,
            media: media
        };

        const response = await fetch(`${EVOLUTION_API_URL}/message/sendMedia/${encodeURIComponent(INSTANCE_NAME)}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'apikey': API_KEY
            },
            body: JSON.stringify(payload)
        });

        const data = await response.json();

        if (!response.ok) {
            console.error('WhatsApp API Media Error:', data);
            throw new Error(data.message || 'Failed to send WhatsApp media');
        }

        // Log to Supabase
        Promise.resolve().then(async () => {
            try {
                await supabase.from('sms_logs').insert([{
                    type: 'whatsapp_media',
                    recipient: formattedNumber,
                    content: `Media File: ${fileName}`,
                    status: 'sent',
                    cost: 0
                }]);
            } catch (e) { }
        });

        return { success: true, data };
    } catch (error: any) {
        console.error('WhatsApp Service Media Error:', error);
        return { success: false, error: error.message };
    }
};

/**
 * High-Level Notification Wrappers
 */

const getFirstName = (order: any) => {
    const fullName = order.customer_name || order.customer?.name || 'Cliente';
    if (fullName.toLowerCase() === 'cliente') return 'Cliente';
    return fullName.trim().split(' ')[0];
};

export const notifyKitchenNewOrderWhatsApp = async (order: any, items: any[]) => {
    const kitchenPhone = '258879146662'; // Configured admin/kitchen number
    const itemsText = items.map(i => `${i.quantity}x ${i.name || i.product_name}`).join('\n');
    const typeText = order.delivery_type === 'dine_in' ? `Mesa ${order.table_zone}` : (order.delivery_type === 'delivery' ? 'Entrega' : 'Recolha');
    
    const message = `NOVO PEDIDO (COZINHA)\n\nPedido N. ${order.short_id || order.orderId || (order.id ? order.id.slice(-6).toUpperCase() : '')}\nTipo: ${typeText}\n\nArtigos a Preparar:\n${itemsText}\n\nNotas: ${order.notes || 'Nenhuma'}`;

    return await sendWhatsAppMessage(kitchenPhone, message);
};

export const notifyAdminSystemsAlert = async (title: string, details: string) => {
    const adminPhone = '258879146662'; // Configured admin number
    const message = `ALERTA DE SISTEMA\n\n${title}\n\nDetalhes:\n${details}\n\nVerifique o Painel de Administração para mais informações.`;
    return await sendWhatsAppMessage(adminPhone, message);
};

export const notifyAdminNewOrderWhatsApp = async (order: any, items: any[]) => {
    const adminPhone = '258879146662'; // Configured admin number
    const total = order.total_amount || order.total || 0;
    const itemsText = items.map(i => `${i.quantity}x ${i.name || i.product_name} - ${i.price} MT`).join('\n');
    const message = `NOVO PEDIDO (ADMIN)\n\nPedido N. ${order.short_id || order.orderId || (order.id ? order.id.slice(-6).toUpperCase() : '')}\nCliente: ${order.customer_name || 'Desconhecido'}\nTotal: ${total} MT\n\nResumo de Artigos:\n${itemsText}`;

    return await sendWhatsAppMessage(adminPhone, message);
};

export const notifyCustomerOrderStatusWhatsApp = async (order: any, newStatus: string) => {
    const customerPhone = order.customer_phone || order.phone || order.customer?.phone;
    if (!customerPhone) return { success: false, error: 'No customer phone provided' };

    let statusText = '';
    let extra = '';

    switch (newStatus) {
        case 'kitchen':
            statusText = 'Na Cozinha';
            extra = '\nO seu pedido foi recebido e já está na cozinha a ser preparado.';
            break;
        case 'processing':
            statusText = 'Em Preparação';
            extra = order.prep_time 
                ? `\nO seu pedido estara pronto em aproximadamente ${order.prep_time} minutos.`
                : '\nA sua encomenda já está a ser preparada.';
            break;
        case 'ready':
            statusText = 'Pronto';
            extra = order.delivery_type === 'delivery' 
                ? '\nA sua encomenda já está a caminho de si!'
                : '\nA sua encomenda já se encontra pronta e à sua espera!';
            break;
        case 'delivering':
            statusText = 'Em Trânsito';
            extra = '\nO nosso motorista já está a caminho com a sua encomenda.';
            break;
        case 'arrived':
            statusText = 'O Motorista Chegou';
            extra = '\nO motorista encontra-se no local de entrega. Por favor, prepare-se para o receber com o seu Código PIN.';
            break;
        case 'completed':
            statusText = 'Concluido';
            extra = '\nA sua encomenda foi entregue. Bom apetite.';
            break;
        default:
            statusText = newStatus;
    }

    const message = `O estado do seu pedido da Pão Caseiro acaba de ser atualizado:\n\nPedido N. ${order.short_id || order.orderId || (order.id ? order.id.slice(-6).toUpperCase() : '')}\nNovo Estado: ${statusText}${extra}\n\n_O sabor que aquece o seu coração!_`;

    return await sendWhatsAppMessage(customerPhone, message);
};

export const notifyCustomerDelayWhatsApp = async (order: any, delayMinutes: string, reason: string) => {
    const customerPhone = order.customer_phone || order.phone || order.customer?.phone;
    if (!customerPhone) return { success: false, error: 'No customer phone provided' };

    const message = `Atualização de Pedido\n\nPedido N. ${order.short_id || order.orderId || (order.id ? order.id.slice(-6).toUpperCase() : '')}\n\nSinceras desculpas, o seu pedido vai demorar mais *${delayMinutes} minutos* devido a: _${reason}_.\n\nAgradecemos a sua compreensão!\n\n_O sabor que aquece o seu coração!_`;
    
    return await sendWhatsAppMessage(customerPhone, message);
};

export const notifyCustomerNewOrderWhatsApp = async (order: any, items: any[]) => {
    const customerPhone = order.customer_phone || order.phone || order.customer?.phone;
    if (!customerPhone) return { success: false, error: 'No customer phone provided' };

    const itemsText = items.map(i => `${i.quantity}x ${i.name || i.product_name} - ${i.price} MT`).join('\n');
    const total = order.total_amount || order.total || 0;
    
    // Ensure the URL is always a public domain so WhatsApp makes it clickable (blue link).
    let baseUrl = 'https://paocaseiro.co.mz';
    if (typeof window !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1' && !window.location.hostname.startsWith('192.168.')) {
        baseUrl = window.location.origin;
    }
    const url = `${baseUrl}/order-receipt/${order.short_id || order.orderId || order.id}`;

    const firstName = getFirstName(order);
    const message = `Olá ${firstName},\n\nMuito obrigado.\nA sua encomenda foi confirmada com sucesso.\n\nDetalhes do Pedido N. ${order.short_id || order.orderId || (order.id ? order.id.slice(-6).toUpperCase() : '')}\n\nArtigos:\n${itemsText}\n\nTotal do recibo: ${total} MT\n\nCaso não consiga baixar o recibo em anexo, verifique-o através do link web abaixo:\n${url}\n\n_O sabor que aquece o seu coração!_`;

    try {
        const { generateFormalInvoicePDF } = await import('./pdfGenerator');
        const doc = await generateFormalInvoicePDF(order, items);
        const pdfBase64 = doc.output('datauristring').split(',')[1];
        
        return await sendWhatsAppMedia(
            customerPhone,
            'document',
            `Fatura-Recibo-PaoCaseiro-${order.short_id || order.id.slice(-6).toUpperCase()}.pdf`,
            message,
            pdfBase64
        );
    } catch(err) {
        console.error("Failed to generate PDF for WhatsApp, falling back to text:", err);
        return await sendWhatsAppMessage(customerPhone, message);
    }
};
