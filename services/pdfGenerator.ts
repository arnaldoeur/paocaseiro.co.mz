import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

export interface CompanySettings {
    name: string;
    legalName: string;
    logo: string;
    address: string;
    phone: string;
    email: string;
    website: string;
    nuit: string;
    regNo: string;
    slogan: string;
    motto: string;
}

const DEFAULT_COMPANY_INFO: CompanySettings = {
    name: 'Pão Caseiro',
    legalName: 'Pão Caseiro, Lda',
    logo: '',
    address: 'Lichinga, Av. Acordo de Lusaka',
    phone: '+258 87 914 6662',
    email: 'geral@paocaseiro.co.mz',
    website: 'www.paocaseiro.co.mz',
    nuit: '',
    regNo: '',
    slogan: 'O Sabor da Tradição',
    motto: 'O sabor que aquece o coração'
};

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

function numeroPorExtenso(num: number): string {
    const unidades = ["", "um", "dois", "três", "quatro", "cinco", "seis", "sete", "oito", "nove"];
    const dezenas = ["dez", "onze", "doze", "treze", "catorze", "quinze", "dezasseis", "dezassete", "dezoito", "dezanove"];
    const dezenasMultiplos = ["", "dez", "vinte", "trinta", "quarenta", "cinquenta", "sessenta", "setenta", "oitenta", "noventa"];
    const centenas = ["", "cento", "duzentos", "trezentos", "quatrocentos", "quinhentos", "seiscentos", "setecentos", "oitocentos", "novecentos"];

    if (num === 0) return "zero meticais";
    if (num === 100) return "cem meticais";

    const getGroup = (n: number): string => {
        if (n === 0) return "";
        if (n === 100) return "cem";
        
        let res = "";
        const c = Math.floor(n / 100);
        const d = Math.floor((n % 100) / 10);
        const u = n % 10;

        if (c > 0) res += centenas[c];
        if (d === 1) {
            if (res) res += " e ";
            res += dezenas[u];
            return res; 
        } else if (d > 1) {
            if (res) res += " e ";
            res += dezenasMultiplos[d];
        }
        if (u > 0) {
            if (res) res += " e ";
            res += unidades[u];
        }
        return res;
    };

    let result = "";
    const m = Math.floor(num / 1000000);
    const mil = Math.floor((num % 1000000) / 1000);
    const rest = num % 1000;

    if (m > 0) {
        result += getGroup(m) + (m === 1 ? " milhão" : " milhões");
    }
    if (mil > 0) {
        if (result) result += " e ";
        if (mil === 1 && !result) {
            result += "mil";
        } else {
            result += getGroup(mil) + " mil";
        }
    }
    if (rest > 0) {
        if (result) result += " e ";
        result += getGroup(rest);
    }
    
    return result + (num === 1 ? " metical" : " meticais");
}

/**
 * RECIBO (Receipt) - Mobile-friendly Beautiful Model matches POS App Print
 */
