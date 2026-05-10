import { formatProductName } from './stringUtils';

/**
 * Service to handle Email notifications via Resend API (routed through Hostinger Bridge)
 */

const DEFAULT_FROM = 'Pão Caseiro <sistema@paocaseiro.co.mz>';
const PRODUCTION_URL = 'https://paocaseiro.co.mz';
const FALLBACK_LOGO_URL = 'https://paocaseiro.co.mz/logo_on_dark.png';

/**
 * Base template for all branded emails
 */
const brandedEmailLayout = (content: string) => `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f7f1eb; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.1);">
        <div style="background-color: #3b2f2f; padding: 30px; text-align: center;">
            <img src="${FALLBACK_LOGO_URL}" alt="Pão Caseiro" style="width: 120px; height: auto; margin-bottom: 10px;">
            <h1 style="color: #d9a65a; margin: 0; font-size: 24px; letter-spacing: 2px; text-transform: uppercase;">Pão Caseiro</h1>
            <p style="color: #f7f1eb; margin: 5px 0 0; font-size: 14px; opacity: 0.8; font-style: italic;">O Sabor que Aquece o Coração</p>
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

import { hostingerService } from './hostingerService';

/**
 * Send an email using the Resend API via Hostinger Bridge.
 */
export const sendEmail = async (to: string[], subject: string, html: string, replyTo?: string, fromOverride?: string, bcc: string[] = [], attachments: any[] = []) => {
    try {
        const payload: any = {
            to,
            subject,
            html: brandedEmailLayout(html)
        };

        if (replyTo) payload.reply_to = replyTo;
        if (fromOverride) payload.from = fromOverride;
        if (bcc && bcc.length > 0) payload.bcc = bcc;
        if (attachments && attachments.length > 0) payload.attachments = attachments;

        const data = await hostingerService.fetch('send_email', payload);

        // Log to local DB
        hostingerService.logNotification('email', to.join(', '), subject, 'sent')
            .catch(e => console.error('[Email Log Error]', e));

        return { success: true, data };
    } catch (error: any) {
        console.error('Email service error:', error);
        
        // Log error to local DB
        hostingerService.logNotification('email', to.join(', '), error.message, 'error')
            .catch(e => console.error('[Email Log Error]', e));

        // Re-throw to allow callers (like UI components) to handle the error
        throw error;
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

    const domain = PRODUCTION_URL;
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
 * Password Reset Email for Customers
 */
export const sendPasswordResetEmail = async (email: string, name: string, newPassword: string) => {
    const html = `
        <h2 style="color: #3b2f2f; text-align: center;">Redefinição de Senha</h2>
        <p>Olá, <strong>${name}</strong>!</p>
        <p>A sua palavra-passe de acesso ao portal da Pão Caseiro foi redefinida com sucesso conforme solicitado.</p>
        
        <div style="background-color: #fcfbf9; padding: 25px; border-radius: 12px; margin: 25px 0; text-align: center; border: 1px solid #d9a65a;">
            <p style="margin: 0; color: #888; font-size: 12px; text-transform: uppercase; font-weight: bold;">Nova Palavra-passe</p>
            <h3 style="margin: 10px 0; color: #3b2f2f; font-size: 28px; letter-spacing: 3px;">${newPassword}</h3>
        </div>

        <p style="text-align: center;">Recomendamos que altere a sua senha após o primeiro acesso para garantir a segurança da sua conta.</p>

        <div style="text-align: center; margin: 30px 0;">
            <a href="${window.location.origin}/login" style="background-color: #3b2f2f; color: #d9a65a; padding: 15px 30px; text-decoration: none; border-radius: 30px; font-weight: bold; display: inline-block;">ENTRAR NA CONTA</a>
        </div>

        <p style="font-size: 12px; color: #999; text-align: center; margin-top: 20px;">
            Se não solicitou esta alteração, por favor contacte a nossa equipa de suporte imediatamente.
        </p>
    `;

    return sendEmail([email], 'Nova Palavra-passe - Pão Caseiro', html);
};

/**
 * Detailed New Order notification sent directly to the Admin.
 */
export const sendAdminNewOrderNotification = async (order: any, items: any[]) => {
    const getAdminEmail = () => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('team_numbers');
            if (saved) return JSON.parse(saved).adminEmail;
        }
        return 'geral@paocaseiro.co.mz';
    };

    const adminEmail = getAdminEmail();
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

/**
 * Order Status Update email for Customers and Bakery
 */
export const notifyOrderStatusUpdateEmail = async (order: any) => {
    const customerEmail = order.customer_email || order.customer?.email || order.email;
    const getAdminEmail = () => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('team_numbers');
            if (saved) return JSON.parse(saved).adminEmail;
        }
        return 'geral@paocaseiro.co.mz';
    };
    const adminEmail = getAdminEmail();

    const statusMap: Record<string, string> = {
        'kitchen': 'Em Preparação (Na Cozinha)',
        'ready': 'Pronto para Levantamento',
        'completed': 'Concluído / Entregue',
        'cancelled': 'Cancelado'
    };

    const statusText = statusMap[order.status] || order.status;
    const domain = window.location.origin;
    const receiptLink = `${domain}/order-receipt/${order.short_id || order.orderId}`;

    const html = `
        <div style="text-align: center; margin-bottom: 20px;">
            <div style="background-color: #3b2f2f; color: #d9a65a; display: inline-block; padding: 8px 15px; border-radius: 20px; font-weight: bold; font-size: 14px; text-transform: uppercase;">
                Atualização de Pedido
            </div>
        </div>

        <h2 style="color: #3b2f2f; text-align: center;">O seu pedido #${order.short_id || order.orderId} está ${statusText}!</h2>
        <p>Olá, <strong>${order.customer_name || order.customer?.name || 'Cliente'}</strong>.</p>
        <p>Gostaríamos de informar que o estado do seu pedido foi atualizado para: <strong>${statusText}</strong>.</p>

        ${order.status === 'ready' ? `
            <div style="background-color: #d9a65a; color: #3b2f2f; padding: 20px; border-radius: 12px; margin: 25px 0; text-align: center;">
                <h3 style="margin: 0;">🎉 Já pode vir levantar!</h3>
                <p style="margin: 10px 0 0;">O seu pedido está fresquinho e à sua espera na nossa padaria.</p>
            </div>
        ` : ''}

        <div style="text-align: center; margin: 30px 0;">
            <a href="${receiptLink}" style="background-color: #3b2f2f; color: #d9a65a; padding: 15px 30px; text-decoration: none; border-radius: 30px; font-weight: bold; display: inline-block;">VER DETALHES / RECIBO</a>
        </div>

        <p style="margin-top: 30px; text-align: center;">Obrigado por escolher a Pão Caseiro! <br/><i>O sabor que aquece o coração.</i></p>
    `;

    // Send to customer if email exists
    if (customerEmail) {
        await sendEmail([customerEmail], `Atualização do Pedido #${order.short_id || order.orderId} - Pão Caseiro`, html);
    }

    // Always send a copy to the bakery
    return await sendEmail([adminEmail], `[STATUS] Pedido #${order.short_id || order.orderId} -> ${statusText}`, html);
};

