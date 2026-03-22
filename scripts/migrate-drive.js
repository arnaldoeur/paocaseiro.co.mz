import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://bqiegszufcqimlvucrpm.supabase.co';
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJxaWVnc3p1ZmNxaW1sdnVjcnBtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEyNzA4MzgsImV4cCI6MjA4Njg0NjgzOH0.AvypZPxytOhoftIFjmK_KclmF3yf_vps-xxzYw9q18k';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function runMigration() {
    console.log("Starting Migration to Drive...");

    // 1. Get Folders
    const { data: folders, error: foldersErr } = await supabase.from('drive_folders').select('id, name');
    if (foldersErr || !folders) {
        console.error("Failed to fetch folders:", foldersErr);
        return;
    }

    const fotosFolder = folders.find(f => f.name === 'Fotos de Produtos')?.id;
    const recibosFolder = folders.find(f => f.name === 'Recibos')?.id;
    const faturasFolder = folders.find(f => f.name === 'Faturas')?.id;

    if (!fotosFolder || !recibosFolder || !faturasFolder) {
        console.error("One or more required folders are missing.");
        return;
    }

    // 2. Migrate Product Photos
    console.log("Migrating Product Photos...");
    const { data: products } = await supabase.from('products').select('id, name, image');
    
    if (products) {
        let importedPhotos = 0;
        for (const p of products) {
            if (p.image && p.image.includes('/storage/v1/object/public/products/')) {
                // Extract path after 'products/'
                const parts = p.image.split('/public/products/');
                const pathName = parts[1];
                
                if (pathName) {
                    // Check if already in drive
                    const { data: exists } = await supabase.from('drive_files')
                        .select('id')
                        .eq('path', pathName)
                        .maybeSingle();
                        
                    if (!exists) {
                        const originalName = pathName.split('/').pop() || pathName;
                        await supabase.from('drive_files').insert({
                            name: originalName,
                            path: pathName,
                            size: 102400, // Dummy size mapping (100kb approx)
                            type: 'image/jpeg',
                            folder_id: fotosFolder,
                            uploaded_by: 'admin'
                        });
                        importedPhotos++;
                    }
                }
            }
        }
        console.log(`Successfully migrated ${importedPhotos} Product Photos.`);
    }

    // 3. Migrate Receipts / Invoices (Generate PDFs if missing)
    console.log("Migrating Receipts & Invoices...");
    const { data: receipts } = await supabase.from('receipts').select('*').order('created_at', { ascending: false }).limit(50); // limit to 50 for demo
    
    if (receipts) {
        let generatedReceipts = 0;
        for (const r of receipts) {
            // Check if already generated
            const fileName = `${r.document_type === 'Receipt' ? 'recibos' : 'faturas'}/${r.receipt_no}.pdf`;
            
            const { data: exists } = await supabase.from('drive_files')
                .select('id')
                .eq('path', fileName)
                .maybeSingle();

            if (!exists) {
                try {
                    console.log(`Generating PDF for ${r.receipt_no}...`);
                    const doc = new jsPDF();
                    doc.setFont('helvetica', 'bold');
                    doc.setFontSize(22);
                    doc.text("Pão Caseiro", 14, 20);
                    
                    doc.setFontSize(14);
                    doc.setTextColor(100);
                    doc.text(`${r.document_type === 'Receipt' ? 'Recibo' : 'Fatura'} N.º: ${r.receipt_no}`, 14, 30);
                    
                    doc.setFont('helvetica', 'normal');
                    doc.setFontSize(11);
                    doc.setTextColor(0);
                    doc.text(`Data: ${r.date}`, 14, 40);
                    doc.text(`Cliente: ${r.customer_name}`, 14, 46);
                    
                    let items = r.items || [];
                    if (typeof items === 'string') {
                        try { items = JSON.parse(items); } catch(e){}
                    }
                    if (!Array.isArray(items)) items = [];
                    
                    const tableData = items.map(i => [
                        i.name || 'Produto', 
                        (i.quantity || 1).toString(), 
                        `${Number(i.price || 0).toLocaleString()} MT`, 
                        `${(Number(i.price || 0) * Number(i.quantity || 1)).toLocaleString()} MT`
                    ]);
                    
                    autoTable(doc, {
                        startY: 55,
                        head: [['Artigo', 'Qtd', 'Preço Unit', 'Subtotal']],
                        body: tableData,
                        theme: 'striped',
                        headStyles: { fillColor: [217, 166, 90] }
                    });
                    
                    const finalY = doc.lastAutoTable?.finalY || 55;
                    doc.setFont('helvetica', 'bold');
                    doc.setFontSize(14);
                    doc.text(`Total a Pagar: ${Number(r.total_amount).toLocaleString()} MT`, 14, finalY + 15);
                    
                    const pdfBuffer = Buffer.from(doc.output('arraybuffer'));
                    
                    // Upload
                    const { error: uploadError } = await supabase.storage.from('products').upload(fileName, pdfBuffer, {
                         contentType: 'application/pdf',
                         upsert: true
                    });
                    
                    if (!uploadError) {
                         const targetFolder = r.document_type === 'Receipt' ? recibosFolder : faturasFolder;
                         await supabase.from('drive_files').insert({
                             name: `${r.receipt_no}.pdf`,
                             path: fileName,
                             size: pdfBuffer.length,
                             type: 'application/pdf',
                             folder_id: targetFolder,
                             uploaded_by: 'system' // System generated
                         });
                         generatedReceipts++;
                    } else {
                         console.error(`Failed to upload PDF for ${r.receipt_no}:`, uploadError);
                    }
                } catch (pdfErr) {
                    console.error(`Error generating PDF for ${r.receipt_no}:`, pdfErr);
                }
            }
        }
        console.log(`Successfully generated and synced ${generatedReceipts} Receipts/Invoices PDFs.`);
    }

    console.log("Migration Complete!");
}

runMigration().catch(console.error);
