import { createClient } from '@supabase/supabase-js';
import { sendOrderConfirmationEmail, sendAdminNewOrderNotification } from './email';
import { notifyCustomer, notifyTeam } from './sms';
import { notifyKitchenNewOrderWhatsApp, notifyAdminNewOrderWhatsApp, notifyCustomerNewOrderWhatsApp } from './whatsapp';

// Connection Mode management
export type ConnectionMode = 'proxy' | 'direct';

const getInitialMode = (): ConnectionMode => {
    if (typeof window !== 'undefined') {
        return (localStorage.getItem('supabase_connection_mode') as ConnectionMode) || 'direct';
    }
    return 'direct';
};

let currentMode = getInitialMode();

export const getConnectionMode = () => currentMode;

export const setConnectionMode = (mode: ConnectionMode) => {
    currentMode = mode;
    if (typeof window !== 'undefined') {
        localStorage.setItem('supabase_connection_mode', mode);
        // Refresh the client if needed (though recreate is better)
    }
};

const getSupabaseUrl = () => {
    // Hardcoded production fallback
    const HARDCODED_URL = 'https://bbvowyztvzselxphbqmt.supabase.co';
    const OLD_ID = 'bqiegszufcqimlvucrpm';
    
    let directUrl = import.meta.env.VITE_SUPABASE_URL || process.env.VITE_SUPABASE_URL || HARDCODED_URL;
    
    // Safety check: If the URL is explicitly the old one, override it with the new one
    if (directUrl.includes(OLD_ID)) {
        console.warn('Stale project ID detected in ENV, overriding with active project.');
        directUrl = HARDCODED_URL;
    }
    
    if (import.meta.env.DEV && currentMode === 'proxy') {
        return `${window.location.origin}/supabase-proxy`;
    }
    return directUrl;
};

const getSupabaseKey = () => {
    // Hardcoded production fallback for PUBLIC Anon Key
    const HARDCODED_KEY = 'sb_publishable_usLS1fQUcQkjo9PUJG7jxw_p_2Y7cCW';
    const OLD_KEY_START = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJxaWVnc3p1'; // Partial check for old key
    
    let key = import.meta.env.VITE_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || HARDCODED_KEY;
    
    // Safety check: If using old legacy key from previous project, override
    if (key.includes('bqiegsz')) {
        key = HARDCODED_KEY;
    }
    
    return key;
};

const SUPABASE_URL = getSupabaseUrl();
const SUPABASE_KEY = getSupabaseKey();

if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error("Supabase configuration missing and fallback failed! The app will likely crash.");
}

// Defensive Initialization with Singleton Pattern
const getSupabaseClient = () => {
    // Check if we already have a client in the global scope to avoid multiple GoTrueClient instances
    if (typeof window !== 'undefined' && (window as any)._supabaseInstance) {
        return (window as any)._supabaseInstance;
    }

    try {
        const client = createClient(SUPABASE_URL, SUPABASE_KEY);
        if (typeof window !== 'undefined') {
            (window as any)._supabaseInstance = client;
        }
        return client;
    } catch (e) {
        console.error("Fatal: Supabase client initialization failed", e);
        // Fallback placeholder to prevent immediate JS crash
        return { 
            from: () => ({ select: () => ({ in: () => ({}), eq: () => ({ single: () => ({}), maybeSingle: () => ({}) }) }) }),
            functions: { invoke: () => ({ error: { message: 'Initialization failed' } }) },
            storage: { from: () => ({ upload: () => ({ error: { message: 'Initialization failed' } }) }) },
            auth: { onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }) }
        } as any;
    }
};

export let supabase = getSupabaseClient();

export const refreshSupabaseClient = () => {
    const newUrl = getSupabaseUrl();
    if (newUrl) {
        supabase = createClient(newUrl, SUPABASE_KEY);
        if (typeof window !== 'undefined') {
            (window as any)._supabaseInstance = supabase;
        }
    }
};

/**
 * Helper to invoke the Hostinger MySQL Proxy Edge Function
 */
export const invokeHostingerDB = async (action: string, query?: string, params?: any[]) => {
    try {
        const { data, error } = await supabase.functions.invoke('hostinger-db', {
            body: { action, query, params }
        });
        
        if (error) throw error;
        return { success: true, data };
    } catch (error: any) {
        console.error('Hostinger DB Error:', error);
        return { success: false, error: error.message };
    }
};

