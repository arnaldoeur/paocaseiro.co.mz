import React, { useState, useEffect, useRef } from 'react';
import ReactECharts from 'echarts-for-react';
import * as echarts from 'echarts/core';
import { CanvasRenderer } from 'echarts/renderers';
import { LineChart, BarChart } from 'echarts/charts';
import {
    GridComponent,
    TooltipComponent,
    TitleComponent,
    LegendComponent,
    DataZoomComponent,
} from 'echarts/components';
import { graphic } from 'echarts';

// Register features
echarts.use([
    CanvasRenderer,
    LineChart,
    BarChart,
    GridComponent,
    TooltipComponent,
    TitleComponent,
    LegendComponent,
    DataZoomComponent
]);
import { motion, AnimatePresence } from 'framer-motion';
import { MetricSelector, type MetricType, metrics } from './MetricSelector';
import { ChartFilters, type TimeRange } from './ChartFilters';
import { ChartExport } from './ChartExport';
import { KPISummary } from './KPISummary';
import { ReportTemplate } from './ReportTemplate';
import { Loader2, LayoutGrid, Activity, BarChart3, Maximize2, TrendingUp, Users } from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

interface Order {
    id: string;
    date: string;
    total: number;
    customer_id: string;
    status: string;
    amount_received: number;
}

interface AnalyticsChartProps {
    orders: Order[];
    teamMembers?: any[];
}

