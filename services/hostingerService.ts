// services/hostingerService.ts

const IS_PROD = typeof window !== 'undefined' && !window.location.hostname.includes('localhost');
const HOSTINGER_BRIDGE_URL = IS_PROD 
    ? 'https://paocaseiro.co.mz/paocaseiro_db.php' 
    : 'http://localhost:8000/public/paocaseiro_db.php';

console.log(`[Hostinger Service] Bridge URL: ${HOSTINGER_BRIDGE_URL}`);
const HOSTINGER_API_KEY = 'PaoCaseiro_Direct_MySQL_2026';

export interface HostingerOrderData {
    short_id: string;
    customer_name: string;
    customer_phone: string;
    customer_email?: string;
    total_amount: number;
    delivery_type: 'pickup' | 'delivery' | 'dine_in';
    delivery_address?: string;
    notes?: string;
    items: Array<{
        name: string;
        quantity: number;
        price: number;
    }>;
}

export const hostingerService = {
    async fetch(action: string, body: any = {}) {
        try {
            const response = await fetch(`${HOSTINGER_BRIDGE_URL}?action=${action}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${HOSTINGER_API_KEY}`
                },
                body: JSON.stringify({ action, ...body })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            
            // Check for generic error
            if (data && data.error) {
                throw new Error(data.error);
            }
            
            // Check for Resend API errors (which use statusCode and message)
            if (data && data.statusCode && data.statusCode >= 400 && data.message) {
                throw new Error(`Email Service Error: ${data.message}`);
            }

            return data;
        } catch (error) {
            console.error(`Hostinger Service Error [${action}]:`, error);
            throw error;
        }
    },

    // --- PRODUTOS ---
    async getProducts() {
        return this.fetch('get_products');
    },

    async saveProduct(productData: any) {
        // In Hostinger, save_product handles both insert and update (ON DUPLICATE KEY UPDATE)
        // It also handles variations if included in the payload
        return this.fetch('save_product', { product_data: productData });
    },

    async toggleProductAvailability(id: string, isAvailable: boolean) {
        return this.fetch('update_product_status', { id, is_available: isAvailable });
    },

    async deleteProduct(id: string) {
        return this.fetch('delete_product', { id });
    },

    async bulkSaveProducts(products: any[]) {
        return this.fetch('bulk_save_products', { products });
    },

    // --- ENCOMENDAS ---
    async saveOrder(orderData: HostingerOrderData) {
        return this.fetch('save_order', orderData);
    },

    async getOrders(filters: any = {}) {
        const body = typeof filters === 'string' ? { status: filters } : filters;
        return this.fetch('get_orders', body);
    },

    async getOrderById(id: string) {
        return this.fetch('get_order', { id });
    },

    async updateOrder(id: string, data: any) {
        return this.fetch('update_order', { id, ...data });
    },

    async updateOrderStatus(shortId: string, status: string) {
        return this.fetch('update_order_status', { short_id: shortId, status });
    },


    // --- DEFINIÇÕES ---
    async getSettings() {
        return this.fetch('get_system_settings');
    },

    async saveSystemSettings(settings: { key: string, value: any }[]) {
        // Bulk save settings by iterating over them
        const results = await Promise.all(settings.map(s => 
            this.fetch('save_setting', { key: s.key, value: s.value })
        ));
        return { success: results.every((r: any) => r.success) };
    },

    async saveSetting(key: string, value: any) {
        return this.fetch('save_setting', { key, value });
    },

    // --- WORK SESSIONS ---
    async getWorkSessions(memberId?: string, status?: string) {
        return this.fetch('get_work_sessions', { member_id: memberId, status });
    },

    async saveWorkSession(sessionData: any) {
        return this.fetch('save_work_session', { session: sessionData });
    },

    async updateWorkSession(id: string, status: string, clockOut?: string) {
        return this.fetch('update_work_session', { id, status, clock_out: clockOut });
    },

    // --- AUTH ---
    async authTeam(username: string, pass: string) {
        return this.fetch('auth_team', { username, password: pass });
    },

    async updateTeamMember(id: string, data: any) {
        return this.fetch('update_team_member', { id, data });
    },

    // --- NOTIFICATIONS ---
    async getNotifications() {
        return this.fetch('get_notifications');
    },

    async markNotificationRead(id: string) {
        return this.fetch('mark_notification_read', { id });
    },

    async markAllNotificationsRead() {
        return this.fetch('mark_all_notifications_read');
    },

    async saveNotification(notification: any) {
        return this.fetch('save_notification', { notification });
    },

    // --- AUDIT ---
    async getAuditLogs(filters: { search?: string, severity?: string, page?: number, page_size?: number } = {}) {
        return this.fetch('get_audit_logs', filters);
    },

    async saveAuditLog(log: any) {
        return this.fetch('save_audit_log', { log });
    },

    // --- DRIVERS ---
    async getDrivers() {
        return this.fetch('get_drivers');
    },

    async saveDriver(driver: any) {
        return this.fetch('save_driver', { driver });
    },

    async deleteDriver(id: string) {
        return this.fetch('delete_driver', { id });
    },

    async getDriverByIdentifier(identifier: string) {
        return this.fetch('get_driver_by_identifier', { identifier });
    },

    async updateDriver(id: string, data: any) {
        return this.fetch('update_driver', { driver: { id, ...data } });
    },




    // --- CUSTOMERS ---
    async getCustomers() {
        return this.fetch('get_customers');
    },

    async saveCustomer(customer: any) {
        return this.fetch('save_customer', { customer });
    },

    async deleteCustomer(id: string) {
        return this.fetch('delete_customer', { id });
    },

    // --- LOGS ---
    async logNotification(type: 'sms' | 'email' | 'whatsapp', recipient: string, content: string, status: string) {
        return this.fetch('log_notification', { type, recipient, content, status });
    },

    async getSmsLogs(limit: number = 200) {
        return this.fetch('get_sms_logs', { limit });
    },

    async updateOrderReadyAt(id: string, estimatedReadyAt: string) {
        return this.fetch('update_order_ready_at', { id, estimated_ready_at: estimatedReadyAt });
    },

    // --- HOME / CONTACT ---
    async getGallery() {
        return this.fetch('get_gallery');
    },

    async saveContactMessage(message: { name: string, phone: string, email: string, message: string }) {
        return this.fetch('save_contact_message', message);
    },

    async getContactMessages(folder?: string) {
        return this.fetch('get_contact_messages', { folder });
    },

    async updateContactMessageStatus(id: string, status: string, replyContent?: string) {
        return this.fetch('update_contact_message_status', { id, status, reply_content: replyContent });
    },

    async deleteContactMessage(id: string) {
        return this.fetch('delete_contact_message', { id });
    },

    async getTeam() {
        return this.fetch('get_team');
    },

    async saveTeamMember(member: any) {
        return this.fetch('save_team_member', member);
    },

    async deleteTeamMember(id: string) {
        return this.fetch('delete_team_member', { id });
    },

    async getReceipts() {
        return this.fetch('get_receipts');
    },

    async saveReceipt(receiptData: any) {
        return this.fetch('save_receipt', { receipt: receiptData });
    },

    async getCashSessions() {
        return this.fetch('get_cash_sessions');
    },

    async openCashSession(openedBy: string, openingBalance: number) {
        return this.fetch('save_cash_session', { opened_by: openedBy, opening_balance: openingBalance });
    },

    async closeCashSession(id: string, closingBalance: number, notes: string) {
        return this.fetch('update_cash_session', { id, closing_balance: closingBalance, notes, status: 'closed' });
    },

    // --- CUSTOMER AUTH ---
    async authCustomer(identifier: string, pass: string) {
        return this.fetch('auth_customer', { identifier, password: pass });
    },

    async getCustomerByIdentifier(identifier: string) {
        return this.fetch('get_customer_by_identifier', { identifier });
    },

    // --- QUEUE ---
    async getQueueCount(createdAt: string) {
        return this.fetch('get_queue_count', { created_at: createdAt });
    },

    async getActiveTicket(identifier: string) {
        return this.fetch('get_active_ticket', { identifier });
    },

    async getTicketsToday() {
        return this.fetch('get_tickets_today', {});
    },

    async generateTicket(isPriority: boolean, phone?: string, category: string = 'Geral', userId?: string) {
        return this.fetch('generate_ticket', { is_priority: isPriority, phone, category, user_id: userId });
    },

    async updateTicketStatus(id: string, status: string, counter?: string) {
        return this.fetch('update_ticket_status', { id, status, counter });
    },

    async updateTicket(id: string, updates: any) {
        return this.fetch('update_ticket', { id, updates });
    },

    async getNextTicket(counter: string) {
        return this.fetch('get_next_ticket', { counter });
    },

    async resetTodayQueue() {
        return this.fetch('reset_today_queue', {});
    },

    async getSystemSettings() {
        return this.fetch('get_system_settings', {});
    },

    async getKitchenStatus() {
        return this.fetch('get_setting', { key: 'kitchen_status' });
    },

    async updateKitchenStatus(status: string) {
        return this.fetch('save_setting', { key: 'kitchen_status', value: status });
    },

    async updateSystemSetting(key: string, value: any) {
        return this.fetch('save_setting', { key, value });
    },

    async getActiveWorkSession(memberId: string) {
        return this.fetch('get_active_work_session', { member_id: memberId });
    },

    async subscribeNewsletter(name: string, email: string) {
        return this.fetch('subscribe_newsletter', { name, email });
    },

    async getNewsletterSubscribers() {
        return this.fetch('get_newsletter_subscribers');
    },

    async deleteNewsletterSubscriber(id: string) {
        return this.fetch('delete_newsletter_subscriber', { id });
    },

    // --- BLOG ---
    async fetchGallery() {
        const data = await this.fetch('fetch_gallery');
        return data.success ? data.data : [];
    },


    async getBlogPosts() {
        return this.fetch('get_blog_posts');
    },

    async getBlogPostBySlug(slug: string) {
        return this.fetch('get_blog_post_by_slug', { slug });
    },

    async saveBlogPost(post: any) {
        return this.fetch('save_blog_post', { post });
    },

    async deleteBlogPost(id: string) {
        return this.fetch('delete_blog_post', { id });
    },

    async getBlogComments(postId?: string) {
        return this.fetch('get_blog_comments', { post_id: postId });
    },

    async saveBlogComment(comment: { post_id: string, author: string, content: string, user_id?: string, status?: string }) {
        return this.fetch('save_blog_comment', comment);
    },

    async deleteBlogComment(id: string) {
        return this.fetch('delete_blog_comment', { id });
    },

    // --- GALLERY ---
    async saveGalleryItem(item: any) {
        return this.fetch('save_gallery_item', { item });
    },

    async deleteGalleryItem(id: string) {
        return this.fetch('delete_gallery_item', { id });
    },

    // --- AI INSIGHTS ---
    async getAIInsights() {
        return this.fetch('get_ai_insights');
    },

    async saveAIInsight(insight: any) {
        return this.fetch('save_ai_insight', { insight });
    },

    async testEmail(to?: string) {
        return this.fetch('test_email', { to });
    },

    // --- EMAIL CAMPAIGNS ---
    async getEmailCampaigns() {
        return this.fetch('get_email_campaigns');
    },

    async saveEmailCampaign(campaign: any) {
        return this.fetch('save_email_campaign', { campaign });
    },

    async deleteEmailCampaign(id: string) {
        return this.fetch('delete_email_campaign', { id });
    },

    // --- DRIVE ---
    async getDriveFolders(parentId?: string | null) {
        return this.fetch('get_drive_folders', { parent_id: parentId });
    },

    async saveDriveFolder(name: string, parentId?: string | null, id?: string) {
        return this.fetch('save_drive_folder', { name, parent_id: parentId, id });
    },

    async deleteDriveFolder(id: string) {
        return this.fetch('delete_drive_folder', { id });
    },

    async getDriveFiles(folderId?: string | null) {
        return this.fetch('get_drive_files', { folder_id: folderId });
    },

    async saveDriveFile(fileData: any) {
        return this.fetch('save_drive_file', { file: fileData });
    },

    async deleteDriveFile(id: string) {
        return this.fetch('delete_drive_file', { id });
    },

    async getAiInsights(prompt: string, systemContext: string) {
        return this.fetch('get_ai_insights', { prompt, systemContext });
    },

    async analyzeAuditLogs() {

        return this.fetch('analyze_audit_logs', {});
    },

    async getDriveFolder(name: string) {
        return this.fetch('get_drive_folder', { name });
    },

    async registerDriveFile(file: any) {
        return this.fetch('register_drive_file', { file });
    },

    async processPayment(payload: any) {
        return this.fetch('process_payment', { payload });
    },

    async uploadDriveFile(file: File, folderId?: string, uploadedBy?: string) {
        const formData = new FormData();
        formData.append('file', file);
        if (folderId) formData.append('folder_id', folderId);
        if (uploadedBy) formData.append('uploaded_by', uploadedBy);
        
        const response = await fetch(`${HOSTINGER_BRIDGE_URL}?action=upload_drive_file`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${HOSTINGER_API_KEY}`
            },
            body: formData
        });

        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const data = await response.json();
        if (data && data.error) throw new Error(data.error);
        return data;
    },

    exportDatabase() {
        return this.fetch('export_database');
    },

    purgeDatabase() {
        return this.fetch('purge_database');
    },

    getPublicUrl(path: string) {
        if (!path) return '';
        if (path.startsWith('http')) return path;
        
        // Hostinger path is usually relative to public/
        // If the path already contains 'uploads/', we use it.
        const cleanPath = path.replace('public/', '');
        return `${IS_PROD ? 'https://paocaseiro.co.mz' : 'http://localhost:8000'}/${cleanPath}`;
    }
};
