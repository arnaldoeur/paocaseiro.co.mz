import { supabase } from './supabase';
import { NotificationService } from './NotificationService';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

const INSTANCE_NAME = import.meta.env.VITE_WHATSAPP_INSTANCE_NAME || 'Zyph Tech, Lda';

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
 * Send a Text Message via WhatsApp via Supabase Edge Function
 */
export const sendWhatsAppMessage = async (to: string, text: string) => {
    if (!to) return { success: false, error: 'No phone number provided' };
    
    const formattedNumber = formatPhone(to);
    
    try {
        const { data, error } = await supabase.functions.invoke('notify-whatsapp', {
            body: {
                number: formattedNumber,
                text: text
            }
        });

        if (error) throw error;

        console.log('WhatsApp success response:', data);

        // Async log success
        supabase.from('sms_logs').insert([{
            type: 'whatsapp',
            recipient: formattedNumber,
            content: text.substring(0, 200), // Log snippet
            status: 'sent',
            cost: 0
        }]).catch(e => console.error('[WhatsApp Log Error]', e));

        return { success: true, data };
    } catch (error: any) {
        console.error('WhatsApp Service Error:', error);
        
        // Async log error
        supabase.from('sms_logs').insert([{
            type: 'whatsapp_error',
            recipient: formattedNumber,
            content: error.message,
            status: 'error',
            cost: 0
        }]).catch(e => console.error('[WhatsApp Log Error]', e));

        // Log to Notification Center
        NotificationService.logSystemEvent(
            "Falha no WhatsApp", 
            `Não foi possível enviar mensagem para ${formattedNumber}. Erro: ${error.message}`, 
            'SYSTEM', 
            'error'
        ).catch(() => {});

        throw error;
    }
};

/**
 * Send Media (PDF/Image) via WhatsApp via Supabase Edge Function
 */
export const sendWhatsAppMedia = async (to: string, mediatype: string, fileName: string, caption: string, media: string) => {
    if (!to) return { success: false, error: 'No phone number provided' };
    
    const formattedNumber = formatPhone(to);
    
    try {
        const { data, error } = await supabase.functions.invoke('notify-whatsapp', {
            body: {
                number: formattedNumber,
                media: media,
                mediatype: mediatype,
                fileName: fileName,
                caption: caption
            }
        });

        if (error) throw error;

        // Log to Supabase
        supabase.from('sms_logs').insert([{
            type: 'whatsapp_media',
            recipient: formattedNumber,
            content: `Media: ${fileName}`,
            status: 'sent',
            cost: 0
        }]).catch(e => console.error('[WhatsApp Media Log Error]', e));

        return { success: true, data };
    } catch (error: any) {
        console.error('WhatsApp Service Media Error:', error);
        throw error;
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
    const itemsText = items.map(i => `• ${i.quantity}x ${i.name || i.product_name}`).join('\n');
    const typeText = order.delivery_type === 'dine_in' ? `🪑 Mesa ${order.table_zone}` : (order.delivery_type === 'delivery' ? '🛵 Entrega' : '🏷️ Recolha');
    
    const message = `👨‍🍳 *NOVO PEDIDO (COZINHA)*\n\n📌 *Pedido N.* #${order.short_id || order.orderId || (order.id ? order.id.slice(-6).toUpperCase() : '')}\n${typeText}\n\n📝 *Artigos a Preparar:*\n${itemsText}\n\n🛑 *Notas:* ${order.notes || 'Nenhuma'}`;

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
    const itemsText = items.map(i => `• ${i.quantity}x ${i.name || i.product_name} - ${i.price} MT`).join('\n');
    const message = `💰 *NOVO PEDIDO (ADMIN)*\n\n📌 *Pedido N.* #${order.short_id || order.orderId || (order.id ? order.id.slice(-6).toUpperCase() : '')}\n👤 *Cliente:* ${order.customer_name || 'Desconhecido'}\n💵 *Total:* ${total} MT\n\n📝 *Resumo:*\n${itemsText}`;

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

    const message = `🔔 *Atualização de Pedido*\n\nO estado do seu pedido da *Pão Caseiro* acaba de ser atualizado:\n\n📌 *Pedido N.* #${order.short_id || order.orderId || (order.id ? order.id.slice(-6).toUpperCase() : '')}\n✨ *Novo Estado:* ${statusText}${extra}\n\n_O sabor que aquece o seu coração!_`;

    return await sendWhatsAppMessage(customerPhone, message);
};

export const notifyCustomerDelayWhatsApp = async (order: any, delayMinutes: string, reason: string) => {
    const customerPhone = order.customer_phone || order.phone || order.customer?.phone;
    if (!customerPhone) return { success: false, error: 'No customer phone provided' };

    const message = `⚠️ *Atualização de Pedido*\n\n📌 *Pedido N.* #${order.short_id || order.orderId || (order.id ? order.id.slice(-6).toUpperCase() : '')}\n\nSinceras desculpas, o seu pedido vai demorar mais *${delayMinutes} minutos* devido a: _${reason}_.\n\nAgradecemos a sua compreensão! 🙏\n\n_O sabor que aquece o seu coração!_`;
    
    return await sendWhatsAppMessage(customerPhone, message);
};

export const notifyCustomerNewOrderWhatsApp = async (order: any, items: any[], customCompanyInfo: any = null) => {
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
    const message = `*🍞 Pão Caseiro — Encomenda Confirmada!*\n\nOlá ${firstName}, muito obrigado por escolher o sabor do nosso coração! 🤎\n\n📦 *Pedido:* #${order.short_id || order.orderId || (order.id ? order.id.slice(-6).toUpperCase() : '')}\n💰 *Total:* ${total} MT\n\n📝 *Artigos:*\n${itemsText}\n\n🔗 *Ver Recibo Online:*\n${url}\n\n_Enviamos em anexo a sua Fatura-Recibo oficial._\n\n*O sabor que aquece o seu coração!*`;

    // A very short non-intrusive caption to embed directly below the Receipt PDF.
    const pdfCaption = `*🍞 Pão Caseiro* — Fatura/Recibo anexo. Obrigado pela preferência!`;

    try {
        const { generateFormalInvoicePDF } = await import('./pdfGenerator');
        
        let companyInfo = customCompanyInfo;
        if (!companyInfo) {
            try {
                // Dynamic import to avoid circular dependency
                const { getCompanySettings } = await import('./supabase');
                companyInfo = await getCompanySettings();
            } catch (err) {
                console.error("Failed to fetch settings for WhatsApp:", err);
            }
        }

        const doc = await generateFormalInvoicePDF(order, items, companyInfo);
        const pdfBase64 = doc.output('datauristring').split(',')[1];
        
        return await sendWhatsAppMedia(
            customerPhone,
            'document',
            `Fatura-Recibo-PaoCaseiro-${order.short_id || order.id.slice(-6).toUpperCase()}.pdf`,
            pdfCaption,
            pdfBase64
        );
    } catch(err) {
        console.error("Failed to generate PDF for WhatsApp, falling back to text:", err);
        return await sendWhatsAppMessage(customerPhone, message);
    }
};