export const generateCustomerReceiptPDF = async (order: any, items: any[], companyInfo: CompanySettings = DEFAULT_COMPANY_INFO) => {
    companyInfo = companyInfo || DEFAULT_COMPANY_INFO;
    let currentY = 10;
    // Add more buffer height to account for the extra spaces, margins and multi-line customer info
    const estimatedHeight = 220 + (items.length * 15) + 60; 
    const pdf = new jsPDF('p', 'mm', [80, estimatedHeight]);
    const pageWidth = 80;
    const margin = 5;

    // Background color #fffbf5 (255, 251, 245)
    pdf.setFillColor(255, 251, 245);
    pdf.rect(0, 0, pageWidth, estimatedHeight, 'F');

    // 1. Logo
    try {
        const logoUrl = companyInfo.logo || (typeof window !== 'undefined' ? `${window.location.origin}/images/logo_receipt.png` : '/images/logo_receipt.png');
        const logoBase64 = await getBase64ImageFromUrl(logoUrl);
        if (logoBase64) {
            pdf.addImage(logoBase64, 'PNG', (pageWidth - 30) / 2, currentY, 30, 30);
            currentY += 32;
        } else {
            currentY += 15;
        }
    } catch (e) {
        currentY += 15;
    }

    // Subtitle
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(150, 150, 150);
    pdf.text(companyInfo.slogan?.toUpperCase() || "PADARIA, PASTELARIA E CAFÉ", pageWidth / 2, currentY, { align: 'center' });
    currentY += 5;

    // Gold line
    pdf.setDrawColor(217, 166, 90);
    pdf.setLineWidth(0.4);
    pdf.line(margin, currentY, pageWidth - margin, currentY);
    currentY += 5;

    // Document Header (Centered)
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(8);
    pdf.setTextColor(150, 150, 150);
    pdf.text("DOCUMENTO", pageWidth / 2, currentY, { align: 'center' });
    currentY += 4;
    
    pdf.setFontSize(10);
    pdf.setTextColor(59, 47, 47);
    pdf.text("FATURA-RECIBO", pageWidth / 2, currentY, { align: 'center' });
    currentY += 5;

    const shortId = order.short_id || order.orderId || order.id?.slice(-6).toUpperCase() || '';
    let displayShortId = shortId;
    if (displayShortId.startsWith('FAT-PC-')) displayShortId = displayShortId.replace('FAT-PC-', '');
    if (displayShortId.startsWith('PC-')) displayShortId = displayShortId.replace('PC-', '');

    pdf.setFontSize(9);
    pdf.text(`N.º FAT-PC-${displayShortId}`, pageWidth / 2, currentY, { align: 'center' });
    currentY += 4;

    const dateStr = (order.created_at || order.date) ? new Date(order.created_at || order.date).toLocaleString('pt-PT') : new Date().toLocaleString('pt-PT'); 
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8);
    pdf.setTextColor(150, 150, 150);
    pdf.text(dateStr, pageWidth / 2, currentY, { align: 'center' });
    currentY += 8;

    // Delivery Type Box (Levantamento na Loja)
    pdf.setDrawColor(240, 240, 240);
    pdf.setFillColor(255, 255, 255);
    pdf.roundedRect(margin, currentY, pageWidth - (margin * 2), 10, 2, 2, 'FD');
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(8);
    pdf.setTextColor(59, 47, 47);
    
    const deliveryTypeMap: Record<string, string> = {
        'pickup': 'Levantamento na Loja',
        'takeaway': 'Levantamento na Loja',
        'delivery': 'Entrega ao Domicílio',
        'dine_in': `Consumo na Loja`
    };
    const deliveryStr = deliveryTypeMap[order.delivery_type || order.customer?.type || 'pickup'] || 'Levantamento na Loja';
    pdf.text(deliveryStr, pageWidth / 2, currentY + 6.5, { align: 'center' });
    currentY += 15;

    // Client and Pedido Info Columns
    pdf.setFontSize(7);
    pdf.text("CLIENTE", margin, currentY);
    pdf.text("PAGAMENTO", pageWidth - margin, currentY, { align: 'right' });
    currentY += 4;

    const customerName = order.customer_name || order.customer?.name || 'Consumidor Final';
    const customerPhone = order.customer_phone || order.phone || order.customer?.phone || '';
    const paymentRef = order.payment_ref || order.transaction_id || `ORD-${Date.now().toString().slice(-6)}`;

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(9);
    pdf.setTextColor(59, 47, 47); // #3b2f2f
    
    // Left Column (Cliente)
    let leftY = currentY;
    let nameLines = pdf.splitTextToSize(customerName, (pageWidth / 2) - margin);
    pdf.text(nameLines, margin, leftY);
    leftY += (nameLines.length * 4);

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(7);
    pdf.setTextColor(150, 150, 150);
    if(customerPhone) {
        pdf.text(customerPhone, margin, leftY);
        leftY += 4;
    }
    const customerEmail = order.customer_email || order.customer?.email || '';
    if (customerEmail) {
        let emailLines = pdf.splitTextToSize(customerEmail, (pageWidth / 2) - margin);
        pdf.text(emailLines, margin, leftY);
        leftY += (emailLines.length * 4);
    }
    
    // Right Column (Pagamento)
    let rightY = currentY;
    
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(7);
    pdf.setTextColor(150, 150, 150);
    pdf.text("ID Pagamento:", pageWidth - margin, rightY, { align: 'right' });
    rightY += 3;
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(59, 47, 47);
    pdf.text(paymentRef, pageWidth - margin, rightY, { align: 'right' });
    rightY += 4;

    // Payment Method
    const paymentMethodMap: Record<string, string> = {
        'mpesa': 'M-Pesa',
        'emola': 'e-Mola',
        'pos': 'POS (Cartão)',
        'cash': 'Dinheiro (Numerário)',
        'bank_transfer': 'Transferência',
        'online': 'Pagamento Online'
    };
    const rawPaymentMethod = order.payment_method || order.method || '';
    if (rawPaymentMethod) {
        pdf.setFont('helvetica', 'normal');
        pdf.text("Método:", pageWidth - margin, rightY, { align: 'right' });
        rightY += 3;
        pdf.setFont('helvetica', 'bold');
        pdf.text(paymentMethodMap[rawPaymentMethod] || rawPaymentMethod, pageWidth - margin, rightY, { align: 'right' });
        rightY += 4;
    }

    currentY = Math.max(leftY, rightY) + 4;

    // Table Header
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(7);
    pdf.setTextColor(150, 150, 150);
    pdf.text("Item", margin, currentY);
    pdf.text("Qtd", pageWidth / 2 + 5, currentY, { align: 'center' });
    pdf.text("Total", pageWidth - margin, currentY, { align: 'right' });
    currentY += 2;
    pdf.setDrawColor(240, 240, 240);
    pdf.line(margin, currentY, pageWidth - margin, currentY);
    currentY += 5;

    // Items
    let totalAmount = 0;
    pdf.setTextColor(59, 47, 47);
    pdf.setFontSize(8);
    items.forEach(item => {
        const qty = item.quantity || 1;
        const price = item.price || 0;
        const itemTotal = qty * price;
        totalAmount += itemTotal;
        
        // Item Name
        let itemName = item.name || item.product_name || 'Artigo';
        const nameLinesArr = pdf.splitTextToSize(itemName, (pageWidth / 2));
        pdf.text(nameLinesArr, margin, currentY);
        
        // Qty & Price
        pdf.text(qty.toString(), pageWidth / 2 + 5, currentY, { align: 'center' });
        // Make total bold
        pdf.setFont('helvetica', 'bold');
        pdf.text(`${itemTotal} MT`, pageWidth - margin, currentY, { align: 'right' });
        pdf.setFont('helvetica', 'normal');
        
        currentY += (nameLinesArr.length * 4) + 2;
        pdf.setDrawColor(245, 245, 245);
        pdf.line(margin, currentY - 1, pageWidth - margin, currentY - 1);
    });

    currentY += 3;

    // Subtotal
    pdf.setFontSize(8);
    pdf.setTextColor(150, 150, 150);
    pdf.text("Subtotal", margin, currentY);
    pdf.text(`${totalAmount} MT`, pageWidth - margin, currentY, { align: 'right' });
    currentY += 5;

    // Gold line
    currentY += 2;
    pdf.setDrawColor(217, 166, 90);
    pdf.line(margin, currentY, pageWidth - margin, currentY);
    currentY += 6;

    // TOTAL
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(12);
    pdf.setTextColor(59, 47, 47);
    pdf.text("TOTAL", margin, currentY);
    pdf.text(`${totalAmount} MT`, pageWidth - margin, currentY, { align: 'right' });
    currentY += 6;

    // Pago (Green)
    const amountPaid = order.amount_paid || totalAmount; // Assume fully paid if receipt
    pdf.setFontSize(8);
    pdf.setTextColor(34, 197, 94); // green-500
    pdf.text("Pago", margin, currentY);
    pdf.text(`${amountPaid} MT`, pageWidth - margin, currentY, { align: 'right' });
    currentY += 4;

    // Falta Pagar
    const balance = totalAmount - amountPaid;
    if (balance > 0) {
        pdf.setTextColor(239, 68, 68); // Red
        pdf.text("Falta Pagar", margin, currentY);
        pdf.text(`${balance} MT`, pageWidth - margin, currentY, { align: 'right' });
        currentY += 4;
    }

    // Dotted separator
    currentY += 8;

    // ── FOOTER ──────────────────────────────────────────────────────────────
    const pageHeight = pdf.internal.pageSize.getHeight();
    let footerY = pageHeight - 48; // Try to stick to bottom
    
    // Prevent overlap with dynamic content
    if (footerY < currentY + 8) {
        footerY = currentY + 8;
    }

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(7);
    pdf.setTextColor(150, 150, 150);
    pdf.text("Obrigado pela preferência!", pageWidth / 2, footerY, { align: 'center' });
    footerY += 4;
    pdf.text("Documento Processado por Computador", pageWidth / 2, footerY, { align: 'center' });
    footerY += 7;

    pdf.setFont('helvetica', 'italic');
    pdf.setTextColor(217, 166, 90);
    pdf.text(`"${companyInfo.motto || 'O sabor que aquece o coração'}"`, pageWidth / 2, footerY, { align: 'center' });
    footerY += 6;

    return pdf;
};

