import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { hostingerService } from './hostingerService';
import { generateFormalInvoicePDF } from './pdfGenerator';
import { getCompanySettings } from './billingService';

const IS_PROD = typeof window !== 'undefined' && !window.location.hostname.includes('localhost');
const API_URL = IS_PROD 
    ? `${window.location.origin}/whatsapp_proxy.php`
    : (import.meta.env.VITE_WHATSAPP_API_URL || 'https://wa.zyphtech.com');
const INSTANCE_NAME = import.meta.env.VITE_WHATSAPP_INSTANCE_NAME || 'Pao caseiro';
const API_KEY = import.meta.env.VITE_WHATSAPP_API_KEY || '84E61FAAB9AB-47FD-8F42-EAFE4DAB9C49';

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
        // Use Hostinger Bridge in production for better reliability and bypassing CORS
        if (IS_PROD) {
            return await hostingerService.fetch('send_whatsapp', {
                number: formattedNumber,
                text: text,
                instance: INSTANCE_NAME
            });
        }

        // Dev/Local fallback
        const endpoint = `/message/sendText/${encodeURIComponent(INSTANCE_NAME)}`;
        const url = `${API_URL}${endpoint}`;

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'apikey': API_KEY
            },
            body: JSON.stringify({
                number: formattedNumber,
                options: {
                    delay: 1200,
                    presence: "composing",
                    linkPreview: false
                },
                text: text
            })
        });

        const data = await response.json();

        // Log success/attempt to local DB via bridge
        hostingerService.logNotification('whatsapp', formattedNumber, text.substring(0, 200), response.ok ? 'sent' : 'error')
            .catch(e => console.error('[WhatsApp Log Error]', e));

        if (!response.ok) throw new Error(data.message || 'Failed to send WhatsApp message');

        return { success: true, data };
    } catch (error: any) {
        console.error('WhatsApp Service Error:', error);
        
        // Fallback to Hostinger Bridge if direct call fails (CORS or other)
        try {
            console.log('Attempting fallback via Hostinger Bridge...');
            const data = await hostingerService.fetch('send_whatsapp', {
                number: formattedNumber,
                text: text
            });
            return { success: true, data };
        } catch (fallbackError) {
            hostingerService.logNotification('whatsapp', formattedNumber, error.message, 'error')
                .catch(e => console.error('[WhatsApp Log Error]', e));
            throw error;
        }
    }
};

/**
 * Send Media (PDF/Image) via WhatsApp
 */
export const sendWhatsAppMedia = async (to: string, mediatype: string, fileName: string, caption: string, media: string) => {
    if (!to) return { success: false, error: 'No phone number provided' };
    
    const formattedNumber = formatPhone(to);
    
    try {
        // Use Hostinger Bridge in production
        if (IS_PROD) {
            return await hostingerService.fetch('send_whatsapp', {
                number: formattedNumber,
                media: media,
                mediatype: mediatype,
                fileName: fileName,
                caption: caption,
                instance: INSTANCE_NAME
            });
        }

        // Dev/Local fallback
        const endpoint = `/message/sendMedia/${encodeURIComponent(INSTANCE_NAME)}`;
        const url = `${API_URL}${endpoint}`;

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'apikey': API_KEY
            },
            body: JSON.stringify({
                number: formattedNumber,
                mediatype: mediatype,
                media: media,
                fileName: fileName,
                caption: caption
            })
        });

        const data = await response.json();

        // Log to local DB
        hostingerService.logNotification('whatsapp', formattedNumber, `Media: ${fileName}`, response.ok ? 'sent' : 'error')
            .catch(e => console.error('[WhatsApp Media Log Error]', e));

        if (!response.ok) throw new Error(data.message || 'Failed to send WhatsApp media');

        return { success: true, data };
    } catch (error: any) {
        console.error('WhatsApp Service Media Error:', error);
        
        // Fallback to Hostinger Bridge
        try {
            const data = await hostingerService.fetch('send_whatsapp', {
                number: formattedNumber,
                media: media,
                mediatype: mediatype,
                fileName: fileName,
                caption: caption
            });
            return { success: true, data };
        } catch (fallbackError) {
            hostingerService.logNotification('whatsapp', formattedNumber, error.message, 'error')
                .catch(e => console.error('[WhatsApp Log Error]', e));
            throw error;
        }
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
    const kitchenPhone = '258876666903'; // Updated as per user request
    const itemsText = items.map(i => `• ${i.quantity}x ${i.name || i.product_name}`).join('\n');
    const typeText = order.delivery_type === 'dine_in' ? `🪑 Mesa ${order.table_zone}` : (order.delivery_type === 'delivery' ? '🛵 Entrega' : '🏷️ Recolha');
    
    const message = `👨‍🍳 *NOVO PEDIDO (COZINHA)*\n\n📌 *Pedido N.* #${order.short_id || order.orderId || (order.id ? order.id.slice(-6).toUpperCase() : '')}\n${typeText}\n\n📝 *Artigos a Preparar:*\n${itemsText}\n\n🛑 *Notas:* ${order.notes || 'Nenhuma'}`;

    return await sendWhatsAppMessage(kitchenPhone, message);
};

