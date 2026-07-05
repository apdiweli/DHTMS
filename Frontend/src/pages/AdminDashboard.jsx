import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  PieChart, Pie, Cell
} from 'recharts';
import {
  Home, Banknote, FileClock, CheckCircle, MoreVertical, Calendar, Loader,
  UserPlus, Building2, FileText, Users, ArrowRight
} from 'lucide-react';
import SummaryCard from '../components/SummaryCard.jsx';
import { getProperties, getTaxRecords, getOwners } from '../services/api';

/**
 * AdminDashboard Component
 * Order: Header -> Statistics -> Quick Actions -> Charts
 */
export default function AdminDashboard({ setActivePage }) {
  const navigate = useNavigate();
  const [dateRange, setDateRange] = useState('This Year');
  const [isLoading, setIsLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState({
    properties: [],
    taxRecords: [],
    owners: []
  });

  // --- 1. Data Fetching ---
  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setIsLoading(true);
      const [propertiesRes, taxRecordsRes, ownersRes] = await Promise.all([
        getProperties(),
        getTaxRecords(),
        getOwners()
      ]);

      setDashboardData({
        properties: propertiesRes.data || [],
        taxRecords: taxRecordsRes.data?.data || taxRecordsRes.data || [],
        owners: ownersRes.data || []
      });
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // --- 2. Statistics Calculation with Trends ---

  // Helper: Get data for specific month (offset: 0 for current, 1 for previous)
  const getMonthData = (data, dateField = 'createdAt', monthOffset = 0) => {
    const date = new Date();
    date.setMonth(date.getMonth() - monthOffset);
    const targetMonth = date.getMonth();
    const targetYear = date.getFullYear();

    return data.filter(item => {
      const itemDate = new Date(item[dateField]);
      return itemDate.getMonth() === targetMonth && itemDate.getFullYear() === targetYear;
    });
  };

  // Helper: Calculate Trend Percentage
  const calculateTrend = (current, previous) => {
    if (previous === 0) return { trend: 'up', trendValue: current > 0 ? '100%' : '0%' };
    const diff = current - previous;
    const percentage = (diff / previous) * 100;
    return {
      trend: percentage >= 0 ? 'up' : 'down',
      trendValue: `${Math.abs(percentage).toFixed(1)}%`
    };
  };

  const summaryData = (() => {
    // 1. Properties
    const currentProps = getMonthData(dashboardData.properties).length;
    const prevProps = getMonthData(dashboardData.properties, 'createdAt', 1).length;
    const propTrend = calculateTrend(currentProps, prevProps);

    // 2. Revenue
    const currentRevenue = getMonthData(dashboardData.taxRecords.filter(r => r.status === 'Paid'))
      .reduce((acc, curr) => acc + (curr.paidAmount || 0), 0);
    const prevRevenue = getMonthData(dashboardData.taxRecords.filter(r => r.status === 'Paid'), 'createdAt', 1)
      .reduce((acc, curr) => acc + (curr.paidAmount || 0), 0);
    const revTrend = calculateTrend(currentRevenue, prevRevenue);

    // 3. Unpaid
    const currentUnpaid = getMonthData(dashboardData.taxRecords.filter(r => r.status === 'Pending' || r.status === 'Partially Paid')).length;
    const prevUnpaid = getMonthData(dashboardData.taxRecords.filter(r => r.status === 'Pending' || r.status === 'Partially Paid'), 'createdAt', 1).length;
    const unpaidTrend = calculateTrend(currentUnpaid, prevUnpaid);

    // 4. Compliance (Ratio of Paid vs Total for the month)
    const calcCompliance = (total, paid) => total > 0 ? (paid / total) * 100 : 0;

    const currentTotalRecs = getMonthData(dashboardData.taxRecords).length;
    const currentPaidRecs = getMonthData(dashboardData.taxRecords.filter(r => r.status === 'Paid')).length;
    const currentCompliance = calcCompliance(currentTotalRecs, currentPaidRecs);

    const prevTotalRecs = getMonthData(dashboardData.taxRecords, 'createdAt', 1).length;
    const prevPaidRecs = getMonthData(dashboardData.taxRecords.filter(r => r.status === 'Paid'), 'createdAt', 1).length;
    const prevCompliance = calcCompliance(prevTotalRecs, prevPaidRecs);

    const compTrend = calculateTrend(currentCompliance, prevCompliance);

    return {
      totalProperties: {
        value: dashboardData.properties.length.toLocaleString(),
        trend: propTrend.trend,
        trendValue: propTrend.trendValue
      },
      revenue: {
        value: `$${dashboardData.taxRecords
          .filter(r => r.status === 'Paid')
          .reduce((acc, curr) => acc + (curr.paidAmount || 0), 0)
          .toLocaleString()}`,
        trend: revTrend.trend,
        trendValue: revTrend.trendValue
      },
      unpaid: {
        value: dashboardData.taxRecords
          .filter(r => r.status === 'Pending' || r.status === 'Partially Paid')
          .length.toString(),
        // For unpaid, 'down' is usually 'good' (green), but our SummaryCard might just show arrow direction
        // Usually less unpaid is good. If trend is 'down', it means unpaid decreased.
        trend: unpaidTrend.trend,
        trendValue: unpaidTrend.trendValue
      },
      compliance: {
        value: dashboardData.taxRecords.length > 0
          ? `${Math.round((dashboardData.taxRecords.filter(r => r.status === 'Paid').length / dashboardData.taxRecords.length) * 100)}%`
          : '0%',
        trend: compTrend.trend,
        trendValue: compTrend.trendValue
      },
    };

  })();

  // --- 3. Chart Data Prep ---
  const revenueData = (() => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const currentMonth = new Date().getMonth();
    const data = [];

    for (let i = 6; i >= 0; i--) {
      const monthIndex = (currentMonth - i + 12) % 12;
      const monthRecords = dashboardData.taxRecords.filter(r => {
        const recordMonth = new Date(r.createdAt).getMonth();
        return recordMonth === monthIndex && r.status === 'Paid';
      });

      const revenue = monthRecords.reduce((acc, curr) => acc + (curr.paidAmount || 0), 0);
      data.push({
        name: months[monthIndex],
        revenue: revenue,
      });
    }
    return data;
  })();

  const pieData = (() => {
    const distribution = dashboardData.properties.reduce((acc, prop) => {
      acc[prop.propertyType] = (acc[prop.propertyType] || 0) + 1;
      return acc;
    }, {});

    const colors = {
      'Residential': '#6366f1', // Indigo
      'Agricultural': '#ec4899', // Pink
      'Industrial': '#f59e0b',  // Amber
      'Other': '#94a3b8'        // Gray
    };

    return Object.entries(distribution).map(([name, value]) => ({
      name,
      value,
      color: colors[name] || colors['Other']
    }));
  })();

  const recentActivity = dashboardData.taxRecords
    .slice(0, 4)
    .map((record, index) => ({
      id: index + 1,
      type: record.status === 'Paid' ? 'payment' : 'alert',
      msg: record.status === 'Paid'
        ? `Payment received`
        : `Tax ${record.status.toLowerCase()}`,
      sub: record.propertyId?.address || 'Unknown Property',
      time: new Date(record.createdAt).toLocaleDateString(),
      amount: record.status === 'Paid' ? `+$${record.paidAmount?.toLocaleString()}` : null
    }));

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <Loader className="w-10 h-10 mx-auto mb-4 animate-spin text-indigo-600" />
          <p className="text-gray-500 font-medium">Loading tax data...</p>
        </div>
      </div>
    );
  }

  // Helper for Quick Actions
  const QuickActionBtn = ({ title, sub, icon: Icon, color, onClick }) => (
    <button
      onClick={onClick}
      className="flex items-center gap-4 bg-white p-4 rounded-xl border border-gray-100 shadow-sm hover:shadow-md hover:border-indigo-100 transition-all duration-200 group text-left w-full"
    >
      <div className={`p-3 rounded-lg ${color} group-hover:scale-110 transition-transform duration-200`}>
        <Icon size={22} />
      </div>
      <div className="flex-1">
        <h3 className="font-bold text-gray-700 text-sm">{title}</h3>
        <p className="text-xs text-gray-400 mt-0.5">{sub}</p>
      </div>
      <div className="text-gray-300 group-hover:text-indigo-500 transition-colors">
        <ArrowRight size={16} />
      </div>
    </button>
  );

  return (
    <div className="space-y-8 pb-10">

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 tracking-tight">Dashboard Overview</h1>
          <p className="text-sm text-gray-500 mt-1">House Taxation Management System</p>
        </div>
        <button className="flex items-center gap-2 bg-white border border-gray-200 px-4 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 shadow-sm transition-all">
          <Calendar size={16} />
          {dateRange}
        </button>
      </div>

      {/* --- STATISTICS SECTION (Moved to Top) --- */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <SummaryCard
          title="Total Properties"
          value={summaryData.totalProperties.value}
          icon={Home}
          color={{ bg: 'bg-blue-50', text: 'text-blue-600' }}
          trend={summaryData.totalProperties.trend}
          trendValue={summaryData.totalProperties.trendValue}
        />
        <SummaryCard
          title="Total Revenue"
          value={summaryData.revenue.value}
          icon={Banknote}
          color={{ bg: 'bg-emerald-50', text: 'text-emerald-600' }}
          trend={summaryData.revenue.trend}
          trendValue={summaryData.revenue.trendValue}
        />
        <SummaryCard
          title="Unpaid Bills"
          value={summaryData.unpaid.value}
          icon={FileClock}
          color={{ bg: 'bg-amber-50', text: 'text-amber-600' }}
          trend={summaryData.unpaid.trend}
          trendValue={summaryData.unpaid.trendValue}
        />
        <SummaryCard
          title="Compliance Rate"
          value={summaryData.compliance.value}
          icon={CheckCircle}
          color={{ bg: 'bg-indigo-50', text: 'text-indigo-600' }}
          trend={summaryData.compliance.trend}
          trendValue={summaryData.compliance.trendValue}
        />
      </div>

      {/* --- QUICK MANAGEMENT SECTION (Moved Below Stats) --- */}
      <div>
        <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">Quick Management</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <QuickActionBtn
            title="Add Owner"
            sub="Register new taxpayer"
            icon={UserPlus}
            color="bg-emerald-50 text-emerald-600"
            onClick={() => navigate && navigate('/owners?action=add')}
          />
          <QuickActionBtn
            title="Create Property"
            sub="Map new housing unit"
            icon={Building2}
            color="bg-blue-50 text-blue-600"
            onClick={() => navigate && navigate('/properties?action=register')}
          />
          <QuickActionBtn
            title="View Reports"
            sub="Financial analysis"
            icon={FileText}
            color="bg-amber-50 text-amber-600"
            onClick={() => navigate && navigate('/reports')}
          />
          <QuickActionBtn
            title="Manage Users"
            sub="Admin permissions"
            icon={Users}
            color="bg-purple-50 text-purple-600"
            onClick={() => navigate && navigate('/users')}
          />
        </div>
      </div>

      {/* Charts & Activity Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Revenue Chart */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className="font-bold text-gray-800">Revenue Analytics</h3>
              <p className="text-xs text-gray-400">Monthly tax collection</p>
            </div>
            <button className="p-1 hover:bg-gray-100 rounded-full text-gray-400 transition-colors">
              <MoreVertical size={18} />
            </button>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenueData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#9ca3af' }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#9ca3af' }} tickFormatter={(v) => `$${v / 1000}k`} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#fff', borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}
                  formatter={(val) => [`$${val.toLocaleString()}`, 'Revenue']}
                />
                <Area type="monotone" dataKey="revenue" stroke="#6366f1" strokeWidth={3} fillOpacity={1} fill="url(#colorRev)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Right Column: Pie & Activity */}
        <div className="flex flex-col gap-6">

          {/* Pie Chart */}
          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex-1">
            <h3 className="font-bold text-gray-800 mb-4">Property Types</h3>
            <div className="h-48 relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={70} paddingAngle={5} dataKey="value">
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-wrap justify-center gap-2 text-xs text-gray-500 mt-2">
                {pieData.slice(0, 3).map(d => (
                  <div key={d.name} className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: d.color }}></span>
                    {d.name}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Activity List */}
          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex-1">
            <h3 className="font-bold text-gray-800 mb-4">Recent Updates</h3>
            <div className="space-y-4">
              {recentActivity.map(item => (
                <div key={item.id} className="flex gap-3 items-start group">
                  <div className={`mt-1.5 min-w-[8px] h-2 rounded-full ${item.type === 'payment' ? 'bg-emerald-400' : 'bg-amber-400'}`}></div>
                  <div className="flex-1">
                    <p className="text-sm text-gray-700 font-medium leading-tight group-hover:text-indigo-600 transition-colors">{item.msg}</p>
                    <p className="text-xs text-gray-400">{item.sub}</p>
                    <div className="flex justify-between items-center mt-1">
                      <span className="text-[10px] text-gray-400">{item.time}</span>
                      {item.amount && <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">{item.amount}</span>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}