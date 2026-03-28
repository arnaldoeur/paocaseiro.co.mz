import html2canvas from 'html2canvas';

export const generateReceiptImageBase64 = async (order: any, items: any[]): Promise<string> => {
    if (typeof document === 'undefined') return ''; // Safety check
    
    // Create container
    const container = document.createElement('div');
    container.style.position = 'fixed';
    container.style.top = '-9999px';
    container.style.left = '-9999px';
    container.style.width = '380px';
    container.style.padding = '20px';
    container.style.backgroundColor = '#fffbf5'; // background color matching PDF
    container.style.fontFamily = 'Arial, sans-serif';
    container.style.color = '#3b2f2f';
    container.style.zIndex = '-9999';
    
    const shortId = order.short_id || order.orderId || order.id?.slice(-6).toUpperCase() || '';
    let displayShortId = shortId;
    if (displayShortId.startsWith('FAT-PC-')) displayShortId = displayShortId.replace('FAT-PC-', '');
    if (displayShortId.startsWith('PC-')) displayShortId = displayShortId.replace('PC-', '');

    const dateStr = (order.created_at || order.date) ? new Date(order.created_at || order.date).toLocaleString('pt-PT') : new Date().toLocaleString('pt-PT');
    
    const deliveryTypeMap: Record<string, string> = {
        'pickup': 'Levantamento na Loja',
        'takeaway': 'Levantamento na Loja',
        'delivery': 'Entrega ao Domicílio',
        'dine_in': `Consumo na Loja`
    };
    const deliveryStr = deliveryTypeMap[order.delivery_type || order.customer?.type || 'pickup'] || 'Levantamento na Loja';
    
    const customerName = order.customer_name || order.customer?.name || 'Consumidor Final';
    const customerPhone = order.customer_phone || order.phone || order.customer?.phone || '';
    const paymentRef = order.payment_ref || order.transaction_id || `ORD-${Date.now().toString().slice(-6)}`;
    const totalAmount = order.total_amount || order.total || 0;
    const amountPaid = order.amount_paid || totalAmount;
    const balance = totalAmount - amountPaid;

    let itemsHtml = items.map(item => {
        const qty = item.quantity || 1;
        const price = item.price || 0;
        const itemTotal = qty * price;
        return `
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px; font-size: 13px;">
                <div style="flex: 1; padding-right: 10px;">${item.name || item.product_name || 'Artigo'}</div>
                <div style="width: 30px; text-align: center;">${qty}</div>
                <div style="width: 70px; text-align: right; font-weight: bold;">${itemTotal} MT</div>
            </div>
            <div style="border-bottom: 1px solid #f5f5f5; margin-bottom: 8px;"></div>
        `;
    }).join('');

    container.innerHTML = `
        <div style="text-align: center; margin-bottom: 15px;">
            <div style="color: #969696; font-size: 12px; font-weight: bold; margin-top: 10px;">PADARIA, PASTELARIA E CAFÉ</div>
            <div style="border-bottom: 2px solid #d9a65a; margin: 10px 0;"></div>
            
            <div style="color: #969696; font-size: 12px; font-weight: bold; margin-top: 15px;">DOCUMENTO</div>
            <div style="color: #3b2f2f; font-size: 16px; font-weight: bold; margin-top: 5px;">FATURA-RECIBO</div>
            <div style="font-size: 14px; margin-top: 5px;">N.º FAT-PC-${displayShortId}</div>
            <div style="color: #969696; font-size: 12px; margin-top: 10px;">${dateStr}</div>
            
            <div style="background-color: #fff; border: 1px solid #eee; border-radius: 6px; padding: 12px; margin-top: 20px; font-weight: bold; font-size: 14px;">
                ${deliveryStr}
            </div>
        </div>

        <div style="display: flex; justify-content: space-between; margin-top: 25px; margin-bottom: 10px; font-size: 11px; color: #969696;">
            <div>CLIENTE</div>
            <div style="text-align: right;">PAGAMENTO</div>
        </div>

        <div style="display: flex; justify-content: space-between; margin-bottom: 25px; font-size: 13px;">
            <div style="flex: 1; padding-right: 15px;">
                <div style="font-weight: bold; font-size: 15px; margin-bottom: 5px;">${customerName}</div>
                ${customerPhone ? `<div style="color: #969696;">${customerPhone}</div>` : ''}
            </div>
            <div style="text-align: right;">
                <div style="color: #969696; margin-bottom: 5px;">ID Pagamento:</div>
                <div style="font-weight: bold;">${paymentRef}</div>
            </div>
        </div>

        <div style="display: flex; justify-content: space-between; margin-bottom: 5px; font-size: 11px; color: #969696;">
            <div style="flex: 1;">Item</div>
            <div style="width: 30px; text-align: center;">Qtd</div>
            <div style="width: 70px; text-align: right;">Total</div>
        </div>
        <div style="border-bottom: 1px solid #eee; margin-bottom: 15px;"></div>

        ${itemsHtml}

        <div style="display: flex; justify-content: space-between; margin-top: 15px; font-size: 13px; color: #969696;">
            <div>Subtotal</div>
            <div>${totalAmount} MT</div>
        </div>

        <div style="border-bottom: 2px solid #d9a65a; margin: 10px 0;"></div>

        <div style="display: flex; justify-content: space-between; margin-top: 10px; font-size: 18px; font-weight: bold;">
            <div>TOTAL</div>
            <div>${totalAmount} MT</div>
        </div>

        <div style="display: flex; justify-content: space-between; margin-top: 15px; font-size: 13px; font-weight: bold; color: ${amountPaid >= totalAmount ? '#22c55e' : '#ef4444'};">
            <div>${amountPaid >= totalAmount ? 'Pago' : 'Falta Pagar'}</div>
            <div>${amountPaid >= totalAmount ? amountPaid : balance} MT</div>
        </div>

        <div style="border-bottom: 1px dashed #ccc; margin: 15px 0;"></div>

        <div style="text-align: center; margin-top: 30px; padding-bottom: 10px;">
            <div style="color: #969696; font-size: 11px; margin-bottom: 5px;">Obrigado pela preferência!</div>
            <div style="color: #969696; font-size: 11px; margin-bottom: 10px;">Documento Processado por Computador</div>
            <div style="color: #d9a65a; font-size: 14px; font-style: italic; margin-bottom: 10px;">"O sabor que aquece o coração"</div>
            <div style="color: #969696; font-weight: bold; font-size: 13px; margin-bottom: 5px;">Pão Caseiro</div>
            <div style="font-size: 12px; margin-bottom: 3px;">Lichinga, Av. Acordo de Lusaka</div>
            <div style="font-size: 12px; margin-bottom: 3px;">+258 87 914 6662 | +258 84 814 6662</div>
            <div style="font-size: 12px; margin-bottom: 3px;">geral@paocaseiro.co.mz</div>
            <div style="font-size: 12px;">www.paocaseiro.co.mz</div>
        </div>
    `;

    document.body.appendChild(container);
    
    try {
        const canvas = await html2canvas(container, {
            scale: 2, // Better resolution
            backgroundColor: '#fffbf5',
            logging: false,
            useCORS: true
        });
        const dataUrl = canvas.toDataURL('image/png');
        // Return base64 without data URI scheme for WhatsApp media usually?
        // Wait, Evolution API `sendMedia` prefers base64: `canvas.toDataURL('image/png').split(',')[1]`.
        // Let's just return the raw base64 string
        return dataUrl.split(',')[1];
    } catch (e) {
        console.error("Failed to generate receipt image", e);
        return '';
    } finally {
        document.body.removeChild(container);
    }
};
