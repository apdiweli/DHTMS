import React, { useState, useEffect, useRef } from 'react';
import { getTaxRecords, getProperties, getUsers } from '../services/api';
import { useAuth } from '../context/AuthContext.jsx';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer,
    LineChart, Line
} from 'recharts';
import {
    TrendingUp, Activity, AlertTriangle, Building2, ShieldCheck, DollarSign, Loader, CheckCircle2
} from 'lucide-react';

const BANADIR_DISTRICTS = ['Abdiaziz', 'Bondhere', 'Daynile', 'Dharkenley', 'Garasbaley', 'Hamar Jajab', 'Hamar Weyne', 'Heliwa', 'Hodan', 'Howlwadag', 'Kahda', 'Karan', 'Shangani', 'Shibis', 'Waberi', 'Wadajir', 'Wardhigley', 'Yaqshid'].sort();

const MOGADISHU_DISTRICT_CENTERS = {
    'Abdiaziz': [2.040, 45.340], 'Bondhere': [2.040, 45.335], 'Daynile': [2.070, 45.300],
    'Dharkenley': [2.025, 45.295], 'Garasbaley': [2.030, 45.275], 'Hamar Jajab': [2.025, 45.325],
    'Hamar Weyne': [2.035, 45.338], 'Heliwa': [2.080, 45.340], 'Hodan': [2.045, 45.305],
    'Howlwadag': [2.040, 45.320], 'Kahda': [2.015, 45.280], 'Karan': [2.055, 45.360],
    'Shangani': [2.035, 45.342], 'Shibis': [2.045, 45.340], 'Waberi': [2.028, 45.315],
    'Wadajir': [2.020, 45.300], 'Wardhigley': [2.045, 45.325], 'Yaqshid': [2.060, 45.335],
};

const MOGADISHU_CENTER = [2.0469, 45.3182];

