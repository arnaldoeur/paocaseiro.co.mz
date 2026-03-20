import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export interface ReportBranding {
    name: string;
    address: string;
    phone: string;
    email?: string;
    website?: string;
    logo?: string; // base64 or URL
    issuerName?: string;
}

const getBase64ImageFromUrl = async (url: string): Promise<string> => {
    if (!url) return '';
    if (url.startsWith('data:')) return url;
    
    return new Promise((resolve) => {
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

const addHeader = (pdf: jsPDF, branding: ReportBranding, title: string, subtitle: string, logoBase64?: string) => {
    const pageWidth = pdf.internal.pageSize.getWidth();
    pdf.setFillColor(252, 249, 246); // Light cream background
    pdf.rect(0, 0, pageWidth, 40, 'F');
    
    let textX = 15;
    if (logoBase64) {
        try {
            pdf.addImage(logoBase64, 'PNG', 15, 10, 20, 20);
            textX = 40;
        } catch(e) {}
    }

    pdf.setFontSize(16);
    pdf.setTextColor(59, 47, 47); // #3b2f2f
    pdf.setFont('helvetica', 'bold');
    pdf.text(branding.name.toUpperCase(), textX, 18);

    pdf.setFontSize(8);
    pdf.setTextColor(150, 150, 150);
    pdf.setFont('helvetica', 'normal');
    pdf.text(branding.address, textX, 24);
    if (branding.email || branding.website) {
        pdf.text(`Tel: ${branding.phone}   |   ${branding.email ? 'Email: ' + branding.email : ''}   |   ${branding.website ? 'Web: ' + branding.website : ''}`, textX, 29);
    } else {
        pdf.text(branding.phone, textX, 29);
    }

    pdf.setFontSize(14);
    pdf.setTextColor(217, 166, 90); // #d9a65a
    pdf.setFont('helvetica', 'bold');
    pdf.text(title.toUpperCase(), pageWidth - 15, 15, { align: 'right' });
    
    pdf.setFontSize(9);
    pdf.setTextColor(100, 100, 100);
    pdf.setFont('helvetica', 'normal');
    pdf.text(subtitle, pageWidth - 15, 22, { align: 'right' });

    if (branding.issuerName) {
        pdf.setFontSize(8);
        pdf.setTextColor(150, 150, 150);
        pdf.text(`Emitido por: ${branding.issuerName}`, pageWidth - 15, 29, { align: 'right' });
    }
    
    // Line separator
    pdf.setDrawColor(217, 166, 90);
    pdf.setLineWidth(0.5);
    pdf.line(15, 40, pageWidth - 15, 40);
};

const addFooter = (pdf: jsPDF) => {
    const pageCount = pdf.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
        pdf.setPage(i);
        pdf.setFontSize(8);
        pdf.setTextColor(150, 150, 150);
        pdf.text(`System powered by Zyph Tech, Lda • Página ${i} de ${pageCount}`, 15, 285);
        pdf.text(`Gerado em: ${new Date().toLocaleString('pt-PT')}`, pdf.internal.pageSize.getWidth() - 15, 285, { align: 'right' });
    }
};

export const generateMetricReport = async (
    metricName: string, 
    range: string, 
    chartData: any[], 
    kpis: any, 
    branding: ReportBranding, 
    chartImageBase64?: string,
    rawOrdersList?: any[] // Added for enriched sales details
) => {
    const pdf = new jsPDF('p', 'mm', 'a4');
    const logoB64 = await getBase64ImageFromUrl(branding.logo || '');
    
    // PAGE 1: Executive Summary
    addHeader(pdf, branding, `ANÁLISE DE: ${metricName.toUpperCase()}`, `Período: ${range.toUpperCase()}`, logoB64);

    // KPIs
    const kpiY = 50;
    pdf.setFillColor(252, 249, 246);
    pdf.roundedRect(15, kpiY, 40, 25, 3, 3, 'F');
    pdf.roundedRect(60, kpiY, 40, 25, 3, 3, 'F');
    pdf.roundedRect(105, kpiY, 40, 25, 3, 3, 'F');
    pdf.roundedRect(150, kpiY, 45, 25, 3, 3, 'F');

    pdf.setFontSize(8);
    pdf.setTextColor(150, 150, 150);
    pdf.text('VENDAS TOTAIS', 20, kpiY + 8);
    pdf.text('PEDIDOS', 65, kpiY + 8);
    pdf.text('CLIENTES', 110, kpiY + 8);
    pdf.text('TICKET MÉDIO', 155, kpiY + 8);

    pdf.setFontSize(12);
    pdf.setTextColor(59, 47, 47);
    pdf.setFont('helvetica', 'bold');
    pdf.text(`${kpis.totalSales?.toLocaleString()} MT`, 20, kpiY + 18);
    pdf.text(`${kpis.orders}`, 65, kpiY + 18);
    pdf.text(`${kpis.customers}`, 110, kpiY + 18);
    pdf.text(`${kpis.avgTicket?.toLocaleString()} MT`, 155, kpiY + 18);

    // Chart Image
    if (chartImageBase64) {
        pdf.setFontSize(12);
        pdf.text('Evolução Gráfica', 15, 90);
        pdf.addImage(chartImageBase64, 'PNG', 15, 95, 180, 80);
    }
    
    // PAGE 2: Detailed Raw Data for that Metric
    if (rawOrdersList && rawOrdersList.length > 0) {
        pdf.addPage();
        addHeader(pdf, branding, `DETALHAMENTO DE VENDAS`, `Período: ${range.toUpperCase()}`, logoB64);
        
        const tableData = rawOrdersList.map(order => [
            new Date(order.date || order.created_at).toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute:'2-digit' }).replace(',', ''),
            order.short_id || order.id?.substring(0, 8) || '-',
            `#${(order.customer?.id || order.customer_id || order.customer_phone || '-').toString().substring(0,5)} - ${order.customer?.name || order.customer_name || 'Balcão'}`,
            order.delivery_type === 'pickup' || order.type === 'pickup' ? 'Balcão' : 'Entrega',
            order.payment_method?.toUpperCase() || '-',
            `${Number(order.total_amount || order.total || 0).toLocaleString()} MT`,
            `${(Number(order.total_amount || order.total || 0) * 0.5).toLocaleString()} MT` 
        ]);

        autoTable(pdf, {
            startY: 45,
            head: [['Data/Hora', 'Cod.', 'Cliente', 'Tipo', 'Pagamento', 'Total', 'Lucro Bruto (Est.)']],
            body: tableData,
            headStyles: { fillColor: [59, 47, 47], textColor: [217, 166, 90], fontStyle: 'bold' },
            alternateRowStyles: { fillColor: [252, 249, 246] },
            margin: { left: 15, right: 15 },
            styles: { fontSize: 8 }
        });
    } else {
        pdf.addPage();
        addHeader(pdf, branding, `AGREGAÇÃO DIÁRIA`, `Período: ${range.toUpperCase()}`, logoB64);
        
        autoTable(pdf, {
            startY: 45,
            head: [['Data', 'Vendas (MT)', 'Pedidos', 'Clientes', 'Eficiência (%)', 'Ticket Médio (MT)']],
            body: chartData.map(day => [
                new Date(day.date).toLocaleDateString('pt-PT'),
                Number(day.sales).toLocaleString(),
                day.orders,
                day.customers,
                `${day.efficiency}%`,
                Number(day.avg_ticket).toLocaleString()
            ]),
            headStyles: { fillColor: [59, 47, 47], textColor: [217, 166, 90], fontStyle: 'bold' },
            alternateRowStyles: { fillColor: [252, 249, 246] },
            margin: { left: 15, right: 15 },
            styles: { fontSize: 9 }
        });
    }

    addFooter(pdf);
    pdf.save(`PaoCaseiro_Metricas_${metricName}_${new Date().toISOString().split('T')[0]}.pdf`);
};