/**
 * Welcome Email for new user registrations
 */
export const sendWelcomeEmail = async (userEmail: string, userName: string) => {
    const domain = PRODUCTION_URL;
    const html = `
        <h2 style="color: #3b2f2f; text-align: center;">Bem-vindo(a) à Pão Caseiro!</h2>
        <p>Olá, <strong>${userName || 'Cliente'}</strong>!</p>
        <p>É com enorme alegria que lhe damos as boas-vindas à nossa padaria online. A partir de agora, o verdadeiro sabor da nossa casa está à distância de um clique.</p>
        
        <div style="background-color: #f7f1eb; padding: 20px; border-radius: 12px; margin: 25px 0; text-align: center; border: 1px dashed #d9a65a;">
            <p style="margin: 0; color: #3b2f2f; font-size: 16px;">
                Explore o nosso menu e descubra pães quentinhos, bolos deliciosos e doces incríveis. Tudo preparado com muito carinho para si e para a sua família.
            </p>
        </div>

        <div style="text-align: center; margin: 30px 0;">
            <a href="${domain}/menu" style="background-color: #d9a65a; color: #3b2f2f; padding: 15px 30px; text-decoration: none; border-radius: 30px; font-weight: bold; display: inline-block;">VER O MENU</a>
        </div>

        <p style="font-size: 14px; color: #666; text-align: center;">
            Se tiver alguma dúvida, contacte-nos pelo nosso site ou responda a este email.
        </p>

        <p style="margin-top: 30px; text-align: center;">Obrigado por preferir a Pão Caseiro! <br/><i>O sabor que aquece o coração</i></p>
    `;

    return sendEmail([userEmail], `Bem-vindo(a) à Pão Caseiro! 🎉`, html);
};

