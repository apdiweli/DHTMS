import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import {
    Home, Search, Filter, FileText, Trash2, Edit, X, Printer, Send,
    MapPin, Building, PlusCircle, DollarSign, CheckSquare, Square,
    Users, Layers, AlertCircle, Ruler, Calendar, Hash, Eye
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { getProperties, createProperty, updateProperty, getOwners, deleteProperty, generateTaxRecord, calculatePropertyTax, getTransferHistoryByProperty, getTaxRecordsByProperty } from '../services/api';

// --- CONSTANTS ---
const MOGADISHU_DISTRICTS = [
    "Abdalaziz", "Bondhere", "Daynile", "Dharkenley", "Hamar Jajab",
    "Hamar Weyne", "Hodan", "Howlwadag", "Huriwa", "Karaan",
    "Shangani", "Shibis", "Waberi", "Wadajir", "Wardhigley", "Yaqshid"
];

// Approximate centers for zooming when a specific district is selected but no polygons exist
const MOGADISHU_DISTRICT_CENTERS = {
    'Abdalaziz': [2.040, 45.340], 'Bondhere': [2.040, 45.335], 'Daynile': [2.070, 45.300],
    'Dharkenley': [2.025, 45.295], 'Hamar Jajab': [2.025, 45.325],
    'Hamar Weyne': [2.035, 45.338], 'Huriwa': [2.080, 45.340], 'Hodan': [2.045, 45.305],
    'Howlwadag': [2.040, 45.320], 'Karaan': [2.055, 45.360],
    'Shangani': [2.035, 45.342], 'Shibis': [2.045, 45.340], 'Waberi': [2.028, 45.315],
    'Wadajir': [2.020, 45.300], 'Wardhigley': [2.045, 45.325], 'Yaqshid': [2.060, 45.335],
};

export default function Properties() {
    const { user } = useAuth();
    const [properties, setProperties] = useState([]);
    const [owners, setOwners] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    // --- STATES ---
    const [isRegisterOpen, setIsRegisterOpen] = useState(false);
    const [selectedProperty, setSelectedProperty] = useState(null);
    const [taxInvoice, setTaxInvoice] = useState(null);
    const [selectedIds, setSelectedIds] = useState([]);
    const [editingPropertyId, setEditingPropertyId] = useState(null);
    const [propertyDetailTab, setPropertyDetailTab] = useState('info'); // 'info' | 'history' | 'documents' | 'taxes'
    const [transferHistory, setTransferHistory] = useState([]);
    const [loadingHistory, setLoadingHistory] = useState(false);
    const [propertyTaxes, setPropertyTaxes] = useState([]);
    const [loadingTaxes, setLoadingTaxes] = useState(false);

    // Form State
    const initialFormState = {
        autoId: '', // Visual only
        ownerId: '',
        address: '',
        district: (user?.role === 'Tax Officer' && user?.jurisdiction && user.jurisdiction !== 'All') ? user.jurisdiction : 'Hodan',
        zone: '', // Added zone
        category: 'Residential',
        type: 'Villa',
        floor: '',
        size: '',
        year: '',
        value: '',
        // Apartment-specific fields
        floors: '',
        unitsPerFloor: '',
        totalUnits: 0,
        // File Uploads
        documents: {
            titleDeed: null,
            passportImage: null
        }
    };
    const [formData, setFormData] = useState(initialFormState);
    const [drawnPolygon, setDrawnPolygon] = useState(null); // GeoJSON polygon coordinates

    // Fetch Data on Mount
    useEffect(() => {
        fetchData();
    }, []);

    // Auto-refresh when page becomes visible (e.g., after recalculating taxes)
    useEffect(() => {
        const handleVisibilityChange = () => {
            if (!document.hidden) {
                fetchData(); // Refresh data when tab becomes visible
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
    }, []);

    // --- DEEP LINKING ---
    const location = useLocation();
    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const searchId = params.get('id');
        if (searchId && properties.length > 0) {
            const found = properties.find(p => p._id === searchId || p.id === searchId);
            if (found) {
                setSelectedProperty(found);
            }
        }

        // Handle Action
        if (params.get('action') === 'register') {
            setIsRegisterOpen(true);
        }
    }, [location.search, properties]);

    const fetchData = async () => {
        try {
            setIsLoading(true);
            const [propsRes, ownersRes] = await Promise.all([getProperties(), getOwners()]);
            setProperties(propsRes.data);
            setOwners(ownersRes.data);
        } catch (error) {
            console.error("Error fetching data:", error);
        } finally {
            setIsLoading(false);
        }
    };

    // --- HELPERS ---

    // Generate Auto ID based on District and Count
    const generateAutoId = (district) => {
        const prefix = district ? district.substring(0, 3).toUpperCase() : 'XXX';
        const randomNum = Math.floor(1000 + Math.random() * 9000); // 4 digit random
        return `MOG-${prefix}-${randomNum}`;
    };

    // Update Auto ID when district changes
    useEffect(() => {
        if (isRegisterOpen) {
            setFormData(prev => ({
                ...prev,
                autoId: generateAutoId(prev.district)
            }));
        }
    }, [formData.district, isRegisterOpen]);

    // Calculate total units when floors or unitsPerFloor change
    useEffect(() => {
        if (formData.type === 'Apartment' && formData.floors && formData.unitsPerFloor) {
            const total = Number(formData.floors) * Number(formData.unitsPerFloor);
            setFormData(prev => ({
                ...prev,
                totalUnits: total
            }));
        }
    }, [formData.floors, formData.unitsPerFloor, formData.type]);

    // --- HANDLERS ---
    
    const handleEditClick = (p) => {
        setFormData({
            autoId: p.taxAccountNumber || p.id || '',
            ownerId: p.ownerId._id || p.ownerId,
            address: p.address,
            district: p.district,
            zone: p.zone || '',
            category: p.propertyType,
            type: p.buildingType,
            floor: p.structureDetails?.floors || '',
            size: p.landDetails?.totalAreaSqm || p.structureDetails?.totalFloorArea || '',
            year: p.year || '',
            value: p.value || '',
            floors: p.structureDetails?.floors || '',
            unitsPerFloor: p.structureDetails?.unitsPerFloor || '',
            totalUnits: p.structureDetails?.totalUnits || 0,
            documents: { titleDeed: null, passportImage: null }
        });
        setDrawnPolygon(p.mapPolygon?.coordinates?.[0] || null);
        setEditingPropertyId(p._id);
        setIsRegisterOpen(true);
    };

    const handleDelete = async (id) => {
        if (window.confirm('Are you sure? This action cannot be undone.')) {
            try {
                await deleteProperty(id);
                setProperties(properties.filter(p => p._id !== id)); // Use _id for MongoDB
                setSelectedIds(selectedIds.filter(selectedId => selectedId !== id));
            } catch (error) {
                console.error("Error deleting property:", error);
                alert("Failed to delete property");
            }
        }
    };

    const handleToggleStatus = (id) => {
        // Implement update status API call here if needed
        setProperties(properties.map(p =>
            p._id === id ? { ...p, status: p.status === 'Active' ? 'Inactive' : 'Active' } : p
        ));
    };

    // Generate Single Bill (Dynamic from Backend)
    const handleGenerateTax = async (property) => {
        try {
            // Fetch real-time tax calculation from backend
            const response = await calculatePropertyTax(property._id);
            const { amount, breakdown } = response.data;

            setTaxInvoice({
                ...property,
                rate: breakdown.rate || 0,
                amount,
                count: 1,
                items: [property],
                ruleName: breakdown.rule,
                breakdown: breakdown.details
            });
        } catch (error) {
            console.error("Failed to fetch real-time tax calculation:", error);
            // Fallback to stored values if API call fails
            const amount = property.calculatedTax || 0;
            const details = property.taxDetails || {};

            setTaxInvoice({
                ...property,
                rate: details.rate || 0,
                amount,
                count: 1,
                items: [property],
                ruleName: details.rule,
                breakdown: details.breakdown
            });
        }
    };

    // Generate Bulk Bills (Improved Logic to use Backend Data)
    const handleBulkGenerate = () => {
        const selectedProps = properties.filter(p => selectedIds.includes(p._id));
        const totalValue = selectedProps.reduce((sum, p) => sum + (p.calculatedTax || 0), 0); // Sum Tax, not Value

        // Analyze distinct districts
        const uniqueDistricts = [...new Set(selectedProps.map(p => p.district))];
        const uniqueOwners = [...new Set(selectedProps.map(p => {
            // Handle populated owner object or ID
            const oId = p.ownerId && p.ownerId._id ? p.ownerId._id : p.ownerId;
            const owner = owners.find(o => o._id === oId);
            // Or if populated name exists
            if (p.ownerId && p.ownerId.name) return p.ownerId.name;
            return owner ? owner.name : 'Unknown';
        }))];

        let districtLabel = 'Mixed Locations';
        if (uniqueDistricts.length === 1) districtLabel = uniqueDistricts[0];
        else if (uniqueDistricts.length <= 3) districtLabel = uniqueDistricts.join(', ');

        let ownerLabel = 'Various Owners';
        if (uniqueOwners.length === 1) ownerLabel = uniqueOwners[0];

        setTaxInvoice({
            address: uniqueDistricts.length === 1 ? `Properties in ${uniqueDistricts[0]}` : 'Multiple Locations',
            owner: ownerLabel,
            type: 'Consolidated Bill',
            district: districtLabel,
            value: selectedProps.reduce((sum, p) => sum + p.value, 0), // Total Property Value
            rate: 0, // Variable rates
            amount: totalValue, // Total Tax
            count: selectedProps.length,
            items: selectedProps
        });
    };

    // Selection Logic
    const toggleSelectAll = () => {
        if (selectedIds.length === properties.length) setSelectedIds([]);
        else setSelectedIds(properties.map(p => p._id));
    };

    const toggleSelectRow = (id) => {
        if (selectedIds.includes(id)) setSelectedIds(selectedIds.filter(item => item !== id));
        else setSelectedIds([...selectedIds, id]);
    };

    // Form Submission
    const handleRegisterSubmit = async (e) => {
        e.preventDefault();
        try {
            if (editingPropertyId) {
                const payload = {
                    ownerId: formData.ownerId,
                    address: formData.address,
                    district: formData.district,
                    zone: formData.zone,
                    propertyType: formData.category,
                    buildingType: formData.type,
                    value: Number(formData.value),
                    landDetails: {
                        totalAreaSqm: Number(formData.size),
                        landCount: Math.ceil(Number(formData.size) / 300) || 1
                    },
                    structureDetails: {
                        totalFloorArea: Number(formData.size),
                        floors: formData.type === 'Apartment' && formData.floors ? Number(formData.floors) : 1,
                        unitsPerFloor: formData.type === 'Apartment' && formData.unitsPerFloor ? Number(formData.unitsPerFloor) : 1,
                        totalUnits: formData.type === 'Apartment' && formData.totalUnits ? Number(formData.totalUnits) : 1
                    }
                };
                if (drawnPolygon) {
                    payload.mapPolygon = {
                        type: 'Polygon',
                        coordinates: [drawnPolygon]
                    };
                }
                const response = await updateProperty(editingPropertyId, payload);
                setProperties(properties.map(p => p._id === editingPropertyId ? response.data : p));
                setIsRegisterOpen(false);
                setFormData(initialFormState);
                setEditingPropertyId(null);
                setDrawnPolygon(null);
                alert("Property updated successfully!");
                return;
            }

            // Use FormData for file uploads
            const data = new FormData();

            // Append regular fields
            Object.keys(formData).forEach(key => {
                if (key !== 'documents') data.append(key, formData[key]);
            });

            // Append Backend-specific fields
            data.append('id', formData.autoId);
            data.append('status', 'Active');
            data.append('zone', formData.zone);
            data.append('value', Number(formData.value));
            data.append('propertyType', formData.category);
            data.append('buildingType', formData.type);

            // Append Structure/Land Details as JSON strings (since FormData is flat)
            // Note: Backend might need to parse these if they are strings, but usually we send flattened or handle JSON.
            // Simplified approach: Send raw fields and let backend construct if needed, OR send JSON string and parse in backend.
            // Backend propertyController expects body.landDetails to be object. express.json handle it but multer handling multipart? 
            // Multer populates req.body with text fields. We need to make sure complex objects are handled.
            // Best practice for complex objects with multer: JSON.stringify

            data.append('landDetails', JSON.stringify({
                totalAreaSqm: Number(formData.size),
                landCount: Math.ceil(Number(formData.size) / 300) || 1
            }));

            data.append('structureDetails', JSON.stringify({
                totalFloorArea: Number(formData.size),
                floors: formData.type === 'Apartment' && formData.floors ? Number(formData.floors) : 1,
                unitsPerFloor: formData.type === 'Apartment' && formData.unitsPerFloor ? Number(formData.unitsPerFloor) : 1,
                totalUnits: formData.type === 'Apartment' && formData.totalUnits ? Number(formData.totalUnits) : 1
            }));

            // Append Files
            if (formData.documents.titleDeed) {
                data.append('titleDeed', formData.documents.titleDeed);
            }
            if (formData.documents.passportImage) {
                data.append('passportImage', formData.documents.passportImage);
            }

            // Append polygon if drawn
            if (drawnPolygon) {
                data.append('mapPolygon', JSON.stringify({
                    type: 'Polygon',
                    coordinates: [drawnPolygon] // GeoJSON: first ring
                }));
            }

            const response = await createProperty(data);
            setProperties([response.data, ...properties]);
            setIsRegisterOpen(false);
            setFormData(initialFormState);
            setDrawnPolygon(null);
            alert("Property created successfully!");
        } catch (error) {
            console.error("Error saving property:", error);
            alert("Failed to save property. " + (error.response?.data?.message || error.message));
        }
    };

    // Confirm and Save Bill
    const handleConfirmBill = async () => {
        if (!taxInvoice) return;

        try {
            // For bulk or single
            const promises = taxInvoice.items.map(item => {
                return generateTaxRecord({
                    propertyId: item._id, // Backend expects propertyId
                    year: new Date().getFullYear()
                });
            });

            await Promise.all(promises);

            alert(`Successfully generated ${promises.length} Tax Bills!`);
            setTaxInvoice(null);
            setSelectedIds([]); // Clear selection after processing

            // Refresh the property list to show updated status
            await fetchData();
        } catch (error) {
            console.error("Error generating tax bills:", error);
            const errMsg = error.response?.data?.error || error.message || "Failed to save tax records.";
            alert(errMsg);
        }
    };

    // Helper to get owner name (Handles Populated Objects or IDs)
    const getOwnerName = (ownerId) => {
        if (!ownerId) return 'Unknown';
        if (ownerId && ownerId.name) return ownerId.name; // Handle populated object

        const owner = owners.find(o => o._id === ownerId);
        return owner ? owner.name : 'Unknown';
    };

    // Fetch transfer history for a property
    const handleOpenPropertyDetail = async (property) => {
        setSelectedProperty(property);
        setPropertyDetailTab('info');
        setTransferHistory([]);
    };

    const handleSwitchToHistory = async (propertyId) => {
        setPropertyDetailTab('history');
        setTransferHistory([]);
        try {
            setLoadingHistory(true);
            const res = await getTransferHistoryByProperty(propertyId);
            setTransferHistory(res.data?.data || res.data || []);
        } catch (err) {
            console.error('Failed to load transfer history:', err);
        } finally {
            setLoadingHistory(false);
        }
    };

    const handleSwitchToTaxes = async (propertyId) => {
        setPropertyDetailTab('taxes');
        setPropertyTaxes([]);
        try {
            setLoadingTaxes(true);
            const res = await getTaxRecordsByProperty(propertyId);
            setPropertyTaxes(res.data?.data || res.data || []);
        } catch (err) {
            console.error('Failed to load tax records:', err);
        } finally {
            setLoadingTaxes(false);
        }
    };

    return (
        <div className="space-y-6">
            {/* Header Area */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Property Registry</h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Manage real estate assets, owners, and tax status.</p>
                </div>

                <div className="flex gap-3">
                    {selectedIds.length > 0 && (
                        <button
                            onClick={handleBulkGenerate}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-xl font-medium shadow-md transition-all flex items-center gap-2 animate-in fade-in"
                        >
                            <Layers size={18} />
                            Generate Bill for {selectedIds.length} Houses
                        </button>
                    )}

                    <button
                        onClick={() => setIsRegisterOpen(true)}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl font-medium shadow-lg shadow-indigo-200 dark:shadow-indigo-900/40 transition-all flex items-center gap-2"
                    >
                        <PlusCircle size={18} /> Register Property
                    </button>
                </div>
            </div>

            {/* Main Table Card */}
            <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl shadow-sm overflow-hidden transition-colors">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50/50 dark:bg-slate-800/50 border-b border-gray-100 dark:border-slate-800 text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400 font-semibold">
                                <th className="p-4 w-12 text-center">
                                    <button onClick={toggleSelectAll} className="text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400">
                                        {selectedIds.length === properties.length && properties.length > 0 ? <CheckSquare size={18} /> : <Square size={18} />}
                                    </button>
                                </th>
                                <th className="p-4">Property Info</th>
                                <th className="p-4">Owner</th>
                                <th className="p-4">Details</th>
                                <th className="p-4 text-right">Value</th>
                                <th className="p-4 text-center">Status</th>
                                <th className="p-4 text-center">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                            {properties.map((p) => (
                                <tr key={p._id} className={`group transition-colors ${selectedIds.includes(p._id) ? 'bg-indigo-50/30 dark:bg-indigo-900/20' : 'hover:bg-gray-50 dark:hover:bg-slate-800/30'}`}>
                                    <td className="p-4 text-center">
                                        <button onClick={() => toggleSelectRow(p._id)} className={`${selectedIds.includes(p._id) ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-300 dark:text-slate-600 hover:text-gray-500 dark:hover:text-slate-400'}`}>
                                            {selectedIds.includes(p._id) ? <CheckSquare size={18} /> : <Square size={18} />}
                                        </button>
                                    </td>
                                    <td className="p-4">
                                        <div className="flex items-center gap-3">
                                            <div className={`p-2 rounded-lg ${p.category === 'Residential' ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400' : 'bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400'}`}>
                                                <Building size={20} />
                                            </div>
                                            <div>
                                                <p className="font-semibold text-gray-800 dark:text-gray-200 text-sm">{p.address}</p>
                                                <p className="text-xs text-gray-400 dark:text-gray-500 font-mono flex items-center gap-1">
                                                    <MapPin size={10} /> {p.district} • Zone: {p.zone || '-'} • {p.id || p._id.substring(0, 8)}
                                                </p>
                                                {p.taxAccountNumber ? (
                                                    <span className="text-[10px] bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-1.5 py-0.5 rounded border border-green-200 dark:border-green-900/50 ml-1">Tax Generated</span>
                                                ) : (
                                                    <span className="text-[10px] bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 px-1.5 py-0.5 rounded border border-yellow-200 dark:border-yellow-900/50 ml-1">Pending Tax</span>
                                                )}
                                            </div>
                                        </div>
                                    </td>
                                    <td className="p-4 text-sm text-gray-600 dark:text-gray-400">{getOwnerName(p.ownerId)}</td>
                                    <td className="p-4 text-xs text-gray-500 dark:text-gray-500 space-y-1">
                                        <span className="block font-medium text-gray-700 dark:text-gray-300">{p.type}</span>
                                        <span className="flex items-center gap-1"><Ruler size={10} /> {p.landDetails?.totalAreaSqm || p.structureDetails?.totalFloorArea || 0} m²</span>
                                    </td>
                                    <td className="p-4 text-sm text-gray-800 dark:text-gray-200 text-right font-medium">
                                        ${p.value.toLocaleString()}
                                    </td>
                                    <td className="p-4 text-center">
                                        <button onClick={() => handleToggleStatus(p._id)}>
                                            {p.status === 'Active' ? (
                                                <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 px-2 py-1 rounded-full border border-emerald-100 dark:border-emerald-900/30">Active</span>
                                            ) : (
                                                <span className="text-xs font-medium text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-slate-800 px-2 py-1 rounded-full border border-gray-200 dark:border-slate-700">Inactive</span>
                                            )}
                                        </button>
                                    </td>
                                    <td className="p-4 text-center">
                                        <div className="flex items-center justify-center gap-2">
                                            <button onClick={() => handleGenerateTax(p)} title="Generate Bill" className="p-1.5 text-gray-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-md">
                                                <Printer size={16} />
                                            </button>
                                            <button onClick={() => handleOpenPropertyDetail(p)} title="View Info" className="p-1.5 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-md">
                                                <FileText size={16} />
                                            </button>
                                            <button onClick={() => handleEditClick(p)} title="Edit" className="p-1.5 text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-md">
                                                <Edit size={16} />
                                            </button>
                                            <button onClick={() => handleDelete(p._id)} title="Delete" className="p-1.5 text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md">
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* --- UPGRADED REGISTRATION MODAL --- */}
            {isRegisterOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-5xl overflow-hidden min-h-[85vh] max-h-[95vh] overflow-y-auto">
                        <div className="px-6 py-4 border-b border-gray-100 dark:border-slate-800 flex justify-between items-center bg-gray-50 dark:bg-slate-800/50">
                            <div>
                                <h3 className="font-bold text-gray-800 dark:text-white text-lg">{editingPropertyId ? 'Edit Property' : 'Register New Property'}</h3>
                                <p className="text-xs text-gray-500 dark:text-gray-400">All fields marked with * are mandatory</p>
                            </div>
                            <button onClick={() => { setIsRegisterOpen(false); setEditingPropertyId(null); setFormData(initialFormState); setDrawnPolygon(null); }}><X size={20} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300" /></button>
                        </div>

                        <form onSubmit={handleRegisterSubmit} className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">

                            {/* Col 1: Identification */}
                            <div className="space-y-4">
                                <h4 className="text-xs font-bold text-indigo-500 uppercase tracking-wider flex items-center gap-1">
                                    <MapPin size={12} /> Location & ID
                                </h4>

                                {/* AUTO_NO INPUT (First Input) */}
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Auto_No (Property ID)</label>
                                    <div className="relative">
                                        <Hash className="absolute left-3 top-2.5 text-gray-400" size={14} />
                                        <input
                                            type="text"
                                            readOnly
                                            value={formData.autoId}
                                            className="w-full pl-9 p-2 border border-gray-200 dark:border-slate-700 bg-gray-100 dark:bg-slate-800 text-gray-500 dark:text-gray-400 rounded-lg text-sm cursor-not-allowed font-mono"
                                        />
                                    </div>
                                    <p className="text-[10px] text-gray-400 mt-1">Automatically generated based on district.</p>
                                </div>

                                <div>
                                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">District *</label>
                                    <select
                                        required
                                        value={formData.district}
                                        onChange={e => setFormData({ ...formData, district: e.target.value })}
                                        disabled={user?.role === 'Tax Officer' && user?.jurisdiction && user.jurisdiction !== 'All'}
                                        className={`w-full p-2 border border-gray-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-gray-800 dark:text-gray-200 text-sm focus:ring-2 focus:ring-indigo-500 ${(user?.role === 'Tax Officer' && user?.jurisdiction && user.jurisdiction !== 'All') ? 'opacity-70 cursor-not-allowed' : ''}`}
                                    >
                                        {MOGADISHU_DISTRICTS.map(d => <option key={d} value={d}>{d}</option>)}
                                    </select>
                                    {user?.role === 'Tax Officer' && user?.jurisdiction && user.jurisdiction !== 'All' && (
                                        <p className="text-[10px] text-indigo-500 mt-1 font-medium">Locked to your assigned district: {user.jurisdiction}</p>
                                    )}
                                </div>

                                <div>
                                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Waxda *</label>
                                    <input
                                        required
                                        type="text"
                                        value={formData.zone}
                                        onChange={e => setFormData({ ...formData, zone: e.target.value })}
                                        className="w-full p-2 border border-gray-300 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-800 text-gray-800 dark:text-gray-200"
                                        placeholder="e.g. Waxda 1"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Property Address *</label>
                                    <input required type="text" value={formData.address} onChange={e => setFormData({ ...formData, address: e.target.value })} className="w-full p-2 border border-gray-300 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-800 text-gray-800 dark:text-gray-200" placeholder="e.g. 123 Wadnaha Road" />
                                </div>

                                <div>
                                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Owner *</label>
                                    <div className="relative">
                                        <Users className="absolute left-3 top-2.5 text-gray-400" size={14} />
                                        <select
                                            required
                                            value={formData.ownerId}
                                            onChange={e => setFormData({ ...formData, ownerId: e.target.value })}
                                            className="w-full pl-9 p-2 border border-gray-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-sm text-gray-800 dark:text-gray-200"
                                        >
                                            <option value="">-- Select Owner --</option>
                                            {owners.map(o => <option key={o._id} value={o._id}>{o.name}</option>)}
                                        </select>
                                    </div>
                                </div>
                            </div>

                            {/* Col 2: Specs */}
                            <div className="space-y-4">
                                <h4 className="text-xs font-bold text-indigo-500 uppercase tracking-wider flex items-center gap-1">
                                    <Building size={12} /> Specifications
                                </h4>

                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Category</label>
                                        <select value={formData.category} onChange={e => setFormData({ ...formData, category: e.target.value })} className="w-full p-2 border border-gray-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-gray-800 dark:text-gray-200 text-sm">
                                            <option>Residential</option>
                                            <option>Industrial</option>
                                            <option>Agricultural</option>
                                            <option>Religious</option>
                                            <option>Government</option>
                                            <option>Charity</option>
                                            <option>Educational</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Type</label>
                                        <select value={formData.type} onChange={e => setFormData({ ...formData, type: e.target.value })} className="w-full p-2 border border-gray-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-gray-800 dark:text-gray-200 text-sm">
                                            <option>Villa</option>
                                            <option>Apartment</option>
                                            <option>Corrugated Sheet House (Jiingad)</option>
                                            <option>Stone House (Daar Dhagax)</option>
                                            <option>Mud House (Baraako)</option>
                                            <option>Warehouse</option>
                                            <option>Factory</option>
                                            <option>Land</option>
                                        </select>
                                    </div>
                                </div>

                                {/* Expanded Inputs: Size & Year */}
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Size (Sqm) *</label>
                                        <div className="relative">
                                            <Ruler className="absolute left-3 top-2.5 text-gray-400" size={14} />
                                            <input required type="number" value={formData.size} onChange={e => setFormData({ ...formData, size: e.target.value })} className="w-full pl-9 p-2 border border-gray-300 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-800 text-gray-800 dark:text-gray-200" placeholder="e.g. 150" />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Year Built</label>
                                        <div className="relative">
                                            <Calendar className="absolute left-3 top-2.5 text-gray-400" size={14} />
                                            <input type="number" value={formData.year} onChange={e => setFormData({ ...formData, year: e.target.value })} className="w-full pl-9 p-2 border border-gray-300 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-800 text-gray-800 dark:text-gray-200" placeholder="e.g. 2020" />
                                        </div>
                                    </div>
                                </div>

                                {formData.type === 'Apartment' && (
                                    <div className="animate-in slide-in-from-top-2 space-y-3">
                                        <div className="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-lg p-3">
                                            <p className="text-xs font-bold text-indigo-700 dark:text-indigo-400 mb-2">Apartment Details</p>

                                            <div className="grid grid-cols-2 gap-3 mb-3">
                                                <div>
                                                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Number of Floors *</label>
                                                    <input
                                                        required
                                                        type="number"
                                                        min="1"
                                                        value={formData.floors}
                                                        onChange={e => setFormData({ ...formData, floors: e.target.value })}
                                                        className="w-full p-2 border border-indigo-300 dark:border-indigo-700 bg-white dark:bg-slate-800 rounded-lg text-sm text-gray-800 dark:text-gray-200"
                                                        placeholder="e.g. 3"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Units per Floor *</label>
                                                    <input
                                                        required
                                                        type="number"
                                                        min="1"
                                                        value={formData.unitsPerFloor}
                                                        onChange={e => setFormData({ ...formData, unitsPerFloor: e.target.value })}
                                                        className="w-full p-2 border border-indigo-300 dark:border-indigo-700 bg-white dark:bg-slate-800 rounded-lg text-sm text-gray-800 dark:text-gray-200"
                                                        placeholder="e.g. 4"
                                                    />
                                                </div>
                                            </div>

                                            {formData.totalUnits > 0 && (
                                                <div className="bg-white dark:bg-slate-800 border border-indigo-200 dark:border-indigo-700 rounded-lg p-2">
                                                    <p className="text-xs text-gray-500 dark:text-gray-400">Total Units (Auto-calculated)</p>
                                                    <p className="text-lg font-bold text-indigo-600 dark:text-indigo-400">{formData.totalUnits} units</p>
                                                    <p className="text-[10px] text-gray-400 mt-1">
                                                        {formData.floors} floors × {formData.unitsPerFloor} units/floor
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}

                                <div>
                                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Estimated Value ($) *</label>
                                    <div className="relative">
                                        <DollarSign className="absolute left-3 top-2.5 text-gray-400" size={14} />
                                        <input required type="number" value={formData.value} onChange={e => setFormData({ ...formData, value: e.target.value })} className="w-full pl-8 p-2 border border-gray-300 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-800 text-gray-800 dark:text-gray-200" placeholder="0.00" />
                                    </div>
                                </div>
                            </div>



                            {/* Draw on Map Section */}
                            <div className="md:col-span-2 space-y-3 pt-4 border-t border-gray-100 dark:border-slate-800">
                                <h4 className="text-xs font-bold text-indigo-500 uppercase tracking-wider flex items-center gap-2">
                                    <MapPin size={12} /> Draw House Boundary on Map
                                </h4>
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                    Optional: Draw the exact boundary of this house on the map. It will appear on the Map View page.
                                </p>
                                <PropertyDrawMap
                                    onPolygonDrawn={setDrawnPolygon}
                                    drawnPolygon={drawnPolygon}
                                    existingProperties={properties}
                                    selectedDistrict={formData.district}
                                />
                                {drawnPolygon && (
                                    <div className="flex items-center gap-2 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg px-3 py-2">
                                        <span className="text-green-600 dark:text-green-400 text-sm font-medium">✓ Boundary drawn ({drawnPolygon.length} points)</span>
                                        <button
                                            type="button"
                                            onClick={() => setDrawnPolygon(null)}
                                            className="ml-auto text-xs text-red-500 hover:text-red-700 font-medium"
                                        >
                                            Clear
                                        </button>
                                    </div>
                                )}
                            </div>

                            {/* Documents Upload Section */}
                            <div className="md:col-span-2 space-y-4 pt-4 border-t border-gray-100 dark:border-slate-800">
                                <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1">
                                    <FileText size={12} /> Documents
                                </h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Title Deed (Image/PDF)</label>
                                        <input
                                            type="file"
                                            accept="image/*,application/pdf"
                                            onChange={e => setFormData({
                                                ...formData,
                                                documents: { ...formData.documents, titleDeed: e.target.files[0] }
                                            })}
                                            className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 dark:file:bg-indigo-900/20 file:text-indigo-700 dark:file:text-indigo-400 hover:file:bg-indigo-100 dark:hover:file:bg-indigo-900/30"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Owner Passport/ID (Image/PDF)</label>
                                        <input
                                            type="file"
                                            accept="image/*,application/pdf"
                                            onChange={e => setFormData({
                                                ...formData,
                                                documents: { ...formData.documents, passportImage: e.target.files[0] }
                                            })}
                                            className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 dark:file:bg-indigo-900/20 file:text-indigo-700 dark:file:text-indigo-400 hover:file:bg-indigo-100 dark:hover:file:bg-indigo-900/30"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Footer */}
                            <div className="md:col-span-2 pt-4 flex gap-3 border-t border-gray-100 dark:border-slate-800 mt-2">
                                <button type="button" onClick={() => { setIsRegisterOpen(false); setEditingPropertyId(null); setFormData(initialFormState); setDrawnPolygon(null); }} className="flex-1 py-2.5 border border-gray-300 dark:border-slate-700 rounded-xl text-gray-600 dark:text-gray-300 font-medium hover:bg-gray-50 dark:hover:bg-slate-800">Cancel</button>
                                <button type="submit" className="flex-1 py-2.5 bg-indigo-600 text-white rounded-xl font-medium shadow-lg hover:bg-indigo-700">{editingPropertyId ? 'Update Property' : 'Save Property'}</button>
                            </div>
                        </form >
                    </div >
                </div >
            )
            }

            {/* --- TAX BILL MODAL --- */}
            {
                taxInvoice && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
                        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in slide-in-from-bottom-10 flex flex-col max-h-[90vh]">
                            <div className="bg-gray-50 dark:bg-slate-800/50 p-4 border-b border-gray-100 dark:border-slate-800 flex justify-between items-center shrink-0">
                                <h3 className="font-bold text-gray-700 dark:text-gray-200 flex items-center gap-2">
                                    <FileText size={18} className="text-indigo-600 dark:text-indigo-400" />
                                    Invoice Preview
                                </h3>
                                <button onClick={() => setTaxInvoice(null)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"><X size={20} /></button>
                            </div>

                            <div className="p-6 overflow-y-auto">
                                <div className="text-center mb-6">
                                    <p className="text-sm text-gray-500 dark:text-gray-400 uppercase tracking-wide">Payable by</p>
                                    <p className="text-lg font-bold text-gray-800 dark:text-white">{taxInvoice.owner}</p>
                                    <p className="text-xs text-indigo-600 dark:text-indigo-400 font-medium mt-1 bg-indigo-50 dark:bg-indigo-900/20 inline-block px-2 py-1 rounded-md">
                                        {taxInvoice.district}
                                    </p>
                                    {taxInvoice.taxAccountNumber && (
                                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 font-mono">TAN: {taxInvoice.taxAccountNumber}</p>
                                    )}
                                </div>

                                <div className="border-2 border-dashed border-gray-200 dark:border-slate-700 rounded-xl p-4 bg-gray-50/50 dark:bg-slate-800/50 mb-6">
                                    <div className="flex justify-between items-end">
                                        <span className="font-bold text-gray-800 dark:text-gray-200">Total Assessment</span>
                                        <span className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">${taxInvoice.amount.toLocaleString()}</span>
                                    </div>
                                    {taxInvoice.ruleName && (
                                        <div className="mt-3 pt-3 border-t border-gray-200 dark:border-slate-700">
                                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Tax Rule Applied</p>
                                            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">{taxInvoice.ruleName}</p>
                                            {taxInvoice.breakdown && (
                                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{taxInvoice.breakdown}</p>
                                            )}
                                        </div>
                                    )}
                                </div>

                                {/* Specific House List for Bulk Orders */}
                                {taxInvoice.count > 1 && (
                                    <div className="mb-6">
                                        <p className="text-xs font-bold text-gray-400 uppercase mb-2">Properties Included ({taxInvoice.count})</p>
                                        <div className="bg-gray-50 dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-lg divide-y divide-gray-100 dark:divide-slate-700 max-h-32 overflow-y-auto">
                                            {taxInvoice.items.map(item => (
                                                <div key={item.id} className="p-2 text-xs flex justify-between">
                                                    <span className="text-gray-600 dark:text-gray-300 truncate flex-1">{item.address}</span>
                                                    <span className="text-gray-400 font-mono ml-2">{item.id}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                <button onClick={handleConfirmBill} className="w-full py-3 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 shadow-lg shadow-indigo-200 dark:shadow-indigo-900/40 flex justify-center items-center gap-2 transition-all">
                                    <Send size={18} /> Confirm & Save Bill
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* --- PROPERTY INFO MODAL --- */}
            {
                selectedProperty && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
                        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in slide-in-from-bottom-10 flex flex-col max-h-[90vh]">
                            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-5 border-b border-gray-100 dark:border-slate-800 flex justify-between items-center shrink-0">
                                <h3 className="font-bold text-white flex items-center gap-2">
                                    <Building size={20} />
                                    Property Information
                                </h3>
                                <button onClick={() => { setSelectedProperty(null); setPropertyDetailTab('info'); setTransferHistory([]); setPropertyTaxes([]); }} className="text-white/80 hover:text-white">
                                    <X size={20} />
                                </button>
                            </div>

                            {/* Tab Switcher */}
                            <div className="flex border-b border-gray-200 dark:border-slate-800 bg-gray-50 dark:bg-slate-800/50 shrink-0">
                                <button
                                    onClick={() => setPropertyDetailTab('info')}
                                    className={`flex-1 py-3 text-sm font-medium transition-colors ${
                                        propertyDetailTab === 'info'
                                            ? 'text-indigo-600 border-b-2 border-indigo-600 bg-white dark:bg-slate-900'
                                            : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'
                                    }`}
                                >
                                    Property Details
                                </button>
                                <button
                                    onClick={() => handleSwitchToHistory(selectedProperty._id)}
                                    className={`flex-1 py-3 text-sm font-medium transition-colors ${
                                        propertyDetailTab === 'history'
                                            ? 'text-indigo-600 border-b-2 border-indigo-600 bg-white dark:bg-slate-900'
                                            : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'
                                    }`}
                                >
                                    Transfer History
                                </button>
                                <button
                                    onClick={() => handleSwitchToTaxes(selectedProperty._id)}
                                    className={`flex-1 py-3 text-sm font-medium transition-colors ${
                                        propertyDetailTab === 'taxes'
                                            ? 'text-indigo-600 border-b-2 border-indigo-600 bg-white dark:bg-slate-900'
                                            : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'
                                    }`}
                                >
                                    Taxes & Payments
                                </button>
                                {['Tax Officer', 'Super Admin'].includes(user?.role) && (
                                    <button
                                        onClick={() => setPropertyDetailTab('documents')}
                                        className={`flex-1 py-3 text-sm font-medium transition-colors ${
                                            propertyDetailTab === 'documents'
                                                ? 'text-indigo-600 border-b-2 border-indigo-600 bg-white dark:bg-slate-900'
                                                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'
                                        }`}
                                    >
                                        Documents
                                    </button>
                                )}
                            </div>
                            {/* INFO TAB */}
                            {propertyDetailTab === 'info' && (
                            <div className="p-6 overflow-y-auto space-y-6">
                                {/* Basic Info */}
                                <div className="bg-gray-50 dark:bg-slate-800/50 rounded-xl p-4 border border-gray-200 dark:border-slate-700">
                                    <h4 className="text-sm font-bold text-gray-700 dark:text-gray-200 mb-3 flex items-center gap-2">
                                        <MapPin size={16} className="text-indigo-600 dark:text-indigo-400" />
                                        Basic Information
                                    </h4>
                                    <div className="grid grid-cols-2 gap-3 text-sm">
                                        <div>
                                            <p className="text-xs text-gray-500 dark:text-gray-400">Address</p>
                                            <p className="font-medium text-gray-800 dark:text-gray-100">{selectedProperty.address}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-gray-500 dark:text-gray-400">District</p>
                                            <p className="font-medium text-gray-800 dark:text-gray-100">{selectedProperty.district}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-gray-500 dark:text-gray-400">Owner</p>
                                            <p className="font-medium text-gray-800 dark:text-gray-100">{getOwnerName(selectedProperty.ownerId)}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-gray-500 dark:text-gray-400">Property ID</p>
                                            <p className="font-medium text-gray-800 dark:text-gray-100 font-mono text-xs">{selectedProperty.id || selectedProperty._id.substring(0, 12)}</p>
                                        </div>
                                        {selectedProperty.taxAccountNumber && (
                                            <div className="col-span-2">
                                                <p className="text-xs text-gray-500 dark:text-gray-400">Tax Account Number (TAN)</p>
                                                <p className="font-bold text-indigo-600 dark:text-indigo-400 font-mono">{selectedProperty.taxAccountNumber}</p>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Property Details */}
                                <div className="bg-gray-50 dark:bg-slate-800/50 rounded-xl p-4 border border-gray-200 dark:border-slate-700">
                                    <h4 className="text-sm font-bold text-gray-700 dark:text-gray-200 mb-3 flex items-center gap-2">
                                        <Building size={16} className="text-purple-600 dark:text-purple-400" />
                                        Property Details
                                    </h4>
                                    <div className="grid grid-cols-2 gap-3 text-sm">
                                        <div>
                                            <p className="text-xs text-gray-500 dark:text-gray-400">Category</p>
                                            <p className="font-medium text-gray-800 dark:text-gray-100">{selectedProperty.propertyType || selectedProperty.category}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-gray-500 dark:text-gray-400">Building Type</p>
                                            <p className="font-medium text-gray-800 dark:text-gray-100">{selectedProperty.buildingType || selectedProperty.type}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-gray-500 dark:text-gray-400">Property Value</p>
                                            <p className="font-medium text-gray-800 dark:text-gray-100">${selectedProperty.value?.toLocaleString() || 0}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-gray-500 dark:text-gray-400">Size</p>
                                            <p className="font-medium text-gray-800 dark:text-gray-100">{selectedProperty.size || selectedProperty.structureDetails?.totalFloorArea || 0} m²</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Structure Details (if apartment or has structure info) */}
                                {selectedProperty.structureDetails && (selectedProperty.buildingType === 'Apartment' || selectedProperty.type === 'Apartment') && (
                                    <div className="bg-indigo-50 dark:bg-indigo-900/20 rounded-xl p-4 border border-indigo-200 dark:border-indigo-800">
                                        <h4 className="text-sm font-bold text-indigo-700 dark:text-indigo-400 mb-3 flex items-center gap-2">
                                            <Layers size={16} />
                                            Structure Details
                                        </h4>
                                        <div className="grid grid-cols-3 gap-3 text-sm">
                                            <div className="bg-white rounded-lg p-3 border border-indigo-100">
                                                <p className="text-xs text-gray-500">Floors</p>
                                                <p className="text-xl font-bold text-indigo-600">{selectedProperty.structureDetails.floors || 1}</p>
                                            </div>
                                            <div className="bg-white rounded-lg p-3 border border-indigo-100">
                                                <p className="text-xs text-gray-500">Units/Floor</p>
                                                <p className="text-xl font-bold text-indigo-600">{selectedProperty.structureDetails.unitsPerFloor || 1}</p>
                                            </div>
                                            <div className="bg-white rounded-lg p-3 border border-indigo-100">
                                                <p className="text-xs text-gray-500">Total Units</p>
                                                <p className="text-xl font-bold text-indigo-600">{selectedProperty.structureDetails.totalUnits || 1}</p>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Tax Information */}
                                <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-200">
                                    <h4 className="text-sm font-bold text-emerald-700 mb-3 flex items-center gap-2">
                                        <DollarSign size={16} />
                                        Tax Information
                                    </h4>
                                    <div className="space-y-3">
                                        <div className="bg-white rounded-lg p-3 border border-emerald-100">
                                            <p className="text-xs text-gray-500">Calculated Tax</p>
                                            <p className="text-2xl font-bold text-emerald-600">${selectedProperty.calculatedTax?.toLocaleString() || 0}</p>
                                        </div>
                                        {selectedProperty.taxDetails && (
                                            <div className="bg-white rounded-lg p-3 border border-emerald-100 space-y-2">
                                                <div>
                                                    <p className="text-xs text-gray-500">Tax Rule Applied</p>
                                                    <p className="font-medium text-gray-800">{selectedProperty.taxDetails.rule || 'N/A'}</p>
                                                </div>
                                                <div>
                                                    <p className="text-xs text-gray-500">Calculation Method</p>
                                                    <p className="font-medium text-gray-800">{selectedProperty.taxDetails.method || 'N/A'}</p>
                                                </div>
                                                {selectedProperty.taxDetails.breakdown && (
                                                    <div>
                                                        <p className="text-xs text-gray-500">Breakdown</p>
                                                        <p className="text-sm text-gray-700">{selectedProperty.taxDetails.breakdown}</p>
                                                    </div>
                                                )}
                                                {selectedProperty.taxDetails.lastCalculated && (
                                                    <div>
                                                        <p className="text-xs text-gray-500">Last Calculated</p>
                                                        <p className="text-xs text-gray-600">{new Date(selectedProperty.taxDetails.lastCalculated).toLocaleString()}</p>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Action Buttons */}
                                <div className="flex gap-3 pt-2">
                                    <button
                                        onClick={() => {
                                            handleGenerateTax(selectedProperty);
                                            setSelectedProperty(null);
                                        }}
                                        className="flex-1 py-3 bg-emerald-600 text-white rounded-xl font-medium hover:bg-emerald-700 shadow-lg shadow-emerald-200 flex justify-center items-center gap-2 transition-all"
                                    >
                                        <Printer size={18} /> Generate Tax Bill
                                    </button>
                                    <button
                                        onClick={() => { setSelectedProperty(null); setPropertyDetailTab('info'); setTransferHistory([]); setPropertyTaxes([]); }}
                                        className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-all"
                                    >
                                        Close
                                    </button>
                                </div>
                            </div>
                            )}

                            {/* TRANSFER HISTORY TAB */}
                            {propertyDetailTab === 'history' && (
                            <div className="p-6 overflow-y-auto">
                                <h4 className="text-sm font-bold text-gray-700 dark:text-gray-200 mb-4 flex items-center gap-2">
                                    Ownership Transfer History
                                </h4>
                                {loadingHistory ? (
                                    <div className="flex justify-center py-10">
                                        <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
                                    </div>
                                ) : transferHistory.length === 0 ? (
                                    <div className="text-center py-12 bg-gray-50 dark:bg-slate-800 rounded-xl border border-dashed border-gray-200 dark:border-slate-700">
                                        <p className="text-4xl mb-3">📋</p>
                                        <p className="text-gray-500 dark:text-gray-400 font-medium">No transfer history found</p>
                                        <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">This property has not been transferred yet.</p>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {transferHistory.map((t, idx) => (
                                            <div key={t._id} className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl p-4 relative">
                                                <div className="flex justify-between items-start mb-3">
                                                    <span className="text-xs font-mono font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 px-2 py-1 rounded">{t.transferNumber}</span>
                                                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                                                        t.status === 'Approved' ? 'bg-green-100 text-green-700' :
                                                        t.status === 'Rejected' ? 'bg-red-100 text-red-700' :
                                                        'bg-yellow-100 text-yellow-700'
                                                    }`}>{t.status}</span>
                                                </div>
                                                <div className="flex items-center gap-3 text-sm">
                                                    <div className="flex-1 text-right">
                                                        <p className="text-xs text-gray-400 mb-0.5">From</p>
                                                        <p className="font-semibold text-red-600">{t.previousOwnerId?.name || 'Unknown'}</p>
                                                    </div>
                                                    <div className="text-gray-300 text-xl font-light">→</div>
                                                    <div className="flex-1">
                                                        <p className="text-xs text-gray-400 mb-0.5">To</p>
                                                        <p className="font-semibold text-green-600">{t.newOwnerId?.name || 'Unknown'}</p>
                                                    </div>
                                                </div>
                                                <div className="mt-3 pt-3 border-t border-gray-100 dark:border-slate-700 grid grid-cols-3 gap-2 text-xs text-gray-500">
                                                    <div>
                                                        <p className="text-gray-400">Type</p>
                                                        <p className="font-medium text-gray-700 dark:text-gray-300">{t.transferType}</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-gray-400">Date</p>
                                                        <p className="font-medium text-gray-700 dark:text-gray-300">{new Date(t.transferDate).toLocaleDateString()}</p>
                                                    </div>
                                                    {t.saleValue > 0 && (
                                                        <div>
                                                            <p className="text-gray-400">Sale Value</p>
                                                            <p className="font-medium text-gray-700 dark:text-gray-300">${t.saleValue.toLocaleString()}</p>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                            )}

                            {/* DOCUMENTS TAB */}
                            {propertyDetailTab === 'documents' && ['Tax Officer', 'Super Admin'].includes(user?.role) && (
                            <div className="p-6 overflow-y-auto space-y-6">
                                <h4 className="text-sm font-bold text-gray-700 dark:text-gray-200 mb-4 flex items-center gap-2">
                                    <FileText size={16} className="text-indigo-600" /> Property Documents
                                </h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {/* Title Deed */}
                                    <div className="bg-gray-50 dark:bg-slate-800/50 rounded-xl p-4 border border-gray-200 dark:border-slate-700">
                                        <h5 className="text-xs font-bold text-gray-600 dark:text-gray-300 mb-2">Title Deed</h5>
                                        {selectedProperty.documents?.titleDeed ? (
                                            <a href={`http://localhost:5002/${selectedProperty.documents.titleDeed.replace(/\\/g, '/')}`} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline text-sm flex items-center gap-1">
                                                <Eye size={14} /> View Title Deed
                                            </a>
                                        ) : (
                                            <p className="text-sm text-gray-500">Not uploaded</p>
                                        )}
                                    </div>
                                    {/* Passport Image */}
                                    <div className="bg-gray-50 dark:bg-slate-800/50 rounded-xl p-4 border border-gray-200 dark:border-slate-700">
                                        <h5 className="text-xs font-bold text-gray-600 dark:text-gray-300 mb-2">Owner's ID/Passport</h5>
                                        {selectedProperty.documents?.passportImage ? (
                                            <a href={`http://localhost:5002/${selectedProperty.documents.passportImage.replace(/\\/g, '/')}`} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline text-sm flex items-center gap-1">
                                                <Eye size={14} /> View Passport
                                            </a>
                                        ) : (
                                            <p className="text-sm text-gray-500">Not uploaded</p>
                                        )}
                                    </div>
                                </div>
                            </div>
                            )}

                            {/* TAXES & PAYMENTS TAB */}
                            {propertyDetailTab === 'taxes' && (
                            <div className="p-6 overflow-y-auto space-y-6">
                                <h4 className="text-sm font-bold text-gray-700 dark:text-gray-200 mb-4 flex items-center gap-2">
                                    <DollarSign size={16} className="text-emerald-600" /> Tax & Payment History
                                </h4>
                                {loadingTaxes ? (
                                    <div className="flex justify-center py-10">
                                        <div className="w-8 h-8 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin"></div>
                                    </div>
                                ) : propertyTaxes.length === 0 ? (
                                    <div className="text-center py-12 bg-gray-50 dark:bg-slate-800 rounded-xl border border-dashed border-gray-200 dark:border-slate-700">
                                        <p className="text-4xl mb-3">💰</p>
                                        <p className="text-gray-500 dark:text-gray-400 font-medium">No tax records found</p>
                                        <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">Generate a tax bill to see it here.</p>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        {propertyTaxes.map((tax) => (
                                            <div key={tax._id} className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl p-4 relative flex flex-col gap-3">
                                                <div className="flex justify-between items-start">
                                                    <div>
                                                        <span className="text-xs font-mono font-bold text-gray-800 dark:text-gray-200 bg-gray-100 dark:bg-slate-700 px-2 py-1 rounded">TAN: {tax.taxAccountNumber}</span>
                                                        <p className="text-xs text-gray-500 mt-2">Year: <span className="font-semibold text-gray-700 dark:text-gray-300">{tax.taxYear}</span></p>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="text-lg font-bold text-gray-800 dark:text-gray-100">${tax.amount?.toLocaleString()}</p>
                                                        <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full ${
                                                            tax.status === 'Paid' ? 'bg-emerald-100 text-emerald-700' :
                                                            tax.status === 'Partially Paid' ? 'bg-blue-100 text-blue-700' :
                                                            tax.status === 'Overdue' ? 'bg-red-100 text-red-700' :
                                                            'bg-amber-100 text-amber-700'
                                                        }`}>{tax.status}</span>
                                                    </div>
                                                </div>
                                                
                                                <div className="grid grid-cols-2 gap-4 text-xs bg-gray-50 dark:bg-slate-800/50 p-3 rounded-lg border border-gray-100 dark:border-slate-700">
                                                    <div>
                                                        <p className="text-gray-400 dark:text-gray-500">Paid Amount</p>
                                                        <p className="font-bold text-emerald-600">${tax.paidAmount?.toLocaleString() || 0}</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-gray-400 dark:text-gray-500">Remaining Balance</p>
                                                        <p className="font-bold text-red-500">${(tax.amount - (tax.paidAmount || 0)).toLocaleString()}</p>
                                                    </div>
                                                    {tax.paidDate && (
                                                        <div className="col-span-2 border-t border-gray-200 dark:border-slate-600 pt-2 mt-1">
                                                            <p className="text-gray-400 dark:text-gray-500">Last Payment Date</p>
                                                            <p className="font-medium text-gray-700 dark:text-gray-300">{new Date(tax.paidDate).toLocaleDateString()}</p>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                            )}
                        </div>
                    </div>
                )
            }
        </div >
    );
}

// ─────────────────────────────────────────────────────────────────────
// PropertyDrawMap — mini embedded Leaflet map for drawing house boundary
// ─────────────────────────────────────────────────────────────────────
function PropertyDrawMap({ onPolygonDrawn, drawnPolygon, existingProperties = [], selectedDistrict = '' }) {
    const mapRef = useRef(null);
    const mapInstanceRef = useRef(null);
    const drawnItemsRef = useRef(null);
    const existingItemsRef = useRef(null);

    // Load Leaflet CSS once
    useEffect(() => {
        if (!document.getElementById('leaflet-css')) {
            const link = document.createElement('link');
            link.id = 'leaflet-css';
            link.rel = 'stylesheet';
            link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
            document.head.appendChild(link);
        }
        if (!document.getElementById('leaflet-draw-css')) {
            const link = document.createElement('link');
            link.id = 'leaflet-draw-css';
            link.rel = 'stylesheet';
            link.href = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet.draw/1.0.4/leaflet.draw.css';
            document.head.appendChild(link);
        }
    }, []);

    useEffect(() => {
        if (!mapRef.current || mapInstanceRef.current) return;

        const initMap = async () => {
            const L = await import('leaflet');
            await import('leaflet-draw');

            // Fix missing default marker icons
            delete L.Icon.Default.prototype._getIconUrl;
            L.Icon.Default.mergeOptions({
                iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
                iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
                shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
            });

            const initialCenter = (selectedDistrict && MOGADISHU_DISTRICT_CENTERS[selectedDistrict]) 
                ? MOGADISHU_DISTRICT_CENTERS[selectedDistrict] 
                : [2.0469, 45.3182];

            const map = L.map(mapRef.current, {
                center: initialCenter,
                zoom: 15,
                zoomControl: true,
            });

            // Define Base Layers
            const roadmap = L.tileLayer('http://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}', {
                maxZoom: 22, subdomains: ['mt0', 'mt1', 'mt2', 'mt3'], attribution: '© Google Maps'
            });
            const satellite = L.tileLayer('http://{s}.google.com/vt/lyrs=y&x={x}&y={y}&z={z}', {
                maxZoom: 22, subdomains: ['mt0', 'mt1', 'mt2', 'mt3'], attribution: '© Google Maps'
            });
            const terrain = L.tileLayer('http://{s}.google.com/vt/lyrs=p&x={x}&y={y}&z={z}', {
                maxZoom: 22, subdomains: ['mt0', 'mt1', 'mt2', 'mt3'], attribution: '© Google Maps'
            });

            roadmap.addTo(map);

            const baseMaps = {
                "🛣️ Roadmap": roadmap,
                "🛰️ Satellite": satellite,
                "⛰️ Terrain": terrain
            };

            L.control.layers(baseMaps, null, { position: 'topright' }).addTo(map);

            // ─── Setup Existing Properties Layer ───
            const existingItems = new L.FeatureGroup();
            map.addLayer(existingItems);
            existingItemsRef.current = existingItems;
            // ────────────────────────────────

            // FeatureGroup to store drawn layers
            const drawnItems = new L.FeatureGroup();
            map.addLayer(drawnItems);
            drawnItemsRef.current = drawnItems;

            // Draw control — Marker, Rectangle, and Polygon enabled
            const drawControl = new L.Control.Draw({
                edit: { featureGroup: drawnItems, remove: true },
                draw: {
                    marker: true,
                    rectangle: {
                        shapeOptions: { color: '#4f46e5', fillColor: '#c7d2fe', fillOpacity: 0.4 }
                    },
                    polygon: {
                        allowIntersection: false,
                        showArea: true,
                        shapeOptions: { color: '#4f46e5', fillColor: '#c7d2fe', fillOpacity: 0.4 }
                    },
                    circle: false,
                    circlemarker: false,
                    polyline: false,
                },
            });
            map.addControl(drawControl);

            // On draw created
            map.on('draw:created', (e) => {
                // Remove previous shape
                drawnItems.clearLayers();

                if (e.layerType === 'marker') {
                    // Make a ~15x15 meter polygon out of the single marker point so schema works perfectly
                    const point = e.layer.getLatLng();
                    const offset = 0.00012; // ~13 meters roughly
                    
                    // Create a visible colored rectangle on the map where they clicked
                    const leafletCoords = [
                        [point.lat - offset, point.lng - offset],
                        [point.lat + offset, point.lng - offset],
                        [point.lat + offset, point.lng + offset],
                        [point.lat - offset, point.lng + offset]
                    ];
                    const generatedPolygon = L.polygon(leafletCoords, {
                        color: '#4f46e5', fillColor: '#c7d2fe', fillOpacity: 0.6, weight: 3
                    });
                    drawnItems.addLayer(generatedPolygon);

                    // Make it instantly editable with drag handles safely!
                    setTimeout(() => {
                        if (generatedPolygon.editing) {
                            generatedPolygon.editing.enable();
                            // Listen for any drag/reshape to update the final form coordinates
                            generatedPolygon.on('edit', function () {
                                const latlngs = this.getLatLngs()[0] || [];
                                const editedCoords = latlngs.map(p => [p.lng, p.lat]);
                                if (editedCoords.length > 0) editedCoords.push(editedCoords[0]); // close ring
                                onPolygonDrawn(editedCoords);
                            });
                        }
                    }, 50);

                    // Send the initial GeoJSON [lng, lat] coordinates to the backend
                    const coords = [
                        [point.lng - offset, point.lat - offset],
                        [point.lng + offset, point.lat - offset],
                        [point.lng + offset, point.lat + offset],
                        [point.lng - offset, point.lat + offset],
                        [point.lng - offset, point.lat - offset] // close ring
                    ];
                    onPolygonDrawn(coords);
                } else {
                    drawnItems.addLayer(e.layer);
                    // Get coordinates as [lng, lat] for GeoJSON
                    const latlngs = e.layer.getLatLngs ? e.layer.getLatLngs()[0] : [];
                    const coords = latlngs.map(p => [p.lng, p.lat]);
                    // Close the ring
                    if (coords.length > 0) coords.push(coords[0]);
                    onPolygonDrawn(coords);
                }
            });

            // On edit
            map.on('draw:edited', (e) => {
                e.layers.eachLayer((layer) => {
                    if (layer instanceof L.Marker) {
                        const point = layer.getLatLng();
                        const offset = 0.0001; 
                        const coords = [
                            [point.lng - offset, point.lat - offset],
                            [point.lng + offset, point.lat - offset],
                            [point.lng + offset, point.lat + offset],
                            [point.lng - offset, point.lat + offset],
                            [point.lng - offset, point.lat - offset]
                        ];
                        onPolygonDrawn(coords);
                    } else if (layer.getLatLngs) {
                        const latlngs = layer.getLatLngs()[0];
                        const coords = latlngs.map(p => [p.lng, p.lat]);
                        if (coords.length > 0) coords.push(coords[0]);
                        onPolygonDrawn(coords);
                    }
                });
            });

            // Setup edit handler to update geoJSON
            map.on('draw:editstop', function () {
                const layers = drawnItemsRef.current.getLayers();
                if (layers.length > 0) {
                    const latlngs = layers[0].getLatLngs()[0] || [];
                    const editedCoords = latlngs.map(p => [p.lng, p.lat]);
                    if (editedCoords.length > 0) editedCoords.push(editedCoords[0]); // close ring
                    onPolygonDrawn(editedCoords);
                }
            });

            // On delete
            map.on('draw:deleted', () => {
                onPolygonDrawn(null);
            });

            mapInstanceRef.current = map;
        };

        initMap();

        return () => {
            if (mapInstanceRef.current) {
                mapInstanceRef.current.remove();
                mapInstanceRef.current = null;
            }
        };
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    // ─── Reactive Effect: Update Existing Properties on Filter Change ───
    useEffect(() => {
        if (!mapInstanceRef.current || !existingItemsRef.current) return;
        const L = window.L;
        if (!L) return;

        const existingItems = existingItemsRef.current;
        existingItems.clearLayers();

        // Pass 1: Filter to relevant properties
        let filteredProps = existingProperties;
        if (selectedDistrict) {
            filteredProps = existingProperties.filter(
                p => p.district && p.district.toLowerCase() === selectedDistrict.toLowerCase()
            );
        }

        // Pass 2: Plot properties
        filteredProps.forEach(property => {
            if (property.mapPolygon && property.mapPolygon.coordinates && property.mapPolygon.coordinates.length > 0 && property.mapPolygon.coordinates[0].length >= 3) {
                const latLngs = property.mapPolygon.coordinates[0].map(([lng, lat]) => [lat, lng]);
                const isPaid = property.paymentStatus === 'paid';
                const mainColor = isPaid ? '#22c55e' : '#ef4444'; // solid green : solid red

                const polygon = L.polygon(latLngs, {
                    color: mainColor,
                    fillColor: mainColor,
                    fill: true,
                    fillOpacity: 0.55,
                    weight: 2,
                    dashArray: '4',       // Make it look established/static
                    interactive: true     // Allow tooltip hovering
                });

                polygon.bindTooltip(`🏠 Registered: ${property.taxAccountNumber || 'Property'}`, {
                    permanent: false,
                    sticky: true,
                    className: 'font-semibold text-xs'
                });

                existingItems.addLayer(polygon);
            }
        });

        // Pass 3: Auto-Zoom to selected district bounds or fallback coordinate
        if (selectedDistrict) {
            if (existingItems.getLayers().length > 0) {
                // Smoothly fly to the cluster of properties found for this district
                mapInstanceRef.current.fitBounds(existingItems.getBounds(), { padding: [50, 50], maxZoom: 16, animate: true });
            } else if (MOGADISHU_DISTRICT_CENTERS[selectedDistrict]) {
                // If no properties exist in this district, fall back to the approximate center
                mapInstanceRef.current.flyTo(MOGADISHU_DISTRICT_CENTERS[selectedDistrict], 15, { animate: true });
            }
        }
    }, [existingProperties, selectedDistrict]);
    // ────────────────────────────────────────────────────────────────

    return (
        <div className="rounded-xl overflow-hidden border border-indigo-200 dark:border-indigo-800 shadow-sm">
            {/* Toolbar help hint */}
            <div className="bg-indigo-50 dark:bg-indigo-900/30 px-3 py-3 text-sm text-indigo-800 dark:text-indigo-200 flex items-center gap-2 border-b border-indigo-200 dark:border-indigo-800 font-medium">
                <span className="text-xl">📍</span>
                <span><strong>Recommendation:</strong> Use the <strong>Marker tool</strong> (the PIN icon in the left menu) to just click once on the house! The system will automatically generate the required house boundary around that spot perfectly.</span>
            </div>
            <div ref={mapRef} style={{ height: '500px', width: '100%' }} />
        </div>
    );
}