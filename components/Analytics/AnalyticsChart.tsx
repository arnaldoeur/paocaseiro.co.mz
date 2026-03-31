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
import { Loader2, LayoutGrid, Activity, BarChart3, Maximize2, TrendingUp, Users, Sparkles, Bot } from 'lucide-react';
import html2canvas from 'html2canvas';
import { generateMetricReport } from '../../services/reportGenerator';
import { supabase } from '../../services/supabase';

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
    onExportMaster?: () => void;
}

export const AnalyticsChart: React.FC<AnalyticsChartProps> = ({ orders = [], teamMembers = [], onExportMaster }) => {
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
    const [aiInsights, setAiInsights] = useState<string | null>(null);
    const [isGeneratingInsights, setIsGeneratingInsights] = useState(false);

    const generateInsights = async () => {
        if (!chartData || chartData.length === 0) return;
        setIsGeneratingInsights(true);
        setAiInsights(null);
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 60000);
            
            const summaryData = chartData.map(d => ({
                data: d.date,
                [metric]: d[metric]
            }));

            const metricLabel = metric === 'sales' ? 'Vendas' :
                metric === 'orders' ? 'Pedidos' :
                metric === 'customers' ? 'Clientes' :
                metric === 'efficiency' ? 'Eficiência' :
                metric === 'avg_ticket' ? 'Ticket Médio' : metric;

            const prompt = `Analise os seguintes dados de ${metricLabel} correspondentes a ${summaryData.length} dias da padaria 'Pão Caseiro' e forneça 3 insights diretos, curtos e muito relevantes para o negócio. Formatação: use markdown simples com bullet points. Foque em apontar tendências de crescimento/queda, ou anomalias notáveis. Evite formalidades exageradas, vá direto ao ponto.\n\nDados: ${JSON.stringify(summaryData)}`;

            const systemContext = 'Você é a Zyph AI, a IA analítica de negócios do painel Pão Caseiro. Seja extremamente técnica, direta e assertiva. Responda em Português.';

            const { data, error } = await supabase.functions.invoke('chat-ai', {
                body: {
                    systemContext: systemContext,
                    messages: [
                        { role: 'user', content: prompt }
                    ]
                }
            });
            
            clearTimeout(timeoutId);

            if (error) throw new Error(`Edge Error: ${error.message}`);
            if (data?.error) throw new Error(`OpenRouter/Edge Error: ${data.error}`);

            if (data?.choices && data.choices.length > 0) {
                setAiInsights(data.choices[0].message.content);
            } else {
                throw new Error('Sem resposta válida');
            }
        } catch (error) {
            console.error('AI Insights Error:', error);
            setAiInsights('Não foi possível gerar insights com a Zyph AI no momento. Tente novamente mais tarde.');
        } finally {
            setIsGeneratingInsights(false);
        }
    };

    const companyBranding = React.useMemo(() => {
        const saved = localStorage.getItem('message_settings');
        return saved ? JSON.parse(saved) : {
            senderId: 'Pão Caseiro',
            icon: '/logo_on_dark.png',
            address: 'Av. Acordo de Lusaka, Xiquelene, Maputo',
            phone: '+258 87 9146 662',
            email: 'geral@paocaseiro.co.mz',
            website: 'www.paocaseiro.co.mz'
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
        if (format === 'pdf-full') {
            if (onExportMaster) onExportMaster();
            return;
        }

        if (!chartRef.current) return;
        const instance = chartRef.current.getEchartsInstance();

        setLoading(true);
        setTimeout(async () => {
            try {
                if (format === 'png' || format === 'svg') {
                    // Branded Wrapper Image Export
                    const exportNode = document.getElementById('report-template-wrapper');
                    if (exportNode) {
                        const canvas = await html2canvas(exportNode, { scale: 2, useCORS: true, backgroundColor: '#fcf9f6' });
                        const finalImg = canvas.toDataURL(`image/${format === 'svg' ? 'svg+xml' : 'png'}`);
                        const link = document.createElement('a');
                        link.download = `Analytics_${metric}_${range}_${new Date().toISOString().split('T')[0]}.${format}`;
                        link.href = finalImg;
                        link.click();
                    } else {
                        // Fallback
                        const chartUrl = instance.getDataURL({
                            type: format === 'svg' ? 'svg' : 'png',
                            pixelRatio: 4,
                            backgroundColor: '#fff',
                            excludeComponents: ['dataZoom']
                        });
                        const link = document.createElement('a');
                        link.download = `Analytics_${metric}_${range}_${new Date().toISOString().split('T')[0]}.${format}`;
                        link.href = chartUrl;
                        link.click();
                    }
                } else if (format === 'pdf-current') {
                    const chartUrl = instance.getDataURL({
                        type: 'png',
                        pixelRatio: 2,
                        backgroundColor: '#fff',
                        excludeComponents: ['dataZoom']
                    });
                    
                    const kpis = {
                        totalSales: chartData.reduce((acc, curr) => acc + curr.sales, 0),
                        orders: chartData.reduce((acc, curr) => acc + curr.orders, 0),
                        customers: chartData.reduce((acc, curr) => acc + curr.customers, 0),
                        avgTicket: Math.floor(chartData.reduce((acc, curr) => acc + curr.sales, 0) / (chartData.reduce((acc, curr) => acc + curr.orders, 0) || 1))
                    };
                    
                    let filteredOrders: any[] | undefined = undefined;
                    if(metric === 'sales' || metric === 'orders') {
                        filteredOrders = orders;
                    }

                    await generateMetricReport(
                        metric, 
                        range, 
                        chartData, 
                        kpis, 
                        {
                            name: companyBranding.senderId,
                            address: companyBranding.address,
                            phone: companyBranding.phone,
                            email: companyBranding.email,
                            website: companyBranding.website,
                            logo: companyBranding.icon
                        }, 
                        chartUrl,
                        filteredOrders
                    );
                }
            } catch (err) {
                console.error('Export failed:', err);
                alert('Erro ao exportar o Relatório. Tente de novo.');
            } finally {
                setLoading(false);
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
                    <button 
                        onClick={generateInsights}
                        disabled={isGeneratingInsights}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all shadow-sm font-bold text-[10px] md:text-xs uppercase tracking-wider ${isGeneratingInsights ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-[#3b2f2f] hover:bg-[#2a2121] text-[#d9a65a] hover:shadow-md'}`}
                        title="Gerar Insights com IA"
                    >
                        {isGeneratingInsights ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                        <span className="hidden sm:inline">IA Insights</span>
                    </button>
                    <ChartFilters selected={range} onChange={setRange} />
                    <div className="h-8 w-[1px] bg-gray-200 hidden sm:block"></div>
                    <ChartExport onExport={handleExport} />
                </div>
            </div>

            {/* AI Insights Panel */}
            <AnimatePresence>
                {(aiInsights || isGeneratingInsights) && (
                    <motion.div 
                        initial={{ opacity: 0, height: 0, scale: 0.95 }}
                        animate={{ opacity: 1, height: 'auto', scale: 1 }}
                        exit={{ opacity: 0, height: 0, scale: 0.95 }}
                        className="mb-6 overflow-hidden w-full"
                    >
                        <div className="bg-gradient-to-br from-[#3b2f2f] to-[#2a2121] rounded-[2rem] p-6 md:p-8 text-white shadow-xl border border-[#d9a65a]/20 relative overflow-hidden">
                            <div className="absolute top-1/2 -translate-y-1/2 right-4 md:right-10 opacity-5 pointer-events-none">
                                <Bot size={150} />
                            </div>
                            <div className="relative z-10">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="flex items-center gap-2 text-[#d9a65a] font-black uppercase tracking-widest text-sm">
                                        <Sparkles size={18} /> Insights por Zyph AI
                                    </h3>
                                    {aiInsights && (
                                        <button onClick={() => setAiInsights(null)} className="text-gray-400 hover:text-white transition-colors text-[10px] font-bold uppercase tracking-wider bg-white/5 hover:bg-white/10 px-3 py-1.5 rounded-full">
                                            Fechar
                                        </button>
                                    )}
                                </div>
                                
                                {isGeneratingInsights ? (
                                    <div className="flex items-center gap-3 text-gray-300 py-4">
                                        <Loader2 size={20} className="animate-spin text-[#d9a65a]" />
                                        <span className="text-sm font-medium animate-pulse">A analisar {chartData.length} pontos de dados para identificar tendências...</span>
                                    </div>
                                ) : (
                                    <div className="text-gray-200 space-y-3 font-medium leading-relaxed text-sm max-w-4xl relative z-10">
                                        {aiInsights?.split('\n').filter(line => line.trim() !== '').map((line, i) => {
                                            const isBullet = line.trim().startsWith('-') || line.trim().startsWith('*');
                                            const text = isBullet ? line.trim().substring(1).trim() : line.trim();
                                            const formattedText = text
                                                .replace(/\*\*(.*?)\*\*/g, '<strong class="text-white">$1</strong>')
                                                .replace(/\*(.*?)\*/g, '<em class="text-[#d9a65a]/80">$1</em>');
                                                
                                            return (
                                                <div key={i} className={`flex gap-3 ${isBullet ? 'ml-2' : ''}`}>
                                                    {isBullet && <span className="text-[#d9a65a] mt-0.5 shrink-0">•</span>}
                                                    <span dangerouslySetInnerHTML={{ __html: formattedText }} />
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Chart Container */}
            <div className="bg-white rounded-[2.5rem] p-6 md:p-8 border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] relative flex-1 min-h-[300px] md:min-h-[400px]">

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

            {/* Hidden Report Template for Image Export Generation */}
            <div id="report-template-wrapper" className="absolute left-[-9999px] top-[-9999px]">
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
        </div>
    );
};