/**
 * Helper to upload heavy media to Hostinger
 */
export const uploadToHostinger = async (file: File) => {
    const BRIDGE_URL = 'https://paocaseiro.co.mz/paocaseiro_bridge.php'; // Production URL
    const API_KEY = 'PaoCaseiro_Secure_Media_Bridge_2026';

    const formData = new FormData();
    formData.append('file', file);

    try {
        const response = await fetch(BRIDGE_URL, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${API_KEY}`
            },
            body: formData
        });

        if (!response.ok) {
            const errData = await response.json();
            throw new Error(errData.error || 'Upload failed');
        }

        return await response.json();
    } catch (error: any) {
        console.error('Hostinger Upload Error:', error);
        return { success: false, error: error.message };
    }
};

// --- Document Generation & Drive Sync (Moved up to fix hoisting issues) ---
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

export const getCompanySettings = async () => {
    try {
        const { data, error } = await supabase.from('settings').select('*');
        if (error) throw error;
        
        const settingsMap: any = {};
        data?.forEach((s: any) => settingsMap[s.key] = s.value);
        
        return {
            name: settingsMap['company_name'] || settingsMap['branding_name'] || 'Pão Caseiro',
            legalName: settingsMap['company_legal_name'] || 'Pão Caseiro, Lda',
            logo: settingsMap['branding_logo'] || '',
            address: settingsMap['company_address'] || settingsMap['branding_address'] || 'Lichinga, Av. Acordo de Lusaka',
            phone: settingsMap['company_phone'] || settingsMap['branding_phone'] || '+258 87 914 6662',
            email: settingsMap['company_email'] || settingsMap['branding_email_user'] || 'geral@paocaseiro.co.mz',
            website: settingsMap['company_website'] || 'www.paocaseiro.co.mz',
            nuit: settingsMap['company_nuit'] || '400000000',
            regNo: settingsMap['company_reg_no'] || '',
            slogan: settingsMap['company_slogan'] || 'O Sabor da Tradição',
            motto: settingsMap['company_motto'] || 'O sabor que aquece o coração'
        } as any;
    } catch (e) {
        console.error("Error fetching company settings:", e);
        return null;
    }
};

export const generateReceipt = async (
    orderId: string, 
    shortId: string, 
    customerId: string, 
    customerName: string, 
    items: any[], 
    totalAmount: number, 
    documentType: 'Receipt' | 'Invoice' = 'Receipt', 
    generatePdfFile: boolean = true,
    createPairedDocument: boolean = true,
    metadata: any = {},
    customCompanyInfo: any = null
) => {
    try {
        const primaryNo = documentType === 'Receipt' ? `REC-${shortId}` : `FAT-${shortId}`;
        const primaryData = {
            order_id: orderId,
            customer_id: customerId,
            customer_name: customerName,
            receipt_no: primaryNo,
            total_amount: totalAmount,
            currency: 'MT',
            document_type: documentType,
            items: items,
            status: documentType === 'Receipt' ? 'paid' : 'pending',
            created_at: new Date().toISOString()
        };
        const { data: primaryResult, error: primaryError } = await supabase.from('receipts').insert([primaryData]).select().single();
        if (primaryError) throw primaryError;

        if (createPairedDocument) {
            const pairedType = documentType === 'Receipt' ? 'Invoice' : 'Receipt';
            const pairedNo = pairedType === 'Receipt' ? `REC-${shortId}` : `FAT-${shortId}`;
            const pairedData = {
                ...primaryData,
                receipt_no: pairedNo,
                document_type: pairedType,
                status: pairedType === 'Receipt' ? 'paid' : primaryData.status,
            };
            const { error: pairedError } = await supabase.from('receipts').insert([pairedData]);
            if (pairedError) console.error("Could not insert paired document record", pairedError);
        }

        if (documentType === 'Receipt' || createPairedDocument) {
            await supabase.from('receipts')
                .update({ status: 'paid' })
                .eq('order_id', orderId)
                .eq('document_type', 'Invoice');
                
            if (!orderId.startsWith('MANUAL-')) {
                await supabase.from('orders')
                    .update({ payment_status: 'paid' })
                    .eq('id', orderId);
            }
        }

        if (generatePdfFile) {
            try {
                const { generateCustomerReceiptPDF, generateFormalInvoicePDF } = await import('./pdfGenerator');
                
                const companyInfo = customCompanyInfo || await getCompanySettings();
                
                const generateAndUploadPdf = async (type: 'Receipt' | 'Invoice', receiptNo: string, dbData: any) => {
                    const docProps = { 
                        ...dbData, 
                        short_id: shortId, 
                        transaction_id: receiptNo, 
                        delivery_type: 'pickup', 
                        amount_paid: totalAmount,
                        ...metadata 
                    };
                    const doc = type === 'Receipt' 
                        ? await generateCustomerReceiptPDF(docProps, items, companyInfo) 
                        : await generateFormalInvoicePDF(docProps, items, companyInfo);

                    const pdfBlob = doc.output('blob');
                    const fileName = `${type === 'Receipt' ? 'recibos' : 'faturas'}/${receiptNo}.pdf`;
                
                    const { error: uploadError } = await supabase.storage.from('products').upload(fileName, pdfBlob, {
                         contentType: 'application/pdf',
                         upsert: true
                    });
                    
                    if (!uploadError) {
                         const folderName = type === 'Receipt' ? 'Recibos' : 'Faturas';
                         const { data: folderInfo } = await supabase.from('drive_folders').select('id').eq('name', folderName).maybeSingle();
                         
                         await supabase.from('drive_files').insert({
                             name: `${receiptNo}.pdf`,
                             path: fileName,
                             size: pdfBlob.size,
                             type: 'application/pdf',
                             folder_id: folderInfo?.id || null,
                             uploaded_by: 'system' 
                         });
                    } else {
                         console.error(`PDF Upload Error for ${type}:`, uploadError);
                    }
                };

                await generateAndUploadPdf(documentType, primaryNo, primaryData);
                
                if (createPairedDocument) {
                    const pairedType = documentType === 'Receipt' ? 'Invoice' : 'Receipt';
                    const pairedNo = pairedType === 'Receipt' ? `REC-${shortId}` : `FAT-${shortId}`;
                    await generateAndUploadPdf(pairedType, pairedNo, primaryData);
                }

            } catch (pdfErr) {
                console.error("PDF Generation/Sync Error:", pdfErr);
            }
        }

        return { success: true, data: primaryResult };
    } catch (error) {
        console.error('Receipt generation error:', error);
        return { success: false, error };
    }
};

export const uploadReceiptToDrive = async (pdfBlob: Blob, orderId: string, documentType: 'Receipt' | 'Invoice') => {
    try {
        const orderShortId = orderId.split('-')[0].toUpperCase(); 
        const receiptNo = documentType === 'Receipt' ? `REC-${orderShortId}` : `FAT-${orderShortId}`;
        const fileName = `${documentType === 'Receipt' ? 'recibos' : 'faturas'}/${receiptNo}.pdf`;

        const { error: uploadError } = await supabase.storage.from('products').upload(fileName, pdfBlob, {
             contentType: 'application/pdf',
             upsert: true
        });

        if (!uploadError) {
             const folderName = documentType === 'Receipt' ? 'Recibos' : 'Faturas';
             const { data: folderInfo } = await supabase.from('drive_folders').select('id').eq('name', folderName).maybeSingle();
             
             await supabase.from('drive_files').insert({
                 name: `${receiptNo}.pdf`,
                 path: fileName,
                 size: pdfBlob.size,
                 type: 'application/pdf',
                 folder_id: folderInfo?.id || null,
                 uploaded_by: 'system' 
             });
             return { success: true };
        } else {
             console.error("PDF Auto-Save Upload Error:", uploadError);
             return { success: false, error: uploadError };
        }
    } catch (err) {
        console.error("Auto-save sync error:", err);
        return { success: false, error: err };
    }
};

export const previewDocumentPDF = async (docData: any, customCompanyInfo: any = null) => {
    try {
        const companyInfo = customCompanyInfo || await getCompanySettings();
        const { generateCustomerReceiptPDF, generateFormalInvoicePDF } = await import('./pdfGenerator');
        const docProps = { 
            ...docData, 
            short_id: docData.receipt_no.split('-').pop() || '000', 
            transaction_id: docData.receipt_no, 
            delivery_type: 'pickup', 
            amount_paid: docData.total_amount 
        };
        const doc = docData.document_type === 'Receipt' 
            ? await generateCustomerReceiptPDF(docProps, docData.items || [], companyInfo) 
            : await generateFormalInvoicePDF(docProps, docData.items || [], companyInfo);
            
        return doc.output('bloburl');
    } catch (error) {
        console.error("Preview PDF generation failed:", error);
        return null;
    }
};

export const saveOrderToSupabase = async (orderData: any, items: any[]) => {
    try {
        // 0. Check or Generate Internal ID
        let internalId = null;
        try {
            const { data: existingCustomer } = await supabase.from('customers').select('internal_id').eq('contact_no', orderData.customer_phone).maybeSingle();
            if (existingCustomer && existingCustomer.internal_id) {
                internalId = existingCustomer.internal_id;
            } else {
                // Generate new ID
                const { data: profile } = await supabase.from('company_profiles').select('customer_id_prefix, customer_id_start_number').limit(1).maybeSingle();
                const prefix = profile?.customer_id_prefix || 'Z';
                const startNum = profile?.customer_id_start_number || 1010;

                // Get highest current ID
                const { data: lastCust } = await supabase.from('customers').select('internal_id').not('internal_id', 'is', null).order('created_at', { ascending: false }).limit(1).maybeSingle();

                let nextNum = startNum;
                if (lastCust && lastCust.internal_id) {
                    const match = lastCust.internal_id.match(/\d+/);
                    if (match) {
                        nextNum = Math.max(startNum, parseInt(match[0], 10) + 1);
                    }
                }
                internalId = `${prefix}${nextNum}`;
            }
        } catch (idErr) {
            console.error("Error generating internal_id:", idErr);
            // Non-fatal, proceed without internal_id if it fails
        }

        // 1. Upsert Customer (Create or Update based on contact_no)
        const { data: customer, error: customerError } = await supabase
            .from('customers')
            .upsert({
                contact_no: orderData.customer_phone,
                phone: orderData.customer_phone,
                name: orderData.customer_name,
                email: orderData.customer_email || null,
                whatsapp: orderData.customer_whatsapp || null,
                nuit: orderData.customer_nuit || null,
                date_of_birth: orderData.customer_dob || null,
                address: orderData.customer_address,
                street: orderData.customer_street || null,
                reference_point: orderData.customer_reference_point || null,
                internal_id: internalId, // Save the generated or existing ID
                last_order_at: new Date().toISOString()
            }, { onConflict: 'contact_no' })
            .select()
            .single();

        if (customerError) {
            console.error("Customer upsert failed:", customerError);
            throw customerError;
        }

        if (!customer || !customer.id) {
            console.error("Critical error: Customer upsert returned no ID.");
            throw new Error("Missing customer ID after upsert.");
        }

        // 2. Insert Order (Linked to Customer)
        const { data: order, error: orderError } = await supabase
            .from('orders')
            .insert([{
                short_id: orderData.short_id,
                payment_ref: orderData.payment_ref,
                transaction_id: orderData.transaction_id,
                delivery_type: orderData.delivery_type,
                delivery_address: orderData.delivery_address,
                delivery_coordinates: orderData.delivery_coordinates,
                table_zone: orderData.table_zone,
                table_people: orderData.table_people,
                notes: orderData.notes,
                total_amount: orderData.total_amount,
                amount_paid: orderData.amount_paid,
                balance: orderData.balance,
                status: orderData.status,
                customer_id: customer.id,
                customer_name: orderData.customer_name,
                customer_phone: orderData.customer_phone,
                customer_address: orderData.delivery_address
            }])
            .select()
            .single();

        if (orderError) throw orderError;

        // NEW: Log System Event for Admin Notification Center
        try {
            await (await import('./NotificationService')).NotificationService.logSystemEvent(
                'Nova Encomenda',
                `Encomenda #${orderData.short_id} recebida de ${orderData.customer_name}. Total: ${orderData.total_amount} MT`,
                'ORDER',
                'success',
                customer.id
            );
        } catch (logErr) {
            console.error("System logging failed for order:", logErr);
        }

        // 3. Prepare Items with order_id
        const orderItems = items.map(item => ({
            order_id: order.id,
            product_name: item.name,
            quantity: item.quantity,
            price: item.price,
            subtotal: item.price * item.quantity
        }));

        // 4. Insert Items
        const { error: itemsError } = await supabase
            .from('order_items')
            .insert(orderItems);

        if (itemsError) throw itemsError;

        // 5. Deduct Stock Immediately on Order Confirmed
        for (const item of items) {
            const productId = item.id || item.product_id;
            const quantityToDeduct = item.quantity || 1;
            if (productId) {
                const { data: product } = await supabase.from('products').select('stock_quantity').eq('id', productId).single();
                if (product && typeof product.stock_quantity === 'number') {
                    const newStock = Math.max(0, product.stock_quantity - quantityToDeduct);
                    await supabase.from('products').update({ stock_quantity: newStock }).eq('id', productId);
                }
            }
        }

        // 6. Trigger Background Tasks (Non-blocking)
        const shortIdStr = orderData.short_id || Date.now().toString().slice(-6);
        const isPaid = orderData.payment_status === 'paid';
        
        processOrderBackgroundTasks(order, items, customer, orderData, shortIdStr, isPaid)
            .catch(bgError => console.error("Background tasks failed silently:", bgError));

        return { success: true, order, customer };
    } catch (error) {
        console.error('Supabase Error:', error);
        return { success: false, error };
    }
};

