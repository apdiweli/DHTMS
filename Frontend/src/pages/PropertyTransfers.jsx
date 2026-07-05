import React, { useState, useEffect } from 'react';
import { getPropertyTransfers, getProperties, getOwners, createPropertyTransfer, approvePropertyTransfer, rejectPropertyTransfer, createOwner } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { ArrowRightLeft, Plus, Search, Filter, CheckCircle, XCircle, FileText, AlertTriangle, Eye, Loader, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';

export default function PropertyTransfers() {
    const { user } = useAuth();
    const [transfers, setTransfers] = useState([]);
    const [properties, setProperties] = useState([]);
    const [owners, setOwners] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('All');
    
    // Modals
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showViewModal, setShowViewModal] = useState(false);
    const [selectedTransfer, setSelectedTransfer] = useState(null);
    const [rejectReason, setRejectReason] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Form State
    const [formData, setFormData] = useState({
        propertyId: '',
        newOwnerId: '',
        transferType: 'Sale',
        transferReason: '',
        transferDate: new Date().toISOString().split('T')[0],
        saleValue: '',
        notes: ''
    });

    const [isCreatingNewOwner, setIsCreatingNewOwner] = useState(false);
    const [newOwnerData, setNewOwnerData] = useState({
        name: '',
        id: '',
        phone: '',
        contact: '',
        district: ''
    });
    
    // Derived state for the selected property to check taxes
    const [selectedProperty, setSelectedProperty] = useState(null);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setIsLoading(true);
            const [transfersRes, propsRes, ownersRes] = await Promise.all([
                getPropertyTransfers(),
                getProperties(),
                getOwners()
            ]);
            
            setTransfers(transfersRes.data?.data || transfersRes.data || []);
            setProperties(propsRes.data?.data || propsRes.data || []);
            setOwners(ownersRes.data?.data || ownersRes.data || []);
        } catch (error) {
            console.error('Error fetching data:', error);
            toast.error('Failed to load transfer data');
        } finally {
            setIsLoading(false);
        }
    };

    const handlePropertyChange = (e) => {
        const pId = e.target.value;
        setFormData({ ...formData, propertyId: pId });
        const prop = properties.find(p => p._id === pId);
        setSelectedProperty(prop || null);
    };

    const handleCreateSubmit = async (e) => {
        e.preventDefault();
        
        try {
            setIsSubmitting(true);
            
            let finalOwnerId = formData.newOwnerId;
            
            // If creating a new owner inline
            if (isCreatingNewOwner) {
                if (!newOwnerData.name || !newOwnerData.id || !newOwnerData.phone) {
                    toast.error('Please fill required new owner fields (Name, ID, Phone)');
                    setIsSubmitting(false);
                    return;
                }
                const ownerRes = await createOwner(newOwnerData);
                finalOwnerId = ownerRes.data?.data?._id || ownerRes.data?._id;
                
                // Refresh owners list
                const ownersListRes = await getOwners();
                setOwners(ownersListRes.data?.data || ownersListRes.data || []);
            }
            
            if (!finalOwnerId) {
                toast.error('Please select or create a new owner');
                setIsSubmitting(false);
                return;
            }

            if (!formData.propertyId) {
                toast.error('Please select a property');
                setIsSubmitting(false);
                return;
            }

            const dataToSubmit = {
                ...formData,
                newOwnerId: finalOwnerId
            };

            await createPropertyTransfer(dataToSubmit);
            toast.success('Property transfer requested successfully');
            setShowCreateModal(false);
            setFormData({
                propertyId: '',
                newOwnerId: '',
                transferType: 'Sale',
                transferReason: '',
                transferDate: new Date().toISOString().split('T')[0],
                saleValue: '',
                notes: ''
            });
            setIsCreatingNewOwner(false);
            fetchData();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to create transfer request');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleApprove = async () => {
        try {
            await approvePropertyTransfer(selectedTransfer._id);
            toast.success('Transfer approved successfully');
            setShowViewModal(false);
            fetchData();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to approve transfer');
        }
    };

    const handleReject = async () => {
        if (!rejectReason) {
            toast.error('Please provide a reason for rejection');
            return;
        }
        try {
            await rejectPropertyTransfer(selectedTransfer._id, rejectReason);
            toast.success('Transfer rejected');
            setShowViewModal(false);
            setRejectReason('');
            fetchData();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to reject transfer');
        }
    };

    const getStatusBadge = (status) => {
        switch (status) {
            case 'Pending': return <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs font-medium">Pending</span>;
            case 'Approved':
            case 'Completed': return <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">Approved</span>;
            case 'Rejected': return <span className="px-2 py-1 bg-red-100 text-red-800 rounded-full text-xs font-medium">Rejected</span>;
            default: return <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded-full text-xs font-medium">{status}</span>;
        }
    };

    const filteredTransfers = transfers.filter(t => {
        const matchesSearch = 
            t.transferNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            t.propertyId?.address?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            t.propertyId?.taxAccountNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            t.previousOwnerId?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            t.newOwnerId?.name?.toLowerCase().includes(searchTerm.toLowerCase());
            
        const matchesStatus = statusFilter === 'All' || t.status === statusFilter;
        
        return matchesSearch && matchesStatus;
    });

    if (isLoading) {
        return <div className="flex justify-center items-center h-64"><Loader className="w-8 h-8 animate-spin text-indigo-600" /></div>;
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <ArrowRightLeft className="w-6 h-6 text-indigo-600" />
                        Property Transfers
                    </h1>
                    <p className="text-gray-500 text-sm mt-1">Manage and track property ownership changes</p>
                </div>
                {(user.role === 'Super Admin' || user.role === 'Tax Officer') && (
                    <button 
                        onClick={() => setShowCreateModal(true)}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
                    >
                        <Plus className="w-4 h-4" />
                        Create Transfer
                    </button>
                )}
            </div>

            {/* Filters */}
            <div className="bg-white dark:bg-slate-900 p-4 rounded-xl shadow-sm border border-gray-200 dark:border-slate-800 flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                    <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <input 
                        type="text" 
                        placeholder="Search by transfer number, property, or owner name..." 
                        className="w-full pl-10 pr-4 py-2 border rounded-lg dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="flex items-center gap-2">
                    <Filter className="w-5 h-5 text-gray-400" />
                    <select 
                        className="border rounded-lg px-3 py-2 dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                    >
                        <option value="All">All Statuses</option>
                        <option value="Pending">Pending</option>
                        <option value="Approved">Approved</option>
                        <option value="Rejected">Rejected</option>
                    </select>
                </div>
            </div>

            {/* Transfer List */}
            <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-gray-200 dark:border-slate-800 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="text-xs text-gray-500 uppercase bg-gray-50 dark:bg-slate-800/50">
                            <tr>
                                <th className="px-6 py-3">Transfer No</th>
                                <th className="px-6 py-3">Property</th>
                                <th className="px-6 py-3">Old Owner</th>
                                <th className="px-6 py-3">New Owner</th>
                                <th className="px-6 py-3">Type / Date</th>
                                <th className="px-6 py-3">Owner Approval</th>
                                <th className="px-6 py-3">Status</th>
                                <th className="px-6 py-3 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredTransfers.length > 0 ? (
                                filteredTransfers.map((t) => (
                                    <tr key={t._id} className="border-b dark:border-slate-800 hover:bg-gray-50 dark:hover:bg-slate-800/50">
                                        <td className="px-6 py-4 font-medium text-indigo-600 dark:text-indigo-400">
                                            {t.transferNumber}
                                        </td>
                                        <td className="px-6 py-4 text-gray-900 dark:text-white">
                                            {t.propertyId?.taxAccountNumber || t.propertyId?.address || 'Unknown'}
                                            <div className="text-xs text-gray-500">{t.propertyId?.district}</div>
                                        </td>
                                        <td className="px-6 py-4 text-gray-600 dark:text-gray-400">
                                            {t.previousOwnerId?.name || 'Unknown'}
                                        </td>
                                        <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">
                                            {t.newOwnerId?.name || 'Unknown'}
                                        </td>
                                        <td className="px-6 py-4 text-gray-500">
                                            {t.transferType}
                                            <div className="text-xs">{new Date(t.transferDate).toLocaleDateString()}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            {getStatusBadge(t.ownerApprovalStatus || 'Not Required')}
                                        </td>
                                        <td className="px-6 py-4">
                                            {getStatusBadge(t.status)}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <button 
                                                onClick={() => {
                                                    setSelectedTransfer(t);
                                                    setShowViewModal(true);
                                                }}
                                                className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300 flex items-center justify-end gap-1 w-full"
                                            >
                                                <Eye className="w-4 h-4" /> View
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="7" className="px-6 py-8 text-center text-gray-500">
                                        No property transfers found.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Create Transfer Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-center p-6 border-b dark:border-slate-800 sticky top-0 bg-white dark:bg-slate-900 z-10">
                            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Create Property Transfer</h2>
                            <button onClick={() => setShowCreateModal(false)} className="text-gray-400 hover:text-gray-600">
                                <XCircle className="w-6 h-6" />
                            </button>
                        </div>
                        
                        <form onSubmit={handleCreateSubmit} className="p-6 space-y-6">
                            
                            {/* Property Selection */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Select Property *</label>
                                <select 
                                    required
                                    className="w-full border rounded-lg px-3 py-2 dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                                    value={formData.propertyId}
                                    onChange={handlePropertyChange}
                                >
                                    <option value="">-- Select Property --</option>
                                    {properties.map(p => (
                                        <option key={p._id} value={p._id}>
                                            {p.taxAccountNumber ? `[${p.taxAccountNumber}] ` : ''}{p.address} ({p.district})
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Current Owner Display */}
                            {selectedProperty && (
                                <div className="bg-gray-50 dark:bg-slate-800 p-4 rounded-lg border border-gray-200 dark:border-slate-700">
                                    <h4 className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Current Ownership Details</h4>
                                    <p className="text-sm"><strong>Owner:</strong> {selectedProperty.ownerId?.name || 'Unknown'}</p>
                                    <p className="text-sm"><strong>Property Type:</strong> {selectedProperty.propertyType}</p>
                                    {/* Outstanding tax warning would ideally be checked dynamically via API, but we'll show a general notice */}
                                    <div className="mt-3 bg-yellow-50 text-yellow-800 p-3 rounded flex gap-2 items-start text-sm border border-yellow-200">
                                        <AlertTriangle className="w-5 h-5 flex-shrink-0 text-yellow-600" />
                                        <p>The system will automatically verify if there are outstanding taxes. Properties with unpaid taxes will have a "Pending" tax warning during Super Admin review.</p>
                                    </div>
                                </div>
                            )}

                            {/* New Owner */}
                            <div>
                                <div className="flex justify-between items-center mb-1">
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">New Owner *</label>
                                    <button 
                                        type="button"
                                        onClick={() => setIsCreatingNewOwner(!isCreatingNewOwner)}
                                        className="text-xs text-indigo-600 font-medium hover:underline"
                                    >
                                        {isCreatingNewOwner ? 'Select Existing Owner' : '+ Create New Owner'}
                                    </button>
                                </div>
                                
                                {!isCreatingNewOwner ? (
                                    <select 
                                        required
                                        className="w-full border rounded-lg px-3 py-2 dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                                        value={formData.newOwnerId}
                                        onChange={(e) => setFormData({...formData, newOwnerId: e.target.value})}
                                    >
                                        <option value="">-- Select New Owner --</option>
                                        {owners.map(o => (
                                        <option key={o._id} value={o._id} disabled={selectedProperty && (typeof selectedProperty.ownerId === 'object' ? selectedProperty.ownerId._id : selectedProperty.ownerId) === o._id}>
                                            {o.name} ({o.id || o.nationalId || 'No ID'}) {selectedProperty && (typeof selectedProperty.ownerId === 'object' ? selectedProperty.ownerId._id : selectedProperty.ownerId) === o._id ? ' - CURRENT OWNER' : ''}
                                        </option>
                                    ))}
                                    </select>
                                ) : (
                                    <div className="grid grid-cols-2 gap-4 bg-indigo-50 dark:bg-indigo-900/20 p-4 rounded-lg border border-indigo-100 dark:border-indigo-800">
                                        <div className="col-span-2">
                                            <label className="block text-xs text-gray-500 mb-1">Full Name *</label>
                                            <input type="text" required value={newOwnerData.name} onChange={e => setNewOwnerData({...newOwnerData, name: e.target.value})} className="w-full border rounded p-2 text-sm dark:bg-slate-800 dark:text-white dark:border-slate-700" />
                                        </div>
                                        <div>
                                            <label className="block text-xs text-gray-500 mb-1">Owner ID *</label>
                                            <input type="text" required value={newOwnerData.id} onChange={e => setNewOwnerData({...newOwnerData, id: e.target.value})} placeholder="e.g. OWN-009" className="w-full border rounded p-2 text-sm dark:bg-slate-800 dark:text-white dark:border-slate-700" />
                                        </div>
                                        <div>
                                            <label className="block text-xs text-gray-500 mb-1">Phone *</label>
                                            <input type="text" required value={newOwnerData.phone} onChange={e => setNewOwnerData({...newOwnerData, phone: e.target.value})} className="w-full border rounded p-2 text-sm dark:bg-slate-800 dark:text-white dark:border-slate-700" />
                                        </div>
                                        <div className="col-span-2">
                                            <label className="block text-xs text-gray-500 mb-1">Email</label>
                                            <input type="email" value={newOwnerData.contact} onChange={e => setNewOwnerData({...newOwnerData, contact: e.target.value})} className="w-full border rounded p-2 text-sm dark:bg-slate-800 dark:text-white dark:border-slate-700" />
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Transfer Details */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Transfer Type *</label>
                                    <select 
                                        required
                                        className="w-full border rounded-lg px-3 py-2 dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                                        value={formData.transferType}
                                        onChange={(e) => setFormData({...formData, transferType: e.target.value})}
                                    >
                                        <option value="Sale">Sale</option>
                                        <option value="Inheritance">Inheritance</option>
                                        <option value="Gift">Gift</option>
                                        <option value="Government Allocation">Government Allocation</option>
                                        <option value="Court Order">Court Order</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Date of Transfer *</label>
                                    <input 
                                        type="date" 
                                        required
                                        className="w-full border rounded-lg px-3 py-2 dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                                        value={formData.transferDate}
                                        onChange={(e) => setFormData({...formData, transferDate: e.target.value})}
                                    />
                                </div>
                                {formData.transferType === 'Sale' && (
                                    <div className="col-span-2">
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Sale Value ($) *</label>
                                        <input 
                                            type="number" 
                                            required
                                            min="0"
                                            className="w-full border rounded-lg px-3 py-2 dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                                            value={formData.saleValue}
                                            onChange={(e) => setFormData({...formData, saleValue: e.target.value})}
                                        />
                                        <p className="text-xs text-gray-500 mt-1">A 2% transfer fee will be automatically applied to the sale value.</p>
                                    </div>
                                )}
                                <div className="col-span-2">
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Notes / Reason</label>
                                    <textarea 
                                        rows="2"
                                        className="w-full border rounded-lg px-3 py-2 dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                                        value={formData.notes}
                                        onChange={(e) => setFormData({...formData, notes: e.target.value})}
                                        placeholder="Any additional information..."
                                    ></textarea>
                                </div>
                            </div>

                            <div className="flex justify-end gap-3 pt-4 border-t dark:border-slate-800">
                                <button type="button" onClick={() => setShowCreateModal(false)} className="px-4 py-2 border rounded-lg text-gray-700 hover:bg-gray-50 dark:border-slate-700 dark:text-gray-300 dark:hover:bg-slate-800">
                                    Cancel
                                </button>
                                <button type="submit" disabled={isSubmitting} className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50">
                                    {isSubmitting ? 'Submitting...' : 'Request Transfer'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* View/Action Modal */}
            {showViewModal && selectedTransfer && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl w-full max-w-xl">
                        <div className="flex justify-between items-center p-6 border-b dark:border-slate-800">
                            <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                Transfer Details {getStatusBadge(selectedTransfer.status)}
                            </h2>
                            <button onClick={() => {setShowViewModal(false); setRejectReason('');}} className="text-gray-400 hover:text-gray-600">
                                <XCircle className="w-6 h-6" />
                            </button>
                        </div>
                        
                        <div className="p-6 space-y-6">
                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                    <p className="text-gray-500 mb-1">Transfer Number</p>
                                    <p className="font-semibold text-gray-900 dark:text-white">{selectedTransfer.transferNumber}</p>
                                </div>
                                <div>
                                    <p className="text-gray-500 mb-1">Date Requested</p>
                                    <p className="font-semibold text-gray-900 dark:text-white">{new Date(selectedTransfer.createdAt).toLocaleDateString()}</p>
                                </div>
                                <div>
                                    <p className="text-gray-500 mb-1">Property</p>
                                    <p className="font-semibold text-gray-900 dark:text-white">{selectedTransfer.propertyId?.address || 'Unknown'}</p>
                                    <p className="text-xs text-gray-500">{selectedTransfer.propertyId?.taxAccountNumber}</p>
                                </div>
                                <div>
                                    <p className="text-gray-500 mb-1">Type & Date</p>
                                    <p className="font-semibold text-gray-900 dark:text-white">{selectedTransfer.transferType}</p>
                                    <p className="text-xs text-gray-500">Eff: {new Date(selectedTransfer.transferDate).toLocaleDateString()}</p>
                                </div>
                            </div>

                            <div className="bg-gray-50 dark:bg-slate-800 p-4 rounded-lg flex items-center justify-between border border-gray-200 dark:border-slate-700">
                                <div className="flex-1">
                                    <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">From (Old Owner)</p>
                                    <p className="font-bold text-red-600">{selectedTransfer.previousOwnerId?.name}</p>
                                </div>
                                <div className="px-4 text-gray-400">
                                    <ArrowRightLeft className="w-6 h-6" />
                                </div>
                                <div className="flex-1 text-right">
                                    <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">To (New Owner)</p>
                                    <p className="font-bold text-green-600">{selectedTransfer.newOwnerId?.name}</p>
                                </div>
                            </div>

                            {selectedTransfer.transferType === 'Sale' && (
                                <div className="flex gap-4">
                                    <div className="flex-1 bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg border border-blue-100 dark:border-blue-800">
                                        <p className="text-xs text-blue-800 dark:text-blue-400">Sale Value</p>
                                        <p className="text-lg font-bold text-blue-900 dark:text-blue-300">${selectedTransfer.saleValue?.toLocaleString()}</p>
                                    </div>
                                    <div className="flex-1 bg-purple-50 dark:bg-purple-900/20 p-3 rounded-lg border border-purple-100 dark:border-purple-800">
                                        <p className="text-xs text-purple-800 dark:text-purple-400">Transfer Fee (2%)</p>
                                        <p className="text-lg font-bold text-purple-900 dark:text-purple-300">${selectedTransfer.transferFee?.toLocaleString()}</p>
                                    </div>
                                </div>
                            )}

                            {selectedTransfer.previousTaxStatus === 'Unpaid' && (
                                <div className="bg-red-50 text-red-800 p-3 rounded-lg flex items-start gap-3 border border-red-200">
                                    <AlertTriangle className="w-5 h-5 flex-shrink-0 text-red-600" />
                                    <div>
                                        <p className="font-bold text-sm">Outstanding Taxes Detected</p>
                                        <p className="text-xs mt-1">This property had unpaid taxes at the time of the request. Ensure the new owner accepts liability or taxes are settled before approval.</p>
                                    </div>
                                </div>
                            )}
                            
                            {selectedTransfer.notes && (
                                <div>
                                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Notes</p>
                                    <p className="text-sm text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-slate-800 p-3 rounded border dark:border-slate-700">{selectedTransfer.notes}</p>
                                </div>
                            )}

                            {/* Super Admin Actions */}
                            {user.role === 'Super Admin' && selectedTransfer.status === 'Pending' && (
                                <div className="pt-4 border-t dark:border-slate-800 space-y-4">
                                    <p className="text-sm font-bold text-gray-800 dark:text-white">Admin Review Actions</p>
                                    
                                    {selectedTransfer.ownerApprovalStatus === 'Pending' && (
                                        <div className="bg-yellow-50 text-yellow-800 p-3 rounded-lg text-sm border border-yellow-200">
                                            <strong>Note:</strong> You cannot approve this transfer yet because it is waiting for the initial owner to approve it in their portal.
                                        </div>
                                    )}
                                    {selectedTransfer.ownerApprovalStatus === 'Rejected' && (
                                        <div className="bg-red-50 text-red-800 p-3 rounded-lg text-sm border border-red-200">
                                            <strong>Note:</strong> The initial owner has rejected this transfer. You should reject this request.
                                        </div>
                                    )}

                                    <div className="flex gap-3">
                                        <button 
                                            onClick={handleApprove}
                                            disabled={selectedTransfer.ownerApprovalStatus === 'Pending' || selectedTransfer.ownerApprovalStatus === 'Rejected'}
                                            className={`flex-1 py-2 rounded-lg font-medium flex items-center justify-center gap-2 ${
                                                selectedTransfer.ownerApprovalStatus === 'Pending' || selectedTransfer.ownerApprovalStatus === 'Rejected' 
                                                ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                                                : 'bg-green-600 hover:bg-green-700 text-white'
                                            }`}
                                        >
                                            <CheckCircle className="w-5 h-5" /> Approve Transfer
                                        </button>
                                        <div className="flex-1 flex flex-col gap-2">
                                            <input 
                                                type="text" 
                                                placeholder="Reason for rejection (optional)"
                                                value={rejectReason}
                                                onChange={(e) => setRejectReason(e.target.value)}
                                                className="w-full border rounded-lg px-3 py-2 text-sm dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                                            />
                                            <button 
                                                onClick={handleReject}
                                                className="w-full bg-red-100 hover:bg-red-200 text-red-700 border border-red-300 py-2 rounded-lg font-medium flex items-center justify-center gap-2"
                                            >
                                                <XCircle className="w-5 h-5" /> Reject
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
