import React, { useEffect, useRef, useState, useCallback } from 'react';
import { getMapProperties, updatePropertyPaymentStatus } from '../services/api';
import { useAuth } from '../context/AuthContext.jsx';

// We import Leaflet CSS via useEffect to avoid SSR issues
const MOGADISHU_CENTER = [2.0469, 45.3182];
const DEFAULT_ZOOM = 13; // Slight zoom out to fit more of Banadir
const BANADIR_DISTRICTS = ['Abdiaziz', 'Bondhere', 'Daynile', 'Dharkenley', 'Garasbaley', 'Hamar Jajab', 'Hamar Weyne', 'Heliwa', 'Hodan', 'Howlwadag', 'Kahda', 'Karan', 'Shangani', 'Shibis', 'Waberi', 'Wadajir', 'Wardhigley', 'Yaqshid'].sort();

// Approximate centers for zooming when a specific district is selected but no polygons exist
const MOGADISHU_DISTRICT_CENTERS = {
    'Abdiaziz': [2.040, 45.340], 'Bondhere': [2.040, 45.335], 'Daynile': [2.070, 45.300],
    'Dharkenley': [2.025, 45.295], 'Garasbaley': [2.030, 45.275], 'Hamar Jajab': [2.025, 45.325],
    'Hamar Weyne': [2.035, 45.338], 'Heliwa': [2.080, 45.340], 'Hodan': [2.045, 45.305],
    'Howlwadag': [2.040, 45.320], 'Kahda': [2.015, 45.280], 'Karan': [2.055, 45.360],
    'Shangani': [2.035, 45.342], 'Shibis': [2.045, 45.340], 'Waberi': [2.028, 45.315],
    'Wadajir': [2.020, 45.300], 'Wardhigley': [2.045, 45.325], 'Yaqshid': [2.060, 45.335],
};

