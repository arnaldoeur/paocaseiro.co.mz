import * as whatsapp from './whatsapp';
import * as sms from './sms';
import { supabase } from './supabase';

/**
 * Unified Notification Service
 * Handles fallback logic between WhatsApp and SMS
 */
export class NotificationService {
    /**
     * Sends a notification specifically for a queue ticket being called.
     * Tries WhatsApp first, falls back to SMS.
     */
    static async notifyTicketCalling(ticket: any, counter: string, phone: string) {
        const message = `Pão Caseiro: Senha ${ticket.ticket_number} - Dirija-se ao ${counter}. Bom atendimento!\nO sabor que aquece o seu coracao!`;
        
        try {
            console.log(`[Notification] Attempting WhatsApp for ticket ${ticket.ticket_number}`);
            await whatsapp.sendWhatsAppMessage(phone, message);
            return { success: true, provider: 'whatsapp' };
        } catch (error: any) {
            console.warn(`[Notification] WhatsApp failed, falling back to SMS:`, error.message);
            try {
                await sms.sendSMS(phone, message.substring(0, 160));
                return { success: true, provider: 'sms' };
            } catch (smsError: any) {
                console.error(`[Notification] Critical Failure: both WhatsApp and SMS failed`, smsError.message);
                return { success: false, error: smsError.message };
            }
        }
    }

    /**
     * Sends a notification for a new ticket being generated.
     */
    static async notifyTicketGenerated(ticket: any, phone: string) {
        const message = `Pão Caseiro: Senha ${ticket.ticket_number} gerada com sucesso. Acompanhe a sua posição no local.\nO sabor que aquece o seu coracao!`;
        
        try {
            await whatsapp.sendWhatsAppMessage(phone, message);
            return { success: true, provider: 'whatsapp' };
        } catch (error) {
            try {
                await sms.sendSMS(phone, message.substring(0, 160));
                return { success: true, provider: 'sms' };
            } catch (smsError: any) {
                return { success: false, error: smsError.message };
            }
        }
    }

    /**
     * Notifies customer about order status updates with fallback.
     */
    static async notifyOrderStatus(order: any, type: string) {
        try {
            // Push Notification Attempt for target customer
            let statusPt = 'Atualização';
            if (type === 'order_confirmed' || type === 'pending' || type === 'new') statusPt = 'Confirmado';
            if (type === 'ready') statusPt = 'Pronto';
            if (type === 'delivering') statusPt = 'Saiu para Entrega';
            if (type === 'completed') statusPt = 'Concluído';
            
            const customerId = order.customer_id || order.user_id || (order.customer && order.customer.id);
            if (customerId) {
                this.sendPushNotification(
                    `Pão Caseiro: Pedido da Encomenda`,
                    `O seu pedido #${order.short_id || order.id?.slice(-6).toUpperCase() || ''} está agora: ${statusPt}`,
                    [customerId],
                    `/dashboard`
                ).catch(() => {});
            }

            // WhatsApp handles complex media (PDFs) for 'order_confirmed' or 'pending'
            if (type === 'order_confirmed' || type === 'pending' || type === 'new') {
                const items = order.items || [];
                await whatsapp.notifyCustomerNewOrderWhatsApp(order, items);
            } else {
                await whatsapp.notifyCustomerOrderStatusWhatsApp(order, type);
            }
            return { success: true, provider: 'whatsapp' };
        } catch (error) {
            console.warn(`[Notification] WhatsApp Order Notify failed, falling back to basic SMS`);
            try {
                await sms.notifyCustomer(order, type as any);
                return { success: true, provider: 'sms' };
            } catch (smsError: any) {
                return { success: false, error: smsError.message };
            }
        }
    }

    /**
     * Notifies customer about order delay.
     */
    static async notifyOrderDelay(order: any, minutes: string, reason: string) {
        try {
            await whatsapp.notifyCustomerDelayWhatsApp(order, minutes, reason);
            return { success: true, provider: 'whatsapp' };
        } catch (error) {
            try {
                await sms.notifyCustomerDelay(order, minutes, reason);
                return { success: true, provider: 'sms' };
            } catch (smsError: any) {
                return { success: false, error: smsError.message };
            }
        }
    }

    /**
     * Notifies customer when driver is approaching.
     */
    static async notifyApproaching(order: any, driver: any) {
        const phone = order.customer_phone || order.customer?.phone;
        if (!phone) return { success: false, error: 'No phone' };

        const message = `Pão Caseiro: #${order.short_id || order.orderId} está a chegar! ${driver?.name || 'O motorista'} já está próximo. Contacte: ${driver?.phone || ''}.\nO sabor que aquece o seu coracao!`;

        try {
            await whatsapp.sendWhatsAppMessage(phone, message);
            return { success: true, provider: 'whatsapp' };
        } catch (error) {
            try {
                await sms.sendSMS(phone, message.substring(0, 160));
                return { success: true, provider: 'sms' };
            } catch (smsError: any) {
                return { success: false, error: smsError.message };
            }
        }
    }