/**
 * FATURA (Invoice) - Colorful Branded Model with NUIT & Complete Data
 * As requested, the colorful model is used for Faturas, with all details.
 */
export const generateFormalInvoicePDF = async (order: any, items: any[], companyInfo: CompanySettings = DEFAULT_COMPANY_INFO) => {
    companyInfo = companyInfo || DEFAULT_COMPANY_INFO;
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pageWidth = pdf.internal.pageSize.getWidth();
    // const pageHeight = pdf.internal.pageSize.getHeight();
    
    let currentY = 20;

    // 1. Logo
    try {
        const logoUrl = companyInfo.logo || (typeof window !== 'undefined' ? `${window.location.origin}/images/logo_receipt.png` : '/images/logo_receipt.png');
        const logoBase64 = await getBase64ImageFromUrl(logoUrl);
        if (logoBase64) {
            pdf.addImage(logoBase64, 'PNG', (pageWidth - 35) / 2, currentY, 35, 35);
            currentY += 40;
        } else {
            currentY += 25;
        }
    } catch (e) {
        currentY += 25;
    }

    // 2. Subtitle & Branding Headers
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(16);
    pdf.setTextColor(217, 166, 90); // #d9a65a
    const subtitle = companyInfo.legalName?.toUpperCase() || companyInfo.name?.toUpperCase() || "PADARIA E PASTELARIA PÃO CASEIRO";
    pdf.text(subtitle, pageWidth / 2, currentY, { align: 'center' });
    currentY += 6;

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(10);
    pdf.setTextColor(100, 100, 100);
    pdf.text(companyInfo.address || "Lichinga, Av. Acordo de Lusaka", pageWidth / 2, currentY, { align: 'center' });
    currentY += 5;
    pdf.text(`Telf: ${companyInfo.phone || '+258 87 9146 662'} | Email: ${companyInfo.email || 'geral@paocaseiro.co.mz'}`, pageWidth / 2, currentY, { align: 'center' });
    currentY += 5;

    if (companyInfo.nuit) {
        pdf.setFont('helvetica', 'bold');
        pdf.text(`NUIT: ${companyInfo.nuit}`, pageWidth / 2, currentY, { align: 'center' });
        currentY += 6;
    } else {
        currentY += 3;
    }

    // 3. Line separator
    pdf.setDrawColor(217, 166, 90);
    pdf.setLineWidth(0.5);
    pdf.line(15, currentY, pageWidth - 15, currentY);
    currentY += 8;

    // 4. Two columns header (Customer & Order Info)
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(10);
    pdf.setTextColor(150, 150, 150);
    pdf.text("FATURADO A", 15, currentY);
    pdf.text("DOCUMENTO", pageWidth - 15, currentY, { align: 'right' });
    currentY += 6;

    // LEFT COLUMN
    let leftY = currentY;
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(12);
    pdf.setTextColor(59, 47, 47);
    const customerName = order.customer_name || order.customer?.name || 'Cliente Final';
    const customerPhone = order.customer_phone || order.phone || order.customer?.phone || '';
    const customerNuit = order.customer_nuit || order.nuit || order.customer?.nuit || '';
    pdf.text(customerName.toUpperCase(), 15, leftY);
    leftY += 6;

    // Client Addl Info
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(11);
    pdf.setTextColor(100, 100, 100);
    const customerEmail = order.customer_email || order.customer?.email || '';
    const customerAddress = order.customer_address || order.customer?.address || order.delivery_address || '';
    
    if(customerPhone) {
        pdf.text(`Telf: ${customerPhone}`, 15, leftY);
        leftY += 6;
    }
    if(customerAddress) {
        pdf.text(`Endereço: ${customerAddress}`, 15, leftY);
        leftY += 6;
    }
    if(customerEmail) {
        pdf.text(`Email: ${customerEmail}`, 15, leftY);
        leftY += 6;
    }
    if (customerNuit) {
        pdf.text(`NUIT: ${customerNuit}`, 15, leftY);
        leftY += 6;
    }

    // RIGHT COLUMN
    let rightY = currentY;
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(12);
    pdf.setTextColor(59, 47, 47);
    
    // LINHA 2 - FATURA-RECIBO
    pdf.text("FATURA-RECIBO", pageWidth - 15, rightY, { align: 'right' });
    rightY += 6;
    
    // LINHA 3 - N.º FAT-PC-xxxx (Prevent double PC prefix)
    const rawShortId = order.short_id || order.orderId || order.id?.slice(-6).toUpperCase() || '';
    let displayShortId = rawShortId;
    if (displayShortId.startsWith('FAT-PC-')) displayShortId = displayShortId.replace('FAT-PC-', '');
    if (displayShortId.startsWith('PC-')) displayShortId = displayShortId.replace('PC-', '');
    pdf.text(`N.º FAT-PC-${displayShortId}`, pageWidth - 15, rightY, { align: 'right' });
    rightY += 8;

    // LINHA 4 - DATA
    const dateStr = (order.created_at || order.date) ? new Date(order.created_at || order.date).toLocaleDateString('pt-PT') : new Date().toLocaleDateString('pt-PT');
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(10);
    pdf.setTextColor(100, 100, 100);
    pdf.text(`Data: ${dateStr}`, pageWidth - 15, rightY, { align: 'right' });
    rightY += 8;

    currentY = Math.max(leftY, rightY) + 4;

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
    pdf.roundedRect(15, currentY, pageWidth - 30, 12, 2, 2, 'FD');
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(11);
    pdf.setTextColor(59, 47, 47);
    // Center it horizontally and vertically within the Box
    pdf.text(`${deliveryType}`, pageWidth / 2, currentY + 6.5, { align: 'center' });
    currentY += 14;

    // 6. Items Table
    const tableData = items.map(i => [
        i.name || i.product_name, 
        i.quantity.toString(), 
        `${(i.price).toLocaleString()} MT`,
        `${(i.price * i.quantity).toLocaleString()} MT`
    ]);

    autoTable(pdf, {
        startY: currentY,
        head: [['Descrição', 'Qtd', 'Preço Unit.', 'Total']],
        body: tableData,
        theme: 'plain',
        headStyles: { textColor: [150, 150, 150], fontSize: 10, fontStyle: 'bold' },
        bodyStyles: { textColor: [59, 47, 47], fontSize: 11 },
        columnStyles: {
            0: { cellWidth: 'auto', halign: 'left' },
            1: { cellWidth: 20, halign: 'center' },
            2: { cellWidth: 35, halign: 'right' },
            3: { cellWidth: 40, halign: 'right', fontStyle: 'bold' }
        },
        margin: { left: 15, right: 15 },
        didParseCell: function (data) {
            if (data.section === 'head' && (data.column.index === 1 || data.column.index === 2)) {
                data.cell.styles.halign = 'center';
            }
            if (data.section === 'head' && data.column.index === 3) {
                data.cell.styles.halign = 'right';
            }
        }
    });

    currentY = (pdf as any).lastAutoTable.finalY + 6;

    // Subtotal
    const totalAmount = order.total_amount || order.total || 0;
    pdf.setDrawColor(230, 230, 230);
    pdf.line(15, currentY, pageWidth - 15, currentY);
    currentY += 6;
    
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(10);
    pdf.setTextColor(150, 150, 150);
    pdf.text("Subtotal", 15, currentY);
    pdf.text(`${totalAmount.toLocaleString()} MT`, pageWidth - 15, currentY, { align: 'right' });
    currentY += 6;

    // Total line
    pdf.line(15, currentY, pageWidth - 15, currentY);
    currentY += 8;
    
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(14);
    pdf.setTextColor(59, 47, 47);
    pdf.text("TOTAL PAGO", 15, currentY);
    pdf.text(`${totalAmount.toLocaleString()} MT`, pageWidth - 15, currentY, { align: 'right' });
    currentY += 8;
    
    pdf.setFont('helvetica', 'italic');
    pdf.setFontSize(9);
    pdf.setTextColor(100, 100, 100);
    const extensoText = numeroPorExtenso(totalAmount);
    // Capitalize first letter
    const extensoCap = extensoText.charAt(0).toUpperCase() + extensoText.slice(1);
    pdf.text(`Valor por extenso: ${extensoCap}`, 15, currentY);
    currentY += 8;

    // 7. Payment Status & Method (left side)
    const paymentStatus = order.payment_status || order.status || 'pending';
    if (paymentStatus === 'paid' || paymentStatus === 'completed') {
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(12);
        pdf.setTextColor(34, 197, 94); // Green 500
        pdf.text("Estado: Pago", 15, currentY);
    } else {
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(12);
        pdf.setTextColor(239, 68, 68); // Red 500
        pdf.text("Estado: A Prazo / Por Pagar", 15, currentY);
    }
    currentY += 6;

    const paymentMethodMapA4: Record<string, string> = {
        'mpesa': 'M-Pesa',
        'emola': 'e-Mola',
        'pos': 'POS (Cartão)',
        'cash': 'Dinheiro (Numerário)',
        'bank_transfer': 'Transferência',
        'online': 'Pagamento Online'
    };
    const rawPaymentMethodA4 = order.payment_method || order.method || '';
    if (rawPaymentMethodA4) {
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(10);
        pdf.setTextColor(100, 100, 100);
        pdf.text(`Método de Pagamento: ${paymentMethodMapA4[rawPaymentMethodA4] || rawPaymentMethodA4}`, 15, currentY);
    }
    
    currentY += 8;

    // Dotted separator
    pdf.setLineDashPattern([1.5, 1.5], 0);
    pdf.setDrawColor(200, 200, 200);
    pdf.line(15, currentY, pageWidth - 15, currentY);
    pdf.setLineDashPattern([], 0);
    currentY += 8;

    // ── FOOTER ──────────────────────────────────────────────────────────────
    const pageHeightA4 = pdf.internal.pageSize.getHeight();
    let footerYA4 = pageHeightA4 - 45; 

    // Prevent overlap
    if (footerYA4 < currentY + 15) {
        footerYA4 = currentY + 15;
    }

    // Add new page if footer overflows visually
    if (footerYA4 > pageHeightA4 - 25) {
        pdf.addPage();
        footerYA4 = 25;
    }

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(10);
    pdf.setTextColor(150, 150, 150);
    pdf.text("Obrigado pela preferência!", pageWidth / 2, footerYA4, { align: 'center' });
    footerYA4 += 5;
    pdf.setFontSize(8);
    pdf.text("Documento Processado por Computador", pageWidth / 2, footerYA4, { align: 'center' });
    footerYA4 += 9;

    pdf.setFont('helvetica', 'italic');
    pdf.setFontSize(11);
    pdf.setTextColor(217, 166, 90);
    pdf.text(`"${companyInfo.motto || 'O sabor que aquece o coração'}"`, pageWidth / 2, footerYA4, { align: 'center' });
    footerYA4 += 8;

    return pdf;
};