export default function DistrictPerformance() {
    const { user } = useAuth();
    const [isLoading, setIsLoading] = useState(true);
    const [taxRecords, setTaxRecords] = useState([]);
    const [properties, setProperties] = useState([]);
    const [users, setUsers] = useState([]);
    
    const mapRef = useRef(null);
    const mapInstanceRef = useRef(null);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setIsLoading(true);
            const [taxRes, propRes, userRes] = await Promise.all([
                getTaxRecords(),
                getProperties(),
                getUsers()
            ]);
            setTaxRecords(taxRes.data?.data || taxRes.data || []);
            setProperties(propRes.data?.data || propRes.data || []);
            setUsers(userRes.data?.data || userRes.data || []);
        } catch (error) {
            console.error('Error fetching district data:', error);
        } finally {
            setIsLoading(false);
        }
    };

    // Calculate aggregated metrics per district
    const districtStats = BANADIR_DISTRICTS.map(districtName => {
        const dProps = properties.filter(p => p.district === districtName);
        const propertyIds = dProps.map(p => p._id);
        const dRecords = taxRecords.filter(r => r.propertyId && propertyIds.includes(typeof r.propertyId === 'object' ? r.propertyId._id : r.propertyId));

        const propertyCount = dProps.length;
        const totalGenerated = dRecords.reduce((sum, r) => sum + (r.amount || 0), 0);
        const totalCollected = dRecords.reduce((sum, r) => sum + (r.paidAmount || 0), 0);
        const totalUnpaid = totalGenerated - totalCollected;
        
        const efficiency = totalGenerated > 0 ? (totalCollected / totalGenerated) * 100 : 0;

        const paidPropertiesCount = dProps.filter(p => p.paymentStatus === 'paid').length;
        const complianceRate = propertyCount > 0 ? (paidPropertiesCount / propertyCount) * 100 : 0;

        // Determine risk level
        let risk = 'Low';
        if (efficiency < 50 || complianceRate < 50) risk = 'High';
        else if (efficiency < 75 || complianceRate < 75) risk = 'Medium';

        // Color based on efficiency for heatmap
        let color = '#ef4444'; // Red
        if (efficiency >= 85) color = '#22c55e'; // Green
        else if (efficiency >= 60) color = '#eab308'; // Yellow

        return {
            district: districtName,
            propertyCount,
            totalGenerated,
            totalCollected,
            totalUnpaid,
            efficiency: Math.round(efficiency),
            complianceRate: Math.round(complianceRate),
            risk,
            color
        };
    }).sort((a, b) => b.totalCollected - a.totalCollected); // Sort by collection default

    const activeDistricts = districtStats.filter(d => d.propertyCount > 0);
    const bestPerforming = activeDistricts.sort((a, b) => b.efficiency - a.efficiency)[0] || null;
    const worstPerforming = [...activeDistricts].sort((a, b) => a.efficiency - b.efficiency)[0] || null;
    
    const avgCollectionRate = activeDistricts.length > 0 
        ? activeDistricts.reduce((sum, d) => sum + d.efficiency, 0) / activeDistricts.length
        : 0;

    // Tax Officer Performance
    const officerStatsMap = {};
    properties.forEach(p => {
        if (p.createdBy) {
            const officerId = typeof p.createdBy === 'object' ? p.createdBy._id : p.createdBy;
            if (!officerStatsMap[officerId]) {
                officerStatsMap[officerId] = { district: p.district, revenue: 0, count: 0 };
            }
            officerStatsMap[officerId].count++;
        }
    });

    taxRecords.forEach(r => {
        if ((r.status === 'Paid' || r.status === 'Partially Paid') && r.propertyId) {
            // Find who created the property to attribute the revenue from the properties array
            const propId = r.propertyId && typeof r.propertyId === 'object' ? r.propertyId._id : r.propertyId;
            const prop = properties.find(p => p._id === propId);
            if (prop && prop.createdBy) {
                const officerId = typeof prop.createdBy === 'object' ? prop.createdBy._id : prop.createdBy;
                if (!officerStatsMap[officerId]) {
                    officerStatsMap[officerId] = { district: prop.district, revenue: 0, count: 0 };
                }
                officerStatsMap[officerId].revenue += r.paidAmount || 0;
            }
        }
    });

    const officerStats = Object.entries(officerStatsMap).map(([id, data]) => {
        const officerUser = users.find(u => u._id === id);
        return {
            name: officerUser ? officerUser.name : 'Unknown Officer',
            district: data.district || 'Various',
            revenue: data.revenue
        };
    }).sort((a, b) => b.revenue - a.revenue).slice(0, 10); // Top 10

    // Trend Analysis (Mocked monthly data based on records)
    const trendData = (() => {
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const currentMonth = new Date().getMonth();
        const top3Districts = activeDistricts.slice(0, 3).map(d => d.district);
        const data = [];

        for (let i = 5; i >= 0; i--) {
            const monthIndex = (currentMonth - i + 12) % 12;
            const monthObj = { name: months[monthIndex] };
            
            top3Districts.forEach(dist => {
                const dProps = properties.filter(p => p.district === dist);
                const propertyIds = dProps.map(p => p._id);
                const monthRecords = taxRecords.filter(r => {
                    const recordMonth = new Date(r.createdAt).getMonth();
                    const isFromDist = r.propertyId && propertyIds.includes(typeof r.propertyId === 'object' ? r.propertyId._id : r.propertyId);
                    return recordMonth === monthIndex && isFromDist;
                });
                monthObj[dist] = monthRecords.reduce((acc, curr) => acc + (curr.paidAmount || 0), 0);
            });
            data.push(monthObj);
        }
        return data;
    })();

    // Initialize Map for Heatmap
    useEffect(() => {
        if (!mapRef.current || mapInstanceRef.current || isLoading) return;

        // Dynamic import to avoid SSR issues
        import('leaflet').then((L) => {
            const map = L.map(mapRef.current, {
                center: MOGADISHU_CENTER,
                zoom: 12,
                zoomControl: true,
            });

            L.tileLayer('http://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}', {
                maxZoom: 20, subdomains: ['mt0', 'mt1', 'mt2', 'mt3'], attribution: '© Google Maps'
            }).addTo(map);

            districtStats.forEach(dist => {
                if (MOGADISHU_DISTRICT_CENTERS[dist.district]) {
                    const center = MOGADISHU_DISTRICT_CENTERS[dist.district];
                    const radius = dist.propertyCount > 0 ? Math.max(800, dist.propertyCount * 10) : 500;
                    
                    const circle = L.circle(center, {
                        color: dist.color,
                        fillColor: dist.color,
                        fillOpacity: 0.6,
                        radius: radius
                    }).addTo(map);

                    circle.bindPopup(`
                        <div class="font-sans">
                            <strong class="text-sm">${dist.district}</strong><br/>
                            <span>Efficiency: ${dist.efficiency}%</span><br/>
                            <span>Collected: $${dist.totalCollected.toLocaleString()}</span><br/>
                            <span>Properties: ${dist.propertyCount}</span>
                        </div>
                    `);

                    L.marker(center, {
                        icon: L.divIcon({
                            className: 'bg-white/80 px-2 py-1 rounded shadow-sm text-xs font-bold border border-gray-300 text-center text-gray-800',
                            html: `${dist.district}<br/>${dist.efficiency}%`,
                            iconSize: [null, null]
                        })
                    }).addTo(map);
                }
            });

            mapInstanceRef.current = map;
        });

        return () => {
            if (mapInstanceRef.current) {
                mapInstanceRef.current.remove();
                mapInstanceRef.current = null;
            }
        };
    }, [isLoading, districtStats]);

    if (!user.permissions?.canViewReports) {
        return (
            <div className="text-center bg-red-100 border-l-4 border-red-500 text-red-700 p-6 rounded-lg mt-10">
                <ShieldCheck className="w-8 h-8 mx-auto mb-3" />
                <h2 className="text-xl font-bold">Access Denied</h2>
                <p>You need Super Admin privileges to view District Performance.</p>
            </div>
        );
    }

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-screen">
                <Loader className="w-12 h-12 mx-auto mb-4 animate-spin text-indigo-600" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-3 mb-6">
                <TrendingUp className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
                <h1 className="text-3xl font-bold text-gray-800 dark:text-white">District Performance</h1>
            </div>

            {/* Dashboard Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 p-6 rounded-xl shadow-sm">
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Districts</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white mt-2">{activeDistricts.length} / {BANADIR_DISTRICTS.length}</p>
                    <p className="text-xs text-gray-500 mt-1">Active / Total</p>
                </div>
                <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 border border-green-200 dark:border-green-800 p-6 rounded-xl shadow-sm">
                    <p className="text-sm font-medium text-green-800 dark:text-green-400 flex items-center gap-2"><CheckCircle2 size={16}/> Best Performing</p>
                    <p className="text-2xl font-bold text-green-900 dark:text-white mt-2">{bestPerforming?.district || 'N/A'}</p>
                    <p className="text-sm font-medium text-green-700 dark:text-green-300 mt-1">
                        ${bestPerforming?.totalCollected.toLocaleString()} • {bestPerforming?.efficiency}% Rate
                    </p>
                </div>
                <div className="bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/20 border border-red-200 dark:border-red-800 p-6 rounded-xl shadow-sm">
                    <p className="text-sm font-medium text-red-800 dark:text-red-400 flex items-center gap-2"><AlertTriangle size={16}/> Worst Performing</p>
                    <p className="text-2xl font-bold text-red-900 dark:text-white mt-2">{worstPerforming?.district || 'N/A'}</p>
                    <p className="text-sm font-medium text-red-700 dark:text-red-300 mt-1">
                        ${worstPerforming?.totalCollected.toLocaleString()} • {worstPerforming?.efficiency}% Rate
                    </p>
                </div>
                <div className="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 p-6 rounded-xl shadow-sm">
                    <p className="text-sm font-medium text-indigo-800 dark:text-indigo-400">Average Collection Rate</p>
                    <p className="text-2xl font-bold text-indigo-900 dark:text-white mt-2">{Math.round(avgCollectionRate)}%</p>
                    <div className="w-full bg-indigo-200 dark:bg-indigo-900 rounded-full h-2 mt-3">
                        <div className="bg-indigo-600 h-2 rounded-full" style={{ width: `${avgCollectionRate}%` }}></div>
                    </div>
                </div>
            </div>

            {/* Charts & Map Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Revenue by District Bar Chart */}
                <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 p-6 rounded-xl shadow-sm">
                    <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-4">Revenue by District</h3>
                    <div className="h-72">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={activeDistricts.slice(0, 7)} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                                <XAxis dataKey="district" tick={{fontSize: 12}} />
                                <YAxis tickFormatter={(val) => `$${val/1000}k`} tick={{fontSize: 12}} />
                                <RechartsTooltip formatter={(val) => `$${val.toLocaleString()}`} />
                                <Legend />
                                <Bar dataKey="totalCollected" name="Collected Revenue" fill="#4f46e5" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* District Heatmap */}
                <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 p-6 rounded-xl shadow-sm flex flex-col">
                    <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-4 flex justify-between items-center">
                        District Map Heatmap
                        <div className="flex gap-2 text-xs font-normal">
                            <span className="flex items-center gap-1"><div className="w-3 h-3 bg-green-500 rounded-full"></div> Excellent</span>
                            <span className="flex items-center gap-1"><div className="w-3 h-3 bg-yellow-500 rounded-full"></div> Average</span>
                            <span className="flex items-center gap-1"><div className="w-3 h-3 bg-red-500 rounded-full"></div> Poor</span>
                        </div>
                    </h3>
                    <div className="flex-1 rounded-xl overflow-hidden border border-gray-200 dark:border-slate-700 min-h-[280px] relative">
                        <div ref={mapRef} className="absolute inset-0 z-0"></div>
                    </div>
                </div>
            </div>

            {/* Tables Row 1 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Ranking Table */}
                <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 p-6 rounded-xl shadow-sm overflow-hidden flex flex-col">
                    <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-4">District Ranking</h3>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="text-xs text-gray-500 uppercase bg-gray-50 dark:bg-slate-800/50">
                                <tr>
                                    <th className="px-4 py-3">Rank</th>
                                    <th className="px-4 py-3">District</th>
                                    <th className="px-4 py-3 text-right">Revenue</th>
                                    <th className="px-4 py-3 text-right">Collection Rate</th>
                                </tr>
                            </thead>
                            <tbody>
                                {activeDistricts.slice(0, 6).map((dist, idx) => (
                                    <tr key={dist.district} className="border-b dark:border-slate-800">
                                        <td className="px-4 py-3 font-medium">#{idx + 1}</td>
                                        <td className="px-4 py-3 font-semibold text-gray-900 dark:text-white">{dist.district}</td>
                                        <td className="px-4 py-3 text-right text-indigo-600 dark:text-indigo-400 font-medium">${dist.totalCollected.toLocaleString()}</td>
                                        <td className="px-4 py-3 text-right">
                                            <span className={`px-2 py-1 rounded-full text-xs font-bold ${dist.efficiency >= 85 ? 'bg-green-100 text-green-700' : dist.efficiency >= 60 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}`}>
                                                {dist.efficiency}%
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Unpaid Taxes & Risk */}
                <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 p-6 rounded-xl shadow-sm flex flex-col">
                    <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-4">High Risk Districts</h3>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="text-xs text-gray-500 uppercase bg-gray-50 dark:bg-slate-800/50">
                                <tr>
                                    <th className="px-4 py-3">District</th>
                                    <th className="px-4 py-3 text-right">Unpaid Amount</th>
                                    <th className="px-4 py-3 text-right">Risk Level</th>
                                </tr>
                            </thead>
                            <tbody>
                                {[...activeDistricts].sort((a, b) => b.totalUnpaid - a.totalUnpaid).slice(0, 6).map((dist) => (
                                    <tr key={dist.district} className="border-b dark:border-slate-800">
                                        <td className="px-4 py-3 font-semibold text-gray-900 dark:text-white">{dist.district}</td>
                                        <td className="px-4 py-3 text-right text-red-600 font-medium">${dist.totalUnpaid.toLocaleString()}</td>
                                        <td className="px-4 py-3 text-right">
                                            <span className={`px-2 py-1 rounded text-xs font-bold ${dist.risk === 'High' ? 'bg-red-100 text-red-700 border border-red-200' : dist.risk === 'Medium' ? 'bg-yellow-100 text-yellow-700 border border-yellow-200' : 'bg-green-100 text-green-700 border border-green-200'}`}>
                                                {dist.risk}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Tables Row 2 */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                 {/* Property Coverage */}
                 <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 p-6 rounded-xl shadow-sm">
                    <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-4">Property Coverage</h3>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="text-xs text-gray-500 uppercase bg-gray-50 dark:bg-slate-800/50">
                                <tr>
                                    <th className="px-4 py-3">District</th>
                                    <th className="px-4 py-3 text-right">Properties</th>
                                </tr>
                            </thead>
                            <tbody>
                                {[...activeDistricts].sort((a, b) => b.propertyCount - a.propertyCount).slice(0, 5).map((dist) => (
                                    <tr key={dist.district} className="border-b dark:border-slate-800">
                                        <td className="px-4 py-3 font-semibold text-gray-900 dark:text-white">{dist.district}</td>
                                        <td className="px-4 py-3 text-right font-medium">{dist.propertyCount.toLocaleString()}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Tax Officer Performance */}
                <div className="xl:col-span-2 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 p-6 rounded-xl shadow-sm">
                    <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-4 flex items-center gap-2"><ShieldCheck size={20} className="text-indigo-500"/> Tax Officer Performance</h3>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="text-xs text-gray-500 uppercase bg-gray-50 dark:bg-slate-800/50">
                                <tr>
                                    <th className="px-4 py-3">Officer</th>
                                    <th className="px-4 py-3">Primary District</th>
                                    <th className="px-4 py-3 text-right">Revenue Collected</th>
                                </tr>
                            </thead>
                            <tbody>
                                {officerStats.length > 0 ? officerStats.map((officer, idx) => (
                                    <tr key={idx} className="border-b dark:border-slate-800">
                                        <td className="px-4 py-3 font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                                            <div className="w-6 h-6 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-xs">
                                                {officer.name.charAt(0).toUpperCase()}
                                            </div>
                                            {officer.name}
                                        </td>
                                        <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{officer.district}</td>
                                        <td className="px-4 py-3 text-right text-green-600 font-bold">${officer.revenue.toLocaleString()}</td>
                                    </tr>
                                )) : (
                                    <tr>
                                        <td colSpan="3" className="text-center py-4 text-gray-500">No officer data available</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
            
            {/* Trend Analysis */}
            <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 p-6 rounded-xl shadow-sm">
                <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-4">Trend Analysis (Top 3 Districts)</h3>
                <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={trendData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                            <XAxis dataKey="name" tick={{fontSize: 12}} />
                            <YAxis tickFormatter={(val) => `$${val/1000}k`} tick={{fontSize: 12}} />
                            <RechartsTooltip formatter={(val) => `$${val.toLocaleString()}`} />
                            <Legend />
                            {activeDistricts.slice(0, 3).map((d, i) => (
                                <Line key={d.district} type="monotone" dataKey={d.district} stroke={['#4f46e5', '#10b981', '#f59e0b'][i]} strokeWidth={3} activeDot={{ r: 6 }} />
                            ))}
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </div>

        </div>
    );
}
