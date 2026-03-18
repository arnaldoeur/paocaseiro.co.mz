import React from 'react';
import { ChevronDown, Calendar } from 'lucide-react';

export type TimeRange = '7d' | '15d' | '1m' | '3m' | '6m' | '1y' | 'custom';

interface ChartFiltersProps {
    selected: TimeRange;
    onChange: (range: TimeRange) => void;
}

const ranges: { id: TimeRange; label: string }[] = [
    { id: '7d', label: '7 Dias' },
    { id: '15d', label: '15 Dias' },
    { id: '1m', label: '1 Mês' },
    { id: '3m', label: '3 Meses' },
    { id: '6m', label: '6 Meses' },
    { id: 'custom', label: 'Personalizado' },
];

export const ChartFilters: React.FC<ChartFiltersProps> = ({ selected, onChange }) => {
    const current = ranges.find(r => r.id === selected) || ranges[0];

    return (
        <div className="relative group">
            <button className="flex items-center gap-3 bg-white border border-gray-100 hover:border-[#d9a65a]/30 px-4 py-2.5 rounded-2xl shadow-sm transition-all active:scale-95 group">
                <div className="p-1.5 rounded-lg bg-gray-50 text-gray-400 group-hover:text-[#d9a65a] transition-colors">
                    <Calendar size={18} />
                </div>
                <div className="text-left pr-4">
                    <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest leading-none mb-1 text-nowrap">Período</p>
                    <p className="text-sm font-bold text-[#3b2f2f] text-nowrap">{current.label}</p>
                </div>
                <ChevronDown size={16} className="text-gray-400 group-hover:text-[#d9a65a] transition-colors" />
            </button>

            <div className="absolute top-full right-0 mt-2 w-48 bg-white rounded-2xl shadow-xl border border-gray-100 py-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
                {ranges.map((r) => (
                    <button
                        key={r.id}
                        onClick={() => onChange(r.id)}
                        className={`w-full flex items-center px-4 py-3 hover:bg-gray-50 transition-colors text-sm font-bold text-nowrap ${selected === r.id ? 'text-[#d9a65a] bg-[#d9a65a]/5' : 'text-gray-600'}`}
                    >
                        {r.label}
                    </button>
                ))}
            </div>
        </div>
    );
};
