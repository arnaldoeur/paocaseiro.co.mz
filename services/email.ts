// services/email.ts
import { formatProductName } from './stringUtils';

/**
 * Service to handle Email notifications via Resend API (routed through Vite proxy)
 */

const RESEND_API_KEY = 're_S6EgeUY6_L24YuNaVSrmAC265zq9wQxwh';
const DEFAULT_FROM = 'Pão Caseiro <sistema@paocaseiro.co.mz>';
const LOGO_URL = 'https://paocaseiro.co.mz/paocaseiropng.png';


/**
 * Base template for all branded emails
 */
const brandedEmailLayout = (content: string) => `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f7f1eb; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.1);">
        <div style="background-color: #3b2f2f; padding: 30px; text-align: center;">
            <img src="${LOGO_URL}" alt="Pão Caseiro" style="width: 120px; height: auto; margin-bottom: 10px;">
            <h1 style="color: #d9a65a; margin: 0; font-size: 24px; letter-spacing: 2px; text-transform: uppercase;">Pão Caseiro</h1>
            <p style="color: #f7f1eb; margin: 5px 0 0; font-size: 14px; opacity: 0.8; font-style: italic;">O Sabor da Tradição na Sua Mesa</p>
        </div>
        <div style="padding: 40px; color: #3b2f2f; line-height: 1.6;">
            ${content}
        </div>
        <div style="background-color: #4b3a2f; padding: 20px; text-align: center; color: #f7f1eb; font-size: 12px;">
            <p style="margin: 0;">&copy; ${new Date().getFullYear()} Padaria e Pastelaria Pão Caseiro (Moçambique)</p>
            <p style="margin: 5px 0 0; opacity: 0.7;">Av. acordo Lusaka Lichinga Niassa, 3300, Moçambique</p>
            <p style="margin: 15px 0 0; font-weight: bold; color: #d9a65a;">Este é um email automático, por favor não responda.</p>
        </div>
    </div>
`;

/**
 * Send an email using the Resend API via Vite Proxy.
 */