/**
 * Welcome Email for new Team Members (Staff)
 */
export const sendTeamWelcomeEmail = async (email: string, name: string, username: string, password?: string) => {
    const domain = PRODUCTION_URL;
    const html = `
        <h2 style="color: #3b2f2f; text-align: center;">Bem-vindo(a) à Equipa Pão Caseiro!</h2>
        <p>Olá, <strong>${name}</strong>!</p>
        <p>A sua conta de acesso ao Gestor / Painel de Controlo da Pão Caseiro foi criada com sucesso.</p>
        
        <div style="background-color: #f7f1eb; padding: 20px; border-radius: 12px; margin: 25px 0; border: 1px dashed #d9a65a;">
            <p style="margin: 0; color: #3b2f2f; font-weight: bold; font-size: 16px;">Detalhes de Acesso</p>
            <table style="width: 100%; margin-top: 15px; border-collapse: collapse;">
                <tr>
                    <td style="padding: 5px 0; color: #666;">Login/Username:</td>
                    <td style="padding: 5px 0; font-weight: bold; color: #3b2f2f;">${username}</td>
                </tr>
                ${password ? `
                <tr>
                    <td style="padding: 5px 0; color: #666;">Palavra-passe provisória:</td>
                    <td style="padding: 5px 0; font-weight: bold; color: #3b2f2f;">${password}</td>
                </tr>` : ''}
            </table>
        </div>

        <div style="text-align: center; margin: 30px 0;">
            <a href="${domain}/admin" style="background-color: #3b2f2f; color: #d9a65a; padding: 15px 30px; text-decoration: none; border-radius: 30px; font-weight: bold; display: inline-block;">ENTRAR NO SISTEMA</a>
        </div>

        <p style="font-size: 14px; color: #666; text-align: center;">
            Aconselhamos a alterar a palavra-passe após o primeiro login, se desejar. Bom trabalho!
        </p>
    `;

    return sendEmail([email], `Bem-vindo(a) à Equipa Pão Caseiro! 🥖`, html);
};

/**
 * New User Registration Notification for Admin
 */