export const AnalyticsChart: React.FC<AnalyticsChartProps> = ({ orders = [], teamMembers = [] }) => {
    const [metric, setMetric] = useState<MetricType>('sales');
    const [range, setRange] = useState<TimeRange>('7d');
    const [selectedStaff, setSelectedStaff] = useState<string>('all');
    const [chartType, setChartType] = useState<'area' | 'bar'>('area');
    const [customDates, setCustomDates] = useState<{ start: string; end: string }>({
        start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        end: new Date().toISOString().split('T')[0]
    });
    const [loading, setLoading] = useState(false);
    const chartRef = useRef<any>(null);

    const companyBranding = React.useMemo(() => {
        const saved = localStorage.getItem('message_settings');
        return saved ? JSON.parse(saved) : {
            senderId: 'Pão Caseiro',
            icon: '/images/logo_receipt.png',
            address: 'Lichinga, Av. Acordo de Lusaka',
            phone: '+258 87 9146 662'
        };
    }, []);

    // Business Logic: Data Aggregation
    const aggregateData = () => {
        if (!orders || orders.length === 0) return [];

        let startDate = new Date();
        const endDate = new Date();

        if (range === 'custom') {
            startDate = new Date(customDates.start);
            startDate.setHours(0, 0, 0, 0);
            endDate.setFullYear(new Date(customDates.end).getFullYear(), new Date(customDates.end).getMonth(), new Date(customDates.end).getDate());
            endDate.setHours(23, 59, 59, 999);
        } else {
            const days = range === '7d' ? 7 : range === '15d' ? 15 : range === '1m' ? 30 : range === '3m' ? 90 : range === '6m' ? 180 : 365;
            startDate = new Date();
            startDate.setDate(startDate.getDate() - (days - 1));
            startDate.setHours(0, 0, 0, 0);
        }

        const dateMap = new Map();

        // Fill Map with all dates in range to avoid gaps
        let current = new Date(startDate);
        while (current <= endDate) {
            const dateStr = current.toISOString().split('T')[0];
            dateMap.set(dateStr, {
                date: dateStr,
                sales: 0,
                orders: 0,
                customers: new Set(),
                efficiency: 0, // Simplified: will be calculated based on status
                avg_ticket: 0,
                completedOrders: 0
            });
            current.setDate(current.getDate() + 1);
        }

        // Aggregate Orders
        orders.forEach(order => {
            // Staff Filter
            if (selectedStaff !== 'all' && (order as any).staff_id !== selectedStaff) return;

            // Use directly since we now pass ISO string from Admin.tsx
            const orderDate = new Date(order.date).toISOString().split('T')[0];
            if (dateMap.has(orderDate)) {
                const dayData = dateMap.get(orderDate);
                // Only count completed/paid orders for sales metrics
                if (order.status === 'completed' || order.status === 'paid') {
                    dayData.sales += order.total;
                    dayData.completedOrders += 1;
                }
                dayData.orders += 1;
                if (order.customer_id) dayData.customers.add(order.customer_id);
            }
        });

        // Convert Map to Array and Finalize Metrics
        return Array.from(dateMap.values()).map(d => ({
            ...d,
            customers: d.customers.size,
            efficiency: d.orders > 0 ? Math.round((d.completedOrders / d.orders) * 100) : 0,
            avg_ticket: d.orders > 0 ? Math.round(d.sales / d.orders) : 0
        }));
    };

    const [chartData, setChartData] = useState<any[]>([]);

    useEffect(() => {
        setChartData(aggregateData());
    }, [range, orders, customDates]);

    const getOption = () => {
        const xData = chartData.map(d => d.date);
        const yData = chartData.map(d => d[metric]);

        const colors: Record<MetricType, string> = {
            sales: '#10b981',
            orders: '#3b82f6',
            customers: '#8b5cf6',
            efficiency: '#f59e0b',
            attendance: '#f97316',
            avg_ticket: '#f43f5e'
        };

        const color = colors[metric];

        return {
            backgroundColor: 'transparent',
            tooltip: {
                trigger: 'axis',
                backgroundColor: 'rgba(255, 255, 255, 0.9)',
                backdropFilter: 'blur(10px)',
                borderColor: 'rgba(217, 166, 90, 0.1)',
                borderWidth: 1,
                padding: [12, 16],
                borderRadius: 16,
                shadowColor: 'rgba(0, 0, 0, 0.05)',
                shadowBlur: 10,
                textStyle: { color: '#3b2f2f', fontFamily: 'Outfit, sans-serif' },
                formatter: (params: any) => {
                    const data = chartData[params[0].dataIndex];
                    const metricLabel = metric === 'sales' ? 'Vendas' :
                        metric === 'orders' ? 'Pedidos' :
                            metric === 'customers' ? 'Clientes' :
                                metric === 'efficiency' ? 'Eficiência' :
                                    metric === 'avg_ticket' ? 'Ticket Médio' : 'Valor';

                    const value = data[metric];
                    const unit = (metric === 'sales' || metric === 'avg_ticket') ? ' MT' :
                        metric === 'efficiency' ? '%' : '';

                    return `
                        <div style="margin-bottom: 8px; font-weight: 800; text-transform: uppercase; font-size: 10px; color: #9ca3af; letter-spacing: 0.1em;">
                            ${new Date(data.date).toLocaleDateString('pt-PT', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </div>
                        <div style="display: flex; align-items: center; gap: 8px;">
                            <div style="width: 8px; height: 8px; border-radius: 50%; background-color: ${color};"></div>
                            <span style="font-size: 12px; font-weight: 600; color: #6b7280;">${metricLabel}:</span>
                            <span style="font-size: 13px; font-weight: 800; color: ${color};">${value.toLocaleString()}${unit}</span>
                        </div>
                    `;
                }
            },
            grid: {
                top: '10%',
                left: '2%',
                right: '2%',
                bottom: '3%',
                containLabel: true
            },
            xAxis: {
                type: 'category',
                data: xData,
                axisLine: { show: false },
                axisTick: { show: false },
                axisLabel: {
                    color: '#9ca3af',
                    fontSize: 10,
                    fontWeight: 700,
                    margin: 20,
                    formatter: (value: string) => {
                        const date = new Date(value);
                        if (range === '7d' || range === '15d') {
                            return date.toLocaleDateString('pt-PT', { day: '2-digit', month: 'short' });
                        }
                        if (range === '1m' || range === '3m') {
                            return date.toLocaleDateString('pt-PT', { day: '2-digit', month: 'short' });
                        }
                        return date.toLocaleDateString('pt-PT', { month: 'short', year: '2-digit' });
                    }
                }
            },
            yAxis: {
                type: 'value',
                splitLine: { lineStyle: { type: 'dashed', color: '#f3f4f6' } },
                axisLine: { show: false },
                axisLabel: { color: '#9ca3af', fontSize: 10, fontWeight: 700, margin: 15 }
            },
            series: [{
                id: 'main-series',
                name: metric,
                type: chartType === 'area' ? 'line' : chartType,
                smooth: true,
                symbol: 'circle',
                symbolSize: 8,
                itemStyle: { color: color, borderWidth: 3, borderColor: '#fff' },
                lineStyle: { width: 4, color: color },
                areaStyle: chartType === 'area' ? {
                    color: new graphic.LinearGradient(0, 0, 0, 1, [
                        { offset: 0, color: `${color}40` },
                        { offset: 1, color: `${color}00` }
                    ])
                } : null,
                data: yData,
                animationDuration: 1000,
                animationEasing: 'cubicOut'
            }],
            dataZoom: []
        };
    };

    const handleExport = async (format: 'png' | 'svg' | 'pdf-current' | 'pdf-full') => {
        if (!chartRef.current) return;
        const instance = chartRef.current.getEchartsInstance();

        // Ensure accurate export by waiting for next tick
        setTimeout(async () => {
            if (format === 'png' || format === 'svg') {
                try {
                    const url = instance.getDataURL({
                        type: format === 'svg' ? 'svg' : 'png',
                        pixelRatio: 4,
                        backgroundColor: '#fff',
                        excludeComponents: ['dataZoom'] // Clean export
                    });
                    const link = document.createElement('a');
                    link.download = `Analytics_${metric}_${range}_${new Date().toISOString().split('T')[0]}.${format}`;
                    link.href = url;
                    link.click();
                } catch (err) {
                    console.error('Export failed:', err);
                    alert('Erro ao exportar imagem. Tente novamente.');
                }
            } else {
                setLoading(true);
                try {
                    // 1. Get Chart Image
                    const chartUrl = instance.getDataURL({
                        type: 'png',
                        pixelRatio: 2,
                        backgroundColor: '#fff',
                        excludeComponents: ['dataZoom']
                    });

                    // 2. Prepare Template Props
                    const kpis = {
                        totalSales: chartData.reduce((acc, curr) => acc + curr.sales, 0),
                        orders: chartData.reduce((acc, curr) => acc + curr.orders, 0),
                        customers: chartData.reduce((acc, curr) => acc + curr.customers, 0),
                        avgTicket: Math.floor(chartData.reduce((acc, curr) => acc + curr.sales, 0) / (chartData.reduce((acc, curr) => acc + curr.orders, 0) || 1))
                    };

                    // 3. Render PDF
                    const pdf = new jsPDF('p', 'mm', 'a4');
                    const pageWidth = pdf.internal.pageSize.getWidth();

                    // --- Page 1: Summary & Chart ---
                    // Add Branding
                    pdf.setFontSize(22);
                    pdf.setTextColor(59, 47, 47); // #3b2f2f
                    pdf.text(companyBranding.senderId.toUpperCase(), 15, 25);

                    pdf.setFontSize(10);
                    pdf.setTextColor(150, 150, 150);
                    pdf.text('RELATÓRIO DE PERFORMANCE EMPRESARIAL', 15, 32);

                    pdf.setFontSize(8);
                    pdf.text(companyBranding.address, 15, 38);
                    pdf.text(companyBranding.phone, 15, 42);

                    // Add Title
                    pdf.setFontSize(16);
                    pdf.setTextColor(217, 166, 90); // #d9a65a
                    pdf.text(`Análise de: ${metric.toUpperCase()}`, 15, 55);
                    pdf.setFontSize(10);
                    pdf.setTextColor(100, 100, 100);
                    pdf.text(`Período: ${range.toUpperCase()} | Gerado em: ${new Date().toLocaleString()}`, 15, 62);

                    // KPI Cards (Simplified for PDF)
                    const kpiY = 75;
                    pdf.setFillColor(252, 249, 246);
                    pdf.roundedRect(15, kpiY, 40, 25, 3, 3, 'F');
                    pdf.roundedRect(60, kpiY, 40, 25, 3, 3, 'F');
                    pdf.roundedRect(105, kpiY, 40, 25, 3, 3, 'F');
                    pdf.roundedRect(150, kpiY, 45, 25, 3, 3, 'F');

                    pdf.setFontSize(8);
                    pdf.setTextColor(150, 150, 150);
                    pdf.text('VENDAS', 20, kpiY + 8);
                    pdf.text('PEDIDOS', 65, kpiY + 8);
                    pdf.text('CLIENTES', 110, kpiY + 8);
                    pdf.text('TICKET MÉDIO', 155, kpiY + 8);

                    pdf.setFontSize(12);
                    pdf.setTextColor(59, 47, 47);
                    pdf.text(`${kpis.totalSales.toLocaleString()} MT`, 20, kpiY + 18);
                    pdf.text(`${kpis.orders}`, 65, kpiY + 18);
                    pdf.text(`${kpis.customers}`, 110, kpiY + 18);
                    pdf.text(`${kpis.avgTicket.toLocaleString()} MT`, 155, kpiY + 18);

                    // Add Chart
                    pdf.addImage(chartUrl, 'PNG', 15, 110, 180, 80);

                    // Footer Page 1
                    pdf.setFontSize(8);
                    pdf.setTextColor(200, 200, 200);
                    pdf.text('System powered by Zyph Tech Intelligence', 15, 285);
                    pdf.text('Página 1', 190, 285);

                    // --- Page 2+: Detailed Table (Only for pdf-full) ---
                    if (format === 'pdf-full') {
                        pdf.addPage();
                        pdf.setFontSize(14);
                        pdf.setTextColor(59, 47, 47);
                        pdf.text('DETALHAMENTO DIÁRIO DA OPERAÇÃO', 15, 20);

                        import('jspdf-autotable').then((autoTableModule) => {
                            const autoTable = autoTableModule.default;
                            autoTable(pdf, {
                                startY: 30,
                                head: [['Data', 'Vendas (MT)', 'Pedidos', 'Clientes', 'Eficiência (%)', 'Ticket Médio (MT)']],
                                body: chartData.map(day => [
                                    new Date(day.date).toLocaleDateString('pt-PT'),
                                    day.sales.toLocaleString(),
                                    day.orders,
                                    day.customers,
                                    `${day.efficiency}%`,
                                    day.avg_ticket.toLocaleString()
                                ]),
                                headStyles: { fillColor: [59, 47, 47], textColor: [217, 166, 90], fontStyle: 'bold' },
                                alternateRowStyles: { fillColor: [252, 249, 246] },
                                margin: { left: 15, right: 15 },
                                styles: { fontSize: 9 },
                                didDrawPage: (data) => {
                                    pdf.setFontSize(8);
                                    pdf.setTextColor(200, 200, 200);
                                    pdf.text(`System powered by Zyph Tech • Página ${pdf.getNumberOfPages()}`, 15, 285);
                                }
                            });
                            pdf.save(`Relatorio_Full_${metric}_${range}_${new Date().toISOString().split('T')[0]}.pdf`);
                        });
                    } else {
                        pdf.save(`Relatorio_Simples_${metric}_${range}_${new Date().toISOString().split('T')[0]}.pdf`);
                    }
                } catch (err) {
                    console.error('PDF Export failed:', err);
                    alert('Erro ao gerar relatório PDF.');
                } finally {
                    setLoading(false);
                }
            }
        }, 100);
    };

    return (
        <div id="analytics-card" className="bg-[#fcf9f6] rounded-[3rem] p-8 md:p-12 relative overflow-hidden border border-[#d9a65a]/10 h-full flex flex-col shadow-sm">
            {/* KPI Summary */}
            <KPISummary data={{
                totalSales: chartData.reduce((acc, curr) => acc + curr.sales, 0),
                orders: chartData.reduce((acc, curr) => acc + curr.orders, 0),
                customers: chartData.reduce((acc, curr) => acc + curr.customers, 0),
                avgTicket: Math.floor(chartData.reduce((acc, curr) => acc + curr.sales, 0) / (chartData.reduce((acc, curr) => acc + curr.orders, 0) || 1))
            }} />

            {/* Controls Bar */}
            <div className="flex flex-wrap items-center justify-between gap-4 mb-8 bg-white/50 p-4 rounded-[2rem] border border-gray-100 shadow-sm transition-all">
                <div className="flex flex-wrap items-center gap-4">
                    <MetricSelector selected={metric} onChange={setMetric} />


                    <div className="h-8 w-[1px] bg-gray-200 hidden md:block"></div>

                    {/* View Options */}
                    <div className="flex bg-gray-100/50 p-1 rounded-xl border border-gray-200/50">
                        <button
                            onClick={() => setChartType('area')}
                            className={`p-1.5 rounded-lg transition-all ${chartType === 'area' ? 'bg-white shadow-sm text-[#d9a65a]' : 'text-gray-400 hover:text-gray-500'}`}
                            title="Área"
                        >
                            <Activity size={16} />
                        </button>
                        <button
                            onClick={() => setChartType('bar')}
                            className={`p-1.5 rounded-lg transition-all ${chartType === 'bar' ? 'bg-white shadow-sm text-[#d9a65a]' : 'text-gray-400 hover:text-gray-500'}`}
                            title="Barras"
                        >
                            <BarChart3 size={16} />
                        </button>
                    </div>

                    {range === 'custom' && (
                        <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-[#d9a65a]/20 shadow-sm animate-fade-in transition-all">
                            <input
                                type="date"
                                value={customDates.start}
                                onChange={(e) => setCustomDates(prev => ({ ...prev, start: e.target.value }))}
                                className="text-[10px] font-bold text-gray-500 bg-transparent outline-none"
                                title="Data Inicial"
                                aria-label="Data Inicial"
                            />
                            <span className="text-gray-300">/</span>
                            <input
                                type="date"
                                value={customDates.end}
                                onChange={(e) => setCustomDates(prev => ({ ...prev, end: e.target.value }))}
                                className="text-[10px] font-bold text-gray-500 bg-transparent outline-none"
                                title="Data Final"
                                aria-label="Data Final"
                            />
                        </div>
                    )}
                </div>

                <div className="flex items-center gap-3">
                    <ChartFilters selected={range} onChange={setRange} />
                    <div className="h-8 w-[1px] bg-gray-200 hidden sm:block"></div>
                    <ChartExport onExport={handleExport} />
                </div>
            </div>

            {/* Chart Container */}
            <div className="bg-white rounded-[2.5rem] p-8 border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] relative flex-1 min-h-[400px]">

                {chartData.length > 0 ? (
                    <ReactECharts
                        ref={chartRef}
                        option={getOption()}
                        style={{ height: '100%', minHeight: '380px', width: '100%' }}
                        notMerge={true}
                        lazyUpdate={true}
                    />
                ) : (
                    <div className="h-full min-h-[400px] flex flex-col items-center justify-center text-gray-400">
                        <Maximize2 size={48} className="mb-4 opacity-20" />
                        <p className="font-bold">Sem dados para este período</p>
                    </div>
                )}
            </div>

            {/* Hidden Report Template for PDF Generation */}
            <ReportTemplate
                data={chartData}
                range={range}
                kpis={{
                    totalSales: chartData.reduce((acc, curr) => acc + curr.sales, 0),
                    orders: chartData.reduce((acc, curr) => acc + curr.orders, 0),
                    customers: chartData.reduce((acc, curr) => acc + curr.customers, 0),
                    avgTicket: Math.floor(chartData.reduce((acc, curr) => acc + curr.sales, 0) / (chartData.reduce((acc, curr) => acc + curr.orders, 0) || 1))
                }}
                branding={{
                    name: companyBranding.senderId,
                    address: companyBranding.address,
                    phone: companyBranding.phone,
                    logo: companyBranding.icon
                }}
            />
        </div>
    );
};
