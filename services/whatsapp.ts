import { supabase } from './supabase';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

const EVOLUTION_API_URL = 'https://wa.zyphtech.com';
const INSTANCE_NAME = 'PAOCASEIRO';
const API_KEY = '429683C4C977415CAAFCCE10F7D57E11';

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

        const response = await fetch(`${EVOLUTION_API_URL}/message/sendText/${INSTANCE_NAME}`, {
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
export const sendWhatsAppMedia = async (to: string, media: string, mediatype: string, fileName: string, caption: string = '') => {
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

        const response = await fetch(`${EVOLUTION_API_URL}/message/sendMedia/${INSTANCE_NAME}`, {
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

export const notifyKitchenNewOrderWhatsApp = async (order: any, items: any[]) => {
    const kitchenPhone = '258879146662'; // Configured admin/kitchen number
    const itemsText = items.map(i => `${i.quantity}x ${i.name || i.product_name}`).join('\n');
    const typeText = order.delivery_type === 'dine_in' ? `Mesa ${order.table_zone}` : (order.delivery_type === 'delivery' ? 'Entrega' : 'Recolha');
    
    // NO EMOJIS!
    const message = `NOVO PEDIDO (COZINHA)\n\nPedido N. ${order.short_id || order.id.slice(-6).toUpperCase()}\nTipo: ${typeText}\n\nArtigos a Preparar:\n${itemsText}\n\nNotas: ${order.notes || 'Nenhuma'}`;

    return await sendWhatsAppMessage(kitchenPhone, message);
};

export const notifyAdminNewOrderWhatsApp = async (order: any, items: any[]) => {
    const adminPhone = '258879146662'; // Configured admin number
    const total = order.total_amount || order.total || 0;
    const itemsText = items.map(i => `${i.quantity}x ${i.name || i.product_name} - ${i.price} MT`).join('\n');

    const message = `NOVO PEDIDO (ADMIN)\n\nPedido N. ${order.short_id || order.id.slice(-6).toUpperCase()}\nCliente: ${order.customer_name || 'Desconhecido'}\nTotal: ${total} MT\n\nResumo de Artigos:\n${itemsText}`;

    return await sendWhatsAppMessage(adminPhone, message);
};

export const notifyCustomerOrderStatusWhatsApp = async (order: any, newStatus: string) => {
    const customerPhone = order.customer_phone || order.phone || order.customer?.phone;
    if (!customerPhone) return { success: false, error: 'No customer phone provided' };

    let statusText = '';
    let extra = '';

    switch (newStatus) {
        case 'processing':
            statusText = 'Em Preparação';
            extra = '\nA sua encomenda já está a ser preparada.';
            break;
        case 'ready':
            statusText = 'Pronto';
            extra = order.delivery_type === 'delivery' 
                ? '\nA sua encomenda será enviada muito em breve.'
                : '\nA sua encomenda está pronta para ser levantada.';
            break;
        case 'completed':
            statusText = 'Concluido';
            extra = '\nA sua encomenda foi entregue. Bom apetite.';
            break;
        default:
            statusText = newStatus;
    }

    const message = `Olá ${order.customer_name || 'Cliente'},\n\nO estado do seu pedido da Pao Caseiro acaba de ser atualizado:\n\nPedido N. ${order.short_id || order.id.slice(-6).toUpperCase()}\nNovo Estado: ${statusText}${extra}\n\nObrigado por preferir a Pao Caseiro.`;

    return await sendWhatsAppMessage(customerPhone, message);
};

export const notifyCustomerNewOrderWhatsApp = async (order: any, items: any[]) => {
    const customerPhone = order.customer_phone || order.phone || order.customer?.phone;
    if (!customerPhone) return { success: false, error: 'No customer phone provided' };

    const itemsText = items.map(i => `${i.quantity}x ${i.name || i.product_name} - ${i.price} MT`).join('\n');
    const total = order.total_amount || order.total || 0;
    const url = typeof window !== 'undefined' ? `${window.location.origin}/order-receipt/${order.short_id || order.id}` : `https://paocaseiro.co.mz/order-receipt/${order.short_id || order.id}`;

    const message = `Olá ${order.customer_name || 'Cliente'},\n\nMuito obrigado.\nA sua encomenda foi confirmada com sucesso.\n\nDetalhes do Pedido N. ${order.short_id || order.id.slice(-6).toUpperCase()}\n\nArtigos:\n${itemsText}\n\nTotal da fatura: ${total} MT\n\nCaso não consiga baixar o recibo em anexo, verifique a fatura web no link abaixo:\n${url}`;

    try {
        const doc = new jsPDF();
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(22);
        doc.text("Pao Caseiro", 14, 20);
        
        doc.setFontSize(14);
        doc.setTextColor(100);
        doc.text(`Fatura N.: FAT-${order.short_id || order.id.slice(-6).toUpperCase()}`, 14, 30);
        
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(11);
        doc.setTextColor(0);
        doc.text(`Data: ${new Date().toLocaleDateString('pt-PT')}`, 14, 40);
        doc.text(`Cliente: ${order.customer_name || 'Cliente'}`, 14, 46);
        
        const tableData = items.map(i => [
            i.name || i.product_name, 
            i.quantity.toString(), 
            `${i.price} MT`, 
            `${(i.price * i.quantity)} MT`
        ]);
        
        autoTable(doc, {
            startY: 55,
            head: [['Artigo', 'Qtd', 'Preco Unit', 'Subtotal']],
            body: tableData,
            theme: 'striped',
            headStyles: { fillColor: [59, 47, 47] }
        });
        
        const finalY = (doc as any).lastAutoTable.finalY || 55;
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(14);
        doc.text(`Total a Pagar: ${total} MT`, 14, finalY + 15);
        
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        doc.setTextColor(150);
        doc.text("Obrigado pela sua preferencia.", 14, finalY + 30);

        const pdfBase64 = doc.output('datauristring').split(',')[1];
        
        return await sendWhatsAppMedia(
            customerPhone,
            'document',
            `Fatura-PaoCaseiro-${order.short_id || order.id.slice(-6).toUpperCase()}.pdf`,
            message,
            pdfBase64
        );
    } catch(err) {
        console.error("Failed to generate PDF for WhatsApp, falling back to text:", err);
        return await sendWhatsAppMessage(customerPhone, message);
    }
};