export const sendAdminNewUserNotification = async (userEmail: string, userName: string) => {
    const getAdminEmail = () => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('team_numbers');
            if (saved) return JSON.parse(saved).adminEmail;
        }
        return 'geral@paocaseiro.co.mz';
    };
    const adminEmail = getAdminEmail();
    const domain = window.location.origin;

    const html = `
        <div style="text-align: center; margin-bottom: 20px;">
            <div style="background-color: #d9a65a; color: #3b2f2f; display: inline-block; padding: 10px 20px; border-radius: 20px; font-weight: bold; font-size: 16px;">
                NOVO CLIENTE REGISTADO
            </div>
        </div>

        <h2 style="color: #3b2f2f; border-bottom: 2px solid #d9a65a; padding-bottom: 10px;">Detalhes do Registo</h2>
        
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; background-color: #f9f9f9;">
            <tr>
                <td style="padding: 10px; border: 1px solid #ddd;"><strong>Nome:</strong> ${userName || 'Desconhecido'}</td>
            </tr>
            <tr>
                <td style="padding: 10px; border: 1px solid #ddd;"><strong>Email:</strong> ${userEmail}</td>
            </tr>
            <tr>
                <td style="padding: 10px; border: 1px solid #ddd;"><strong>Data/Hora:</strong> ${new Date().toLocaleString('pt-PT')}</td>
            </tr>
        </table>

        <div style="text-align: center; margin-top: 30px;">
            <a href="${domain}/admin" style="background-color: #3b2f2f; color: #d9a65a; padding: 15px 30px; border-radius: 8px; text-decoration: none; font-weight: bold; display: inline-block;">Abrir Painel Admin</a>
        </div>
    `;

    return sendEmail([adminEmail], `[NOVO CLIENTE] ${userName || userEmail}`, html);
};

/**
 * Newsletter Subscription Email
 */
export const sendNewsletterEmail = async (name: string, userEmail: string) => {
    const domain = PRODUCTION_URL;
    const html = `
        <h2 style="color: #3b2f2f; text-align: center;">Obrigado por se inscrever!</h2>
        <p>Olá, <strong>${name}</strong>!</p>
        <p>A sua subscrição na nossa newsletter foi efetuada com sucesso. Fique atento ao seu email para receber novidades, ofertas exclusivas, atualizações e campanhas especiais da Pão Caseiro.</p>
        
        <div style="text-align: center; margin: 30px 0;">
            <a href="${domain}/blog" style="background-color: #d9a65a; color: #3b2f2f; padding: 15px 30px; text-decoration: none; border-radius: 30px; font-weight: bold; display: inline-block;">LER AS ÚLTIMAS NOTÍCIAS</a>
        </div>
        <p style="text-align: center; margin-top: 10px;">Ou <a href="${domain}/menu" style="color: #d9a65a; font-weight: bold;">veja o nosso menu</a> para encomendar.</p>

        <p style="margin-top: 30px; text-align: center;">Obrigado por preferir a Pão Caseiro! <br/><i>O sabor que aquece o coração</i></p>
    `;

    return sendEmail([userEmail], 'Subscrição Confirmada! 🎉', html);
};

/**
 * Newsletter Presentation Email (Triggered by n8n or external scheduler 30-min later)
 */
export const sendPresentationEmail = async (name: string, userEmail: string) => {
    const domain = PRODUCTION_URL;
    const html = `
        <h2 style="color: #3b2f2f; text-align: center;">Conheça a Pão Caseiro</h2>
        <p>Olá, <strong>${name}</strong>!</p>
        <p>Gostariamos de lhe dar a conhecer um pouco mais sobre o que faz a Pão Caseiro tão especial. Somos mais do que uma padaria; somos tradição e sabor que contam histórias.</p>
        <ul style="list-style: none; padding-left: 0;">
            <li>🥖 <strong>Pão Fresco Diário:</strong> Fermentação natural e assados lentos.</li>
            <li>🥐 <strong>Bolos e Folhados:</strong> Para os seus momentos mais doces.</li>
            <li>🚚 <strong>Entregas Rápidas:</strong> O pão à sua porta com um toque.</li>
        </ul>
        <div style="text-align: center; margin: 30px 0;">
            <a href="${domain}/menu" style="background-color: #d9a65a; color: #3b2f2f; padding: 15px 30px; text-decoration: none; border-radius: 30px; font-weight: bold; display: inline-block;">FAZER UMA ENCOMENDA ONLINE</a>
        </div>
        <p style="margin-top: 30px; text-align: center;">Estamos à sua espera. <br/><i>Pão Caseiro</i></p>
    `;

    return sendEmail([userEmail], 'Descubra a Tradição da Pão Caseiro', html);
};