export const sendEmail = async (to: string[], subject: string, html: string, replyTo?: string, fromOverride?: string, bcc: string[] = []) => {
    try {
        // Automatically CC the bakery on all platform dispatch emails so they never miss anything
        const finalBcc = Array.from(new Set([...bcc, 'geral@paocaseiro.co.mz']));

        const payload: any = {
            from: fromOverride || DEFAULT_FROM,
            to,
            subject,
            html: brandedEmailLayout(html),
            bcc: finalBcc
        };

        if (replyTo) {
            payload.reply_to = replyTo;
        }

        // Using /api/resend proxy to avoid CORS
        const response = await fetch('/api/resend/emails', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${RESEND_API_KEY}`,
                'Accept': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        // Some error cases might not return JSON, handle carefully
        const data = await response.json().catch(() => ({ message: 'Unexpected response from server' }));

        if (!response.ok) {
            console.error('Resend API Error:', data);
            throw new Error(data.message || 'Failed to send email');
        }

        console.log('Email sent successfully:', data);
        return { success: true, data };
    } catch (error: any) {
        console.error('Email service error:', error);
        return { success: false, error: error.message };
    }
};

/**
 * Branded OTP email template.
 */
export const sendOTPEmail = async (toEmail: string, otpCode: string) => {
    const html = `
        <div style="text-align: center;">
            <h2 style="color: #3b2f2f;">Seu Código de Acesso</h2>
            <p style="font-size: 16px;">Utilize o código abaixo para validar o seu acesso no portal da Pão Caseiro:</p>
            <div style="margin: 30px 0; background: #ffffff; padding: 20px; border: 2px dashed #d9a65a; border-radius: 12px; display: inline-block;">
                <h1 style="margin: 0; color: #d9a65a; font-size: 42px; letter-spacing: 10px; font-family: monospace;">${otpCode}</h1>
            </div>
            <p style="color: #666; font-size: 14px;">Este código é válido por 10 minutos. Se você não solicitou este código, ignore este email.</p>
        </div>
    `;

    return sendEmail([toEmail], 'Código de Acesso - Pão Caseiro', html);
};

/**
 * Order Receipt / Confirmation email for Customers
 */
export const sendOrderConfirmationEmail = async (order: any, items: any[]) => {
    // If there is no customer email, do not send the customer receipt
    const customerEmail = order.customer_email || order.email;
    if (!customerEmail) return { success: false, error: 'No email provided by customer' };

    const domain = window.location.origin;
    const receiptLink = `${domain}/order-receipt/${order.short_id || order.id}`;

    const itemsHtml = items.map(item => `
        <tr>
            <td style="padding: 10px 0; border-bottom: 1px solid #eee;">${item.quantity}x ${formatProductName(item.name || item.product_name)}</td>
            <td style="padding: 10px 0; border-bottom: 1px solid #eee; text-align: right;">${item.price} MT</td>
        </tr>
    `).join('');

    const html = `
        <h2 style="color: #3b2f2f;">Detalhes do Pedido</h2>
        <p>Olá, <strong>${order.customer_name || 'Cliente'}</strong>.</p>
        <p>Recebemos o registo do seu pedido #${order.short_id || order.id.slice(-6).toUpperCase()}.</p>
        
        <div style="background: #ffffff; padding: 20px; border-radius: 12px; margin: 25px 0; border: 1px solid #eee;">
            <h3 style="margin-top: 0; border-bottom: 2px solid #f7f1eb; padding-bottom: 10px;">Resumo</h3>
            <table style="width: 100%; border-collapse: collapse;">
                ${itemsHtml}
                <tr>
                    <td style="padding: 15px 0 0; font-weight: bold;">Total</td>
                    <td style="padding: 15px 0 0; font-weight: bold; text-align: right; color: #d9a65a; font-size: 18px;">${order.total_amount || order.total} MT</td>
                </tr>
            </table>
        </div>

        <div style="text-align: center; margin: 30px 0;">
            <a href="${receiptLink}" style="background-color: #d9a65a; color: #3b2f2f; padding: 15px 30px; text-decoration: none; border-radius: 30px; font-weight: bold; display: inline-block;">VER FATURA / RECIBO</a>
        </div>

        <p style="font-size: 14px; color: #666;">
            <strong>Morada de Entrega:</strong><br>
            ${order.customer_address || order.delivery_address || 'Ponto de recolha na padaria'}
        </p>

        <p style="margin-top: 30px;">Obrigado por escolher a Pão Caseiro!</p>
    `;

    return sendEmail(
        [customerEmail],
        `Pedido #${order.short_id || order.id.slice(-6).toUpperCase()} - Pão Caseiro`,
        html
    );
};

/**
 * Detailed New Order notification sent directly to the Admin.
 */
export const sendAdminNewOrderNotification = async (order: any, items: any[]) => {
    const adminEmail = 'geral@paocaseiro.co.mz';
    const domain = window.location.origin;
    const orderLink = `${domain}/admin`; // Direct link to dashboard
    const receiptLink = `${domain}/order-receipt/${order.short_id || order.id}`;

    const itemsHtml = items.map(i => `
        <tr style="border-bottom: 1px solid #eee;">
            <td style="padding: 10px; font-weight: bold;">${i.quantity}x</td>
            <td style="padding: 10px;">${formatProductName(i.name || i.product_name)}</td>
            <td style="padding: 10px; text-align: right;">${i.price * i.quantity} MT</td>
        </tr>
    `).join('');

    let deliveryDetails = '';
    const type = order.delivery_type || order.type || 'N/A';

    if (type === 'delivery') {
        deliveryDetails = `
            <p><strong>Morada de Entrega:</strong> ${order.delivery_address || order.address || 'Não indicada'}</p>
        `;
    } else if (type === 'dine_in') {
        deliveryDetails = `
            <p><strong>Zona (Mesa):</strong> ${order.table_zone || 'N/A'}</p>
            <p><strong>Nº Pessoas:</strong> ${order.table_people || 'N/A'}</p>
        `;
    }

    const html = `
        <div style="text-align: center; margin-bottom: 20px;">
            <div style="background-color: #d9a65a; color: #3b2f2f; display: inline-block; padding: 10px 20px; border-radius: 20px; font-weight: bold; font-size: 16px;">
                NOVO PEDIDO ONLINE
            </div>
        </div>

        <h2 style="color: #3b2f2f; border-bottom: 2px solid #d9a65a; padding-bottom: 10px;">Encomenda #${order.short_id || order.id.slice(-6).toUpperCase()}</h2>
        
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; background-color: #f9f9f9;">
            <tr>
                <td style="padding: 10px; border: 1px solid #ddd;"><strong>Cliente:</strong> ${order.customer_name || 'Desconhecido'}</td>
                <td style="padding: 10px; border: 1px solid #ddd;"><strong>Tipo:</strong> <span style="text-transform: uppercase;">${type.replace('_', ' ')}</span></td>
            </tr>
            <tr>
                <td style="padding: 10px; border: 1px solid #ddd;"><strong>Telemóvel:</strong> ${order.customer_phone || order.phone}</td>
                <td style="padding: 10px; border: 1px solid #ddd;"><strong>Valor Base:</strong> ${order.total_amount || order.total || 0} MT</td>
            </tr>
            <tr>
                <td style="padding: 10px; border: 1px solid #ddd;" colspan="2"><strong>Notas Cliente:</strong> ${order.notes || 'Nenhuma'}</td>
            </tr>
        </table>

        ${deliveryDetails}

        <h3 style="color: #3b2f2f; margin-top: 20px;">Itens Solicitados</h3>
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 30px;">
            <thead style="background-color: #3b2f2f; color: #f7f1eb;">
                <tr>
                    <th style="padding: 10px; text-align: left;">Qtd</th>
                    <th style="padding: 10px; text-align: left;">Artigo</th>
                    <th style="padding: 10px; text-align: right;">Total</th>
                </tr>
            </thead>
            <tbody>
                ${itemsHtml}
            </tbody>
        </table>

         <div style="text-align: center; margin-top: 40px; display: flex; gap: 10px; justify-content: center;">
            <a href="${orderLink}" style="background-color: #3b2f2f; color: #d9a65a; padding: 15px 30px; border-radius: 8px; text-decoration: none; font-weight: bold; display: inline-block;">Abrir Painel Admin</a>
            <a href="${receiptLink}" style="background-color: #f7f1eb; color: #3b2f2f; border: 2px solid #d9a65a; padding: 15px 30px; border-radius: 8px; text-decoration: none; font-weight: bold; display: inline-block;">Ver Fatura/Recibo</a>
        </div>
    `;

    return sendEmail(
        [adminEmail],
        `[NOVO PEDIDO] #${order.short_id || order.id.slice(-6).toUpperCase()} - ${order.customer_name || 'Cliente'}`,
        html
    );
};

/**
 * Delivery Start notification for Customers
 */
export const sendDeliveryNotificationEmail = async (order: any, items: any[]) => {
    const customerEmail = order.customer_email || order.customer?.email || order.email;
    if (!customerEmail) return { success: false, error: 'No email provided' };

    const domain = window.location.origin;
    const receiptLink = `${domain}/order-receipt/${order.short_id || order.orderId}`;

    const itemsHtml = items.map(item => `
        <tr>
            <td style="padding: 10px 0; border-bottom: 1px solid #eee;">${item.quantity}x ${formatProductName(item.name || item.product_name)}</td>
            <td style="padding: 10px 0; border-bottom: 1px solid #eee; text-align: right;">${item.price} MT</td>
        </tr>
    `).join('');

    const html = `
        <div style="text-align: center; margin-bottom: 20px;">
            <div style="background-color: #d9a65a; color: #3b2f2f; display: inline-block; padding: 8px 15px; border-radius: 20px; font-weight: bold; font-size: 14px; text-transform: uppercase;">
                Pedido em Rota de Entrega
            </div>
        </div>

        <h2 style="color: #3b2f2f;">O seu pedido está a caminho!</h2>
        <p>Olá, <strong>${order.customer_name || 'Cliente'}</strong>.</p>
        <p>O seu pedido #${order.short_id || order.orderId} já saiu da nossa padaria e o nosso estafeta está em rota para a sua localização.</p>

        <div style="background: #ffffff; padding: 20px; border-radius: 12px; margin: 25px 0; border: 1px solid #eee;">
            <h3 style="margin-top: 0; border-bottom: 2px solid #f7f1eb; padding-bottom: 10px;">Resumo do Pedido</h3>
            <table style="width: 100%; border-collapse: collapse;">
                ${itemsHtml}
                <tr>
                    <td style="padding: 15px 0 0; font-weight: bold;">Total</td>
                    <td style="padding: 15px 0 0; font-weight: bold; text-align: right; color: #d9a65a; font-size: 18px;">${order.total || 0} MT</td>
                </tr>
            </table>
        </div>

        <div style="background-color: #fcfbf9; padding: 20px; border-radius: 12px; border: 1px solid #d9a65a; margin-bottom: 30px;">
            <p style="margin: 0; color: #888; font-size: 12px; text-transform: uppercase; font-weight: bold; text-align: center;">Código de Confirmação (OTP)</p>
            <h1 style="margin: 10px 0; color: #3b2f2f; font-size: 32px; letter-spacing: 5px; text-align: center;">${order.otp || '----'}</h1>
            <p style="margin: 0; color: #666; font-size: 12px; text-align: center;">Por favor, forneça este código ao estafeta no momento da entrega.</p>
        </div>

        <div style="text-align: center; margin: 30px 0;">
            <a href="${receiptLink}" style="background-color: #3b2f2f; color: #d9a65a; padding: 15px 30px; text-decoration: none; border-radius: 30px; font-weight: bold; display: inline-block;">RASTREAR / VER RECIBO</a>
        </div>

        <p style="font-size: 14px; color: #666;">
            <strong>Endereço de Entrega:</strong><br>
            ${order.customer_address || order.delivery_address || 'Conforme indicado no pedido'}
        </p>

        <p style="margin-top: 30px;">Prepare a mesa, o sabor que aquece o coração está a chegar!</p>
    `;

    return sendEmail(
        [customerEmail],
        `Pedido #${order.short_id || order.orderId} a caminho! - Pão Caseiro`,
        html
    );
};
