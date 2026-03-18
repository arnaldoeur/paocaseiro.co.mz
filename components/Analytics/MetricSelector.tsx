import React from 'react';
import { ChevronDown, TrendingUp, ShoppingBag, Users, Zap, Clock, Ticket } from 'lucide-react';

export type MetricType = 'sales' | 'orders' | 'customers' | 'efficiency' | 'attendance' | 'avg_ticket';

interface MetricSelectorProps {
    selected: MetricType;
    onChange: (metric: MetricType) => void;
}

export const metrics: { id: MetricType; label: string; icon: any; color: string }[] = [
    { id: 'sales', label: 'Vendas', icon: TrendingUp, color: 'text-emerald-500' },
    { id: 'orders', label: 'Pedidos', icon: ShoppingBag, color: 'text-blue-500' },
    { id: 'customers', label: 'Clientes', icon: Users, color: 'text-violet-500' },
    { id: 'efficiency', label: 'Eficiência', icon: Zap, color: 'text-amber-500' },
    { id: 'avg_ticket', label: 'Ticket Médio', icon: Ticket, color: 'text-rose-500' },
];

export const MetricSelector: React.FC<MetricSelectorProps> = ({ selected, onChange }) => {
    const current = metrics.find(m => m.id === selected) || metrics[0];

    return (
        <div className="relative group">
            <button className="flex items-center gap-3 bg-white border border-gray-100 hover:border-[#d9a65a]/30 px-4 py-2.5 rounded-2xl shadow-sm transition-all active:scale-95">
                <div className={`p-1.5 rounded-lg bg-gray-50 ${current.color}`}>
                    <current.icon size={18} />
                </div>
                <div className="text-left pr-4">
                    <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest leading-none mb-1">Métrica</p>
                    <p className="text-sm font-bold text-[#3b2f2f]">{current.label}</p>
                </div>
                <ChevronDown size={16} className="text-gray-400 group-hover:text-[#d9a65a] transition-colors" />
            </button>

            <div className="absolute top-full left-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-gray-50 py-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
                {metrics.map((m) => (
                    <button
                        key={m.id}
                        onClick={() => onChange(m.id)}
                        className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors ${selected === m.id ? 'bg-[#d9a65a]/5' : ''}`}
                    >
                        <div className={`p-1.5 rounded-lg ${selected === m.id ? 'bg-white shadow-sm' : 'bg-gray-50'} ${m.color}`}>
                            <m.icon size={16} />
                        </div>
                        <span className={`text-sm font-bold ${selected === m.id ? 'text-[#d9a65a]' : 'text-gray-600'}`}>{m.label}</span>
                    </button>
                ))}
            </div>
        </div>
    );
};