/**
 * Birthday Celebration Email
 */
export const sendBirthdayEmail = async (email: string, name: string) => {
    const html = `
        <div style="text-align: center;">
            <h1 style="color: #d9a65a; font-size: 32px;">Feliz Aniversário! 🎂</h1>
            <p style="font-size: 18px; color: #3b2f2f;">Olá, <strong>${name}</strong>!</p>
            <p>Hoje é um dia especial e a equipa da Pão Caseiro não quis deixar passar em branco.</p>
            
            <div style="background-color: #ffffff; padding: 30px; border-radius: 20px; margin: 30px 0; border: 2px solid #f7f1eb;">
                <p style="font-size: 16px; margin-bottom: 20px;">Para celebrar o seu dia, temos um presente para si:</p>
                <div style="background-color: #3b2f2f; color: #d9a65a; padding: 20px; border-radius: 12px; display: inline-block;">
                    <p style="margin: 0; font-size: 12px; text-transform: uppercase;">Use o Cupão:</p>
                    <h2 style="margin: 5px 0; font-size: 24px; letter-spacing: 5px;">BDAY-PC2026</h2>
                    <p style="margin: 5px 0 0; font-size: 14px;"><strong>15% DESCONTO</strong> no seu próximo pedido</p>
                </div>
            </div>

            <p>Esperamos que o seu dia seja repleto de doçura e momentos inesquecíveis.</p>
            
            <div style="text-align: center; margin-top: 30px;">
                <a href="${PRODUCTION_URL}/menu" style="background-color: #d9a65a; color: #3b2f2f; padding: 15px 30px; text-decoration: none; border-radius: 30px; font-weight: bold; display: inline-block;">ESCOLHER O MEU BOLO</a>
            </div>
        </div>
    `;

    return sendEmail([email], `Parabéns, ${name}! 🎈 Temos um presente para si`, html);
};

/**
 * New Product Notification (Broadcast)
 */
export const sendNewProductNotification = async (emails: string[], product: any) => {
    const html = `
        <div style="text-align: center; margin-bottom: 20px;">
            <span style="background-color: #d9a65a; color: #3b2f2f; padding: 5px 15px; border-radius: 20px; font-weight: bold; font-size: 12px; text-transform: uppercase;">NOVIDADE NO MENU</span>
        </div>
        <h2 style="color: #3b2f2f; text-align: center;">Temos um novo sabor para si!</h2>
        
        <div style="background-color: #ffffff; border-radius: 16px; overflow: hidden; margin: 30px 0; border: 1px solid #eee;">
            ${product.image ? `<img src="${product.image}" alt="${product.name}" style="width: 100%; height: 250px; object-cover: cover;">` : ''}
            <div style="padding: 25px;">
                <h3 style="margin: 0; color: #3b2f2f; font-size: 22px;">${product.name}</h3>
                <p style="color: #666; margin: 15px 0;">${product.description || 'Uma nova delícia artesanal acaba de chegar à nossa vitrine. Venha provar enquanto está quentinho!'}</p>
                <p style="color: #d9a65a; font-size: 20px; font-weight: bold; margin: 0;">Apenas ${product.price} MT</p>
            </div>
        </div>

        <div style="text-align: center; margin: 30px 0;">
            <a href="${PRODUCTION_URL}/menu" style="background-color: #3b2f2f; color: #d9a65a; padding: 15px 30px; text-decoration: none; border-radius: 30px; font-weight: bold; display: inline-block;">ENCOMENDAR AGORA</a>
        </div>

        <p style="text-align: center; color: #999; font-size: 12px;">Fique atento às nossas novidades semanais!</p>
    `;

    return sendEmail(emails, `Novidade: Conheça o nosso novo ${product.name}! 🥖`, html);
};
