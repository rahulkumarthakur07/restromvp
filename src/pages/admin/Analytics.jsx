import React, { useEffect, useState } from 'react';
import { collection, query, getDocs, orderBy } from 'firebase/firestore';
import { db } from '../../firebase';
import { TrendingUp, ShoppingBag, DollarSign, Activity } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function Analytics() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ totalRevenue: 0, totalOrders: 0, avgValue: 0 });
  const [chartData, setChartData] = useState([]);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const q = query(collection(db, 'orders'));
        const sn = await getDocs(q);
        
        // For MVP we just calculate everything on the client
        let revenue = 0;
        let ordersCount = sn.docs.length;
        const dailyData = {};
        
        sn.forEach(doc => {
          const data = doc.data();
          if (data.totalAmount && data.paid) {
            revenue += data.totalAmount;
          }
          if (data.timestamp && data.timestamp.toDate) {
            const dateStr = data.timestamp.toDate().toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            if (!dailyData[dateStr]) dailyData[dateStr] = { date: dateStr, revenue: 0, orders: 0 };
            if (data.paid) dailyData[dateStr].revenue += data.totalAmount;
            dailyData[dateStr].orders += 1;
          }
        });

        const chartArr = Object.values(dailyData).slice(-14);
        setChartData(chartArr);

        setStats({
          totalRevenue: revenue,
          totalOrders: ordersCount,
          avgValue: ordersCount > 0 ? revenue / ordersCount : 0
        });
      } catch (error) {
        console.error("Error fetching analytics:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchAnalytics();
  }, []);

  if (loading) {
    return <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>;
  }

  const statCards = [
    { title: 'Total Revenue (Paid)', value: `$${stats.totalRevenue.toFixed(2)}`, icon: DollarSign, color: 'text-green-600', bg: 'bg-green-50' },
    { title: 'Total Orders', value: stats.totalOrders, icon: ShoppingBag, color: 'text-blue-600', bg: 'bg-blue-50' },
    { title: 'Average Order Value', value: `$${stats.avgValue.toFixed(2)}`, icon: TrendingUp, color: 'text-purple-600', bg: 'bg-purple-50' },
  ];

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Analytics Overview</h1>
          <p className="text-gray-500 font-medium">Key performance indicators for your restaurant</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {statCards.map((s, i) => {
          const Icon = s.icon;
          return (
            <div key={i} className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex items-center space-x-6">
              <div className={`p-4 rounded-2xl ${s.bg} ${s.color}`}>
                <Icon className="w-8 h-8" />
              </div>
              <div>
                <p className="text-sm font-bold text-gray-500 tracking-wide uppercase">{s.title}</p>
                <h2 className="text-3xl font-black text-gray-800">{s.value}</h2>
              </div>
            </div>
          );
        })}
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8 min-h-[400px]">
        <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center">
          <Activity className="w-5 h-5 mr-2 text-blue-600" />
          Revenue Over Time
        </h3>
        
        {chartData.length > 0 ? (
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fill: '#9ca3af', fontSize: 12}} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#9ca3af', fontSize: 12}} tickFormatter={(val) => `$${val}`} />
                <Tooltip 
                  cursor={{stroke: '#f3f4f6', strokeWidth: 2}}
                  contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}}
                />
                <Line type="monotone" dataKey="revenue" stroke="#2563eb" strokeWidth={4} dot={{r: 4, strokeWidth: 2}} activeDot={{r: 6}} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-80 text-gray-400 font-medium">
            <Activity className="w-12 h-12 mb-2 text-gray-200" />
            <p>Not enough date-based data for charts yet.</p>
          </div>
        )}
      </div>
    </div>
  );
}
