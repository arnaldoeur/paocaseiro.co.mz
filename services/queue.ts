import { hostingerService } from './hostingerService';

export interface QueueTicket {
    id: string;
    ticket_number: string;
    is_priority: boolean;
    category?: string; // New: Padaria, Confeitaria, Café, Lanches
    status: 'waiting' | 'calling' | 'completed' | 'skipped' | 'cancelled';
    counter?: string;
    called_at?: string;
    customer_phone?: string;
    created_at: string;
}

export const queueService = {
    getMZTodayStr() {
        return new Intl.DateTimeFormat('en-CA', { 
            timeZone: 'Africa/Maputo' 
        }).format(new Date());
    },

    async getTicketsToday(): Promise<QueueTicket[]> {
        const data = await hostingerService.getTicketsToday();
        return data || [];
    },

    async generateTicket(isPriority: boolean = false, phone?: string, category: string = 'Geral', userId?: string) {
        const data = await hostingerService.generateTicket(isPriority, phone, category, userId);
        if (data && data.id) {
            window.dispatchEvent(new CustomEvent('queue-ticket-created', { detail: data }));
        }
        return data;
    },

    async callTicket(id: string, counter: string) {
        const data = await hostingerService.updateTicketStatus(id, 'calling', counter);
        if (data && data.id) {
            window.dispatchEvent(new CustomEvent('queue-ticket-calling', { detail: data }));
        }
        return data;
    },

    async callNext(counter: string) {
        const data = await hostingerService.getNextTicket(counter);
        if (data && data.id) {
            window.dispatchEvent(new CustomEvent('queue-ticket-calling', { detail: data }));
        }
        return data;
    },

    async completeTicket(id: string) {
        return await hostingerService.updateTicketStatus(id, 'completed');
    },

    async skipTicket(id: string) {
        return await hostingerService.updateTicketStatus(id, 'skipped');
    },

    async cancelTicket(id: string) {
        return await hostingerService.updateTicketStatus(id, 'cancelled');
    },

    async updateTicket(id: string, updates: Partial<QueueTicket>) {
        return await hostingerService.updateTicket(id, updates);
    },

    async checkPriorityEligibility(phone: string): Promise<{ eligible: boolean; message?: string }> {
        const data = await hostingerService.getCustomerByIdentifier(phone.trim());

        if (!data || !data.created_at) {
            return { eligible: false, message: "Cliente não encontrado no sistema." };
        }

        const createdAt = new Date(data.created_at);
        const now = new Date();
        const diffDays = Math.floor((now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24));

        if (diffDays >= 0) {
            return { eligible: true };
        } else {
            return { 
                eligible: false, 
                message: `Necessário 7 dias de registo (possui apenas ${diffDays} dias).` 
            };
        }
    },

    async resetTodayQueue() {
        return await hostingerService.resetTodayQueue();
    },

    async getTodayStats() {
        const tickets = await this.getTicketsToday();
        
        return {
            total: tickets?.length || 0,
            completed: tickets?.filter((t: QueueTicket) => t.status === 'completed').length || 0,
            cancelled: tickets?.filter((t: QueueTicket) => t.status === 'cancelled').length || 0,
            skipped: tickets?.filter((t: QueueTicket) => t.status === 'skipped').length || 0,
            waiting: tickets?.filter((t: QueueTicket) => t.status === 'waiting').length || 0,
        };
    }
};
