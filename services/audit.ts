import { supabase } from './supabase';

export type AuditEntityType = 'website' | 'system' | 'purchase' | 'product' | 'file' | 'order' | 'customer' | 'auth' | 'blog' | 'logistics' | 'team_member';

interface AuditLogEntry {
    user_id?: string;
    customer_phone?: string;
    action: string;
    entity_type: AuditEntityType;
    entity_id?: string;
    details?: any;
}

export const logAudit = async (entry: AuditLogEntry) => {
    try {
        // Obter user_id se não for fornecido e houver sessão ativa
        if (!entry.user_id) {
            const adminId = localStorage.getItem('admin_id');
            const customerId = localStorage.getItem('pc_auth_id');
            if (adminId) {
                entry.user_id = adminId;
            } else if (customerId) {
                entry.user_id = customerId;
            }
        }

        // Obter número de telefone do cache local de cliente se disponível
        if (!entry.customer_phone) {
            const phone = localStorage.getItem('pc_auth_phone');
            if (phone) {
                entry.customer_phone = phone;
            }
        }

        const { error } = await supabase
            .from('audit_logs')
            .insert([{
                user_id: entry.user_id || null,
                customer_phone: entry.customer_phone || null,
                action: entry.action,
                entity_type: entry.entity_type,
                entity_id: entry.entity_id || null,
                details: entry.details || null
            }]);

        if (error) {
            console.error('Failed to write audit log:', error);
        }
    } catch (err) {
        console.error('Audit exception:', err);
    }
};
