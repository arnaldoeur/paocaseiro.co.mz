import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

const getBase64ImageFromUrl = async (url: string): Promise<string> => {
    if (!url) return '';
    if (url.startsWith('data:')) return url;
    
    return new Promise((resolve) => {
        if (typeof window === 'undefined') { resolve(''); return; }
        const img = new Image();
        img.crossOrigin = 'Anonymous';
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            if (ctx) ctx.drawImage(img, 0, 0);
            resolve(canvas.toDataURL('image/png'));
        };
        img.onerror = () => resolve('');
        img.src = url;
    });
};

export const generateCustomerReceiptPDF = async (order: any, items: any[], documentType: string = 'Fatura') => {
    // Standard A4 sizes: width 210mm, height 297mm
    // Wait, mobile layout looks better for WhatsApp! Let's use a custom width: 120mm, variable height or A4 aspect ratio.
    // Given the invoice has few items, a portrait mode paper is good. Let's stick to standard 'a4' for universal compatibility.
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    
    let currentY = 20;

    // 1. Logo
    try {
        const logoUrl = typeof window !== 'undefined' ? `${window.location.origin}/images/logo_receipt.png` : '/images/logo_receipt.png';
        const logoBase64 = await getBase64ImageFromUrl(logoUrl);
        if (logoBase64) {
            // Keep aspect ratio. Say logo is 60x60
            pdf.addImage(logoBase64, 'PNG', (pageWidth - 50) / 2, currentY, 50, 50);
            currentY += 55;
        } else {
            currentY += 40;
        }
    } catch (e) {
        currentY += 40;
    }

    // 2. Subtitle
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(14);
    pdf.setTextColor(217, 166, 90); // #d9a65a
    const subtitle = "PADARIA, PASTELARIA E CAFÉ";
    pdf.text(subtitle, pageWidth / 2, currentY, { align: 'center' });
    currentY += 8;

    // 3. Line separator
    pdf.setDrawColor(217, 166, 90);
    pdf.setLineWidth(0.5);
    pdf.line(15, currentY, pageWidth - 15, currentY);
    currentY += 10;

    // 4. Two columns header (Customer & Order Info)
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(10);
    pdf.setTextColor(150, 150, 150);
    pdf.text("CLIENTE", 15, currentY);
    pdf.text("PEDIDO", pageWidth - 15, currentY, { align: 'right' });
    currentY += 6;

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(12);
    pdf.setTextColor(59, 47, 47);
    const customerName = order.customer_name || order.customer?.name || 'Cliente';
    const customerPhone = order.customer_phone || order.phone || order.customer?.phone || '';
    pdf.text(customerName.toUpperCase(), 15, currentY);
    
    // Order ID
    const shortId = order.short_id || order.orderId || order.id?.slice(-6).toUpperCase() || '';
    pdf.text(`${documentType.toUpperCase() === 'RECEIPT' ? 'REC' : 'FAT'}-PC-${shortId}`, pageWidth - 15, currentY, { align: 'right' });
    currentY += 5;

    // Client Phone
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(11);
    pdf.setTextColor(100, 100, 100);
    if(customerPhone) {
        pdf.text(customerPhone, 15, currentY);
    }

    // Payment ID and Date
    pdf.setFontSize(9);
    if (order.transaction_id || order.id) {
        pdf.text(`ID Pagamento: ${order.transaction_id || 'ORD' + (order.id || Date.now()).toString().slice(0,10)}`, pageWidth - 15, currentY, { align: 'right' });
        currentY += 5;
    }
    const dateStr = (order.created_at || order.date) ? new Date(order.created_at || order.date).toLocaleString('pt-PT') : new Date().toLocaleString('pt-PT');
    pdf.text(dateStr, pageWidth - 15, currentY, { align: 'right' });
    currentY += 10;

    // 5. Box / Type of delivery
    const deliveryTypeMap: Record<string, string> = {
        'pickup': 'Levantamento na Loja',
        'takeaway': 'Levantamento na Loja',
        'delivery': 'Entrega ao Domicílio',
        'dine_in': `Consumo na Loja (Mesa ${order.table_zone || '...'})`
    };
    const deliveryType = deliveryTypeMap[order.delivery_type || order.customer?.type || 'pickup'] || 'Levantamento na Loja';
    
    pdf.setDrawColor(230, 230, 230);
    pdf.setFillColor(252, 252, 252);
    pdf.roundedRect(15, currentY, pageWidth - 30, 15, 3, 3, 'FD');
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(12);
    pdf.setTextColor(59, 47, 47);
    // Draw home icon placeholder or just text
    pdf.text(deliveryType, 20, currentY + 11);
    currentY += 25;

    // 6. Items Table
    const tableData = items.map(i => [
        i.name || i.product_name, 
        i.quantity.toString(), 
        `${(i.price * i.quantity).toLocaleString()} MT`
    ]);

    autoTable(pdf, {
        startY: currentY,
        head: [['Item', 'Qtd', 'Total']],
        body: tableData,
        theme: 'plain',
        headStyles: { textColor: [150, 150, 150], fontSize: 11, fontStyle: 'bold' },
        bodyStyles: { textColor: [59, 47, 47], fontSize: 12 },
        columnStyles: {
            0: { cellWidth: 'auto', halign: 'left' },
            1: { cellWidth: 25, halign: 'center' },
            2: { cellWidth: 40, halign: 'right', fontStyle: 'bold' }
        },
        margin: { left: 15, right: 15 },
        didParseCell: function (data) {
            if (data.section === 'head' && data.column.index === 1) {
                data.cell.styles.halign = 'center';
            }
            if (data.section === 'head' && data.column.index === 2) {
                data.cell.styles.halign = 'right';
            }
        }
    });

    currentY = (pdf as any).lastAutoTable.finalY + 10;

    // Subtotal
    const totalAmount = order.total_amount || order.total || 0;
    pdf.setDrawColor(230, 230, 230);
    pdf.line(15, currentY, pageWidth - 15, currentY);
    currentY += 8;
    
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(11);
    pdf.setTextColor(150, 150, 150);
    pdf.text("Subtotal", 15, currentY);
    pdf.text(`${totalAmount.toLocaleString()} MT`, pageWidth - 15, currentY, { align: 'right' });
    currentY += 8;

    // Total line
    pdf.line(15, currentY, pageWidth - 15, currentY);
    currentY += 10;
    
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(16);
    pdf.setTextColor(59, 47, 47);
    pdf.text("TOTAL", 15, currentY);
    pdf.text(`${totalAmount.toLocaleString()} MT`, pageWidth - 15, currentY, { align: 'right' });
    currentY += 10;

    // Pago status
    const paymentStatus = order.payment_status || order.status;
    if (paymentStatus === 'paid' || paymentStatus === 'completed' || order.amount_paid >= totalAmount) {
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(14);
        pdf.setTextColor(34, 197, 94); // Green 500
        pdf.text("Pago", 15, currentY);
        pdf.text(`${(order.amount_paid || totalAmount).toLocaleString()} MT`, pageWidth - 15, currentY, { align: 'right' });
        currentY += 12;
    } else {
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(14);
        pdf.setTextColor(239, 68, 68); // Red 500
        pdf.text("Por Pagar", 15, currentY);
        pdf.text(`${(totalAmount - (order.amount_paid || 0)).toLocaleString()} MT`, pageWidth - 15, currentY, { align: 'right' });
        currentY += 12;
    }

    // Dotted separator
    pdf.setLineDashPattern([2, 2], 0);
    pdf.setDrawColor(200, 200, 200);
    pdf.line(15, currentY, pageWidth - 15, currentY);
    pdf.setLineDashPattern([], 0); // reset
    currentY += 15;

    // Footer
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(10);
    pdf.setTextColor(150, 150, 150);
    pdf.text("Obrigado pela preferência!", pageWidth / 2, currentY, { align: 'center' });
    currentY += 6;
    
    pdf.setFont('helvetica', 'italic');
    pdf.setTextColor(217, 166, 90);
    pdf.text('"O sabor que aquece o coração"', pageWidth / 2, currentY, { align: 'center' });
    currentY += 8;
    
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(100, 100, 100);
    pdf.text("Pão Caseiro", pageWidth / 2, currentY, { align: 'center' });
    currentY += 6;
    
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(9);
    pdf.text("Lichinga, Av. Acordo de Lusaka", pageWidth / 2, currentY, { align: 'center' });
    currentY += 5;
    pdf.text("+258 87 9146 662", pageWidth / 2, currentY, { align: 'center' });
    currentY += 5;
    pdf.text("geral@paocaseiro.co.mz", pageWidth / 2, currentY, { align: 'center' });
    currentY += 5;
    pdf.text("www.paocaseiro.co.mz", pageWidth / 2, currentY, { align: 'center' });

    return pdf;
};
