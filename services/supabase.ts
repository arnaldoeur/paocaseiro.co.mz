import { createClient } from '@supabase/supabase-js';
import { sendOrderConfirmationEmail, sendAdminNewOrderNotification } from './email';
import { notifyCustomer, notifyTeam } from './sms';
import { notifyKitchenNewOrderWhatsApp, notifyAdminNewOrderWhatsApp, notifyCustomerNewOrderWhatsApp } from './whatsapp';

// Connection Mode management
export type ConnectionMode = 'proxy' | 'direct';

const getInitialMode = (): ConnectionMode => {
    if (typeof window !== 'undefined') {
        return (localStorage.getItem('supabase_connection_mode') as ConnectionMode) || 'proxy';
    }
    return 'proxy';
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
    const directUrl = import.meta.env.VITE_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    if (import.meta.env.DEV && currentMode === 'proxy') {
        return `${window.location.origin}/supabase-proxy`;
    }
    return directUrl;
};

const SUPABASE_URL = getSupabaseUrl();
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.warn("Supabase configuration missing!");
}

// Export a function to recreate the client when mode changes
export let supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

export const refreshSupabaseClient = () => {
    const newUrl = getSupabaseUrl();
    if (newUrl) {
        supabase = createClient(newUrl, SUPABASE_KEY);
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

        // 6. Generate Initial Invoice Record
        const invoiceData = {
            order_id: order.id,
            customer_id: customer.id,
            customer_name: customer.name,
            receipt_no: `FAT-${orderData.short_id || Date.now().toString().slice(-6)}`,
            date: new Date().toISOString().split('T')[0],
            total_amount: orderData.total_amount,
            currency: 'MT',
            document_type: 'Invoice',
            items: items,
            status: 'pending',
            created_at: new Date().toISOString()
        };
        const { error: invoiceError } = await supabase.from('receipts').insert([invoiceData]);
        if (invoiceError) console.error("Invoice generation error", invoiceError);

        // 6. Send Branded Notifications
        try {
            const fullOrder = {
                ...order,
                customer_email: customer.email,
                customer_name: customer.name,
                total_amount: orderData.total_amount,
                short_id: orderData.short_id,
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

            // WhatsApp Notification / Receipt to Customer
            notifyCustomerNewOrderWhatsApp(fullOrder, items).catch(e => console.error("Customer WhatsApp notification failed", e));

            // SMS Confirmation
            const smsOrder = {
                short_id: orderData.short_id,
                orderId: order.id,
                customer: { phone: orderData.customer_phone, name: customer.name },
                status: 'pending'
            };
            notifyCustomer(smsOrder, 'order_confirmed').catch(e => console.error("SMS notification failed", e));

            // Admin SMS Notification
            const adminSmsOrder = {
                orderId: orderData.short_id || order.id,
                customer: { name: customer.name },
                total: orderData.total_amount,
                items: items
            };
            notifyTeam(adminSmsOrder, 'new_order').catch(e => console.error("Admin SMS notification failed", e));

        } catch (notifError) {
            console.error("Post-save notification error", notifError);
        }

        return { success: true, order, customer };
    } catch (error) {
        console.error('Supabase Error:', error);
        return { success: false, error };
    }
};

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

import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

export const generateReceipt = async (orderId: string, shortId: string, customerId: string, customerName: string, items: any[], totalAmount: number, documentType: 'Receipt' | 'Invoice' = 'Receipt', generatePdfFile: boolean = true) => {
    try {
        const receiptNo = documentType === 'Receipt' ? `REC-${shortId}` : `FAT-${shortId}`;
        const receiptData = {
            order_id: orderId,
            customer_id: customerId,
            customer_name: customerName,
            receipt_no: receiptNo,
            date: new Date().toISOString().split('T')[0],
            total_amount: totalAmount,
            currency: 'MT',
            document_type: documentType,
            items: items,
            status: 'paid',
            created_at: new Date().toISOString()
        };
        const { data, error } = await supabase.from('receipts').insert([receiptData]).select().single();
        if (error) throw error;

        // If it's a receipt being generated for an existing invoice, update the invoice status
        if (documentType === 'Receipt') {
            await supabase.from('receipts')
                .update({ status: 'paid' })
                .eq('order_id', orderId)
                .eq('document_type', 'Invoice');
        }

        // --- Generate PDF & Sync to Drive ---
        if (generatePdfFile) {
            try {
                const doc = new jsPDF();
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(22);
            doc.text("Pão Caseiro", 14, 20);
            
            doc.setFontSize(14);
            doc.setTextColor(100);
            doc.text(`${documentType === 'Receipt' ? 'Recibo' : 'Fatura'} N.º: ${receiptNo}`, 14, 30);
            
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(11);
            doc.setTextColor(0);
            doc.text(`Data: ${receiptData.date}`, 14, 40);
            doc.text(`Cliente: ${customerName}`, 14, 46);
            
            const tableData = items.map(i => [
                i.name, 
                i.quantity.toString(), 
                `${i.price.toLocaleString()} MT`, 
                `${(i.price * i.quantity).toLocaleString()} MT`
            ]);
            
            autoTable(doc, {
                startY: 55,
                head: [['Artigo', 'Qtd', 'Preço Unit', 'Subtotal']],
                body: tableData,
                theme: 'striped',
                headStyles: { fillColor: [217, 166, 90] } // #d9a65a
            });
            
            const finalY = (doc as any).lastAutoTable.finalY || 55;
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(14);
            doc.text(`Total a Pagar: ${totalAmount.toLocaleString()} MT`, 14, finalY + 15);
            
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(10);
            doc.setTextColor(150);
            doc.text("Obrigado pela preferência!", 14, finalY + 30);

            const pdfBlob = doc.output('blob');
            const fileName = `${documentType === 'Receipt' ? 'recibos' : 'faturas'}/${receiptNo}.pdf`;
            
            // Upload to products bucket
            const { error: uploadError } = await supabase.storage.from('products').upload(fileName, pdfBlob, {
                 contentType: 'application/pdf',
                 upsert: true
            });
            
            if (!uploadError) {
                 // Sync to drive_files
                 const folderName = documentType === 'Receipt' ? 'Recibos' : 'Faturas';
                 const { data: folderInfo } = await supabase.from('drive_folders').select('id').eq('name', folderName).maybeSingle();
                 
                 await supabase.from('drive_files').insert({
                     name: `${receiptNo}.pdf`,
                     path: fileName,
                     size: pdfBlob.size,
                     type: 'application/pdf',
                     folder_id: folderInfo?.id || null,
                     uploaded_by: 'system' // System generated
                 });
            } else {
                 console.error("PDF Upload Error:", uploadError);
            }
        } catch (pdfErr) {
            console.error("PDF Generation/Sync Error:", pdfErr);
        }
        }
        // ------------------------------------

        return { success: true, data };
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
