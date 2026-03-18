const fs = require('fs');
const path = 'C:\\Users\\Arnaldo Eurico\\Desktop\\Zyph Dev\\paocaseiro.co.mz\\paocaseiro.co.mz\\pages\\Admin.tsx';

let content = fs.readFileSync(path, 'utf8');
let lines = content.split('\n');

const newDashboard = [
    "                {/* Dashboard View */}",
    "                {activeView === 'dashboard' && (",
    "                    <div className=\"space-y-6 animate-fade-in\">",
    "                        {/* Compact Stats Row */}",
    "                        <div className=\"grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4\">",
    "                            <div",
    "                                onClick={() => { setActiveView('orders'); setStatusFilter('pending'); }}",
    "                                className=\"bg-white p-4 rounded-2xl shadow-sm border border-[#d9a65a]/10 cursor-pointer group hover:shadow-xl hover:-translate-y-1 transition-all duration-300 relative overflow-hidden\"",
    "                            >",
    "                                <div className=\"absolute top-0 right-0 p-2 opacity-5 group-hover:opacity-10 transition-opacity\"><Clock size={40} /></div>",
    "                                <h3 className=\"text-2xl font-black text-[#d9a65a] mb-0\">{pendingOrders}</h3>",
    "                                <p className=\"text-gray-400 text-[10px] uppercase font-black tracking-widest\">Pendentes</p>",
    "                            </div>",
    "",
    "                            <div",
    "                                onClick={() => setActiveView('stock')}",
    "                                className=\"bg-white p-4 rounded-2xl shadow-sm border border-[#d9a65a]/10 cursor-pointer group hover:shadow-xl hover:-translate-y-1 transition-all duration-300 relative overflow-hidden\"",
    "                            >",
    "                                <div className=\"absolute top-0 right-0 p-2 opacity-5 group-hover:opacity-10 transition-opacity\"><Package size={40} /></div>",
    "                                <h3 className=\"text-2xl font-black text-[#d9a65a] mb-0\">{totalProducts}</h3>",
    "                                <p className=\"text-gray-400 text-[10px] uppercase font-black tracking-widest\">Produtos</p>",
    "                                {lowStockProducts > 0 && <span className=\"absolute bottom-2 right-4 text-[8px] text-red-500 font-black bg-red-50 px-2 py-0.5 rounded-full\">{lowStockProducts} Low</span>}",
    "                            </div>",
    "",
    "                            <div",
    "                                onClick={() => setActiveView('logistics')}",
    "                                className=\"bg-white p-4 rounded-2xl shadow-sm border border-[#d9a65a]/10 cursor-pointer group hover:shadow-xl hover:-translate-y-1 transition-all duration-300 relative overflow-hidden\"",
    "                            >",
    "                                <div className=\"absolute top-0 right-0 p-2 opacity-5 group-hover:opacity-10 transition-opacity\"><Truck size={40} /></div>",
    "                                <h3 className=\"text-2xl font-black text-[#3b2f2f] mb-0\">{orders.filter(o => o.customer.type === 'delivery' && o.status === 'pending').length}</h3>",
    "                                <p className=\"text-gray-400 text-[10px] uppercase font-black tracking-widest\">Entregas</p>",
    "                            </div>",
    "",
    "                            <div",
    "                                onClick={() => { setActiveView('logistics'); setLogisticsTab('drivers'); }}",
    "                                className=\"bg-white p-4 rounded-2xl shadow-sm border border-[#d9a65a]/10 cursor-pointer group hover:shadow-xl hover:-translate-y-1 transition-all duration-300 relative overflow-hidden\"",
    "                            >",
    "                                <div className=\"absolute top-0 right-0 p-2 opacity-5 group-hover:opacity-10 transition-opacity\"><Users size={40} /></div>",
    "                                <h3 className=\"text-2xl font-black text-[#3b2f2f] mb-0\">{drivers.filter(d => d.status === 'available').length}</h3>",
    "                                <p className=\"text-gray-400 text-[10px] uppercase font-black tracking-widest\">Motoristas</p>",
    "                            </div>",
    "",
    "                            <div",
    "                                onClick={() => setActiveView('logistics')}",
    "                                className=\"bg-[#3b2f2f] p-4 rounded-2xl shadow-sm border border-[#d9a65a]/20 cursor-pointer group hover:shadow-xl hover:-translate-y-1 transition-all duration-300 relative overflow-hidden text-white\"",
    "                            >",
    "                                <div className=\"absolute top-0 right-0 p-2 opacity-5 group-hover:opacity-10 transition-opacity\"><MapPin size={40} /></div>",
    "                                <div className=\"flex items-center gap-1.5 mb-0\">",
    "                                    <span className=\"w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse\"></span>",
    "                                    <h3 className=\"text-2xl font-black text-white\">{drivers.filter(d => d.status === 'busy').length}</h3>",
    "                                </div>",
    "                                <p className=\"text-[#d9a65a] text-[10px] uppercase font-black tracking-widest\">Live</p>",
    "                            </div>",
    "",
    "                            <div",
    "                                onClick={() => setActiveView('orders')}",
    "                                className=\"bg-[#d9a65a] p-4 rounded-2xl shadow-sm border border-[#3b2f2f]/10 cursor-pointer group hover:shadow-xl hover:-translate-y-1 transition-all duration-300 relative overflow-hidden\"",
    "                            >",
    "                                <div className=\"absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-20 transition-opacity\"><TrendingUp size={40} /></div>",
    "                                <h3 className=\"text-2xl font-black text-[#3b2f2f] mb-0\">{orders.length}</h3>",
    "                                <p className=\"text-[#3b2f2f]/60 text-[10px] uppercase font-black tracking-widest\">Total Vendas</p>",
    "                            </div>",
    "                        </div>",
    "",
    "                        {/* Performance & Activity Row */}",
    "                        <div className=\"grid grid-cols-1 lg:grid-cols-4 gap-6\">",
    "                            {/* Performance Chart */}",
    "                            <div className=\"lg:col-span-3 bg-white rounded-3xl shadow-sm border border-gray-100 p-6 flex flex-col\">",
    "                                <div className=\"flex justify-between items-center mb-6\">",
    "                                    <h3 className=\"text-sm font-black text-[#3b2f2f] uppercase tracking-widest flex items-center gap-2\">",
    "                                        <TrendingUp size={16} className=\"text-[#d9a65a]\" /> Performance (7 Dias)",
    "                                    </h3>",
    "                                    <div className=\"flex gap-2\">",
    "                                        <div className=\"flex items-center gap-1.5\">",
    "                                            <span className=\"w-2 h-2 bg-[#d9a65a] rounded-full\"></span>",
    "                                            <span className=\"text-[10px] font-bold text-gray-400 uppercase\">Vendas</span>",
    "                                        </div>",
    "                                    </div>",
    "                                </div>",
    "                                <div className=\"flex items-end gap-2 h-40 w-full relative group/chart\">",
    "                                    {salesData.map((data, idx) => (",
    "                                        <div key={idx} className=\"flex-1 flex flex-col items-center gap-2 group/bar relative\">",
    "                                            <div className=\"relative w-full flex items-end justify-center h-full\">",
    "                                                <motion.div",
    "                                                    initial={{ height: 0 }}",
    "                                                    animate={{ height: `${(data.value / (maxSale || 1)) * 100}%` }}",
    "                                                    transition={{ duration: 1, delay: idx * 0.1, ease: 'easeOut' }}",
    "                                                    className=\"w-full max-w-[32px] bg-gradient-to-t from-[#d9a65a] to-[#f2d4a7] rounded-t-lg transition-all duration-300 group-hover/bar:brightness-110 shadow-[0_4px_12px_rgba(217,166,90,0.15)] group-hover/bar:shadow-[0_8px_20px_rgba(217,166,90,0.3)]\"",
    "                                                    style={{ minHeight: '4px' }}",
    "                                                />",
    "                                                <div className=\"absolute -top-10 opacity-0 group-hover/bar:opacity-100 transition-all duration-300 scale-75 group-hover/bar:scale-100 -translate-y-2 group-hover/bar:translate-y-0 z-20 pointer-events-none\">",
    "                                                    <div className=\"bg-[#3b2f2f] text-white text-[10px] font-black py-1.5 px-3 rounded-full shadow-xl whitespace-nowrap border border-white/10 ring-4 ring-[#3b2f2f]/5\">",
    "                                                        {data.value.toLocaleString()} MT",
    "                                                    </div>",
    "                                                    <div className=\"w-2 h-2 bg-[#3b2f2f] rotate-45 mx-auto -mt-1 shadow-xl border-r border-b border-white/10\"></div>",
    "                                                </div>",
    "                                            </div>",
    "                                            <span className=\"text-[9px] font-black text-gray-300 uppercase tracking-tighter group-hover/bar:text-[#d9a65a] transition-colors\">{data.day}</span>",
    "                                        </div>",
    "                                    ))}",
    "                                    <div className=\"absolute inset-0 flex flex-col justify-between pointer-events-none opacity-5\">",
    "                                        {[1, 2, 3, 4].map(l => <div key={l} className=\"w-full border-t border-gray-400\"></div>)}",
    "                                    </div>",
    "                                </div>",
    "                            </div>",
    "",
    "                            {/* Recent Activity (Compact) */}",
    "                            <div className=\"bg-white rounded-3xl shadow-sm border border-gray-100 p-5 flex flex-col h-full max-h-[240px] lg:max-h-full\">",
    "                                <h3 className=\"text-sm font-black text-[#3b2f2f] uppercase tracking-widest mb-4 flex items-center gap-2\">",
    "                                    <Clock size={16} className=\"text-[#d9a65a]\" /> Recentes",
    "                                </h3>",
    "                                <div className=\"space-y-3 overflow-y-auto pr-1 thin-scrollbar\">",
    "                                    {recentOrders.length === 0 ? (",
    "                                        <p className=\"text-gray-400 text-[10px] text-center py-4 font-bold uppercase\">Sem atividade.</p>",
    "                                    ) : (",
    "                                        recentOrders.slice(0, 5).map((o, i) => (",
    "                                            <div key={i} className=\"flex items-center gap-3 p-2.5 bg-gray-50/50 rounded-2xl hover:bg-white hover:shadow-lg transition-all border border-transparent hover:border-[#d9a65a]/10 group\">",
    "                                                <div className={`p-1.5 rounded-xl ${o.status === 'completed' ? 'bg-green-50 text-green-500' : o.status === 'pending' ? 'bg-orange-50 text-orange-500' : 'bg-red-50 text-red-500'}`}>",
    "                                                    {o.status === 'completed' ? <CheckCircle size={14} /> : o.status === 'pending' ? <Clock size={14} /> : <X size={14} />}",
    "                                                </div>",
    "                                                <div className=\"flex-1 min-w-0\">",
    "                                                    <p className=\"font-black text-[#3b2f2f] text-[11px] truncate\">{o.customer.name}</p>",
    "                                                    <p className=\"text-[9px] font-bold text-gray-400\">{o.total} MT • {o.items.length} itens</p>",
    "                                                </div>",
    "                                                <span className=\"text-[8px] font-black text-gray-300 uppercase shrink-0\">{o.date.split(',')[1].trim()}</span>",
    "                                            </div>",
    "                                        ))",
    "                                    )}",
    "                                </div>",
    "                                <button",
    "                                    onClick={() => setActiveView('orders')}",
    "                                    className=\"mt-4 w-full py-2 bg-gray-50 hover:bg-[#d9a65a]/10 text-gray-400 hover:text-[#d9a65a] rounded-xl text-[9px] font-black uppercase tracking-widest transition-all\"",
    "                                >",
    "                                    Ver Todos",
    "                                </button>",
    "                            </div>",
    "                        </div>",
    "                    </div>",
    "                )}"
];

// Replace dashboard view (approx lines 1827-1978)
// We look for line 1827: {activeView === 'dashboard' && (
const startIndex = lines.findIndex(l => l.includes("{activeView === 'dashboard' && ("));
const endIndex = lines.findIndex((l, i) => i > startIndex && l.trim() === ')}' && lines[i + 2] && lines[i + 2].includes('Orders View'));

if (startIndex !== -1 && endIndex !== -1) {
    console.log(`Replacing from line ${startIndex + 1} to ${endIndex + 1}`);
    lines.splice(startIndex - 1, (endIndex - startIndex) + 2, ...newDashboard);
} else {
    console.error('Could not find dashboard block', { startIndex, endIndex });
}

// Fix end of file
const lastLines = [
    "                        }",
    "                    </div>",
    "                </div>",
    "            );",
    "};"
];

// Find the last AnimatePresence closing tag or similar
const lastIndex = lines.findLastIndex(l => l.trim() === ');');
if (lastIndex !== -1) {
    console.log(`Fixing end of file at line ${lastIndex + 1}`);
    lines.splice(lastIndex - 2, lines.length - (lastIndex - 2), ...lastLines);
}

fs.writeFileSync(path, lines.join('\n'));
console.log('Done');
