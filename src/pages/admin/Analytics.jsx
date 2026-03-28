import React, { useEffect, useState } from 'react';
import { collection, query, getDocs, where } from 'firebase/firestore';
import { db } from '../../firebase';
import { TrendingUp, ShoppingBag, DollarSign, Activity, BarChart3, AlertCircle } from 'lucide-react';
import { AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const TIME_RANGES = [
  { id: 'today', label: 'Today' },
  { id: 'yesterday', label: 'Yesterday' },
  { id: '7days', label: 'Last 7 Days' },
  { id: '1month', label: 'Last 30 Days' },
  { id: '3months', label: 'Last 3 Months' },
  { id: '1year', label: 'Last Year' },
  { id: 'all', label: 'All Time' }
];

const getRangeDates = (range) => {
  const now = new Date();
  const start = new Date();
  let end = new Date(now);
  
  start.setHours(0, 0, 0, 0);
  end.setHours(23, 59, 59, 999);

  switch(range) {
    case 'yesterday':
      start.setDate(now.getDate() - 1);
      end = new Date(start);
      end.setHours(23, 59, 59, 999);
      break;
    case '7days':
      start.setDate(now.getDate() - 6);
      break;
    case '1month':
      start.setDate(now.getDate() - 29);
      break;
    case '3months':
      start.setMonth(now.getMonth() - 3);
      break;
    case '1year':
      start.setFullYear(now.getFullYear() - 1);
      break;
    case 'all':
      start.setFullYear(2000); 
      break;
    case 'today':
    default:
      break;
  }
  return { start, end };
};

export default function Analytics() {
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('7days');
  const [stats, setStats] = useState({ revenue: 0, orders: 0, avgValue: 0, unpaid: 0 });
  const [chartData, setChartData] = useState([]);
  const [topItems, setTopItems] = useState([]);

  useEffect(() => {
    const fetchAnalytics = async () => {
      setLoading(true);
      try {
        const { start, end } = getRangeDates(timeRange);
        
        const q = query(
          collection(db, 'orders'),
          where('timestamp', '>=', start),
          where('timestamp', '<=', end)
        );
        const sn = await getDocs(q);
        
        let rev = 0;
        let unp = 0;
        let ordCount = sn.docs.length;
        const itemsCount = {};
        const timeSeries = {};

        const isHourly = ['today', 'yesterday'].includes(timeRange);
        const isMonthly = ['3months', '1year', 'all'].includes(timeRange);

        if (isHourly) {
           for(let i=0; i<24; i++) {
              const label = `${i.toString().padStart(2, '0')}:00`;
              timeSeries[label] = { name: label, revenue: 0, orders: 0 };
           }
        } else if (timeRange === '7days' || timeRange === '1month') {
           const d = new Date(start);
           while(d <= end) {
              const label = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
              timeSeries[label] = { name: label, revenue: 0, orders: 0 };
              d.setDate(d.getDate() + 1);
           }
        }

        sn.forEach(doc => {
          const data = doc.data();
          if (!data.timestamp || !data.timestamp.toDate) return;
          
          const dateObj = data.timestamp.toDate();
          const amt = data.totalAmount || 0;

          if (data.paid) rev += amt;
          else unp += amt;

          if (data.items && Array.isArray(data.items)) {
            data.items.forEach(item => {
              if (!itemsCount[item.name]) itemsCount[item.name] = 0;
              itemsCount[item.name] += (item.quantity || 1);
            });
          }

          let label = '';
          if (isHourly) {
             label = `${dateObj.getHours().toString().padStart(2, '0')}:00`;
          } else if (isMonthly) {
             label = dateObj.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
          } else {
             label = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
          }

          if (!timeSeries[label]) {
             timeSeries[label] = { name: label, revenue: 0, orders: 0, __dateObj: dateObj };
          }
          
          if (data.paid) timeSeries[label].revenue += amt;
          timeSeries[label].orders += 1;
        });

        let chartArr = Object.values(timeSeries);
        if (isMonthly) {
          chartArr.sort((a,b) => {
            const dA = a.__dateObj ? new Date(a.__dateObj) : new Date(a.name);
            const dB = b.__dateObj ? new Date(b.__dateObj) : new Date(b.name);
            return dA - dB;
          });
        }

        const top = Object.keys(itemsCount)
          .map(name => ({ name, qty: itemsCount[name] }))
          .sort((a,b) => b.qty - a.qty)
          .slice(0, 5);

        setChartData(chartArr);
        setTopItems(top);
        setStats({
          revenue: rev,
          orders: ordCount,
          avgValue: ordCount > 0 ? rev / ordCount : 0,
          unpaid: unp
        });

      } catch (error) {
        console.error("Error fetching analytics:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchAnalytics();
  }, [timeRange]);

  const statCards = [
    { title: 'Total Revenue', subtitle: 'Paid amounts', value: `Rs. ${stats.revenue.toFixed(0)}`, icon: DollarSign, color: 'from-emerald-400 to-emerald-600', iconBg: 'bg-emerald-50', iconColor: 'text-emerald-500' },
    { title: 'Total Orders', subtitle: 'Count of orders', value: stats.orders, icon: ShoppingBag, color: 'from-blue-400 to-blue-600', iconBg: 'bg-blue-50', iconColor: 'text-blue-500' },
    { title: 'Average Value', subtitle: 'Revenue / Orders', value: `Rs. ${stats.avgValue.toFixed(0)}`, icon: TrendingUp, color: 'from-violet-400 to-violet-600', iconBg: 'bg-violet-50', iconColor: 'text-violet-500' },
    { title: 'Pending Dues', subtitle: 'Unpaid amounts', value: `Rs. ${stats.unpaid.toFixed(0)}`, icon: AlertCircle, color: 'from-rose-400 to-rose-600', iconBg: 'bg-rose-50', iconColor: 'text-rose-500' },
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
      
      {/* Header */}
      <div className="relative overflow-hidden bg-white rounded-4xl border border-gray-100 shadow-2xl shadow-gray-200/50 p-6 md:p-10 flex flex-col md:flex-row md:items-start justify-between gap-6">
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-64 h-64 bg-amber-50/60 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-64 h-64 bg-blue-50/40 rounded-full blur-3xl pointer-events-none" />
        <div className="relative">
          <div className="inline-flex items-center space-x-2 bg-amber-50 text-amber-600 px-5 py-2 rounded-2xl text-xs font-black uppercase tracking-widest mb-4">
            <BarChart3 className="w-4 h-4" />
            <span>Analytics Overview</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-black text-gray-950 tracking-tight leading-none mb-2">
            Business Performance
          </h1>
          <p className="text-gray-400 font-medium max-w-lg">
            Monitor and boost your restaurant's key metrics.
          </p>
        </div>
        
        {/* Time Filter */}
        <div className="relative shrink-0">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="appearance-none bg-white border border-gray-100 text-sm font-black text-gray-800 px-6 py-3.5 pr-12 rounded-2xl shadow-sm outline-none focus:ring-2 focus:ring-amber-500 cursor-pointer hover:border-gray-200 transition-all text-center min-w-[160px]"
          >
            {TIME_RANGES.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
          </select>
          <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-300">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" /></svg>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center min-h-[40vh]">
          <div className="w-14 h-14 border-4 border-blue-600/20 rounded-full relative">
            <div className="absolute inset-0 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
        </div>
      ) : (
        <>
          {/* Stat Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {statCards.map((s, i) => {
              const Icon = s.icon;
              return (
                <div key={i} className="group bg-white p-6 rounded-4xl border border-gray-100 shadow-sm hover:shadow-2xl hover:border-gray-200 transition-all duration-500 relative overflow-hidden">
                  <div className="absolute top-0 right-0 -mr-8 -mt-8 w-24 h-24 bg-gray-50/80 rounded-full blur-2xl pointer-events-none" />
                  <div className="relative">
                    <div className={`w-12 h-12 mb-4 rounded-2xl flex items-center justify-center ${s.iconBg} ${s.iconColor} group-hover:scale-110 transition-transform duration-500 shadow-sm`}>
                      <Icon className="w-6 h-6" />
                    </div>
                    <h2 className="text-2xl font-black text-gray-950 tracking-tight leading-none mb-1">{s.value}</h2>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{s.title}</p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Charts Row 1 */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* Revenue Trend */}
            <div className="lg:col-span-2 bg-white rounded-4xl border border-gray-100 shadow-sm p-6 md:p-8">
              <div className="flex items-center space-x-3 mb-6">
                <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-500 flex items-center justify-center">
                  <Activity className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-gray-950 tracking-tight">Revenue Trend</h3>
                  <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">{TIME_RANGES.find(t=>t.id===timeRange)?.label}</p>
                </div>
              </div>
              <div className="h-72 mt-4 text-xs font-black text-gray-400">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} dy={10} />
                    <YAxis axisLine={false} tickLine={false} />
                    <Tooltip
                      contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                      itemStyle={{ fontSize: '12px', fontWeight: 800 }}
                      labelStyle={{ fontSize: '10px', color: '#94a3b8', fontWeight: 800, marginBottom: '4px' }}
                      formatter={(val) => `Rs. ${val}`}
                    />
                    <Area type="monotone" dataKey="revenue" name="Revenue" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorRev)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Payment Status (Pie Chart) */}
            <div className="bg-white rounded-4xl border border-gray-100 shadow-sm p-6 md:p-8 flex flex-col">
              <div className="flex items-center space-x-3 mb-6">
                <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-500 flex items-center justify-center shrink-0">
                  <DollarSign className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-gray-950 tracking-tight">Payment Status</h3>
                  <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Paid vs Unpaid ratio</p>
                </div>
              </div>
              <div className="flex-1 min-h-[16rem] flex items-center justify-center relative">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={[
                        { name: 'Paid', value: stats.revenue },
                        { name: 'Unpaid', value: stats.unpaid }
                      ]}
                      innerRadius={70}
                      outerRadius={90}
                      paddingAngle={5}
                      dataKey="value"
                      stroke="none"
                    >
                      <Cell fill="#10b981" />
                      <Cell fill="#ef4444" />
                    </Pie>
                    <Tooltip 
                       contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                       itemStyle={{ fontSize: '12px', fontWeight: 800 }}
                       formatter={(val) => `Rs. ${Number(val).toFixed(0)}`}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none mt-2">
                   <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none">Total</span>
                   <span className="text-xl font-black text-gray-950 leading-none mt-1">
                     Rs. {((stats.revenue || 0) + (stats.unpaid || 0)).toFixed(0)}
                   </span>
                </div>
              </div>
              <div className="flex justify-between items-center px-4 mt-4 pt-4 border-t border-gray-50">
                <div className="text-center">
                  <div className="text-xs font-black text-emerald-500 mb-0.5">Paid</div>
                  <div className="text-xs font-bold text-gray-400">Rs. {stats.revenue.toFixed(0)}</div>
                </div>
                <div className="text-center">
                  <div className="text-xs font-black text-rose-500 mb-0.5">Unpaid</div>
                  <div className="text-xs font-bold text-gray-400">Rs. {stats.unpaid.toFixed(0)}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Charts Row 2 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            
            {/* Order Volume */}
            <div className="bg-white rounded-4xl border border-gray-100 shadow-sm p-6 md:p-8">
              <div className="flex items-center space-x-3 mb-6">
                <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-500 flex items-center justify-center">
                  <BarChart3 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-gray-950 tracking-tight">Order Volume</h3>
                  <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">{stats.orders} Total Orders</p>
                </div>
              </div>
              <div className="h-64 mt-4 text-xs font-black text-gray-400">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} dy={10} />
                    <YAxis axisLine={false} tickLine={false} allowDecimals={false} />
                    <Tooltip
                      contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                      itemStyle={{ fontSize: '12px', fontWeight: 800, color: '#3b82f6' }}
                      labelStyle={{ fontSize: '10px', color: '#94a3b8', fontWeight: 800, marginBottom: '4px' }}
                      cursor={{ fill: '#f8fafc' }}
                    />
                    <Bar dataKey="orders" name="Orders" fill="#3b82f6" radius={[6, 6, 0, 0]} barSize={28} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Top Selling Items */}
            <div className="bg-white rounded-4xl border border-gray-100 shadow-sm p-6 md:p-8 flex flex-col">
              <div className="flex items-center space-x-3 mb-8">
                <div className="w-10 h-10 rounded-2xl bg-rose-50 text-rose-500 flex items-center justify-center">
                  <ShoppingBag className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-gray-950 tracking-tight">Top Sellers</h3>
                  <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Most popular items</p>
                </div>
              </div>
              <div className="flex-1 space-y-3">
                 {topItems.length === 0 ? (
                   <div className="h-full flex flex-col items-center justify-center text-gray-300 pb-10">
                      <ShoppingBag className="w-12 h-12 mb-4 text-gray-200" />
                      <p className="text-sm font-black">No items sold yet</p>
                   </div>
                 ) : topItems.map((item, idx) => (
                   <div key={idx} className="flex items-center justify-between p-4 rounded-3xl bg-gray-50/50 hover:bg-gray-50 border border-gray-100 transition-colors">
                     <div className="flex items-center space-x-4">
                       <div className="w-10 h-10 rounded-2xl bg-white text-gray-950 font-black text-lg flex items-center justify-center shadow-sm border border-gray-50 shrink-0">
                         {idx + 1}
                       </div>
                       <span className="font-bold text-sm text-gray-800 leading-tight pr-4">{item.name}</span>
                     </div>
                     <div className="text-right shrink-0">
                       <span className="block text-lg font-black text-gray-950 leading-none">{item.qty}</span>
                       <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest mt-1 block">Sold</span>
                     </div>
                   </div>
                 ))}
              </div>
            </div>

          </div>
        </>
      )}
    </div>
  );
}
