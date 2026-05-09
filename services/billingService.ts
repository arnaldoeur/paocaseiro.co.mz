import { hostingerService } from './hostingerService';
import { generateCustomerReceiptPDF, generateFormalInvoicePDF } from './pdfGenerator';

export const getCompanySettings = async () => {
    try {
        const settings = await hostingerService.getSettings();
        if (!settings || settings.length === 0) return null;

        const settingsMap: any = {};
        settings.forEach((s: any) => {
            settingsMap[s.key] = s.value;
        });

        return {
            name: settingsMap['company_name'] || 'Pão Caseiro',
            address: settingsMap['company_address'] || 'Av. Acordo de Lusaka, Lichinga',
            phone: settingsMap['company_phone'] || '+258 87 9146 662',
            email: settingsMap['company_email'] || 'geral@paocaseiro.co.mz',
            nuit: settingsMap['company_nuit'] || '400000000',
            regNo: settingsMap['company_reg_no'] || '',
            slogan: settingsMap['company_slogan'] || 'O sabor que aquece o coração',
            motto: settingsMap['company_motto'] || 'O sabor que aquece o coração'
        } as any;
    } catch (e) {
        console.error("Error fetching company settings:", e);
        return null;
    }
};

export const previewDocumentPDF = async (docData: any, customCompanyInfo: any = null) => {
    try {
        const companyInfo = customCompanyInfo || await getCompanySettings();
        const docProps = {
            ...docData,
            short_id: docData.receipt_no?.split('-').pop() || '000',
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

export const generateAndUploadReceipt = async (
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
            created_at: new Date().toISOString(),
            ...metadata
        };

        // 1. Save to Hostinger
        const primaryResult = await hostingerService.saveReceipt(primaryData);

        if (createPairedDocument) {
            const pairedType = documentType === 'Receipt' ? 'Invoice' : 'Receipt';
            const pairedNo = pairedType === 'Receipt' ? `REC-${shortId}` : `FAT-${shortId}`;
            const pairedData = {
                ...primaryData,
                receipt_no: pairedNo,
                document_type: pairedType,
                status: pairedType === 'Receipt' ? 'paid' : primaryData.status,
            };
            await hostingerService.saveReceipt(pairedData);
        }

        // 2. Update Order Status if paid
        if (documentType === 'Receipt' || createPairedDocument) {
            // In Hostinger, we can update order status
            if (!orderId.startsWith('MANUAL-')) {
                await hostingerService.updateOrder(orderId, { payment_status: 'paid' });
            }
        }

        // 3. Handle PDF Generation and Upload
        if (generatePdfFile) {
            try {
                const companyInfo = customCompanyInfo || await getCompanySettings();

                const generateAndUpload = async (type: 'Receipt' | 'Invoice', receiptNo: string, dbData: any) => {
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
                    const file = new File([pdfBlob], `${receiptNo}.pdf`, { type: 'application/pdf' });

                    // Upload to Hostinger Drive
                    const folderName = type === 'Receipt' ? 'Recibos' : 'Faturas';
                    let folderId = null;
                    try {
                        const folder = await hostingerService.getDriveFolder(folderName);
                        folderId = folder?.id;
                    } catch (e) { }

                    await hostingerService.uploadDriveFile(file, folderId, 'system');
                };

                await generateAndUpload(documentType, primaryNo, primaryData);

                if (createPairedDocument) {
                    const pairedType = documentType === 'Receipt' ? 'Invoice' : 'Receipt';
                    const pairedNo = pairedType === 'Receipt' ? `REC-${shortId}` : `FAT-${shortId}`;
                    await generateAndUpload(pairedType, pairedNo, primaryData);
                }
            } catch (pdfErr) {
                console.error("PDF Generation/Upload Error:", pdfErr);
            }
        }

        return { success: true, data: primaryResult };
    } catch (error) {
        console.error('Billing service error:', error);
        return { success: false, error };
    }
};
