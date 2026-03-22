const fs = require('fs');

let content = fs.readFileSync('pages/admin/AdminPerformanceView.tsx', 'utf8');

// 1. Update loadData function and states
const targetStatesAndLoad = `    const [stats, setStats] = useState({
        totalHours: 0,
        activeStaff: 0,
        absentStaff: 0,
        productivityScore: 0,
        avgOrderTime: 0
    });

    const [staff, setStaff] = useState<any[]>([]);
    const [insights, setInsights] = useState<any[]>([]);
    
    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            // Fetch users (staff)
            const { data: userData } = await supabase.from('users').select('*').in('role', ['admin', 'staff', 'manager']);
            const staffList = userData || [];
            
            // Fetch today's orders to calculate activity
            const today = new Date().toISOString().split('T')[0];
            const { data: ordersData } = await supabase.from('orders').select('user_id, status, created_at').gte('created_at', today);
            
            const activeUserIds = new Set(ordersData?.filter(o => o.user_id).map(o => o.user_id));
            
            setStaff(staffList.map(u => ({
                ...u,
                isActive: activeUserIds.has(u.id),
                ordersToday: ordersData?.filter(o => o.user_id === u.id).length || 0
            })));

            setStats({
                totalHours: 0, // Necessita módulo de picar ponto
                activeStaff: activeUserIds.size,
                absentStaff: staffList.length - activeUserIds.size,
                productivityScore: activeUserIds.size > 0 ? 100 : 0, // Placeholder real baseado em actividade
                avgOrderTime: 0 // Requer timestamps de transição de status
            });

            // Fetch AI Insights
            const { data: insightData } = await supabase.from('ai_insights').select('*').order('created_at', { ascending: false });
            if (insightData) setInsights(insightData);
            else setInsights([]);

        } catch (error) {
            console.error('Error loading performance data:', error);
        } finally {
            setLoading(false);
        }
    };`;

const newStatesAndLoad = `    const [stats, setStats] = useState({
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
            // Fetch users (staff)
            const { data: userData } = await supabase.from('users').select('*').in('role', ['admin', 'staff', 'manager']);
            const staffList = userData || [];
            
            // 1. Fetch Today's Orders
            const today = new Date();
            today.setHours(0,0,0,0);
            const { data: ordersData } = await supabase.from('orders').select('user_id, status, created_at, updated_at').gte('created_at', today.toISOString());
            
            // 2. Fetch Active Employee Sessions
            const { data: sessionsData } = await supabase.from('employee_sessions').select('*').order('check_in', { ascending: false });
            const activeSessions = (sessionsData || []).filter((s:any) => s.status === 'active');
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
                const ordersByMe = (ordersData||[]).filter((o:any) => o.user_id === u.id).length;
                let currentDuration = '---';
                let checkInTime = '---';
                if(session) {
                    const cIn = new Date(session.check_in);
                    checkInTime = cIn.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
                    const diffMs = Date.now() - cIn.getTime();
                    const diffHrs = Math.floor(diffMs / 3600000);
                    const diffMins = Math.floor((diffMs % 3600000) / 60000);
                    currentDuration = \`\${diffHrs}h \${diffMins}m\`;
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
                if(s.status === 'active') {
                    todayHours += (Date.now() - new Date(s.check_in).getTime()) / 3600000;
                } else if(s.total_hours) {
                    todayHours += parseFloat(s.total_hours);
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
            // Bar Chart: Last 7 days hours
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
                    if(sDate >= dayStart && sDate <= dayEnd) hrs += (s.total_hours || 0);
                });
                return Math.round(hrs);
            });

            const barOptions = {
                tooltip: { trigger: 'axis' },
                xAxis: { type: 'category', data: barLabels },
                yAxis: { type: 'value', name: 'Horas' },
                series: [{ data: barData, type: 'bar', itemStyle: { color: '#d9a65a', borderRadius: [4,4,0,0] } }]
            };

            // Heatmap Setup
            // Mock Heatmap if no data, or calculate if we fetch last 7 days orders
            const { data: weekOrders } = await supabase.from('orders').select('created_at').gte('created_at', new Date(Date.now() - 7 * 86400000).toISOString());
            
            const hours = Array.from({length:24}, (_,i) => \`\${i}h\`);
            const days = ['Dom','Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
            const heatData: [number, number, number][] = [];
            
            for(let d=0; d<7; d++) {
                for(let h=0; h<24; h++) {
                    heatData.push([h, d, 0]);
                }
            }

            (weekOrders || []).forEach((o:any) => {
                const date = new Date(o.created_at);
                const day = date.getDay(); // 0-6
                const hour = date.getHours(); // 0-23
                const idx = heatData.findIndex(item => item[0] === hour && item[1] === day);
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

            // Fetch AI Insights
            const { data: insightData } = await supabase.from('ai_insights').select('*').order('created_at', { ascending: false });
            if (insightData) setInsights(insightData);
            else setInsights([]);

        } catch (error) {
            console.error('Error loading performance data:', error);
        } finally {
            setLoading(false);
        }
    };`;

content = content.replace(targetStatesAndLoad, newStatesAndLoad);

// 2. Update line 163 to use chartData
const targetCharts = `<div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
                    <h3 className="font-bold text-[#3b2f2f] mb-4">Horas Trabalhadas (Últimos 7 dias)</h3>
                    <ReactECharts option={{
                        tooltip: { trigger: 'axis' },
                        xAxis: { type: 'category', data: ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'] },
                        yAxis: { type: 'value' },
                        series: [{ data: [120, 132, 101, 134, 90, 230, 210], type: 'bar', itemStyle: { color: '#d9a65a', borderRadius: [4,4,0,0] } }]
                    }} style={{ height: 300 }} />
                </div>
                <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
                    <h3 className="font-bold text-[#3b2f2f] mb-4">Heatmap de Carga Operacional</h3>
                    <div className="flex-1 flex items-center justify-center text-gray-400 text-sm h-[300px] border-2 border-dashed border-gray-100 rounded-xl">
                        [Heatmap ECharts Module Loading...]
                    </div>
                </div>`;

const newCharts = `<div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
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
                </div>`;
content = content.replace(targetCharts, newCharts);

// 3. Update Tracking Table Rows
const targetTableRow = `<td className="px-6 py-4 text-gray-400">---</td>
                                <td className="px-6 py-4 text-gray-400">---</td>`;
const newTableRow = `<td className="px-6 py-4 text-gray-400">{user.checkIn || '---'}</td>
                                <td className="px-6 py-4 text-gray-400">{user.duration || '---'}</td>`;
content = content.replace(targetTableRow, newTableRow);

fs.writeFileSync('pages/admin/AdminPerformanceView.tsx', content);
console.log('Refactored AdminPerformanceView.tsx');
