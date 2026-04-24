import { supabase } from './supabase';

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
    // Get today's date string in Maputo (UTC+2)
    getMZTodayStr() {
        return new Intl.DateTimeFormat('en-CA', { 
            timeZone: 'Africa/Maputo' 
        }).format(new Date());
    },

    // Get all tickets from today
    async getTicketsToday(): Promise<QueueTicket[]> {
        // Use a simple date comparison that works with Supabase/Postgres
        // We fetch from the start of the current day in Maputo
        const now = new Date();
        const mzTodayStart = new Date(now.toLocaleString("en-US", {timeZone: "Africa/Maputo"}));
        mzTodayStart.setHours(0, 0, 0, 0);
        
        const { data, error } = await supabase
            .from('queue_tickets')
            .select('*')
            .gte('created_at', mzTodayStart.toISOString())
            .order('created_at', { ascending: true });
        
        if (error) throw error;
        return data || [];
    },

    // Generate a new ticket
    async generateTicket(isPriority: boolean = false, phone?: string, category: string = 'Geral', userId?: string) {
        console.log("DEBUG: generateTicket called. Priority:", isPriority, "Category:", category, "User ID:", userId);
        const { data, error } = await supabase.rpc('generate_queue_ticket_v4', { 
            p_priority: isPriority,
            p_phone: phone,
            p_category: category,
            p_user_id: userId || null
        });
        
        if (error) {
            console.error("DEBUG: generate_queue_ticket RPC Error:", error);
            throw error;
        }

        // Broadcast the new ticket for instant local updates
        const ticketRecord = Array.isArray(data) ? data[0] : data;
        
        if (ticketRecord) {
            supabase.channel('queue-realtime-enhanced').send({
                type: 'broadcast',
                event: 'ticket-created',
                payload: { ticket: ticketRecord }
            });
        }

        console.log("DEBUG: generate_queue_ticket Success:", ticketRecord);
        return ticketRecord;
    },

    // Call a specific ticket
    async callTicket(id: string, counter: string) {
        console.log("DEBUG: callTicket called. ID:", id, "Counter:", counter);
        const { data, error } = await supabase
            .from('queue_tickets')
            .update({ 
                status: 'calling', 
                counter: counter.trim(), 
                called_at: new Date().toISOString() 
            })
            .eq('id', id)
            .select()
            .single();
            
        if (error) {
            console.warn("DEBUG: Direct update failed, trying RPC:", error);
            const { data: rpcData, error: rpcError } = await supabase.rpc('call_queue_ticket', { 
                p_id: id, 
                p_counter: counter 
            });
            if (rpcError) {
                console.error("DEBUG: call_queue_ticket RPC failed too:", rpcError);
                throw rpcError;
            }
            
            // Broadcast the event even if RPC was used
            if (rpcData) {
                supabase.channel('queue-realtime-enhanced').send({
                    type: 'broadcast',
                    event: 'ticket-calling',
                    payload: { ticket: rpcData }
                });
            }
            return rpcData;
        }

        // Broadcast the event for instant UI/Audio sync
        if (data) {
            supabase.channel('queue-realtime-enhanced').send({
                type: 'broadcast',
                event: 'ticket-calling',
                payload: { ticket: data }
            });
        }
        
        console.log("DEBUG: callTicket Success:", data);
        return data;
    },

    // Call the next available ticket (Priority first, then FIFO)
    async callNext(counter: string) {
        // Optimized: Fetch ONLY the next waiting ticket directly from DB
        const now = new Date();
        const mzTodayStart = new Date(new Intl.DateTimeFormat('en-US', {
            timeZone: 'Africa/Maputo',
            year: 'numeric',
            month: 'numeric',
            day: 'numeric'
        }).format(now));
        mzTodayStart.setHours(0, 0, 0, 0);

        // 1. Try priority first
        const { data: priorityTicket, error: pError } = await supabase
            .from('queue_tickets')
            .select('*')
            .eq('status', 'waiting')
            .eq('is_priority', true)
            .gte('created_at', mzTodayStart.toISOString())
            .order('created_at', { ascending: true })
            .limit(1)
            .maybeSingle();

        if (priorityTicket) {
            return this.callTicket(priorityTicket.id, counter);
        }

        // 2. Try normal
        const { data: normalTicket, error: nError } = await supabase
            .from('queue_tickets')
            .select('*')
            .eq('status', 'waiting')
            .eq('is_priority', false)
            .gte('created_at', mzTodayStart.toISOString())
            .order('created_at', { ascending: true })
            .limit(1)
            .maybeSingle();

        if (normalTicket) {
            return this.callTicket(normalTicket.id, counter);
        }

        return null;
    },

    // Complete a ticket
    async completeTicket(id: string) {
        console.log("DEBUG: completeTicket called. ID:", id);
        const { data, error } = await supabase
            .from('queue_tickets')
            .update({ status: 'completed' })
            .eq('id', id)
            .select()
            .single();
            
        if (error) {
            console.warn("DEBUG: Direct complete failed, trying RPC:", error);
            const { data: rpcData, error: rpcError } = await supabase.rpc('complete_queue_ticket', { p_id: id });
            if (rpcError) {
                console.error("DEBUG: complete_queue_ticket RPC failed too:", rpcError);
                throw rpcError;
            }
            return rpcData;
        }
        return data;
    },

    // Skip a ticket (didn't show up)
    async skipTicket(id: string) {
        const { data, error } = await supabase
            .from('queue_tickets')
            .update({ status: 'skipped' })
            .eq('id', id)
            .select()
            .single();
            
        if (error) {
            const { data: rpcData, error: rpcError } = await supabase.rpc('skip_queue_ticket', { p_id: id });
            if (rpcError) throw rpcError;
            return rpcData;
        }
        return data;
    },

    // Cancel a ticket
    async cancelTicket(id: string) {
        const { data, error } = await supabase
            .from('queue_tickets')
            .update({ status: 'cancelled' })
            .eq('id', id)
            .select()
            .single();
            
        if (error) {
            const { data: rpcData, error: rpcError } = await supabase.rpc('cancel_queue_ticket', { p_id: id });
            if (rpcError) throw rpcError;
            return rpcData;
        }
        return data;
    },

    // Update ticket details without changing queue flow state
    async updateTicket(id: string, updates: Partial<QueueTicket>) {
        const { data, error } = await supabase
            .from('queue_tickets')
            .update(updates)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    // Check if a customer is eligible for priority (registered > 7 days)
    async checkPriorityEligibility(phone: string): Promise<{ eligible: boolean; message?: string }> {
        console.log("DEBUG: Checking priority for", phone);
        const { data, error } = await supabase
            .from('customers')
            .select('created_at')
            .eq('contact_no', phone.trim())
            .maybeSingle();

        if (error) {
            console.error("DEBUG: Customer check error:", error);
            throw error;
        }

        if (!data) {
            return { eligible: false, message: "Cliente não encontrado no sistema." };
        }

        const createdAt = new Date(data.created_at);
        const now = new Date();
        const diffDays = Math.floor((now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24));

        // [LAUNCH_PHASE] Reduced from 7 to 0 days to allow all new customers priority for the first week
        if (diffDays >= 0) {
            return { eligible: true };
        } else {
            return { 
                eligible: false, 
                message: `Necessário 7 dias de registo (possui apenas ${diffDays} dias).` 
            };
        }
    },

    // Reset today's queue (Safety tool for operators)
    async resetTodayQueue() {
        const mzToday = this.getMZTodayStr();
        const tickets = await this.getTicketsToday();
        
        const activeIds = tickets
            .filter(t => ['waiting', 'calling'].includes(t.status))
            .map(t => t.id);

        if (activeIds.length === 0) return [];

        const { data, error } = await supabase
            .from('queue_tickets')
            .update({ status: 'cancelled' })
            .in('id', activeIds);

        if (error) throw error;
        return data;
    },

    // Get stats for today
    async getTodayStats() {
        const tickets = await this.getTicketsToday();
        
        const stats = {
            total: tickets?.length || 0,
            completed: tickets?.filter(t => t.status === 'completed').length || 0,
            cancelled: tickets?.filter(t => t.status === 'cancelled').length || 0,
            skipped: tickets?.filter(t => t.status === 'skipped').length || 0,
            waiting: tickets?.filter(t => t.status === 'waiting').length || 0,
        };

        return stats;
    }
};
