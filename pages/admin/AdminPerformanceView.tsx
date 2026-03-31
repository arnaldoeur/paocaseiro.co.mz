import React, { useState, useEffect } from 'react';
import ReactECharts from 'echarts-for-react';
import { supabase } from '../../services/supabase';
import { Clock, Activity, Target, Zap, AlertTriangle, TrendingUp, Filter, Search, ChevronRight, CheckCircle, BrainCircuit, X, Calendar } from 'lucide-react';

export const AdminPerformanceView: React.FC = () => {
    const [subTab, setSubTab] = useState<'overview' | 'tracking' | 'productivity' | 'insights'>('overview');
    const [loading, setLoading] = useState(true);
    
    const [stats, setStats] = useState({
        totalHours: 0,
        activeStaff: 0,
        absentStaff: 0,
        productivityScore: 0,
        avgOrderTime: 0
    });

    const [staff, setStaff] = useState<any[]>([]);
    const [insights, setInsights] = useState<any[]>([]);
    const [chartData, setChartData] = useState<any>({
        barOptions: {},
        heatmapOptions: {}
    });
    
    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            // Fetch users (staff) from correct table
            const { data: userData } = await supabase.from('team_members').select('*');
            const staffList = userData || [];
            
            // 1. Fetch Today's Orders
            const today = new Date();
            today.setHours(0,0,0,0);
            const { data: ordersData } = await supabase
                .from('orders')
                .select('staff_id, status, created_at, updated_at')
                .gte('created_at', today.toISOString());
            
            // 2. Fetch Active Team Sessions
            const { data: sessionsData } = await supabase
                .from('employee_sessions')
                .select('*')
                .order('check_in', { ascending: false });
            
            const activeSessions = (sessionsData || []).filter((s:any) => !s.check_out);
            const activeStaffIds = new Set(activeSessions.map((s:any) => s.employee_id));

            // Calculate Order Times
            let totalOrderTime = 0;
            let completedOrdersCount = 0;
            (ordersData || []).forEach((o:any) => {
                if(o.status === 'concluido' || o.status === 'completed' || o.status === 'pronto') {
                    const created = new Date(o.created_at).getTime();
                    const updated = new Date(o.updated_at).getTime();
                    if(updated > created) {
                        totalOrderTime += (updated - created) / 60000; // in minutes
                        completedOrdersCount++;
                    }
                }
            });
            const avgOrderTime = completedOrdersCount > 0 ? Math.round(totalOrderTime / completedOrdersCount) : 0;

            // 3. Map Staff Data
            const staffWithMetrics = staffList.map((u:any) => {
                const session = activeSessions.find((s:any) => s.employee_id === u.id);
                const ordersByMe = (ordersData||[]).filter((o:any) => o.staff_id === u.id).length;
                let currentDuration = '---';
                let checkInTime = '---';
                if(session) {
                    const cIn = new Date(session.check_in);
                    checkInTime = cIn.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
                    const diffMs = Date.now() - cIn.getTime();
                    const diffHrs = Math.floor(diffMs / 3600000);
                    const diffMins = Math.floor((diffMs % 3600000) / 60000);
                    currentDuration = `${diffHrs}h ${diffMins}m`;
                }

                return {
                    ...u,
                    isActive: activeStaffIds.has(u.id),
                    ordersToday: ordersByMe,
                    checkIn: checkInTime,
                    duration: currentDuration
                };
            });
            setStaff(staffWithMetrics);

            // 4. Calculate Stats
            let todayHours = 0;
            const todaySessions = (sessionsData || []).filter((s:any) => new Date(s.check_in) >= today);
            todaySessions.forEach((s:any) => {
                if (s.total_hours) {
                    todayHours += parseFloat(s.total_hours.toString());
                } else {
                    const start = new Date(s.check_in).getTime();
                    const stop = s.check_out ? new Date(s.check_out).getTime() : Date.now();
                    todayHours += (stop - start) / 3600000;
                }
            });

            const activeStaffCount = activeStaffIds.size;
            
            setStats({
                totalHours: Math.round(todayHours),
                activeStaff: activeStaffCount,
                absentStaff: staffList.length - activeStaffCount,
                productivityScore: activeStaffCount > 0 ? Math.min(100, Math.round(((ordersData?.length || 0) / (activeStaffCount * 10)) * 100)) : 0, 
                avgOrderTime: avgOrderTime
            });

            // 5. Build Charts Data
            const dayLabels = ['Dom','Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
            const last7Days = Array.from({length: 7}, (_, i) => {
                const d = new Date();
                d.setDate(d.getDate() - (6 - i));
                return d;
            });
            const barLabels = last7Days.map(d => dayLabels[d.getDay()]);
            const barData = last7Days.map(d => {
                const dayStart = new Date(d); dayStart.setHours(0,0,0,0);
                const dayEnd = new Date(d); dayEnd.setHours(23,59,59,999);
                let hrs = 0;
                (sessionsData || []).forEach((s:any) => {
                    const sDate = new Date(s.check_in);
                    if(sDate >= dayStart && sDate <= dayEnd) {
                        if (s.total_hours) {
                            hrs += parseFloat(s.total_hours.toString());
                        } else {
                            const start = new Date(s.check_in).getTime();
                            const stop = s.check_out ? new Date(s.check_out).getTime() : Date.now();
                            hrs += (stop - start) / 3600000;
                        }
                    }
                });
                return Math.round(hrs);
            });

            const barOptions = {
                tooltip: { trigger: 'axis' },
                xAxis: { type: 'category', data: barLabels },
                yAxis: { type: 'value', name: 'Horas' },
                series: [{ data: barData, type: 'bar', itemStyle: { color: '#d9a65a', borderRadius: [4,4,0,0] } }]
            };

            const { data: weekOrders } = await supabase.from('orders').select('created_at').gte('created_at', new Date(Date.now() - 7 * 86400000).toISOString());
            
            const hours = Array.from({length:24}, (_,i) => `${i}h`);
            const days = ['Dom','Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
            const heatData: [number, number, number][] = [];
            
            for(let d=0; d<7; d++) {
                for(let h=0; h<24; h++) {
                    heatData.push([h, d, 0]);
                }
            }

            (weekOrders || []).forEach((o:any) => {
                const date = new Date(o.created_at);
                const day = date.getDay();
                const hour = date.getHours();
                const idx = heatData.findIndex((item:any) => item[0] === hour && item[1] === day);
                if(idx !== -1) heatData[idx][2]++;
            });

            const maxHeat = Math.max(...heatData.map(d => d[2]), 1);

            const heatmapOptions = {
                tooltip: { position: 'top' },
                grid: { height: '60%', top: '10%' },
                xAxis: { type: 'category', data: hours, splitArea: { show: true } },
                yAxis: { type: 'category', data: days, splitArea: { show: true } },
                visualMap: {
                    min: 0,
                    max: maxHeat,
                    calculable: true,
                    orient: 'horizontal',
                    left: 'center',
                    bottom: '0%',
                    inRange: { color: ['#f8f9fa', '#d9a65a', '#3b2f2f'] }
                },
                series: [{
                    name: 'Pedidos',
                    type: 'heatmap',
                    data: heatData,
                    label: { show: true, fontSize: 10 },
                    emphasis: { itemStyle: { shadowBlur: 10, shadowColor: 'rgba(0, 0, 0, 0.5)' } }
                }]
            };

            setChartData({ barOptions, heatmapOptions });

            const { data: insightData } = await supabase.from('ai_insights').select('*').order('created_at', { ascending: false });
            if (insightData) setInsights(insightData);
            else setInsights([]);

        } catch (error) {
            console.error('Error loading performance data:', error);
        } finally {
            setLoading(false);
        }
    };

    const generateAIInsights = async () => {
        setLoading(true);
        try {
            // Generate basic analytical insights based on current staff data.
            const totalOrders = staff.reduce((acc, user) => acc + user.ordersToday, 0);
            const activeCount = staff.filter(s => s.isActive).length;
            
            const newInsights = [];

            if (activeCount === 0) {
                newInsights.push({
                    title: 'Operação Parada',
                    description: 'Não foram detetadas transacções recentes na plataforma hoje. A equipa encontra-se fora de serviço.',
                    category: 'Desempenho Geral',
                    priority: 'critical',
                    recommendation: 'Verifique se o sistema está online ou se os colaboradores precisam de assistência técnica.'
                });
            } else {
                newInsights.push({
                    title: `Volume de Pedidos (${totalOrders})`,
                    description: `A plataforma processou ${totalOrders} pedidos hoje liderados por ${activeCount} funcionário(s) activo(s).`,
                    category: 'Desempenho Geral',
                    priority: 'normal',
                    recommendation: 'Ritmo operacional satisfatório. Mantenha as diretrizes de serviço actuais.'
                });

                const topPerformer = [...staff].sort((a,b) => b.ordersToday - a.ordersToday)[0];
                if (topPerformer && topPerformer.ordersToday > 0) {
                    newInsights.push({
                        title: `Destaque: ${topPerformer.name}`,
                        description: `O colaborador lidera com ${topPerformer.ordersToday} pedidos concluídos hoje, assegurando a maior fatia operacional.`,
                        category: 'Recursos Humanos',
                        priority: 'high',
                        recommendation: 'Considerar gratificação ou reconhecimento na próxima avaliação de equipa.'
                    });
                }
            }

            // Insert into the database
            for (const ins of newInsights) {
                await supabase.from('ai_insights').insert(ins);
            }

            // Reload data
            await loadData();
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const renderVisaoGeral = () => (
        <div className="animate-fade-in space-y-6">
            {/* KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow cursor-pointer">
                    <div className="flex justify-between items-center mb-4">
                        <div className="bg-blue-50 p-2 rounded-xl"><Clock className="text-blue-500" size={20} /></div>
                        <span className="text-xs font-bold text-gray-400">HOJE</span>
                    </div>
                    <h4 className="text-3xl font-black text-[#3b2f2f]">{stats.totalHours}h</h4>
                    <p className="text-sm text-gray-500 font-medium">Trabalhadas</p>
                </div>
                
                <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow cursor-pointer">
                    <div className="flex justify-between items-center mb-4">
                        <div className="bg-green-50 p-2 rounded-xl"><Activity className="text-green-500" size={20} /></div>
                        <span className="text-xs font-bold text-gray-400">EM TEMPO REAL</span>
                    </div>
                    <h4 className="text-3xl font-black text-[#3b2f2f]">{stats.activeStaff} / {stats.activeStaff + stats.absentStaff}</h4>
                    <p className="text-sm text-gray-500 font-medium">Funcionários em Serviço</p>
                </div>

                <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow cursor-pointer">
                    <div className="flex justify-between items-center mb-4">
                        <div className="bg-amber-50 p-2 rounded-xl"><Zap className="text-amber-500" size={20} /></div>
                        <span className="text-xs font-bold text-gray-400">MÉDIA GERAL</span>
                    </div>
                    <h4 className="text-3xl font-black text-[#3b2f2f]">{stats.productivityScore}%</h4>
                    <p className="text-sm text-gray-500 font-medium">Score de Produtividade</p>
                </div>

                <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow cursor-pointer">
                    <div className="flex justify-between items-center mb-4">
                        <div className="bg-purple-50 p-2 rounded-xl"><Target className="text-purple-500" size={20} /></div>
                        <span className="text-xs font-bold text-gray-400">MÉDIA GERAL</span>
                    </div>
                    <h4 className="text-3xl font-black text-[#3b2f2f]">{stats.avgOrderTime} min</h4>
                    <p className="text-sm text-gray-500 font-medium">Tempo por Pedido</p>
                </div>
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
                    <h3 className="font-bold text-[#3b2f2f] mb-4">Horas Trabalhadas (Últimos 7 dias)</h3>
                    {chartData.barOptions && Object.keys(chartData.barOptions).length > 0 ? (
                        <ReactECharts option={chartData.barOptions} style={{ height: 300 }} />
                    ) : (
                        <div className="h-[300px] flex items-center justify-center text-gray-400">Carregando dados...</div>
                    )}
                </div>
                <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 overflow-x-auto">
                    <h3 className="font-bold text-[#3b2f2f] mb-4">Heatmap de Carga Operacional (Pedidos)</h3>
                    {chartData.heatmapOptions && Object.keys(chartData.heatmapOptions).length > 0 ? (
                        <div className="min-w-[600px]">
                            <ReactECharts option={chartData.heatmapOptions} style={{ height: 300 }} />
                        </div>
                    ) : (
                         <div className="flex-1 flex items-center justify-center text-gray-400 text-sm h-[300px] border-2 border-dashed border-gray-100 rounded-xl">
                            Aguarde...
                        </div>
                    )}
                </div>
            </div>
        </div>
    );

    const renderRastreio = () => (
        <div className="animate-fade-in bg-white rounded-3xl border border-gray-100 overflow-hidden shadow-sm">
            <div className="p-6 border-b border-gray-50 flex justify-between items-center bg-gray-50/30">
                <div>
                    <h3 className="font-bold text-[#3b2f2f] text-lg">Rastreio em Tempo Real</h3>
                    <p className="text-sm text-gray-500">Monitorize quem está ativo e o seu estado atual.</p>
                </div>
                <div className="flex gap-2">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                        <input type="text" placeholder="Procurar funcionário..." className="pl-10 pr-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#d9a65a]" />
                    </div>
                    <button className="px-4 py-2 border border-gray-200 rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-gray-50">
                        <Filter size={16} /> Filtros
                    </button>
                </div>
            </div>
            <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-white border-b border-gray-50 text-gray-400 font-bold uppercase tracking-wider text-[10px]">
                    <tr>
                        <th className="px-6 py-4">Funcionário</th>
                        <th className="px-6 py-4">Estado</th>
                        <th className="px-6 py-4">Check-in</th>
                        <th className="px-6 py-4">Duração Atual</th>
                        <th className="px-6 py-4">Pedidos</th>
                        <th className="px-6 py-4 text-right">Acções</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                    {staff.length === 0 ? (
                        <tr><td colSpan={6} className="px-6 py-8 text-center text-gray-400">Nenhum funcionário encontrado.</td></tr>
                    ) : (
                        staff.map(user => (
                            <tr key={user.id} className="hover:bg-gray-50 cursor-pointer transition-colors">
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold uppercase">
                                            {user.name?.charAt(0) || 'U'}
                                        </div>
                                        <div><p className="font-bold text-[#3b2f2f]">{user.name}</p><p className="text-xs text-gray-400 uppercase">{user.role}</p></div>
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    {user.isActive ? 
                                        <span className="px-2 py-1 bg-green-100 text-green-700 rounded-md font-bold text-xs">Em Serviço (Activo)</span> : 
                                        <span className="px-2 py-1 bg-gray-100 text-gray-500 rounded-md font-bold text-xs">Fora de Serviço</span>
                                    }
                                </td>
                                <td className="px-6 py-4 text-gray-400">{user.checkIn || '---'}</td>
                                <td className="px-6 py-4 text-gray-400">{user.duration || '---'}</td>
                                <td className="px-6 py-4 font-bold">{user.ordersToday}</td>
                                <td className="px-6 py-4 text-right"><ChevronRight size={18} className="text-gray-400 inline-block" /></td>
                            </tr>
                        ))
                    )}
                </tbody>
            </table>
        </div>
    );

    const renderInsights = () => (
        <div className="animate-fade-in">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h3 className="font-bold text-[#3b2f2f] text-2xl">Insights Pão Caseiro AI</h3>
                    <p className="text-gray-500">Análise automática de métricas operacionais, RH e Financeiro.</p>
                </div>
                <button 
                    onClick={generateAIInsights}
                    disabled={loading}
                    className="bg-[#3b2f2f] text-[#d9a65a] px-6 py-2 rounded-xl font-bold hover:bg-black transition-colors flex items-center gap-2 disabled:opacity-50"
                >
                    <BrainCircuit size={18} />
                    {loading ? 'A processar...' : 'Gerar Relatório de Insights'}
                </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {insights.map(i => (
                    <div key={i.id} className={`p-6 rounded-3xl border-2 hover:-translate-y-1 transition-transform cursor-pointer ${i.priority === 'critical' ? 'bg-red-50 border-red-100' : i.priority === 'high' ? 'bg-orange-50 border-orange-100' : 'bg-white border-gray-100 shadow-sm'}`}>
                        <div className="flex justify-between items-start mb-4">
                            <span className={`px-2 py-1 rounded text-[10px] font-black uppercase tracking-widest ${i.priority === 'critical' ? 'bg-red-200 text-red-800' : 'bg-gray-100 text-gray-500'}`}>{i.category}</span>
                            {i.priority === 'critical' && <AlertTriangle size={18} className="text-red-500" />}
                        </div>
                        <h4 className={`font-bold text-lg mb-2 ${i.priority === 'critical' ? 'text-red-900' : 'text-[#3b2f2f]'}`}>{i.title}</h4>
                        <p className={`text-sm mb-4 ${i.priority === 'critical' ? 'text-red-700' : 'text-gray-500'}`}>{i.description}</p>
                        <div className="bg-white/50 p-3 rounded-xl border border-white">
                            <p className="text-xs font-bold text-gray-900 mb-1">Recomendação:</p>
                            <p className="text-xs text-gray-600">{i.recommendation || 'Pendente.'}</p>
                        </div>
                    </div>
                ))}
                {insights.length === 0 && (
                    <div className="col-span-full py-20 text-center text-gray-400">Sem insights gerados no momento.</div>
                )}
            </div>
        </div>
    );

    return (
        <div className="flex flex-col h-full bg-transparent">
            {/* Tabs */}
            <div className="flex gap-2 p-1 bg-gray-100 rounded-xl mb-6 w-fit">
                <button onClick={() => setSubTab('overview')} className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${subTab === 'overview' ? 'bg-white text-[#3b2f2f] shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}>Visão Geral</button>
                <button onClick={() => setSubTab('tracking')} className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${subTab === 'tracking' ? 'bg-white text-[#3b2f2f] shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}>Rastreio (Presença)</button>
                <button onClick={() => setSubTab('productivity')} className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${subTab === 'productivity' ? 'bg-white text-[#3b2f2f] shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}>Produtividade</button>
                <button onClick={() => setSubTab('insights')} className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${subTab === 'insights' ? 'bg-white text-purple-600 shadow-sm flex items-center gap-2' : 'text-gray-500 hover:text-gray-900 flex items-center gap-2'}`}><BrainCircuit size={14}/> Insights IA</button>
            </div>

            {/* Content */}
            {loading ? (
                <div className="flex-1 flex items-center justify-center animate-pulse text-gray-400">Carregando métricas enterprise...</div>
            ) : (
                <div className="flex-1">
                    {subTab === 'overview' && renderVisaoGeral()}
                    {subTab === 'tracking' && renderRastreio()}
                    {subTab === 'productivity' && (
                        <div className="animate-fade-in bg-white rounded-3xl border border-gray-100 overflow-hidden shadow-sm">
                            <div className="p-6 border-b border-gray-50 bg-gray-50/30">
                                <h3 className="font-bold text-[#3b2f2f] text-lg">Ranking Diário (Volume de Pedidos)</h3>
                                <p className="text-sm text-gray-500">Mede o volume de tickets tratados por cada funcionário no dia actual.</p>
                            </div>
                            <table className="w-full text-left text-sm whitespace-nowrap">
                                <thead className="bg-white border-b border-gray-50 text-gray-400 font-bold uppercase tracking-wider text-[10px]">
                                    <tr>
                                        <th className="px-6 py-4">Posição</th>
                                        <th className="px-6 py-4">Funcionário</th>
                                        <th className="px-6 py-4">Pedidos Concluídos</th>
                                        <th className="px-6 py-4">Performance Score</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {staff.sort((a,b) => b.ordersToday - a.ordersToday).map((user, idx) => (
                                        <tr key={user.id} className="hover:bg-gray-50 cursor-pointer transition-colors">
                                            <td className="px-6 py-4">
                                                <div className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs ${idx === 0 ? 'bg-yellow-100 text-yellow-700' : idx === 1 ? 'bg-gray-200 text-gray-700' : idx === 2 ? 'bg-orange-100 text-orange-700' : 'bg-gray-50 text-gray-400'}`}>
                                                    {idx + 1}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div><p className="font-bold text-[#3b2f2f]">{user.name}</p><p className="text-xs text-gray-400 uppercase">{user.role}</p></div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 font-black text-lg">{user.ordersToday}</td>
                                            <td className="px-6 py-4">
                                                <div className="w-full bg-gray-100 rounded-full h-2 max-w-[150px]">
                                                    <div className="bg-green-500 h-2 rounded-full" style={{ width: `${Math.min(100, (user.ordersToday / Math.max(1, staff[0]?.ordersToday)) * 100)}%` }}></div>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                    {staff.length === 0 && (
                                        <tr><td colSpan={4} className="px-6 py-8 text-center text-gray-400">Dados insuficientes.</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}
                    {subTab === 'insights' && renderInsights()}
                </div>
            )}
        </div>
    );
};
