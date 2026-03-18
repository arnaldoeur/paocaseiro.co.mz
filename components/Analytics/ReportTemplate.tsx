import React from 'react';
import { TrendingUp, ShoppingBag, Users, Zap, Ticket, MapPin, Phone, Activity } from 'lucide-react';

interface ReportData {
    date: string;
    sales: number;
    orders: number;
    customers: number;
    efficiency: number;
    avg_ticket: number;
}

interface ReportTemplateProps {
    data: ReportData[];
    kpis: {
        totalSales: number;
        orders: number;
        customers: number;
        avgTicket: number;
    };
    range: string;
    branding?: {
        name: string;
        address: string;
        phone: string;
        logo: string;
    };
    chartImage?: string;
}

export const ReportTemplate: React.FC<ReportTemplateProps> = ({ data, kpis, range, branding, chartImage }) => {
    return (
        <div
            id="report-pdf-template"
            className="bg-white p-12 w-[1200px] text-[#3b2f2f] font-sans"
            style={{ position: 'fixed', left: '-9999px', top: '-9999px' }}
        >
            {/* Header */}
            <div className="flex justify-between items-start border-b-2 border-[#d9a65a]/20 pb-8 mb-8">
                <div className="flex items-center gap-6">
                    {branding?.logo && (
                        <div className="w-24 h-24 bg-white rounded-2xl p-2 border border-gray-100 shadow-sm">
                            <img src={branding.logo} alt={branding.name} className="w-full h-full object-contain" />
                        </div>
                    )}
                    <div>
                        <h1 className="text-4xl font-black text-[#3b2f2f] uppercase tracking-tighter mb-1">{branding?.name || 'Pão Caseiro'}</h1>
                        <p className="text-lg font-bold text-[#d9a65a] uppercase tracking-widest mb-2">Relatório de Performance Empresarial</p>
                        <div className="flex flex-col gap-1 text-sm text-gray-400 font-bold uppercase tracking-widest">
                            <span className="flex items-center gap-2"><MapPin size={14} /> {branding?.address || 'Lichinga, Av. Acordo de Lusaka'}</span>
                            <span className="flex items-center gap-2"><Phone size={14} /> {branding?.phone || '+258 87 9146 662'}</span>
                        </div>
                    </div>
                </div>
                <div className="text-right">
                    <p className="text-sm font-black text-gray-400 uppercase tracking-widest mb-1">Período de Análise</p>
                    <p className="text-xl font-bold bg-[#3b2f2f] px-6 py-2 rounded-full text-[#d9a65a] inline-block shadow-lg">{range.toUpperCase()}</p>
                    <p className="text-xs text-gray-400 mt-4 font-bold uppercase">Gerado em: {new Date().toLocaleString('pt-PT')}</p>
                </div>
            </div>

            {/* KPI Section */}
            <div className="grid grid-cols-4 gap-6 mb-12">
                <div className="bg-[#fcf9f6] p-6 rounded-[2.5rem] border border-[#d9a65a]/10 shadow-sm relative overflow-hidden group">
                    <div className="flex items-center gap-3 mb-3 relative z-10">
                        <div className="p-2 bg-emerald-500/10 rounded-xl text-emerald-600">
                            <TrendingUp size={20} />
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Total Vendas</span>
                    </div>
                    <p className="text-3xl font-black text-[#3b2f2f] relative z-10">{kpis.totalSales.toLocaleString()} <span className="text-sm">MT</span></p>
                </div>

                <div className="bg-[#fcf9f6] p-6 rounded-[2.5rem] border border-[#d9a65a]/10 shadow-sm relative overflow-hidden group">
                    <div className="flex items-center gap-3 mb-3 relative z-10">
                        <div className="p-2 bg-blue-500/10 rounded-xl text-blue-600">
                            <ShoppingBag size={20} />
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Vol. Pedidos</span>
                    </div>
                    <p className="text-3xl font-black text-[#3b2f2f] relative z-10">{kpis.orders}</p>
                </div>

                <div className="bg-[#fcf9f6] p-6 rounded-[2.5rem] border border-[#d9a65a]/10 shadow-sm relative overflow-hidden group">
                    <div className="flex items-center gap-3 mb-3 relative z-10">
                        <div className="p-2 bg-violet-500/10 rounded-xl text-violet-600">
                            <Users size={20} />
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Clientes Únicos</span>
                    </div>
                    <p className="text-3xl font-black text-[#3b2f2f] relative z-10">{kpis.customers}</p>
                </div>

                <div className="bg-[#fcf9f6] p-6 rounded-[2.5rem] border border-[#d9a65a]/10 shadow-sm relative overflow-hidden group">
                    <div className="flex items-center gap-3 mb-3 relative z-10">
                        <div className="p-2 bg-rose-500/10 rounded-xl text-rose-600">
                            <Ticket size={20} />
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Ticket Médio</span>
                    </div>
                    <p className="text-3xl font-black text-[#3b2f2f] relative z-10">{kpis.avgTicket.toLocaleString()} <span className="text-sm">MT</span></p>
                </div>
            </div>

            {/* Chart Section */}
            {chartImage && (
                <div className="mb-12 bg-[#fcf9f6] rounded-[3rem] p-8 border border-[#d9a65a]/10 shadow-sm">
                    <h2 className="text-sm font-black uppercase tracking-[0.2em] text-[#3b2f2f] mb-6 flex items-center gap-3">
                        <Activity className="text-[#d9a65a]" size={18} /> Visualização Analítica da Métrica Selecionada
                    </h2>
                    <div className="w-full bg-white rounded-[2rem] p-4 border border-gray-100 overflow-hidden">
                        <img src={chartImage} className="w-full h-auto" alt="Analytics Chart" />
                    </div>
                </div>
            )}

            {/* Data Table */}
            <div className="bg-white rounded-[3rem] border border-[#d9a65a]/10 overflow-hidden shadow-sm">
                <div className="bg-[#3b2f2f] px-10 py-5 flex justify-between items-center">
                    <h2 className="text-xs font-black uppercase tracking-[0.2em] text-[#d9a65a]">Detalhamento Operacional Diário</h2>
                </div>
                <table className="w-full text-left">
                    <thead>
                        <tr className="bg-gray-50/50">
                            <th className="px-10 py-6 text-[10px] font-black uppercase tracking-[0.15em] text-gray-400">📅 Data</th>
                            <th className="px-10 py-6 text-[10px] font-black uppercase tracking-[0.15em] text-gray-400 text-right">💰 Vendas</th>
                            <th className="px-10 py-6 text-[10px] font-black uppercase tracking-[0.15em] text-gray-400 text-center">🛒 Pedidos</th>
                            <th className="px-10 py-6 text-[10px] font-black uppercase tracking-[0.15em] text-gray-400 text-center">👥 Clientes</th>
                            <th className="px-10 py-6 text-[10px] font-black uppercase tracking-[0.15em] text-gray-400 text-center">⚡ Eficiência</th>
                            <th className="px-10 py-6 text-[10px] font-black uppercase tracking-[0.15em] text-gray-400 text-right">🎫 Ticket Médio</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {data.map((day, idx) => (
                            <tr key={idx} className="hover:bg-gray-50/30 transition-colors">
                                <td className="px-10 py-5 text-sm font-bold text-[#3b2f2f]">
                                    {new Date(day.date).toLocaleDateString('pt-PT', { day: '2-digit', month: 'short', year: 'numeric' })}
                                </td>
                                <td className="px-10 py-5 text-sm font-black text-emerald-600 text-right">
                                    {day.sales.toLocaleString()} MT
                                </td>
                                <td className="px-10 py-5 text-sm font-bold text-blue-600 text-center">
                                    {day.orders}
                                </td>
                                <td className="px-10 py-5 text-sm font-bold text-violet-600 text-center">
                                    {day.customers}
                                </td>
                                <td className="px-10 py-5 text-sm font-bold text-center">
                                    <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider ${day.efficiency >= 80 ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
                                        {day.efficiency}%
                                    </span>
                                </td>
                                <td className="px-10 py-5 text-sm font-black text-rose-600 text-right">
                                    {day.avg_ticket.toLocaleString()} MT
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Footer */}
            <div className="mt-12 flex justify-between items-center border-t border-gray-100 pt-8">
                <div className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]"></div>
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Dados Consolidados • Zyph Tech Intelligence Ecosystem</span>
                </div>
                <p className="text-[10px] text-gray-300 font-bold uppercase tracking-[0.2em]">
                    {branding?.name || 'Pão Caseiro'} Admin Portal • Relatório Gerencial v2.5
                </p>
            </div>
        </div>
    );
};
