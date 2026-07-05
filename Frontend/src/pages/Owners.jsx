import React, { useState, useMemo, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import {
    Users, PlusCircle, Search, MapPin, Edit, Phone, Mail,
    ShieldCheck, AlertTriangle, Briefcase, LayoutGrid, List,
    Filter, X, CheckCircle, Ban, TrendingUp, Building2, Trash2, Eye, KeyRound
} from 'lucide-react';
import { getOwners, createOwner, deleteOwner, updateOwner, resetOwnerPassword } from '../services/api';

export default function Owners() {
    const [owners, setOwners] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [viewMode, setViewMode] = useState('grid');
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState('All');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isViewModalOpen, setIsViewModalOpen] = useState(false);
    const [selectedOwner, setSelectedOwner] = useState(null);
    const [isResetPasswordOpen, setIsResetPasswordOpen] = useState(false);
    const [resetPasswordOwner, setResetPasswordOwner] = useState(null);
    const [newPasswordValue, setNewPasswordValue] = useState('');

    // New Owner Form State
    const [newOwner, setNewOwner] = useState({
        name: '', type: 'Individual', phone: '', district: 'Hodan', email: ''
    });
    const [createUserAccount, setCreateUserAccount] = useState(false);
    const [userPassword, setUserPassword] = useState('');

    // Fetch Owners on Mount
    useEffect(() => {
        fetchOwners();
    }, []);

    // --- DEEP LINKING ---
    const location = useLocation();
    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const q = params.get('q') || params.get('id') || params.get('search');
        if (q) {
            setSearchTerm(q);
        }
        // Handle Action
        if (params.get('action') === 'add') {
            setIsModalOpen(true);
        }
    }, [location.search]);

    const fetchOwners = async () => {
        try {
            setIsLoading(true);
            const response = await getOwners();
            setOwners(response.data);
        } catch (error) {
            console.error("Error fetching owners:", error);
        } finally {
            setIsLoading(false);
        }
    };

    // --- COMPUTED DATA ---
    const filteredOwners = useMemo(() => {
        return owners.filter(owner => {
            const matchesSearch = owner.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (owner.ownerId && owner.ownerId.toLowerCase().includes(searchTerm.toLowerCase()));
            const matchesStatus = filterStatus === 'All' || owner.status === filterStatus;
            return matchesSearch && matchesStatus;
        });
    }, [owners, searchTerm, filterStatus]);

    const stats = {
        total: owners.length,
        active: owners.filter(o => o.status === 'Active').length,
        value: owners.reduce((acc, curr) => acc + (curr.totalValue || 0), 0)
    };

    // --- HELPERS ---
    const getInitials = (name) => name ? name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : '??';

    const getRiskColor = (level) => {
        if (level === 'Low') return 'bg-emerald-50 text-emerald-700 border-emerald-100';
        if (level === 'Medium') return 'bg-amber-50 text-amber-700 border-amber-100';
        return 'bg-rose-50 text-rose-700 border-rose-100';
    };

    const getStatusColor = (status) => {
        return status === 'Active' ? 'text-emerald-600 bg-emerald-50' : 'text-rose-600 bg-rose-50';
    };

    // --- HANDLERS ---
    const handleAddOwner = async (e) => {
        e.preventDefault();

        // Validate email if creating user account
        if (createUserAccount && !newOwner.email) {
            alert('Email is required to create a user account');
            return;
        }

        if (createUserAccount && !userPassword) {
            alert('Password is required to create a user account');
            return;
        }

        try {
            const createdOwner = {
                ...newOwner,
                contact: newOwner.email,
                properties: 0,
                totalValue: 0,
                riskLevel: 'Low',
                status: 'Active',
                verified: false,
                createUserAccount,
                password: userPassword
            };

            const response = await createOwner(createdOwner);

            // Show success message
            if (response.data.userCreated) {
                alert(`Owner created successfully!\n\nLogin Credentials:\nEmail: ${newOwner.email}\nPassword: ${userPassword}\n\nPlease save these credentials.`);
            } else if (response.data.userLinked) {
                alert(`Owner created and linked to existing user account successfully.\n\nIMPORTANT: The user already exists, so the password you entered was NOT used. The user should log in with their existing password.`);
            } else {
                alert(response.data.message || 'Owner created successfully!');
            }

            setOwners([response.data.data, ...owners]);
            setIsModalOpen(false);
            setNewOwner({ name: '', type: 'Individual', phone: '', district: 'Hodan', email: '' });
            setCreateUserAccount(false);
            setUserPassword('');
        } catch (error) {
            console.error("Error creating owner:", error);
            alert(error.response?.data?.message || "Failed to create owner");
        }
    };

    // Handle Delete Owner
    const handleDeleteOwner = async (ownerId, ownerName) => {
        if (!confirm(`Are you sure you want to delete ${ownerName}?\n\nNote: You cannot delete an owner who has properties. Delete all properties first.`)) {
            return;
        }

        try {
            await deleteOwner(ownerId);
            alert('Owner deleted successfully!');
            // Refresh the list
            await fetchOwners();
        } catch (error) {
            console.error('Error deleting owner:', error);
            const errorMessage = error.response?.data?.message || 'Failed to delete owner';
            alert(errorMessage);
        }
    };

    // Handle Edit Owner
    const handleEditOwner = (owner) => {
        setSelectedOwner(owner);
        setIsEditModalOpen(true);
    };

    // Handle View Owner
    const handleViewOwner = (owner) => {
        setSelectedOwner(owner);
        setIsViewModalOpen(true);
    };

    // Handle Update Owner
    const handleUpdateOwner = async (e) => {
        e.preventDefault();
        try {
            const response = await updateOwner(selectedOwner._id, selectedOwner);
            alert('Owner updated successfully!');
            await fetchOwners();
            setIsEditModalOpen(false);
            setSelectedOwner(null);
        } catch (error) {
            console.error('Error updating owner:', error);
            alert(error.response?.data?.message || 'Failed to update owner');
        }
    };

    // Handle Reset Password
    const handleResetPassword = async (e) => {
        e.preventDefault();
        if (!newPasswordValue) {
            alert('Please enter a new password');
            return;
        }
        try {
            const response = await resetOwnerPassword(resetPasswordOwner._id, newPasswordValue);
            alert(`Password reset successfully for ${resetPasswordOwner.name}!\n\nNew Password: ${newPasswordValue}\n\nPlease share this password with the owner securely.`);
            setIsResetPasswordOpen(false);
            setResetPasswordOwner(null);
            setNewPasswordValue('');
        } catch (error) {
            console.error('Error resetting password:', error);
            alert(error.response?.data?.message || 'Failed to reset password');
        }
    };

    return (
        <div className="space-y-6">

            {/* 1. Dashboard Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-gray-100 dark:border-slate-800 shadow-sm flex items-center justify-between transition-colors">
                    <div>
                        <p className="text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wider">Total Taxpayers</p>
                        <h2 className="text-2xl font-bold text-gray-800 dark:text-white">{stats.total}</h2>
                    </div>
                    <div className="p-3 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 rounded-full"><Users size={20} /></div>
                </div>
                <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-gray-100 dark:border-slate-800 shadow-sm flex items-center justify-between transition-colors">
                    <div>
                        <p className="text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wider">Active Status</p>
                        <h2 className="text-2xl font-bold text-gray-800 dark:text-white">{stats.active}</h2>
                    </div>
                    <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 rounded-full"><CheckCircle size={20} /></div>
                </div>
                <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-gray-100 dark:border-slate-800 shadow-sm flex items-center justify-between transition-colors">
                    <div>
                        <p className="text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wider">Portfolio Value</p>
                        <h2 className="text-2xl font-bold text-gray-800 dark:text-white">${(stats.value / 1000000).toFixed(2)}M</h2>
                    </div>
                    <div className="p-3 bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 rounded-full"><TrendingUp size={20} /></div>
                </div>
            </div>

            {/* 2. Toolbar & Controls */}
            <div className="flex flex-col md:flex-row justify-between gap-4 items-center bg-white dark:bg-slate-900 p-4 rounded-xl border border-gray-200 dark:border-slate-800 shadow-sm transition-colors">
                <div className="flex w-full md:w-auto gap-2">
                    <div className="relative flex-1 md:w-64">
                        <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
                        <input
                            type="text"
                            placeholder="Search name, ID, or phone..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-gray-200 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                    </div>
                    <select
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value)}
                        className="px-3 py-2 border border-gray-200 dark:border-slate-700 rounded-lg text-sm bg-gray-50 dark:bg-slate-800 text-gray-700 dark:text-gray-200 focus:outline-none"
                    >
                        <option value="All">All Status</option>
                        <option value="Active">Active</option>
                        <option value="Suspended">Suspended</option>
                    </select>
                </div>

                <div className="flex gap-2 w-full md:w-auto">
                    <div className="bg-gray-100 dark:bg-slate-800 p-1 rounded-lg flex">
                        <button onClick={() => setViewMode('grid')} className={`p-2 rounded-md transition-all ${viewMode === 'grid' ? 'bg-white dark:bg-slate-700 shadow text-indigo-600 dark:text-indigo-400' : 'text-gray-400'}`}><LayoutGrid size={18} /></button>
                        <button onClick={() => setViewMode('list')} className={`p-2 rounded-md transition-all ${viewMode === 'list' ? 'bg-white dark:bg-slate-700 shadow text-indigo-600 dark:text-indigo-400' : 'text-gray-400'}`}><List size={18} /></button>
                    </div>
                    <button onClick={() => setIsModalOpen(true)} className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 shadow-md shadow-indigo-200 dark:shadow-indigo-900/40 transition-all">
                        <PlusCircle size={18} /> <span className="hidden sm:inline">Add Owner</span>
                    </button>
                </div>
            </div>

            {/* 3. Grid View (CRM Style) */}
            {viewMode === 'grid' && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {filteredOwners.map((owner) => (
                        <div key={owner._id} className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl p-5 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group relative overflow-hidden">

                            {/* Status Banner */}
                            <div className={`absolute top-0 left-0 w-1 h-full ${owner.status === 'Active' ? 'bg-emerald-500' : 'bg-rose-500'}`}></div>

                            <div className="flex justify-between items-start mb-4 pl-2">
                                <div className="flex gap-3 items-center">
                                    <div className="w-12 h-12 rounded-full bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold text-lg border border-indigo-100 dark:border-indigo-900/30">
                                        {getInitials(owner.name)}
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-gray-800 dark:text-white text-sm flex items-center gap-1">
                                            {owner.name}
                                            {owner.verified && <ShieldCheck size={14} className="text-blue-500" fill="currentColor" />}
                                        </h3>
                                        <p className="text-[10px] text-gray-400 dark:text-gray-500">{owner.ownerId || owner._id}</p>
                                        {owner.userId && (
                                            <p className="text-[10px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1 mt-0.5">
                                                <CheckCircle size={10} /> Has Portal Access
                                            </p>
                                        )}
                                    </div>
                                </div>
                                <span className={`px-2 py-1 rounded-md text-[10px] font-bold border uppercase ${getRiskColor(owner.riskLevel)}`}>
                                    {owner.riskLevel} Risk
                                </span>
                            </div>

                            {/* Contact Info */}
                            <div className="space-y-2 mb-4 pl-2">
                                <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                                    <MapPin size={14} className="text-gray-400" /> {owner.district}, Mogadishu
                                </div>
                                <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                                    <Mail size={14} className="text-gray-400" /> {owner.email || owner.contact || 'No email'}
                                </div>
                                <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                                    <Phone size={14} className="text-gray-400" /> {owner.phone}
                                </div>
                            </div>

                            {/* Stats Box */}
                            <div className="bg-gray-50 dark:bg-slate-800/50 rounded-xl p-3 grid grid-cols-2 gap-4 border border-gray-100 dark:border-slate-800 mb-4 ml-2">
                                <div>
                                    <p className="text-[10px] text-gray-400 uppercase">Properties</p>
                                    <p className="font-bold text-gray-800 dark:text-gray-200 flex items-center gap-1 text-sm">
                                        <Briefcase size={14} className="text-indigo-500" /> {owner.properties}
                                    </p>
                                </div>
                                <div className="text-right">
                                    <p className="text-[10px] text-gray-400 uppercase">Valuation</p>
                                    <p className="font-bold text-emerald-600 dark:text-emerald-400 text-sm">${((owner.totalValue || 0) / 1000).toFixed(0)}k</p>
                                </div>
                            </div>

                            {/* Footer Actions */}
                            <div className="pt-3 border-t border-gray-100 dark:border-slate-800 flex justify-between items-center pl-2">
                                <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${getStatusColor(owner.status)}`}>
                                    ● {owner.status}
                                </span>
                                <div className="flex gap-1">
                                    <button onClick={() => handleViewOwner(owner)} className="p-1.5 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg" title="View"><Eye size={14} /></button>
                                    <button onClick={() => handleEditOwner(owner)} className="p-1.5 text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg" title="Edit"><Edit size={14} /></button>
                                    <button
                                        onClick={() => { setResetPasswordOwner(owner); setIsResetPasswordOpen(true); }}
                                        className="p-1.5 text-gray-400 hover:text-amber-600 dark:hover:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20 rounded-lg"
                                        title="Reset Password"
                                    >
                                        <KeyRound size={14} />
                                    </button>
                                    <button
                                        onClick={() => handleDeleteOwner(owner._id, owner.name)}
                                        className="p-1.5 text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                                        title="Delete Owner"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            </div>

                        </div>
                    ))}
                </div>
            )}

            {/* 4. List View */}
            {viewMode === 'list' && (
                <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm transition-colors">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-gray-50 dark:bg-slate-800/50 text-gray-500 dark:text-gray-400 font-medium border-b border-gray-100 dark:border-slate-800">
                                <tr>
                                    <th className="p-4">Owner Identity</th>
                                    <th className="p-4">Contact</th>
                                    <th className="p-4">Location</th>
                                    <th className="p-4">Status</th>
                                    <th className="p-4 text-right">Portfolio Value</th>
                                    <th className="p-4 text-center">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                                {filteredOwners.map(owner => (
                                    <tr key={owner._id} className="hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors group">
                                        <td className="p-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-xs font-bold">
                                                    {getInitials(owner.name)}
                                                </div>
                                                <div>
                                                    <p className="font-medium text-gray-800 dark:text-gray-200">{owner.name}</p>
                                                    <p className="text-xs text-gray-400">{owner.type}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-4 text-gray-600 dark:text-gray-400 text-xs">
                                            <div className="flex flex-col">
                                                <span>{owner.phone}</span>
                                                <span className="text-gray-400 dark:text-gray-500">{owner.contact}</span>
                                            </div>
                                        </td>
                                        <td className="p-4 text-gray-600 dark:text-gray-400">{owner.district}</td>
                                        <td className="p-4">
                                            <span className={`text-xs px-2 py-1 rounded-full border ${owner.status === 'Active' ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-100 dark:border-emerald-900/30 text-emerald-600 dark:text-emerald-400' : 'bg-rose-50 dark:bg-rose-900/20 border-rose-100 dark:border-rose-900/30 text-rose-600 dark:text-rose-400'}`}>
                                                {owner.status}
                                            </span>
                                        </td>
                                        <td className="p-4 text-right font-medium text-gray-800 dark:text-gray-200">
                                            ${(owner.totalValue || 0).toLocaleString()}
                                            <span className="block text-[10px] text-gray-400">{owner.properties} Properties</span>
                                        </td>
                                        <td className="p-4 text-center">
                                            <div className="flex items-center justify-center gap-2">
                                                <button onClick={() => handleViewOwner(owner)} className="text-gray-400 hover:text-blue-600 dark:hover:text-blue-400" title="View"><Eye size={16} /></button>
                                                <button onClick={() => handleEditOwner(owner)} className="text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400" title="Edit"><Edit size={16} /></button>
                                                <button
                                                    onClick={() => { setResetPasswordOwner(owner); setIsResetPasswordOpen(true); }}
                                                    className="text-gray-400 hover:text-amber-600 dark:hover:text-amber-400"
                                                    title="Reset Password"
                                                >
                                                    <KeyRound size={16} />
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteOwner(owner._id, owner.name)}
                                                    className="text-gray-400 hover:text-red-600 dark:hover:text-red-400"
                                                    title="Delete Owner"
                                                >
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
            )}

            {/* 5. Create Owner Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in-95">
                        <div className="px-6 py-4 border-b border-gray-100 dark:border-slate-800 flex justify-between items-center bg-gray-50 dark:bg-slate-800/50">
                            <h3 className="font-bold text-gray-800 dark:text-white">Register New Owner</h3>
                            <button onClick={() => setIsModalOpen(false)}><X size={20} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300" /></button>
                        </div>
                        <form onSubmit={handleAddOwner} className="p-6 space-y-4">
                            <div>
                                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Full Name / Entity Name</label>
                                <input required type="text" value={newOwner.name} onChange={e => setNewOwner({ ...newOwner, name: e.target.value })} className="w-full p-2 border border-gray-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white dark:bg-slate-800 text-gray-800 dark:text-gray-200" placeholder="e.g. Faarah Nur" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Type</label>
                                    <select value={newOwner.type} onChange={e => setNewOwner({ ...newOwner, type: e.target.value })} className="w-full p-2 border border-gray-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-gray-800 dark:text-gray-200">
                                        <option>Individual</option><option>Business</option><option>Government</option><option>Trust</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">District</label>
                                    <select value={newOwner.district} onChange={e => setNewOwner({ ...newOwner, district: e.target.value })} className="w-full p-2 border border-gray-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-gray-800 dark:text-gray-200">
                                        <option>Hodan</option><option>Waberi</option><option>Daynile</option><option>Hamar Weyne</option>
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Phone Number</label>
                                <input required type="tel" value={newOwner.phone} onChange={e => setNewOwner({ ...newOwner, phone: e.target.value })} className="w-full p-2 border border-gray-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-gray-800 dark:text-gray-200" placeholder="+252..." />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Email Address</label>
                                <input
                                    type="email"
                                    value={newOwner.email}
                                    onChange={e => setNewOwner({ ...newOwner, email: e.target.value })}
                                    className="w-full p-2 border border-gray-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-gray-800 dark:text-gray-200"
                                    placeholder="owner@email.com"
                                    required={createUserAccount}
                                />
                            </div>

                            {/* User Account Creation Option */}
                            <div className="border-t border-gray-200 dark:border-slate-800 pt-4">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={createUserAccount}
                                        onChange={(e) => setCreateUserAccount(e.target.checked)}
                                        className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                                    />
                                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Create Portal Login Account</span>
                                </label>
                                <p className="text-xs text-gray-500 dark:text-gray-400 ml-6 mt-1">Allow this owner to access the Owner Portal</p>
                            </div>

                            {createUserAccount && (
                                <div className="bg-indigo-50 dark:bg-indigo-900/20 p-4 rounded-lg space-y-3 border border-indigo-100 dark:border-indigo-800">
                                    <p className="text-xs font-medium text-indigo-900 dark:text-indigo-300">Portal Access Credentials</p>
                                    <div>
                                        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Login Password</label>
                                        <input
                                            type="password"
                                            value={userPassword}
                                            onChange={(e) => setUserPassword(e.target.value)}
                                            className="w-full p-2 border border-gray-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-gray-800 dark:text-gray-200"
                                            placeholder="Enter password for owner"
                                            required
                                        />
                                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Owner will use their email and this password to log in</p>
                                    </div>
                                </div>
                            )}

                            <div className="pt-4 flex gap-3">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-2 border border-gray-300 dark:border-slate-700 rounded-xl text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-800">Cancel</button>
                                <button type="submit" className="flex-1 py-2 bg-indigo-600 text-white rounded-xl shadow-lg hover:bg-indigo-700">Register Profile</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* 6. Edit Owner Modal */}
            {isEditModalOpen && selectedOwner && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in-95">
                        <div className="px-6 py-4 border-b border-gray-100 dark:border-slate-800 flex justify-between items-center bg-gray-50 dark:bg-slate-800/50">
                            <h3 className="font-bold text-gray-800 dark:text-white">Edit Owner</h3>
                            <button onClick={() => setIsEditModalOpen(false)}><X size={20} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300" /></button>
                        </div>
                        <form onSubmit={handleUpdateOwner} className="p-6 space-y-4">
                            <div>
                                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Full Name</label>
                                <input
                                    required
                                    type="text"
                                    value={selectedOwner.name}
                                    onChange={e => setSelectedOwner({ ...selectedOwner, name: e.target.value })}
                                    className="w-full p-2 border border-gray-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-gray-800 dark:text-gray-200"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Type</label>
                                    <select
                                        value={selectedOwner.type}
                                        onChange={e => setSelectedOwner({ ...selectedOwner, type: e.target.value })}
                                        className="w-full p-2 border border-gray-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-gray-800 dark:text-gray-200"
                                    >
                                        <option>Individual</option><option>Business</option><option>Government</option><option>Trust</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Status</label>
                                    <select
                                        value={selectedOwner.status}
                                        onChange={e => setSelectedOwner({ ...selectedOwner, status: e.target.value })}
                                        className="w-full p-2 border border-gray-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-gray-800 dark:text-gray-200"
                                    >
                                        <option>Active</option><option>Suspended</option><option>Inactive</option>
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Phone Number</label>
                                <input
                                    required
                                    type="tel"
                                    value={selectedOwner.phone}
                                    onChange={e => setSelectedOwner({ ...selectedOwner, phone: e.target.value })}
                                    className="w-full p-2 border border-gray-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-gray-800 dark:text-gray-200"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Email Address</label>
                                <input
                                    type="email"
                                    value={selectedOwner.email || selectedOwner.contact || ''}
                                    onChange={e => setSelectedOwner({ ...selectedOwner, email: e.target.value, contact: e.target.value })}
                                    className="w-full p-2 border border-gray-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-gray-800 dark:text-gray-200"
                                />
                            </div>
                            <div className="pt-4 flex gap-3">
                                <button type="button" onClick={() => setIsEditModalOpen(false)} className="flex-1 py-2 border border-gray-300 dark:border-slate-700 rounded-xl text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-800">Cancel</button>
                                <button type="submit" className="flex-1 py-2 bg-indigo-600 text-white rounded-xl shadow-lg hover:bg-indigo-700">Update Owner</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* 7. View Owner Modal */}
            {isViewModalOpen && selectedOwner && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden animate-in zoom-in-95">
                        <div className="px-6 py-4 border-b border-gray-100 dark:border-slate-800 flex justify-between items-center bg-gradient-to-r from-indigo-600 to-purple-600">
                            <h3 className="font-bold text-white flex items-center gap-2">
                                <Users size={20} /> Owner Details
                            </h3>
                            <button onClick={() => setIsViewModalOpen(false)}><X size={20} className="text-white/80 hover:text-white" /></button>
                        </div>
                        <div className="p-6 space-y-6">
                            {/* Owner Header */}
                            <div className="flex items-center gap-4 pb-4 border-b border-gray-200 dark:border-slate-800">
                                <div className="w-16 h-16 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold text-2xl">
                                    {getInitials(selectedOwner.name)}
                                </div>
                                <div className="flex-1">
                                    <h4 className="text-xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
                                        {selectedOwner.name}
                                        {selectedOwner.verified && <ShieldCheck size={18} className="text-blue-500" fill="currentColor" />}
                                    </h4>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">{selectedOwner.type} • {selectedOwner.ownerId || selectedOwner._id}</p>
                                </div>
                                <span className={`px-3 py-1 rounded-full text-xs font-medium ${selectedOwner.status === 'Active' ? 'bg-emerald-100 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400' : 'bg-rose-100 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400'}`}>
                                    {selectedOwner.status}
                                </span>
                            </div>

                            {/* Contact Information */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-gray-50 dark:bg-slate-800/50 p-4 rounded-xl">
                                    <p className="text-xs text-gray-500 dark:text-gray-400 uppercase mb-1">Phone Number</p>
                                    <p className="font-medium text-gray-800 dark:text-gray-200 flex items-center gap-2">
                                        <Phone size={16} className="text-indigo-500" />
                                        {selectedOwner.phone}
                                    </p>
                                </div>
                                <div className="bg-gray-50 dark:bg-slate-800/50 p-4 rounded-xl">
                                    <p className="text-xs text-gray-500 dark:text-gray-400 uppercase mb-1">Email Address</p>
                                    <p className="font-medium text-gray-800 dark:text-gray-200 flex items-center gap-2">
                                        <Mail size={16} className="text-indigo-500" />
                                        {selectedOwner.email || selectedOwner.contact || 'N/A'}
                                    </p>
                                </div>
                                <div className="bg-gray-50 dark:bg-slate-800/50 p-4 rounded-xl">
                                    <p className="text-xs text-gray-500 dark:text-gray-400 uppercase mb-1">Location</p>
                                    <p className="font-medium text-gray-800 dark:text-gray-200 flex items-center gap-2">
                                        <MapPin size={16} className="text-indigo-500" />
                                        {selectedOwner.district}, Mogadishu
                                    </p>
                                </div>
                                <div className="bg-gray-50 dark:bg-slate-800/50 p-4 rounded-xl">
                                    <p className="text-xs text-gray-500 dark:text-gray-400 uppercase mb-1">Risk Level</p>
                                    <p className={`font-medium flex items-center gap-2 ${selectedOwner.riskLevel === 'Low' ? 'text-emerald-600' : selectedOwner.riskLevel === 'Medium' ? 'text-amber-600' : 'text-rose-600'}`}>
                                        <AlertTriangle size={16} />
                                        {selectedOwner.riskLevel} Risk
                                    </p>
                                </div>
                            </div>

                            {/* Portfolio Stats */}
                            <div className="bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 p-4 rounded-xl border border-indigo-100 dark:border-indigo-800">
                                <p className="text-xs text-indigo-600 dark:text-indigo-400 uppercase mb-3 font-medium">Portfolio Overview</p>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <p className="text-sm text-gray-600 dark:text-gray-400">Properties Owned</p>
                                        <p className="text-2xl font-bold text-gray-800 dark:text-white">{selectedOwner.properties || 0}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-gray-600 dark:text-gray-400">Total Value</p>
                                        <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">${((selectedOwner.totalValue || 0) / 1000).toFixed(0)}k</p>
                                    </div>
                                </div>
                            </div>

                            {/* Portal Access */}
                            {selectedOwner.userId && (
                                <div className="bg-emerald-50 dark:bg-emerald-900/20 p-4 rounded-xl border border-emerald-200 dark:border-emerald-800">
                                    <p className="text-sm font-medium text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
                                        <CheckCircle size={16} />
                                        Owner has portal access
                                    </p>
                                    <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1">This owner can log in to view their properties and tax records</p>
                                </div>
                            )}
                        </div>
                        <div className="bg-gray-50 dark:bg-slate-800/30 p-4 flex gap-3">
                            <button onClick={() => setIsViewModalOpen(false)} className="flex-1 py-2.5 text-gray-600 dark:text-gray-300 font-medium hover:bg-gray-200 dark:hover:bg-slate-700 rounded-lg transition-colors">Close</button>
                            <button onClick={() => { setIsViewModalOpen(false); handleEditOwner(selectedOwner); }} className="flex-1 py-2.5 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 shadow-lg flex justify-center items-center gap-2">
                                <Edit size={18} /> Edit Owner
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {/* 8. Reset Password Modal */}
            {isResetPasswordOpen && resetPasswordOwner && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95">
                        <div className="px-6 py-4 border-b border-gray-100 dark:border-slate-800 flex justify-between items-center bg-gradient-to-r from-amber-500 to-orange-500">
                            <h3 className="font-bold text-white flex items-center gap-2">
                                <KeyRound size={20} /> Reset Password
                            </h3>
                            <button onClick={() => { setIsResetPasswordOpen(false); setResetPasswordOwner(null); setNewPasswordValue(''); }}>
                                <X size={20} className="text-white/80 hover:text-white" />
                            </button>
                        </div>
                        <form onSubmit={handleResetPassword} className="p-6 space-y-4">
                            <div className="bg-amber-50 dark:bg-amber-900/20 p-4 rounded-xl border border-amber-200 dark:border-amber-800">
                                <p className="text-sm font-medium text-amber-800 dark:text-amber-300 flex items-center gap-2">
                                    <AlertTriangle size={16} />
                                    Resetting password for:
                                </p>
                                <p className="text-lg font-bold text-gray-800 dark:text-white mt-1">{resetPasswordOwner.name}</p>
                                <p className="text-xs text-gray-500 dark:text-gray-400">{resetPasswordOwner.email || resetPasswordOwner.contact || 'No email'}</p>
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">New Password</label>
                                <input
                                    required
                                    type="password"
                                    value={newPasswordValue}
                                    onChange={e => setNewPasswordValue(e.target.value)}
                                    className="w-full p-2.5 border border-gray-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-gray-800 dark:text-gray-200 focus:ring-2 focus:ring-amber-500 outline-none"
                                    placeholder="Enter new password"
                                    minLength={4}
                                />
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">The owner will use this new password to log in</p>
                            </div>

                            <div className="pt-2 flex gap-3">
                                <button type="button" onClick={() => { setIsResetPasswordOpen(false); setResetPasswordOwner(null); setNewPasswordValue(''); }} className="flex-1 py-2.5 border border-gray-300 dark:border-slate-700 rounded-xl text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-800">Cancel</button>
                                <button type="submit" className="flex-1 py-2.5 bg-amber-600 text-white rounded-xl shadow-lg hover:bg-amber-700 flex items-center justify-center gap-2">
                                    <KeyRound size={18} /> Reset Password
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