/**
 * Encapsulated background worker for decoupled processing.
 * Ready to be migrated to a Supabase Edge Function in the future.
 */
async function processOrderBackgroundTasks(
    order: any, 
    items: any[], 
    customer: any, 
    orderData: any, 
    shortIdStr: string, 
    isPaid: boolean
) {
    // Fetch common settings once for consistency
    const companyInfo = await getCompanySettings();

    // 1. Generate Initial Document
    try {
        const docMetadata = {
            customer_phone: customer.contact_no || orderData.customer_phone || orderData.phone || '',
            customer_email: customer.email || orderData.customer_email || '',
            customer_nuit: customer.nuit || orderData.customer_nuit || '',
            customer_address: customer.address || orderData.customer_address || orderData.delivery_address || '',
            payment_method: orderData.payment_method || orderData.method || ''
        };

        await generateReceipt(
            order.id,
            shortIdStr,
            customer.id,
            customer.name,
            items,
            orderData.total_amount,
            isPaid ? 'Receipt' : 'Invoice',
            true, // Generate PDF to Drive
            isPaid, // Create paired document if paid
            docMetadata,
            companyInfo
        );
    } catch (docError) {
        console.error("Initial document generation error", docError);
    }

    // 2. Send Branded Notifications
    try {
        const fullOrder = {
            ...order,
            customer_email: customer.email,
            customer_name: customer.name,
            total_amount: orderData.total_amount,
            short_id: shortIdStr,
            delivery_type: orderData.delivery_type,
            delivery_address: orderData.delivery_address,
            table_zone: orderData.table_zone,
            table_people: orderData.table_people,
            notes: orderData.notes,
            customer_phone: orderData.customer_phone
        };

        // Email Confirmation to Customer
        sendOrderConfirmationEmail(fullOrder, items).catch(e => console.error("Email notification failed", e));

        // Detailed Email Notification to Admin
        sendAdminNewOrderNotification(fullOrder, items).catch(e => console.error("Admin notification failed", e));

        // WhatsApp Notification to Kitchen and Admin
        notifyKitchenNewOrderWhatsApp(fullOrder, items).catch(e => console.error("Kitchen WhatsApp notification failed", e));
        notifyAdminNewOrderWhatsApp(fullOrder, items).catch(e => console.error("Admin WhatsApp notification failed", e));

        // WhatsApp Notification / Receipt to Customer - Pass companyInfo
        notifyCustomerNewOrderWhatsApp(fullOrder, items, companyInfo).catch(e => console.error("Customer WhatsApp notification failed", e));

        // SMS Confirmation
        const smsOrder = {
            short_id: shortIdStr,
            orderId: order.id,
            customer: { phone: orderData.customer_phone, name: customer.name },
            status: 'pending'
        };
        notifyCustomer(smsOrder, 'order_confirmed').catch(e => console.error("SMS notification failed", e));

        // Admin SMS Notification
        const adminSmsOrder = {
            orderId: shortIdStr || order.id,
            customer: { name: customer.name },
            total: orderData.total_amount,
            items: items
        };
        notifyTeam(adminSmsOrder, 'new_order').catch(e => console.error("Admin SMS notification failed", e));

    } catch (notifError) {
        console.error("Post-save notification error", notifError);
    }
}

export const getProducts = async () => {
    try {
        const { data: products, error } = await supabase
            .from('products')
            .select('*')
            .order('name');

        if (error) throw error;
        return { success: true, data: products };
    } catch (error) {
        console.error('Error fetching products:', error);
        return { success: false, error };
    }
};