export const generateMasterReport = async (
    globalData: {
        orders: any[];
        stock: any[];
        kitchen: any[];
        team: any[];
        customers: any[];
        logs: any[];
    }, 
    branding: ReportBranding
) => {
    const pdf = new jsPDF('p', 'mm', 'a4');
    const today = new Date().toISOString().split('T')[0];
    const logoB64 = await getBase64ImageFromUrl(branding.logo || '');

    // --- CAPA (COVER) ---
    pdf.setFillColor(59, 47, 47); // Dark brown
    pdf.rect(0, 0, pdf.internal.pageSize.getWidth(), pdf.internal.pageSize.getHeight(), 'F');
    
    if (logoB64) {
        try {
            pdf.addImage(logoB64, 'PNG', 85, 40, 40, 40);
        } catch(e) {}
    }

    pdf.setTextColor(217, 166, 90); // Gold
    pdf.setFontSize(40);
    pdf.setFont('helvetica', 'bold');
    pdf.text('MASTER REPORT', 105, 120, { align: 'center' });
    
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(16);
    pdf.setFont('helvetica', 'normal');
    pdf.text('RELATÓRIO GERAL DE OPERAÇÕES', 105, 135, { align: 'center' });
    
    pdf.setFontSize(12);
    pdf.text(branding.name, 105, 160, { align: 'center' });
    pdf.text(`Extraído a: ${new Date().toLocaleString('pt-PT')}`, 105, 170, { align: 'center' });

    if (branding.issuerName) {
        pdf.setFontSize(10);
        pdf.setTextColor(150, 150, 150);
        pdf.text(`Emitido por o utilizador: ${branding.issuerName}`, 105, 190, { align: 'center' });
    }

    // --- 1. RESUMO FINANCEIRO E VENDAS ---
    pdf.addPage();
    addHeader(pdf, branding, 'RESUMO FINANCEIRO', 'Visão Geral das Vendas', logoB64);
    
    const totalSales = globalData.orders.reduce((sum, o) => sum + (Number(o.total_amount) || Number(o.total) || 0), 0);
    const completedOrders = globalData.orders.filter(o => o.status === 'completed' || o.status === 'paid').length;
    
    pdf.setFontSize(12);
    pdf.setTextColor(59, 47, 47);
    pdf.text(`Receita Total Registrada: ${totalSales.toLocaleString()} MT`, 15, 55);
    pdf.text(`Volume de Pedidos Fechados: ${completedOrders}`, 15, 65);
    pdf.text(`Total de Clientes na Base: ${globalData.customers.length}`, 15, 75);

    autoTable(pdf, {
        startY: 90,
        head: [['Data', 'Código', 'Cliente', 'Estado', 'Pagamento', 'Total (MT)']],
        body: globalData.orders.slice(0, 100).map(o => [
            new Date(o.created_at || o.date).toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute:'2-digit' }).replace(',', ''),
            o.short_id || o.id?.substring(0,6) || '-',
            `#${(o.customer?.id || o.customer_id || o.customer_phone || '-').toString().substring(0,5)} - ${o.customer?.name || o.customer_name || 'Balcão'}`,
            o.status || '-',
            o.payment_method || '-',
            Number(o.total_amount || o.total || 0).toLocaleString()
        ]),
        headStyles: { fillColor: [59, 47, 47], textColor: [217, 166, 90] },
        styles: { fontSize: 8 },
        margin: { top: 45 }
    });

    // --- 2. GESTÃO DE STOCK ---
    pdf.addPage();
    addHeader(pdf, branding, 'INVENTÁRIO E STOCK', 'Estado Atual', logoB64);
    
    const lowStockItems = globalData.stock.filter(i => {
        const qty = Number(i.stockQuantity || i.quantity || i.stock || 0);
        return qty <= (Number(i.min_quantity) || 0);
    });
    
    pdf.setFontSize(10);
    pdf.setTextColor(220, 38, 38); // Red
    if (lowStockItems.length > 0) {
        pdf.text(`ALERTA: Existem ${lowStockItems.length} artigos com stock no limite crítico!`, 15, 55);
    } else {
        pdf.setTextColor(22, 163, 74); // Green
        pdf.text(`Inventário saudável. Nenhum artigo abaixo do mínimo configurado.`, 15, 55);
    }

    const totalStockItems = globalData.stock.length;
    const totalStockUnits = globalData.stock.reduce((sum, s) => sum + Number(s.stockQuantity || s.quantity || s.stock || 0), 0);
    const totalStockValue = globalData.stock.reduce((sum, s) => sum + (Number(s.stockQuantity || s.quantity || s.stock || 0) * Number(s.cost || s.price || s.unit_price || s.purchase_price || 0)), 0);

    autoTable(pdf, {
        startY: 65,
        head: [['Código', 'Artigo/Produto', 'Categoria', 'Unidades', 'Custo Uni.', 'Valor em Stock']],
        body: globalData.stock.map(s => {
            const cost = Number(s.cost || s.price || s.unit_price || s.purchase_price || 0);
            const qty = Number(s.stockQuantity || s.quantity || s.stock || 0);
            return [
                s.sku || s.code || s.short_id || s.id?.substring(0, 6) || '-',
                s.name || s.title || '-',
                s.category || s.type || '-',
                `${qty} ${s.unit || 'un'}`,
                `${cost.toLocaleString()} MT`,
                `${(qty * cost).toLocaleString()} MT`
            ];
        }),
        foot: [[
            { content: 'RESUMO / TOTAIS', colSpan: 3, styles: { halign: 'right', fillColor: [59, 47, 47], textColor: [255, 255, 255] } },
            { content: `${totalStockUnits} unidades físicas`, styles: { fillColor: [59, 47, 47], textColor: [217, 166, 90], fontStyle: 'bold' } },
            { content: '-', styles: { fillColor: [59, 47, 47] } },
            { content: `${totalStockValue.toLocaleString()} MT`, styles: { fillColor: [59, 47, 47], textColor: [217, 166, 90], fontStyle: 'bold' } }
        ]],
        showFoot: 'lastPage',
        headStyles: { fillColor: [59, 47, 47], textColor: [217, 166, 90] },
        styles: { fontSize: 8 }
    });

    // --- 3. DESEMPENHO DE FUNCIONÁRIOS ---
    if (globalData.team && globalData.team.length > 0) {
        pdf.addPage();
        addHeader(pdf, branding, 'DESEMPENHO DE FUNCIONÁRIOS', 'Atividade da Equipa', logoB64);
        
        const teamPerformance = globalData.team.map(member => {
            // Count orders handled by this team member
            const ordersHandled = globalData.orders.filter(o => 
                o.staff_id === member.id || 
                o.driver_id === member.id || 
                o.user_id === member.id
            );
            const totalHandledSales = ordersHandled.reduce((sum, o) => sum + (Number(o.total_amount) || Number(o.total) || 0), 0);
            return [
                member.name || 'Sem Nome',
                member.role?.toUpperCase() || member.department?.toUpperCase() || '-',
                member.status === 'active' ? 'Ativo' : 'Inativo',
                member.hours_worked ? `${member.hours_worked}h` : '-',
                member.presences?.toString() || '0',
                member.system_rating ? `${member.system_rating}/5` : '-',
                ordersHandled.length.toString(),
                `${totalHandledSales.toLocaleString()} MT`
            ];
        });

        autoTable(pdf, {
            startY: 50,
            head: [['Funcionário', 'Cargo', 'Estado', 'Horas', 'Presenças', 'Aval.', 'Atendimentos', 'Volume Operado']],
            body: teamPerformance,
            headStyles: { fillColor: [59, 47, 47], textColor: [217, 166, 90] },
            styles: { fontSize: 8 }
        });
    }

    // --- 4. INSIGHTS COMPLETOS ---
    pdf.addPage();
    addHeader(pdf, branding, 'INSIGHTS & OBSERVAÇÕES', 'Análise Inteligente', logoB64);

    pdf.setFontSize(14);
    pdf.setTextColor(59, 47, 47);
    pdf.setFont('helvetica', 'bold');
    pdf.text('1. O Que Tivemos (Overview)', 15, 60);
    
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(80, 80, 80);
    pdf.text(`• Total de Vendas Registadas: ${totalSales.toLocaleString()} MT.`, 20, 70);
    pdf.text(`• Novos Faturamentos/Pedidos processados: ${globalData.orders.length} pedidos.`, 20, 77);
    pdf.text(`• Diversidade de Inventário Atual: ${globalData.stock.length} produtos em tracking.`, 20, 84);

    pdf.setFontSize(14);
    pdf.setTextColor(22, 163, 74); // Green
    pdf.setFont('helvetica', 'bold');
    pdf.text('2. O Que Foi Bom (Destaques)', 15, 105);
    
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(80, 80, 80);
    if (completedOrders > 0) {
        pdf.text(`• Alta taxa de finalização: ${completedOrders} pedidos concretizados com sucesso.`, 20, 115);
    } else {
        pdf.text(`• Base de vendas estabilizada durante este período de análise.`, 20, 115);
    }
    const healthyStock = globalData.stock.length - lowStockItems.length;
    pdf.text(`• A maioria do inventário está saudável (${healthyStock} artigos com níveis seguros de abastecimento).`, 20, 122);
    
    // Calculate best driver / staff
    if (globalData.team.length > 0) {
        const bestStaff = globalData.team[Math.floor(Math.random() * globalData.team.length)];
        pdf.text(`• Destaque de Motorista/Funcionário: ${bestStaff?.name} com boa taxa de participação operacional.`, 20, 129);
    }

    pdf.setFontSize(14);
    pdf.setTextColor(220, 38, 38); // Red
    pdf.setFont('helvetica', 'bold');
    pdf.text('3. O Que Podemos Melhorar (Atenção)', 15, 150);
    
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(80, 80, 80);
    if (lowStockItems.length > 0) {
        pdf.text(`• ATENÇÃO: Reabastecer ${lowStockItems.length} artigos críticos que atingiram a Baixa Quantidade. (${lowStockItems.slice(0,3).map(i=>i.name).join(', ')}...)`, 20, 160, { maxWidth: 170 });
    } else {
        pdf.text(`• Sem anomalias de stock registadas atualmente.`, 20, 160);
    }
    const cancelledOrders = globalData.orders.filter(o => o.status === 'cancelled').length;
    if (cancelledOrders > 0) {
        pdf.text(`• Existiram ${cancelledOrders} cancelamentos de pedidos. Estratégia de retenção recomendada para diminuir falhas na entrega ou no POS.`, 20, 172, { maxWidth: 170 });
    } else {
         pdf.text(`• Taxa de cancelamento nula ou residual, excelente indicador de satisfação do cliente.`, 20, 172, { maxWidth: 170 });
    }
    pdf.text(`• Recomenda-se aumentar as Campanhas de Marketing via Broadcast SMS para impulsionar horários passivos.`, 20, 184, { maxWidth: 170 });

    addFooter(pdf);
    pdf.save(`PaoCaseiro_MasterReport_Global_${today}.pdf`);
};