export const notifyAdminSystemsAlert = async (title: string, details: string) => {
    const adminPhone = '258876666903'; // Updated as per user request
    const message = `ALERTA DE SISTEMA\n\n${title}\n\nDetalhes:\n${details}\n\nVerifique o Painel de Administração para mais informações.`;
    return await sendWhatsAppMessage(adminPhone, message);
};

export const notifyAdminNewOrderWhatsApp = async (order: any, items: any[]) => {
    const adminPhone = '258876666903'; // Updated as per user request
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
    
    const baseUrl = 'https://paocaseiro.co.mz';
    const url = `${baseUrl}/order-receipt/${order.short_id || order.orderId || order.id}`;

    const firstName = getFirstName(order);

    let paymentInstructions = '';

    const message = `*🍞 Pão Caseiro — Encomenda Confirmada!*\n\nOlá ${firstName}, muito obrigado por escolher a nossa padaria! 🍞\n\n📦 *Pedido:* #${order.short_id || order.orderId || (order.id ? order.id.slice(-6).toUpperCase() : '')}\n💰 *Total:* ${total} MT\n\n📝 *Artigos:*\n${itemsText}${paymentInstructions}\n\n🔗 *Ver Recibo Online:*\n${url}\n\n*O sabor que aquece o seu coração!*`;

    // Send the complete message as the PDF caption
    const pdfCaption = message;

    try {
        let companyInfo = customCompanyInfo;
        if (!companyInfo) {
            try {
                companyInfo = await getCompanySettings();
            } catch (err) {
                console.error("Failed to fetch settings for WhatsApp:", err);
            }
        }

        const doc = await generateFormalInvoicePDF(order, items, companyInfo);
        const pdfBase64 = doc.output('datauristring').split(',')[1];
        
        const shortIdStr = order.short_id || order.orderId || (order.id ? order.id.slice(-6).toUpperCase() : 'UNKNOWN');

        return await sendWhatsAppMedia(
            customerPhone,
            'document',
            `Fatura-Recibo-PaoCaseiro-${shortIdStr}.pdf`,
            pdfCaption,
            pdfBase64
        );
    } catch(err) {
        console.error("Failed to generate PDF for WhatsApp, falling back to text:", err);
        return await sendWhatsAppMessage(customerPhone, message);
    }
};

/**
 * Send Birthday Greeting via WhatsApp
 */
export const notifyCustomerBirthdayWhatsApp = async (customerName: string, phone: string) => {
    const firstName = customerName ? customerName.trim().split(' ')[0] : 'Cliente';
    const message = `🎉 *Parabéns, ${firstName}!* 🎂\n\nA equipe da *Pão Caseiro* deseja-lhe um dia repleto de doçura e alegria! Que a sua vida seja sempre como o nosso pão: quentinha e cheia de amor. 🤎\n\nComo presente, temos um mimo especial para si na sua próxima visita! 🍞✨\n\n_O sabor que aquece o seu coração!_`;
    return await sendWhatsAppMessage(phone, message);
};
