import React from 'react';
import { DollarSign, ShoppingBag, Users, Receipt } from 'lucide-react';

interface KPISummaryProps {
    data: {
        totalSales: number;
        orders: number;
        customers: number;
        avgTicket: number;
    };
}

export const KPISummary: React.FC<KPISummaryProps> = ({ data }) => {
    const stats = [
        { label: 'Vendas Totais', value: `${data.totalSales.toLocaleString()} MT`, icon: DollarSign, color: 'bg-emerald-50 text-emerald-600' },
        { label: 'Pedidos', value: data.orders.toLocaleString(), icon: ShoppingBag, color: 'bg-blue-50 text-blue-600' },
        { label: 'Clientes', value: data.customers.toLocaleString(), icon: Users, color: 'bg-violet-50 text-violet-600' },
        { label: 'Ticket Médio', value: `${data.avgTicket.toLocaleString()} MT`, icon: Receipt, color: 'bg-amber-50 text-amber-600' },
    ];

    return (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {stats.map((s, idx) => (
                <div key={idx} className="bg-white p-5 rounded-[2rem] border border-gray-100 shadow-sm hover:shadow-md transition-shadow group">
                    <div className="flex items-center gap-4">
                        <div className={`p-3 rounded-2xl ${s.color} transition-transform group-hover:scale-110`}>
                            <s.icon size={24} />
                        </div>
                        <div>
                            <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mb-1">{s.label}</p>
                            <p className="text-xl font-black text-[#3b2f2f]">{s.value}</p>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
};