export default function MapView() {
    const { user } = useAuth();
    const mapRef = useRef(null);
    const mapInstanceRef = useRef(null);
    const layersRef = useRef([]);
    const labelsRef = useRef([]);

    const [properties, setProperties] = useState([]);
    const [filter, setFilter] = useState('all'); // 'all' | 'paid' | 'unpaid'
    const [districtFilter, setDistrictFilter] = useState(() => {
        if (user?.role === 'Tax Officer' && user?.jurisdiction && user.jurisdiction !== 'All') {
            return user.jurisdiction;
        }
        return 'All';
    }); // 'All' or specific district
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    // Load Leaflet CSS dynamically
    useEffect(() => {
        if (!document.getElementById('leaflet-css')) {
            const link = document.createElement('link');
            link.id = 'leaflet-css';
            link.rel = 'stylesheet';
            link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
            document.head.appendChild(link);
        }
    }, []);

    // Fetch properties
    const fetchProperties = useCallback(async () => {
        try {
            setIsLoading(true);
            setError(null);
            const res = await getMapProperties();
            setProperties(res.data);
        } catch (err) {
            console.error('Failed to load map properties:', err);
            setError('Failed to load properties. Check your connection.');
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchProperties();
    }, [fetchProperties]);

    // Initialize Leaflet map
    useEffect(() => {
        if (!mapRef.current || mapInstanceRef.current) return;

        const initMap = async () => {
            const L = await import('leaflet');

            const map = L.map(mapRef.current, {
                center: MOGADISHU_CENTER,
                zoom: DEFAULT_ZOOM,
                zoomControl: true,
            });

            // Define Base Layers
            const roadmap = L.tileLayer('http://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}', {
                maxZoom: 20, subdomains: ['mt0', 'mt1', 'mt2', 'mt3'], attribution: '© Google Maps'
            });
            const satellite = L.tileLayer('http://{s}.google.com/vt/lyrs=y&x={x}&y={y}&z={z}', {
                maxZoom: 20, subdomains: ['mt0', 'mt1', 'mt2', 'mt3'], attribution: '© Google Maps'
            });
            const terrain = L.tileLayer('http://{s}.google.com/vt/lyrs=p&x={x}&y={y}&z={z}', {
                maxZoom: 20, subdomains: ['mt0', 'mt1', 'mt2', 'mt3'], attribution: '© Google Maps'
            });
            const traffic = L.tileLayer('http://{s}.google.com/vt/lyrs=m,traffic&x={x}&y={y}&z={z}', {
                maxZoom: 20, subdomains: ['mt0', 'mt1', 'mt2', 'mt3'], attribution: '© Google Maps Live Traffic'
            });

            roadmap.addTo(map);

            const baseMaps = {
                "🛣️ Roadmap (Standard)": roadmap,
                "🛰️ Satellite (Hybrid)": satellite,
                "⛰️ Terrain & Elevation": terrain,
                "🚗 Live Traffic": traffic
            };

            L.control.layers(baseMaps, null, { position: 'topright', collapsed: false }).addTo(map);

            mapInstanceRef.current = map;
        };

        initMap();

        return () => {
            if (mapInstanceRef.current) {
                mapInstanceRef.current.remove();
                mapInstanceRef.current = null;
            }
        };
    }, []);

    // Render polygons whenever properties or filter changes
    useEffect(() => {
        const renderPolygons = async () => {
            const map = mapInstanceRef.current;
            if (!map) return;

            const L = await import('leaflet');

            // Clear previous layers and labels
            layersRef.current.forEach(layer => map.removeLayer(layer));
            labelsRef.current.forEach(label => map.removeLayer(label));
            layersRef.current = [];
            labelsRef.current = [];

            const filtered = properties.filter(p => {
                // Apply Payment Filter
                let statMatch = true;
                if (filter === 'paid') statMatch = p.paymentStatus === 'paid';
                if (filter === 'unpaid') statMatch = p.paymentStatus === 'unpaid';

                // Apply District Filter
                let distMatch = true;
                if (districtFilter !== 'All') {
                    distMatch = p.district && p.district.toLowerCase() === districtFilter.toLowerCase();
                }

                return statMatch && distMatch;
            });

            const bounds = L.latLngBounds();
            let hasValidBounds = false;

            filtered.forEach((property) => {
                const isPaid = property.paymentStatus === 'paid';
                const mainColor = isPaid ? '#22c55e' : '#ef4444'; // solid green : solid red

                const hasPolygon = property.mapPolygon &&
                    property.mapPolygon.coordinates &&
                    property.mapPolygon.coordinates.length > 0 &&
                    property.mapPolygon.coordinates[0].length >= 3;

                if (hasPolygon) {
                    // GeoJSON uses [lng, lat], Leaflet uses [lat, lng]
                    const latLngs = property.mapPolygon.coordinates[0].map(
                        ([lng, lat]) => [lat, lng]
                    );

                    const polygon = L.polygon(latLngs, {
                        color: mainColor,
                        fillColor: mainColor,
                        fillOpacity: 0.55,
                        weight: 2,
                    });

                    // React styles for HTML popup
                    const bgColor = mainColor;
                    const pillBgColor = isPaid ? '#bbf7d0' : '#fee2e2';

                    // Popup content
                    const ownerName = property.ownerId?.name || 'Unknown Owner';
                    const id = property.taxAccountNumber || property._id.substring(0, 8);
                    const taxAmount = property.calculatedTax
                        ? `$${Number(property.calculatedTax).toLocaleString()}`
                        : 'Not calculated';

                    polygon.bindPopup(`
                        <div style="min-width:200px;font-family:system-ui,sans-serif">
                            <div style="background:${bgColor};color:white;padding:8px 12px;border-radius:6px 6px 0 0;margin:-1px -1px 8px">
                                <strong style="font-size:13px">${property.address || 'No address'}</strong>
                            </div>
                            <table style="width:100%;font-size:12px;border-collapse:collapse">
                                <tr><td style="color:#6b7280;padding:3px 0">ID</td><td style="font-weight:600;font-family:monospace">${id}</td></tr>
                                <tr><td style="color:#6b7280;padding:3px 0">Owner</td><td style="font-weight:600">${ownerName}</td></tr>
                                <tr><td style="color:#6b7280;padding:3px 0">District</td><td style="font-weight:600">${property.district || '-'}</td></tr>
                                <tr><td style="color:#6b7280;padding:3px 0">Type</td><td style="font-weight:600">${property.buildingType || property.propertyType || '-'}</td></tr>
                                <tr><td style="color:#6b7280;padding:3px 0">Tax</td><td style="font-weight:600;color:#4f46e5">${taxAmount}</td></tr>
                                <tr><td style="color:#6b7280;padding:3px 0">Status</td>
                                    <td><span style="background:${pillBgColor};color:${bgColor};padding:2px 8px;border-radius:99px;font-weight:700;font-size:11px;border:1px solid ${bgColor}">
                                        ${isPaid ? '✓ Paid' : '✗ Unpaid'}
                                    </span></td>
                                </tr>
                            </table>
                        </div>
                    `, { maxWidth: 280 });

                    polygon.addTo(map);
                    layersRef.current.push(polygon);

                    // House number label at center
                    const center = polygon.getBounds().getCenter();
                    const shortId = property.taxAccountNumber
                        ? property.taxAccountNumber.split('-').pop()
                        : property._id.substring(0, 4).toUpperCase();

                    const label = L.marker(center, {
                        icon: L.divIcon({
                            className: '',
                            html: `<div style="
                                background:${bgColor};
                                color:white;
                                padding:2px 6px;
                                border-radius:4px;
                                font-size:10px;
                                font-weight:700;
                                font-family:monospace;
                                white-space:nowrap;
                                box-shadow:0 1px 4px rgba(0,0,0,0.3);
                                border:1px solid rgba(255,255,255,0.4);
                                pointer-events:none;
                            ">${shortId}</div>`,
                            iconSize: [null, null],
                            iconAnchor: [0, 0],
                        }),
                    });
                    label.addTo(map);
                    labelsRef.current.push(label);

                    // Extend bounds to zoom
                    bounds.extend(polygon.getBounds());
                    hasValidBounds = true;

                } else {
                    // No polygon — show a circle marker instead
                    const marker = L.circleMarker(MOGADISHU_CENTER, {
                        radius: 8,
                        color: mainColor,
                        fillColor: mainColor,
                        fillOpacity: 0.55,
                        weight: 2,
                    });

                    const ownerName = property.ownerId?.name || 'Unknown Owner';
                    marker.bindPopup(`
                        <div style="font-family:system-ui,sans-serif;font-size:12px;padding:4px">
                            <strong>${property.address || 'No address'}</strong><br/>
                            <span style="color:#6b7280">Owner: ${ownerName}</span><br/>
                            <span style="color:#6b7280">District: ${property.district || '-'}</span><br/>
                            <em style="color:#f59e0b;font-size:11px">⚠ No map boundary drawn</em>
                        </div>
                    `);
                    marker.addTo(map);
                    layersRef.current.push(marker);
                }
            });

            // Adjust view based on mapped properties or selected district
            if (hasValidBounds) {
                map.fitBounds(bounds, { padding: [40, 40], maxZoom: 16 });
            } else if (districtFilter !== 'All') {
                const center = MOGADISHU_DISTRICT_CENTERS[districtFilter] || MOGADISHU_CENTER;
                map.setView(center, 14);
            } else {
                map.setView(MOGADISHU_CENTER, DEFAULT_ZOOM);
            }
        };

        if (!isLoading) {
            renderPolygons();
        }
    }, [properties, filter, districtFilter, isLoading]);

    // Derive stats dynamically based purely on current district selection
    const displayedProperties = properties.filter(p => districtFilter === 'All' || (p.district && p.district.toLowerCase() === districtFilter.toLowerCase()));
    const total = displayedProperties.length;
    const paid = displayedProperties.filter(p => p.paymentStatus === 'paid').length;
    const unpaid = total - paid;
    const withMap = displayedProperties.filter(p => p.mapPolygon && p.mapPolygon.coordinates && p.mapPolygon.coordinates.length > 0).length;

    return (
        <div className="flex flex-col gap-4 h-full">

            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
                        🗺️ Property Map
                    </h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                        View all registered properties on the map — green = paid, red = unpaid
                    </p>
                </div>
                <button
                    onClick={fetchProperties}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-xl transition-all flex items-center gap-2 shadow-md"
                >
                    ↺ Refresh Map
                </button>
            </div>

            {/* Stats Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <StatCard label="Total Properties" value={total} color="indigo" />
                <StatCard label="Paid" value={paid} color="green" />
                <StatCard label="Unpaid" value={unpaid} color="red" />
                <StatCard label="On Map" value={withMap} color="purple" />
            </div>

            {/* Filter Buttons & Tools */}
            <div className="flex gap-4 flex-wrap items-center justify-between">
                <div className="flex gap-2 flex-wrap items-center">
                    <FilterBtn active={filter === 'all'} onClick={() => setFilter('all')} color="gray">
                        🗺️ Show All ({total})
                    </FilterBtn>
                    <FilterBtn active={filter === 'paid'} onClick={() => setFilter('paid')} color="green">
                        🟢 Paid ({paid})
                    </FilterBtn>
                    <FilterBtn active={filter === 'unpaid'} onClick={() => setFilter('unpaid')} color="red">
                        🔴 Unpaid ({unpaid})
                    </FilterBtn>
                </div>

                <div className="flex items-center gap-2">
                    <label htmlFor="district-filter" className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                        📍 Region Area:
                    </label>
                    <div className="relative">
                        <select
                            id="district-filter"
                            value={districtFilter}
                            onChange={(e) => setDistrictFilter(e.target.value)}
                            disabled={user?.role === 'Tax Officer' && user?.jurisdiction && user.jurisdiction !== 'All'}
                            className={`appearance-none bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 outline-none text-gray-700 dark:text-gray-200 text-sm font-semibold rounded-xl pl-4 pr-10 py-2 focus:ring-2 focus:ring-indigo-500/50 shadow-sm transition-all ${(user?.role === 'Tax Officer' && user?.jurisdiction && user.jurisdiction !== 'All') ? 'opacity-70 cursor-not-allowed' : ''}`}
                        >
                            <option value="All">All Districts (Banadir)</option>
                            {BANADIR_DISTRICTS.map(dist => (
                                <option key={dist} value={dist}>{dist}</option>
                            ))}
                        </select>
                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-gray-500">
                            <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" /></svg>
                        </div>
                    </div>
                </div>
            </div>

            {/* Map Container */}
            <div className="relative rounded-2xl overflow-hidden shadow-xl border border-gray-200 dark:border-slate-700 flex-1" style={{ minHeight: '520px' }}>
                {isLoading && (
                    <div className="absolute inset-0 bg-white/80 dark:bg-slate-900/80 z-20 flex items-center justify-center">
                        <div className="text-center">
                            <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                            <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">Loading map data...</p>
                        </div>
                    </div>
                )}
                {error && (
                    <div className="absolute inset-0 bg-white/90 dark:bg-slate-900/90 z-20 flex items-center justify-center">
                        <div className="text-center">
                            <p className="text-red-500 font-medium mb-3">{error}</p>
                            <button onClick={fetchProperties} className="px-4 py-2 bg-red-100 text-red-600 rounded-lg text-sm font-medium">
                                Try Again
                            </button>
                        </div>
                    </div>
                )}

                {/* Legend */}
                <div className="absolute top-4 right-4 z-[400] bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-gray-200 dark:border-slate-700 p-3 min-w-[140px]">
                    <p className="text-xs font-bold text-gray-700 dark:text-gray-200 mb-2 uppercase tracking-wide">Legend</p>
                    <div className="flex items-center gap-2 mb-1.5">
                        <div className="w-4 h-4 rounded bg-green-200 border-2 border-green-500 flex-shrink-0" />
                        <span className="text-xs text-gray-600 dark:text-gray-300 font-medium">Tax Paid</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded bg-red-200 border-2 border-red-500 flex-shrink-0" />
                        <span className="text-xs text-gray-600 dark:text-gray-300 font-medium">Tax Unpaid</span>
                    </div>
                </div>

                <div ref={mapRef} style={{ width: '100%', height: '100%', minHeight: '520px' }} />
            </div>

            {/* Properties without map boundary */}
            {total > withMap && (
                <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4">
                    <p className="text-sm text-amber-700 dark:text-amber-400 font-medium">
                        ⚠️ {total - withMap} propert{total - withMap > 1 ? 'ies have' : 'y has'} no map boundary drawn yet.
                        Draw boundaries when registering new properties.
                    </p>
                </div>
            )}
        </div>
    );
}

function StatCard({ label, value, color }) {
    const colors = {
        indigo: 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800',
        green: 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800',
        red: 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800',
        purple: 'bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800',
    };
    return (
        <div className={`rounded-xl border p-3 ${colors[color]}`}>
            <p className="text-2xl font-bold">{value}</p>
            <p className="text-xs font-medium opacity-80 mt-0.5">{label}</p>
        </div>
    );
}

function FilterBtn({ active, onClick, color, children }) {
    const activeColors = {
        gray: 'bg-gray-800 text-white',
        green: 'bg-green-600 text-white',
        red: 'bg-red-600 text-white',
    };
    return (
        <button
            onClick={onClick}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all border ${
                active
                    ? `${activeColors[color]} border-transparent shadow-md`
                    : 'bg-white dark:bg-slate-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-slate-700 hover:border-gray-300 dark:hover:border-slate-600'
            }`}
        >
            {children}
        </button>
    );
}
