// services/hostingerService.ts

const IS_PROD = typeof window !== 'undefined' && !window.location.hostname.includes('localhost');
const HOSTINGER_BRIDGE_URL = (typeof window !== 'undefined' && (window.location.protocol === 'http:' || window.location.protocol === 'https:'))
    ? '/paocaseiro_db.php'
    : 'https://paocaseiro.co.mz/paocaseiro_db.php';

console.log(`[Hostinger Service] Bridge URL: ${HOSTINGER_BRIDGE_URL}`);
const HOSTINGER_API_KEY = 'PaoCaseiro_Direct_MySQL_2026';

export interface HostingerOrderData {
    short_id: string;
    customer_id?: string | null;
    customer_name: string;
    customer_phone: string;
    customer_email?: string;
    total_amount: number;
    delivery_type: 'pickup' | 'delivery' | 'dine_in';
    delivery_address?: string;
    notes?: string;
    payment_method?: string;
    payment_status?: string;
    payment_reference?: string;
    transaction_id?: string;
    items: Array<{
        name: string;
        quantity: number;
        price: number;
    }>;
}

export const hostingerService = {
    async fetch(action: string, body: any = {}, retryCount = 1) {
        let lastError: any;
        for (let i = 0; i <= retryCount; i++) {
            try {
                const response = await fetch(`${HOSTINGER_BRIDGE_URL}?action=${action}`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${HOSTINGER_API_KEY}`,
                        'X-Requested-With': 'XMLHttpRequest'
                    },
                    body: JSON.stringify({ action, ...body })
                });

                const data = await response.json().catch(() => null);

                if (!response.ok) {
                    const errorMessage = data?.error || data?.message || `HTTP error! status: ${response.status}`;
                    throw new Error(errorMessage);
                }

                if (data && data.error) {
                    throw new Error(data.error);
                }
                
                if (data && data.statusCode && data.statusCode >= 400 && data.message) {
                    throw new Error(`Email Service Error: ${data.message}`);
                }

                return data;
            } catch (error: any) {
                lastError = error;
                const isNetworkError = error.message.includes('Failed to fetch') || error.message.includes('NetworkError') || error.message.includes('network');
                
                if (isNetworkError && i < retryCount) {
                    console.warn(`[Hostinger Service] Network failure on ${action}. Retrying... (${i + 1}/${retryCount})`);
                    await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1))); // Exponential backoff
                    continue;
                }
                
                console.error(`Hostinger Service Error [${action}]:`, error);
                throw error;
            }
        }
        throw lastError;
    },

    // --- PRODUTOS ---
    async getProducts() {
        const data = await this.fetch('get_products');
        if (Array.isArray(data)) {
            return data.map((p: any) => ({
                ...p,
                image: this.resolveProductImage(p.name, p.image),
                stock: p.stock_quantity ?? p.stockQuantity ?? 0,
                isAvailable: p.is_available == 1 || p.is_available === true || p.inStock == 1
            }));
        }
        return data;
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
    async getSettings(key?: string) {
        return this.fetch('get_system_settings', key ? { key } : {});
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
        return this.fetch('get_work_shifts', { member_id: memberId, status });
    },

    async saveWorkSession(sessionData: any) {
        const res = await this.fetch('save_work_shift', { shift: sessionData });
        if (res.success) {
            return {
                success: true,
                id: res.id,
                session: {
                    id: res.id,
                    ...sessionData
                }
            };
        }
        return res;
    },

    async updateWorkSession(id: string, status: string, clockOut?: string) {
        return this.fetch('update_work_shift', { id, status, clock_out: clockOut });
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
        const data = await this.fetch('get_gallery');
        return data.success && Array.isArray(data.data) ? data.data : [];
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
        return this.fetch('get_cash_registers');
    },

    async openCashSession(openedBy: string, openingBalance: number) {
        const res = await this.fetch('save_cash_register', { opened_by: openedBy, opening_balance: openingBalance });
        if (res.success) {
            return {
                success: true,
                session: {
                    id: res.id,
                    opened_by: openedBy,
                    opening_balance: openingBalance,
                    status: 'open',
                    opened_at: new Date().toISOString()
                }
            };
        }
        return res;
    },

    async closeCashSession(id: string, closingBalance: number, notes: string) {
        return this.fetch('update_cash_register', { id, closing_balance: closingBalance, notes, status: 'closed' });
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
        return this.fetch('get_active_work_shift', { member_id: memberId });
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
        return this.fetch('init_tx', { payload });
    },

    async uploadDriveFile(file: File, folderId?: string | null, uploadedBy?: string, targetFolder?: string) {
        const formData = new FormData();
        formData.append('file', file);
        if (folderId) formData.append('folder_id', folderId);
        if (uploadedBy) formData.append('uploaded_by', uploadedBy);
        if (targetFolder) formData.append('target_folder', targetFolder);

        const response = await fetch(`${HOSTINGER_BRIDGE_URL}?action=upload_drive_file`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${HOSTINGER_API_KEY}`
            },
            body: formData
        });

        if (!response.ok) throw new Error('Falha no upload');
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
        
        // Intercepta uploads/products para servir dos assets
        if (path.includes('uploads/products/')) {
            const fileName = path.substring(path.lastIndexOf('/') + 1);
            const cleanName = fileName.replace(/^\d+_/, '');
            const knownAssets = [
                "agua-namaacha-500ml.png", "arrofadas.png", "batata-frita.png", "batatas-fritas.png",
                "biscoitos-amanteigados.png", "bola-berlim.png", "bolo-arroz.png", "bolo-t14.png",
                "bolo20.png", "bolot24.png", "bolot26.png", "brioche-fruta.png", "broa-milho.png",
                "cachorro-quente.png", "cafe-categoria.png", "cafeexpressapao.png", "cakes.png",
                "calzone-recheado.png", "cappuccino.png", "cha-com-leite.png", "cha-especial-1.png",
                "cha-leite-gelado-boba.png", "cha-quente.png", "chamussaS.png", "chamussas-mix.png",
                "charuto.png", "chocolate-quente.png", "coca-cola-300ml.png", "compal-300ml.png",
                "coxinhas.png", "croissant-folhado.png", "croissants-chocolate.png", "croissants-folhados.png",
                "croissants-recheados-extra.png", "croissants-recheados.png", "croissants-simples.png",
                "donuts.png", "empadas.png", "fanta-laranja-300ml.png", "fatias-bolo-pound.png",
                "fatias-xadrez.png", "folhado-salsicha-queijo.png", "folhado-salsicha.png", "folhados-carne.png",
                "folhados-recheados.png", "guardanapo-recheado.png", "hamburguer-completo.png",
                "hamburguer-simples.png", "ketchup.png", "king-pie-frango.png", "lacos.png",
                "lingua-sogra.png", "maionese.png", "melted-cheese-sauce.png", "mini-bus.png",
                "mini-folhados.png", "mini-pizza.png", "mini-pizzas-extra.png", "molho-de-tomate.png",
                "molho-picante.png", "nevada.png", "palmier-recheado.png", "palmier.png",
                "pao-caseiro-extra-2.png", "pao-caseiro.png", "pao-cereais.png", "pao-de-hamburguer.png",
                "pao-extra.png", "pao-forma-integral.png", "pao-forma-simples.png", "pao-integral-2.png",
                "pao-integral.png", "pao-portugues.png", "paointefgrale.png", "paonormal2.png",
                "paozinho-leite-dourado.png", "pastel-de-coco.png", "pastel-de-nata.png", "pie-vegetais.png",
                "pizza-4-estacoes.png", "pizza-atum.png", "pizza-de-frango-2.png", "pizza-frango.png",
                "pizza-mexicana.png", "pizza-pepperoni.png", "pizza_mexicana.webp", "premium-coffee.png",
                "pudim.png", "queques.png", "rissois-camarao.png", "sacos-de-torrada.png", "salada-mista.png",
                "salada-tomate-cebola.png", "shawarma-de-frango.png", "sprite-300ml.png", "torta.png",
                "waffle-stick.png", "waffle_stick.png"
            ];
            if (knownAssets.includes(cleanName)) {
                return this.getPublicUrl(`assets/products/${cleanName}`);
            }
        }
        
        // Handle database proxy serve_file links correctly
        if (path.includes('paocaseiro_db.php')) {
            const index = HOSTINGER_BRIDGE_URL.indexOf('paocaseiro_db.php');
            const baseUrl = index !== -1 ? HOSTINGER_BRIDGE_URL.substring(0, index) : '';
            return `${baseUrl}${path.substring(path.indexOf('paocaseiro_db.php'))}`;
        }

        if (path.startsWith('http')) {
            if (path.includes('/uploads/')) {
                const relativePath = path.substring(path.indexOf('uploads/'));
                return this.getPublicUrl(`paocaseiro_db.php?action=serve_upload&path=${relativePath}`);
            }
            return path;
        }

        // Hostinger path is usually relative to public/
        // Remove leading slash and 'public/' if present
        const cleanPath = path.replace(/^(\/|public\/)/, '');
        
        if (cleanPath.startsWith('uploads/')) {
            return this.getPublicUrl(`paocaseiro_db.php?action=serve_upload&path=${cleanPath}`);
        }
        
        // If it's a simple filename (no slashes) and looks like an image, assume it's in images/products/
        if (!cleanPath.includes('/') && /\.(jpg|jpeg|png|webp|gif|svg)$/i.test(cleanPath)) {
             return `${IS_PROD ? 'https://paocaseiro.co.mz' : 'http://localhost:8000'}/images/products/${cleanPath}`;
        }

        // If it's a UI/branding asset within the local repository (assets/ folder)
        // These should always be served relative to the site root
        if (cleanPath.startsWith('assets/')) {
            return `/${cleanPath}`;
        }

        return `${IS_PROD ? 'https://paocaseiro.co.mz' : 'http://localhost:8000'}/${cleanPath}`;
    },

    resolveProductImage(name: string, originalImage?: string): string {
        const normalizedName = name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        
        // Force override for known local assets if name matches
        if (normalizedName.includes('lingua de sogra') || normalizedName.includes('lingua da sogra')) {
            return this.getPublicUrl('assets/products/lingua-sogra.png');
        }
        
        const mapping: Record<string, string> = {
            'pao caseiro': 'pao-caseiro.png',
            'pao de forma': 'pao-forma-simples.png',
            'pao integral': 'pao-integral.png',
            'pao de cereais': 'pao-cereais.png',
            'pao portugues': 'pao-portugues.png',
            'pao de hamburguer': 'pao-de-hamburguer.png',
            'paozinho': 'paozinho-leite-dourado.png',
            'croissant simples': 'croissants-simples.png',
            'croissant de chocolate': 'croissants-chocolate.png',
            'croissant folhado': 'croissant-folhado.png',
            'croissant recheado': 'croissants-recheados.png',
            'croissant': 'croissants-simples.png',
            'pastel de nata': 'pastel-de-nata.png',
            'pastel de coco': 'pastel-de-coco.png',
            'bolo de arroz': 'bolo-arroz.png',
            'bola de berlim': 'bola-berlim.png',
            'queque': 'queques.png',
            'palmier': 'palmier.png',
            'arrofada': 'arrofadas.png',
            'brioche': 'brioche-fruta.png',
            'chamuca': 'chamussaS.png',
            'chamussa': 'chamussaS.png',
            'empada': 'empadas.png',
            'rissois': 'rissois-camarao.png',
            'coxinha': 'coxinhas.png',
            'folhado de salsicha': 'folhado-salsicha.png',
            'folhado de carne': 'folhados-carne.png',
            'folhado': 'mini-folhados.png',
            'pizza frango': 'pizza-frango.png',
            'pizza atum': 'pizza-atum.png',
            'pizza pepperoni': 'pizza-pepperoni.png',
            'pizza mexicana': 'pizza-mexicana.png',
            'mini pizza': 'mini-pizza.png',
            'pizza': 'pizza-4-estacoes.png',
            'hamburguer simples': 'hamburguer-simples.png',
            'hamburguer completo': 'hamburguer-completo.png',
            'cachorro quente': 'cachorro-quente.png',
            'shawarma': 'shawarma-de-frango.png',
            'batata frita': 'batata-frita.png',
            'salada mista': 'salada-mista.png',
            'salada tomate': 'salada-tomate-cebola.png',
            'cafe': 'premium-coffee.png',
            'cappuccino': 'cappuccino.png',
            'chocolate quente': 'chocolate-quente.png',
            'cha': 'cha-quente.png',
            'agua': 'agua-namaacha-500ml.png',
            'coca cola': 'coca-cola-300ml.png',
            'coca-cola': 'coca-cola-300ml.png',
            'fanta': 'fanta-laranja-300ml.png',
            'sprite': 'sprite-300ml.png',
            'compal': 'compal-300ml.png',
            'bolo': 'cakes.png',
            'torta': 'torta.png',
            'pudim': 'pudim.png',
            'waffle': 'waffle-stick.png',
            'saco de torrada': 'sacos-de-torrada.png',
            'ketchup': 'ketchup.png',
            'maionese': 'maionese.png',
            'molho picante': 'molho-picante.png'
        };

        if (originalImage && originalImage.trim() !== '') {
            // Se for um link de uploads/products, tenta mapear para o asset correspondente que temos localmente
            if (originalImage.includes('uploads/products/')) {
                const fileName = originalImage.substring(originalImage.lastIndexOf('/') + 1);
                const cleanName = fileName.replace(/^\d+_/, '');
                const knownAssets = [
                    "agua-namaacha-500ml.png", "arrofadas.png", "batata-frita.png", "batatas-fritas.png",
                    "biscoitos-amanteigados.png", "bola-berlim.png", "bolo-arroz.png", "bolo-t14.png",
                    "bolo20.png", "bolot24.png", "bolot26.png", "brioche-fruta.png", "broa-milho.png",
                    "cachorro-quente.png", "cafe-categoria.png", "cafeexpressapao.png", "cakes.png",
                    "calzone-recheado.png", "cappuccino.png", "cha-com-leite.png", "cha-especial-1.png",
                    "cha-leite-gelado-boba.png", "cha-quente.png", "chamussaS.png", "chamussas-mix.png",
                    "charuto.png", "chocolate-quente.png", "coca-cola-300ml.png", "compal-300ml.png",
                    "coxinhas.png", "croissant-folhado.png", "croissants-chocolate.png", "croissants-folhados.png",
                    "croissants-recheados-extra.png", "croissants-recheados.png", "croissants-simples.png",
                    "donuts.png", "empadas.png", "fanta-laranja-300ml.png", "fatias-bolo-pound.png",
                    "fatias-xadrez.png", "folhado-salsicha-queijo.png", "folhado-salsicha.png", "folhados-carne.png",
                    "folhados-recheados.png", "guardanapo-recheado.png", "hamburguer-completo.png",
                    "hamburguer-simples.png", "ketchup.png", "king-pie-frango.png", "lacos.png",
                    "lingua-sogra.png", "maionese.png", "melted-cheese-sauce.png", "mini-bus.png",
                    "mini-folhados.png", "mini-pizza.png", "mini-pizzas-extra.png", "molho-de-tomate.png",
                    "molho-picante.png", "nevada.png", "palmier-recheado.png", "palmier.png",
                    "pao-caseiro-extra-2.png", "pao-caseiro.png", "pao-cereais.png", "pao-de-hamburguer.png",
                    "pao-extra.png", "pao-forma-integral.png", "pao-forma-simples.png", "pao-integral-2.png",
                    "pao-integral.png", "pao-portugues.png", "paointefgrale.png", "paonormal2.png",
                    "paozinho-leite-dourado.png", "pastel-de-coco.png", "pastel-de-nata.png", "pie-vegetais.png",
                    "pizza-4-estacoes.png", "pizza-atum.png", "pizza-de-frango-2.png", "pizza-frango.png",
                    "pizza-mexicana.png", "pizza-pepperoni.png", "pizza_mexicana.webp", "premium-coffee.png",
                    "pudim.png", "queques.png", "rissois-camarao.png", "sacos-de-torrada.png", "salada-mista.png",
                    "salada-tomate-cebola.png", "shawarma-de-frango.png", "sprite-300ml.png", "torta.png",
                    "waffle-stick.png", "waffle_stick.png"
                ];
                if (knownAssets.includes(cleanName)) {
                    return this.getPublicUrl(`assets/products/${cleanName}`);
                }
            }

            if (originalImage.startsWith('http') && !originalImage.includes('/uploads/')) return originalImage;
            if (originalImage.includes('paocaseiro_db.php') || originalImage.includes('assets/') || originalImage.includes('uploads/')) {
                return this.getPublicUrl(originalImage);
            }
            
            let cleanOriginal = originalImage.replace(/^\//, '');
            // Normalize the filename part of the original image just like we did with physical files
            const parts = cleanOriginal.split('/');
            const filename = parts.pop() || '';
            const path = parts.length > 0 ? parts.join('/') + '/' : '';
            
            const dotIndex = filename.lastIndexOf('.');
            const namePart = dotIndex > -1 ? filename.substring(0, dotIndex) : filename;
            const extPart = dotIndex > -1 ? filename.substring(dotIndex) : '';
            
            const normalizedFilename = namePart
                .toLowerCase()
                .normalize("NFD")
                .replace(/[\u0300-\u036f]/g, "")
                .replace(/\s+/g, '-')
                + extPart.toLowerCase();

            cleanOriginal = path + normalizedFilename;

            // Se já tiver assets/products, não adiciona de novo
            if (cleanOriginal.includes('assets/products')) {
                return this.getPublicUrl(cleanOriginal);
            }
            return this.getPublicUrl(`assets/products/${cleanOriginal}`);
        }

        // Sort keys by length descending to ensure more specific matches (e.g. "forma integral") are checked before broader ones (e.g. "forma")
        const mappingEntries = Object.entries(mapping).sort((a, b) => b[0].length - a[0].length);

        for (const [key, image] of mappingEntries) {
            if (normalizedName.includes(key)) {
                return this.getPublicUrl(`assets/products/${image}`);
            }
        }

        return this.getPublicUrl('assets/products/pao-caseiro.png');
    }
};