    /**
     * Notifies driver when an order is assigned.
     */
    static async notifyDriverAssigned(driver: any, order: any) {
        try {
            await sms.notifyDriverAssigned(driver, order);
            return { success: true };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    }

    /**
     * Sends an OTP to a customer.
     */
    static async sendOTP(phone: string, code: string) {
        const message = `Seu codigo de acesso Pao Caseiro: ${code}`;
        return this.sendCustomNotification(phone, message);
    }

    /**
     * Sends a custom message to a customer with WhatsApp-to-SMS fallback.
     */
    static async sendCustomNotification(phone: string, message: string) {
        try {
            await whatsapp.sendWhatsAppMessage(phone, message);
            return { success: true, provider: 'whatsapp' };
        } catch (error) {
            console.warn(`[Notification] Custom WhatsApp failed, falling back to SMS`);
            try {
                await sms.sendSMS(phone, message.substring(0, 160));
                return { success: true, provider: 'sms' };
            } catch (smsError: any) {
                return { success: false, error: smsError.message };
            }
        }
    }

    /**
     * Broadcasts a notification to the entire team via WhatsApp/SMS
     */
    static async notifyTeam(title: string, message: string) {
        const team = {
            admin1: '258879146662',
            admin2: '258846930960'
        };

        const fullMessage = `[PÃO CASEIRO ALERT]\n*${title}*\n\n${message}`;

        for (const [member, phone] of Object.entries(team)) {
            if (!phone) continue;
            try {
                console.log(`[Notification] Broadcasting to ${member} (${phone})`);
                await this.sendCustomNotification(phone, fullMessage);
            } catch (err) {
                console.error(`[Notification] Failed broadcast to ${member}:`, err);
            }
        }
    }

    /**
     * Records a system-wide notice for the Admin Notification Center.
     */
    static async logSystemEvent(title: string, message: string, type: 'ORDER' | 'SUPPORT' | 'TICKET' | 'SYSTEM' | 'USER' = 'SYSTEM', level: 'info' | 'success' | 'warning' | 'error' = 'info', userId?: string) {
        try {
            // Log to the new actionable notifications table
            await supabase.from('notifications').insert([{
                type: type.toLowerCase(),
                title,
                message,
                entity_id: userId,
                link: this.getLinkForType(type, userId),
                read: false
            }]);

            // Legacy log also for audit trail (optional but keeping for now)
            await supabase.from('system_logs').insert([{
                title,
                message,
                type,
                level,
                user_id: userId,
                read: false
            }]);

            // Auto-broadcast high priority events to team
            if (type === 'SUPPORT' || type === 'USER' || (type === 'ORDER' && level === 'error')) {
                this.notifyTeam(title, message).catch(err => console.error("Broadcast failed:", err));
            }

            return { success: true };
        } catch (error: any) {
            console.error(`[Notification] Failed to log system event:`, error.message);
            return { success: false, error: error.message };
        }
    }

    /**
     * Helper to generate links based on event type
     */
    private static getLinkForType(type: string, entityId?: string): string {
        switch (type.toUpperCase()) {
            case 'ORDER':
                return `/admin?view=encomendas&id=${entityId || ''}`;
            case 'SUPPORT':
                return `/admin?view=it_support&id=${entityId || ''}`;
            case 'USER':
                return `/admin?view=clientes&id=${entityId || ''}`;
            default:
                return '/admin?view=notificacoes';
        }
    }

    /**
     * New method for creating highly specific actionable notifications
     */
    static async createNotification(data: { 
        type: 'order' | 'user' | 'support' | 'system', 
        title: string, 
        message: string, 
        entity_id?: string, 
        link?: string 
    }) {
        try {
            const { error } = await supabase.from('notifications').insert([{
                ...data,
                read: false
            }]);
            if (error) throw error;
            return { success: true };
        } catch (error: any) {
            console.error(`[Notification] createNotification failed:`, error.message);
            return { success: false, error: error.message };
        }
    }

    /**
     * Sends a Web Push Notification globally or to specific users using OneSignal REST API
     */
    static async sendPushNotification(title: string, message: string, externalUserIds?: string[], url?: string) {
        const appId = "43e27b65-50cf-40b7-8a95-e87f200e742c";
        const restKey = "os_v2_app_iprhwzkqz5alpcuv5b7sadtufs2spk6ohp3uiz5jobjcglqltgyc4wubf5l6hkljskfe3c3k6qhyj65obbfgshusghauecd4hgzq4oa";
        
        try {
            const body: any = {
                app_id: appId,
                headings: { en: title, pt: title },
                contents: { en: message, pt: message },
                name: "System Notification",
            };

            if (url) {
                body.url = url;
            }

            if (externalUserIds && externalUserIds.length > 0) {
                body.include_aliases = { external_id: externalUserIds };
                body.target_channel = "push";
            } else {
                body.included_segments = ["Subscribed Users"];
            }

            const response = await fetch("https://onesignal.com/api/v1/notifications", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Basic ${restKey}`
                },
                body: JSON.stringify(body)
            });

            const result = await response.json();
            return { success: true, result };
        } catch (error: any) {
            console.error("[Notification] OneSignal Push Error:", error);
            return { success: false, error: error.message };
        }
    }
}
