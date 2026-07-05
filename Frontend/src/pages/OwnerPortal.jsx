// pages/OwnerPortal.jsx

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Home, DollarSign, FileText, User, Calendar, MapPin,
    CreditCard, Download, Eye, CheckCircle, Clock,
    AlertTriangle, TrendingUp, Building, Receipt, History,
    Loader, X, XCircle, Printer, Tag, KeyRound, Lock, ArrowRightLeft
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { getProperties, getTaxRecords, recordPayment, changeOwnPassword, getPropertyTransfers, ownerApprovePropertyTransfer, ownerRejectPropertyTransfer } from '../services/api';

const OwnerPortal = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [properties, setProperties] = useState([]);
    const [taxRecords, setTaxRecords] = useState([]);
    const [transferRecords, setTransferRecords] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('overview');
    const [selectedReceipt, setSelectedReceipt] = useState(null);
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
    const [selectedTaxRecord, setSelectedTaxRecord] = useState(null);
    const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
    const [viewTaxRecord, setViewTaxRecord] = useState(null);

    // Payment form state
    const [paymentForm, setPaymentForm] = useState({
        amount: '',
        paymentMethod: 'Cash',
        reference: ''
    });

    // Change Password state
    const [passwordForm, setPasswordForm] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
    });
    const [passwordMessage, setPasswordMessage] = useState({ text: '', type: '' });

    // Fetch data on mount
    useEffect(() => {
        fetchOwnerData();
    }, []);

    const fetchOwnerData = async () => {
        try {
            setIsLoading(true);
            // Fetch properties, tax records, and transfers
            const [propertiesRes, taxRecordsRes, transfersRes] = await Promise.all([
                getProperties(),
                getTaxRecords(),
                getPropertyTransfers()
            ]);

            // Backend filters data by owner role automatically
            // Extract data from API response
            const properties = propertiesRes.data || [];
            const taxRecords = taxRecordsRes.data?.data || taxRecordsRes.data || [];
            const transfers = transfersRes.data?.data || transfersRes.data || [];

            setProperties(Array.isArray(properties) ? properties : []);
            setTaxRecords(Array.isArray(taxRecords) ? taxRecords : []);
            setTransferRecords(Array.isArray(transfers) ? transfers : []);
        } catch (error) {
            console.error('Error fetching owner data:', error);
            setProperties([]);
            setTaxRecords([]);
            setTransferRecords([]);
        } finally {
            setIsLoading(false);
        }
    };

    // Handle payment submission for Mobile Money and Bank Transfer
    const handlePaymentSubmit = async (e) => {
        e.preventDefault();

        // Validate payment method
        if (paymentForm.paymentMethod === 'Cash') {
            alert('Cash payments must be processed by a tax officer. Please visit the tax office.');
            return;
        }

        const maxAmount = selectedTaxRecord.amount - (selectedTaxRecord.paidAmount || 0);
        if (parseFloat(paymentForm.amount) > maxAmount) {
            alert(`You cannot pay more than the outstanding balance of ${formatCurrency(maxAmount)}.`);
            return;
        }

        try {
            await recordPayment({
                taxRecordId: selectedTaxRecord._id,
                amount: paymentForm.amount,
                paymentMethod: paymentForm.paymentMethod,
                reference: paymentForm.reference
            });

            alert('Payment submitted successfully! Your payment will be processed shortly.');

            // Reset form
            setPaymentForm({
                amount: '',
                paymentMethod: 'Mobile Money',
                reference: ''
            });

            // Refresh data
            await fetchOwnerData();

            // Close modal
            setIsPaymentModalOpen(false);
            setSelectedTaxRecord(null);
        } catch (error) {
            console.error('Error recording payment:', error);
            const errorMessage = error.response?.data?.error || 'Failed to submit payment. Please try again.';
            alert(errorMessage);
        }
    };

    // Open payment modal - For display only, owners cannot submit payments
    // Payments must be recorded by staff (Super Admin or Tax Officer)
    const openPaymentModal = (taxRecord) => {
        setSelectedTaxRecord(taxRecord);
        setPaymentForm({
            amount: (taxRecord.amount - (taxRecord.paidAmount || 0)).toString(),
            paymentMethod: 'Mobile Money', // Default to Mobile Money instead of Cash
            reference: ''
        });
        setIsPaymentModalOpen(true);
    };

    // Calculate statistics
    const stats = {
        totalProperties: properties.length,
        totalDue: taxRecords
            .filter(r => r.status === 'Pending' || r.status === 'Partially Paid')
            .reduce((acc, curr) => acc + (curr.amount - (curr.paidAmount || 0)), 0),
        totalPaid: taxRecords
            .filter(r => r.status === 'Paid')
            .reduce((acc, curr) => acc + curr.paidAmount, 0),
        pendingPayments: taxRecords.filter(r => r.status === 'Pending' || r.status === 'Partially Paid').length
    };

    // Helper functions
    const formatCurrency = (amount) => new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD'
    }).format(amount);

    const formatDate = (dateStr) => new Date(dateStr).toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
    });

    // Handle Change Password
    const handleChangePassword = async (e) => {
        e.preventDefault();
        setPasswordMessage({ text: '', type: '' });

        if (passwordForm.newPassword !== passwordForm.confirmPassword) {
            setPasswordMessage({ text: 'New passwords do not match', type: 'error' });
            return;
        }

        try {
            await changeOwnPassword(passwordForm.currentPassword, passwordForm.newPassword);
            setPasswordMessage({ text: 'Password changed successfully!', type: 'success' });
            setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
        } catch (error) {
            setPasswordMessage({
                text: error.response?.data?.message || 'Failed to change password',
                type: 'error'
            });
        }
    };

    const getStatusStyle = (status) => {
        switch (status) {
            case 'Paid':
                return 'bg-green-100 text-green-700 border-green-200';
            case 'Pending':
                return 'bg-amber-100 text-amber-700 border-amber-200';
            case 'Partially Paid':
                return 'bg-blue-100 text-blue-700 border-blue-200';
            case 'Overdue':
                return 'bg-red-100 text-red-700 border-red-200';
            default:
                return 'bg-gray-100 text-gray-700 border-gray-200';
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-screen">
                <div className="text-center">
                    <Loader className="w-12 h-12 mx-auto mb-4 animate-spin text-indigo-600" />
                    <p className="text-gray-600">Loading your portal...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl p-6 text-white shadow-xl">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold mb-2">Welcome, {user.name}!</h1>
                        <p className="text-indigo-100">Manage your properties and tax payments</p>
                    </div>
                    <div className="bg-white/20 p-4 rounded-xl backdrop-blur-sm">
                        <User size={48} />
                    </div>
                </div>
            </div>

            {/* Statistics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
                    <div className="flex items-center justify-between mb-2">
                        <p className="text-gray-500 text-sm font-medium">My Properties</p>
                        <Building className="text-indigo-600" size={24} />
                    </div>
                    <p className="text-3xl font-bold text-gray-800">{stats.totalProperties}</p>
                </div>

                <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
                    <div className="flex items-center justify-between mb-2">
                        <p className="text-gray-500 text-sm font-medium">Total Due</p>
                        <AlertTriangle className="text-amber-600" size={24} />
                    </div>
                    <p className="text-3xl font-bold text-amber-600">{formatCurrency(stats.totalDue)}</p>
                </div>

                <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
                    <div className="flex items-center justify-between mb-2">
                        <p className="text-gray-500 text-sm font-medium">Total Paid</p>
                        <CheckCircle className="text-green-600" size={24} />
                    </div>
                    <p className="text-3xl font-bold text-green-600">{formatCurrency(stats.totalPaid)}</p>
                </div>

                <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
                    <div className="flex items-center justify-between mb-2">
                        <p className="text-gray-500 text-sm font-medium">Pending</p>
                        <Clock className="text-blue-600" size={24} />
                    </div>
                    <p className="text-3xl font-bold text-blue-600">{stats.pendingPayments}</p>
                </div>
            </div>

            {/* Tabs */}
            <div className="bg-white border border-gray-200 rounded-xl shadow-sm">
                <div className="border-b border-gray-200">
                    <div className="flex space-x-1 p-2">
                        <button
                            onClick={() => setActiveTab('overview')}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${activeTab === 'overview'
                                ? 'bg-indigo-600 text-white'
                                : 'text-gray-600 hover:bg-gray-100'
                                }`}
                        >
                            <Home size={18} />
                            Overview
                        </button>
                        <button
                            onClick={() => setActiveTab('properties')}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${activeTab === 'properties'
                                ? 'bg-indigo-600 text-white'
                                : 'text-gray-600 hover:bg-gray-100'
                                }`}
                        >
                            <Building size={18} />
                            My Properties
                        </button>
                        <button
                            onClick={() => setActiveTab('payments')}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${activeTab === 'payments'
                                ? 'bg-indigo-600 text-white'
                                : 'text-gray-600 hover:bg-gray-100'
                                }`}
                        >
                            <DollarSign size={18} />
                            Payments
                        </button>
                        <button
                            onClick={() => setActiveTab('history')}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${activeTab === 'history'
                                ? 'bg-indigo-600 text-white'
                                : 'text-gray-600 hover:bg-gray-100'
                                }`}
                        >
                            <History size={18} />
                            Payment History
                        </button>
                        <button
                            onClick={() => setActiveTab('transfers')}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${activeTab === 'transfers'
                                ? 'bg-indigo-600 text-white'
                                : 'text-gray-600 hover:bg-gray-100'
                                }`}
                        >
                            <ArrowRightLeft size={18} />
                            Transfers
                        </button>
                        <button
                            onClick={() => setActiveTab('profile')}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${activeTab === 'profile'
                                ? 'bg-indigo-600 text-white'
                                : 'text-gray-600 hover:bg-gray-100'
                                }`}
                        >
                            <User size={18} />
                            Profile
                        </button>
                    </div>
                </div>

                <div className="p-6">
                    {/* Overview Tab */}
                    {activeTab === 'overview' && (
                        <div className="space-y-6">
                            <h2 className="text-xl font-bold text-gray-800 mb-4">Recent Activity</h2>

                            {/* Pending Payments */}
                            <div>
                                <h3 className="text-lg font-semibold text-gray-700 mb-3">Pending Payments</h3>
                                {taxRecords.filter(r => r.status === 'Pending' || r.status === 'Partially Paid').length === 0 ? (
                                    <p className="text-gray-500">No pending payments</p>
                                ) : (
                                    <div className="space-y-3">
                                        {taxRecords
                                            .filter(r => r.status === 'Pending' || r.status === 'Partially Paid')
                                            .slice(0, 5)
                                            .map(record => (
                                                <div key={record._id} className="flex items-center justify-between p-4 bg-amber-50 border border-amber-200 rounded-lg">
                                                    <div>
                                                        <p className="font-semibold text-gray-800">{record.propertyId?.address || 'N/A'}</p>
                                                        <p className="text-sm text-gray-600">TAN: {record.taxAccountNumber}</p>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="text-lg font-bold text-amber-600">
                                                            {formatCurrency(record.amount - (record.paidAmount || 0))}
                                                        </p>
                                                        <div className="flex gap-2 justify-end mt-1">
                                                            <button
                                                                onClick={() => {
                                                                    setViewTaxRecord(record);
                                                                    setIsDetailsModalOpen(true);
                                                                }}
                                                                className="p-1 px-2 text-gray-500 hover:bg-gray-100 rounded-lg flex items-center gap-1 text-xs"
                                                                title="View Details"
                                                            >
                                                                <Eye size={16} /> Details
                                                            </button>
                                                            <button
                                                                onClick={() => openPaymentModal(record)}
                                                                className="px-3 py-1 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700"
                                                            >
                                                                Pay Now
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Properties Tab */}
                    {activeTab === 'properties' && (
                        <div>
                            <div className="flex justify-between items-center mb-4">
                                <h2 className="text-xl font-bold text-gray-800">My Properties</h2>
                                <button 
                                    onClick={() => navigate('/map')} 
                                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-xl transition-all flex items-center gap-2 shadow-md"
                                >
                                    <MapPin size={16} /> View on Map
                                </button>
                            </div>
                            {properties.length === 0 ? (
                                <p className="text-gray-500">No properties found</p>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {properties.map(property => (
                                        <div key={property._id} className="border border-gray-200 rounded-xl p-5 hover:shadow-lg transition-shadow">
                                            <div className="flex items-start justify-between mb-3">
                                                <div className="flex items-center gap-3">
                                                    <div className="bg-indigo-100 p-3 rounded-lg">
                                                        <Building className="text-indigo-600" size={24} />
                                                    </div>
                                                    <div>
                                                        <h3 className="font-bold text-gray-800">{property.address}</h3>
                                                        <p className="text-sm text-gray-500">Type: {property.propertyType}</p>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="space-y-2 text-sm">
                                                <div className="flex justify-between">
                                                    <span className="text-gray-600">Size:</span>
                                                    <span className="font-medium">{property.size} sqm</span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span className="text-gray-600">Zone:</span>
                                                    <span className="font-medium">{property.zone}</span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span className="text-gray-600">Status:</span>
                                                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${property.status === 'Active'
                                                        ? 'bg-green-100 text-green-700'
                                                        : 'bg-gray-100 text-gray-700'
                                                        }`}>
                                                        {property.status}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Payments Tab */}
                    {activeTab === 'payments' && (
                        <div>
                            <h2 className="text-xl font-bold text-gray-800 mb-4">Make a Payment</h2>
                            {taxRecords.filter(r => r.status === 'Pending' || r.status === 'Partially Paid').length === 0 ? (
                                <div className="text-center py-12">
                                    <CheckCircle className="w-16 h-16 mx-auto mb-4 text-green-500" />
                                    <p className="text-lg font-medium text-gray-700">All payments are up to date!</p>
                                    <p className="text-gray-500">You have no pending tax payments.</p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {taxRecords
                                        .filter(r => r.status === 'Pending' || r.status === 'Partially Paid')
                                        .map(record => (
                                            <div key={record._id} className="border border-gray-200 rounded-xl p-5">
                                                <div className="flex items-center justify-between">
                                                    <div className="flex-1">
                                                        <div className="flex items-center gap-3 mb-2">
                                                            <Receipt className="text-indigo-600" size={20} />
                                                            <h3 className="font-bold text-gray-800">{record.taxAccountNumber}</h3>
                                                        </div>
                                                        <p className="text-sm text-gray-600 mb-1">
                                                            <MapPin size={14} className="inline mr-1" />
                                                            {record.propertyId?.address || 'N/A'}
                                                        </p>
                                                        <p className="text-sm text-gray-600">
                                                            <Calendar size={14} className="inline mr-1" />
                                                            Due: {formatDate(record.createdAt)}
                                                        </p>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="text-sm text-gray-500 mb-1">Amount Due</p>
                                                        <p className="text-2xl font-bold text-gray-800 mb-3">
                                                            {formatCurrency(record.amount - (record.paidAmount || 0))}
                                                        </p>
                                                        <div className="flex gap-2 justify-end">
                                                            <button
                                                                onClick={() => {
                                                                    setViewTaxRecord(record);
                                                                    setIsDetailsModalOpen(true);
                                                                }}
                                                                className="px-4 py-2 border border-gray-300 text-gray-600 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2"
                                                            >
                                                                <Eye size={18} /> Details
                                                            </button>
                                                            <button
                                                                onClick={() => openPaymentModal(record)}
                                                                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                                                            >
                                                                Pay Now
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Payment History Tab */}
                    {activeTab === 'history' && (
                        <div>
                            <h2 className="text-xl font-bold text-gray-800 mb-4">Payment History</h2>
                            {taxRecords.filter(r => r.status === 'Paid').length === 0 ? (
                                <p className="text-gray-500">No payment history</p>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full">
                                        <thead className="bg-gray-50 border-b border-gray-200">
                                            <tr>
                                                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase">Date</th>
                                                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase">TAN</th>
                                                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase">Property</th>
                                                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-600 uppercase">Amount</th>
                                                <th className="text-center px-4 py-3 text-xs font-semibold text-gray-600 uppercase">Status</th>
                                                <th className="text-center px-4 py-3 text-xs font-semibold text-gray-600 uppercase">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-200">
                                            {taxRecords
                                                .filter(r => r.status === 'Paid')
                                                .map(record => (
                                                    <tr key={record._id} className="hover:bg-gray-50">
                                                        <td className="px-4 py-3 text-sm text-gray-600">
                                                            {formatDate(record.updatedAt)}
                                                        </td>
                                                        <td className="px-4 py-3 text-sm font-mono font-medium text-gray-800">
                                                            {record.taxAccountNumber}
                                                        </td>
                                                        <td className="px-4 py-3 text-sm text-gray-600">
                                                            {record.propertyId?.address || 'N/A'}
                                                            ```
                                                        </td>
                                                        <td className="px-4 py-3 text-sm font-bold text-right text-gray-800">
                                                            {formatCurrency(record.paidAmount)}
                                                        </td>
                                                        <td className="px-4 py-3 text-center">
                                                            <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${getStatusStyle(record.status)}`}>
                                                                <CheckCircle size={14} />
                                                                {record.status}
                                                            </span>
                                                        </td>
                                                        <td className="px-4 py-3 text-center">
                                                            <button
                                                                onClick={() => setSelectedReceipt({
                                                                    id: record.taxAccountNumber,
                                                                    amount: record.paidAmount,
                                                                    date: record.updatedAt,
                                                                    payer: user.name,
                                                                    propertyId: record.propertyId?.address || 'N/A',
                                                                    method: 'Cash',
                                                                    ref: record.taxAccountNumber
                                                                })}
                                                                className="text-indigo-600 hover:text-indigo-800"
                                                            >
                                                                <Eye size={18} />
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Transfers Tab */}
                    {activeTab === 'transfers' && (
                        <div>
                            <h2 className="text-xl font-bold text-gray-800 mb-4">Property Transfers</h2>
                            {transferRecords.length === 0 ? (
                                <div className="text-center py-12 text-gray-500">
                                    <ArrowRightLeft className="w-12 h-12 mx-auto mb-3 opacity-50" />
                                    <p>No property transfers found involving your account.</p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {transferRecords.map(t => (
                                        <div key={t._id} className="border border-gray-200 rounded-xl p-5 shadow-sm">
                                            <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
                                                <div>
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <span className="font-bold text-gray-800 text-lg">{t.propertyId?.address || 'Unknown'}</span>
                                                        <span className={`px-2 py-1 rounded text-xs font-semibold ${
                                                            t.ownerApprovalStatus === 'Pending' ? 'bg-yellow-100 text-yellow-800' :
                                                            t.ownerApprovalStatus === 'Approved' ? 'bg-green-100 text-green-800' :
                                                            t.ownerApprovalStatus === 'Rejected' ? 'bg-red-100 text-red-800' :
                                                            'bg-gray-100 text-gray-800'
                                                        }`}>
                                                            {t.ownerApprovalStatus === 'Not Required' ? t.status : t.ownerApprovalStatus}
                                                        </span>
                                                    </div>
                                                    <p className="text-sm text-gray-600 mb-2">Transfer No: <span className="font-mono">{t.transferNumber}</span> | Type: {t.transferType}</p>
                                                    
                                                    <div className="flex items-center gap-4 text-sm mt-3 bg-gray-50 p-3 rounded-lg border border-gray-100">
                                                        <div className="flex-1">
                                                            <p className="text-xs text-gray-500 uppercase">From</p>
                                                            <p className="font-medium text-gray-800">{t.previousOwnerId?.name === user.name ? 'You' : t.previousOwnerId?.name}</p>
                                                        </div>
                                                        <ArrowRightLeft className="w-4 h-4 text-gray-400" />
                                                        <div className="flex-1 text-right">
                                                            <p className="text-xs text-gray-500 uppercase">To</p>
                                                            <p className="font-medium text-gray-800">{t.newOwnerId?.name === user.name ? 'You' : t.newOwnerId?.name}</p>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Action Buttons for Pending Transfers where the user is the Initial Owner */}
                                                {t.previousOwnerId?._id === user._id && t.ownerApprovalStatus === 'Pending' && (
                                                    <div className="flex flex-col gap-2 min-w-[140px]">
                                                        <button 
                                                            onClick={async () => {
                                                                if(window.confirm('Are you sure you want to approve this transfer? You will lose ownership of this property.')) {
                                                                    try {
                                                                        await ownerApprovePropertyTransfer(t._id);
                                                                        alert('Transfer approved successfully.');
                                                                        fetchOwnerData();
                                                                    } catch (err) {
                                                                        alert(err.response?.data?.message || 'Failed to approve');
                                                                    }
                                                                }
                                                            }}
                                                            className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg flex items-center justify-center gap-2 transition-colors"
                                                        >
                                                            <CheckCircle className="w-4 h-4" /> Approve
                                                        </button>
                                                        <button 
                                                            onClick={async () => {
                                                                const reason = window.prompt('Reason for rejection:');
                                                                if(reason !== null) {
                                                                    try {
                                                                        await ownerRejectPropertyTransfer(t._id, reason);
                                                                        alert('Transfer rejected.');
                                                                        fetchOwnerData();
                                                                    } catch (err) {
                                                                        alert(err.response?.data?.message || 'Failed to reject');
                                                                    }
                                                                }
                                                            }}
                                                            className="px-4 py-2 bg-red-100 hover:bg-red-200 text-red-700 border border-red-200 rounded-lg flex items-center justify-center gap-2 transition-colors"
                                                        >
                                                            <XCircle className="w-4 h-4" /> Reject
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Profile Tab */}
                    {activeTab === 'profile' && (
                        <div>
                            <h2 className="text-xl font-bold text-gray-800 mb-4">My Profile</h2>
                            <div className="max-w-2xl">
                                <div className="bg-gray-50 rounded-xl p-6 space-y-4">
                                    <div className="flex items-center gap-4 mb-6">
                                        <div className="bg-indigo-600 text-white w-20 h-20 rounded-full flex items-center justify-center text-3xl font-bold">
                                            {user.name.charAt(0).toUpperCase()}
                                        </div>
                                        <div>
                                            <h3 className="text-2xl font-bold text-gray-800">{user.name}</h3>
                                            <p className="text-gray-600">{user.role}</p>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="border-l-4 border-indigo-600 pl-4">
                                            <p className="text-sm text-gray-500">Total Properties</p>
                                            <p className="text-2xl font-bold text-gray-800">{stats.totalProperties}</p>
                                        </div>
                                        <div className="border-l-4 border-green-600 pl-4">
                                            <p className="text-sm text-gray-500">Total Paid</p>
                                            <p className="text-2xl font-bold text-green-600">{formatCurrency(stats.totalPaid)}</p>
                                        </div>
                                        <div className="border-l-4 border-amber-600 pl-4">
                                            <p className="text-sm text-gray-500">Total Due</p>
                                            <p className="text-2xl font-bold text-amber-600">{formatCurrency(stats.totalDue)}</p>
                                        </div>
                                        <div className="border-l-4 border-blue-600 pl-4">
                                            <p className="text-sm text-gray-500">Pending Payments</p>
                                            <p className="text-2xl font-bold text-blue-600">{stats.pendingPayments}</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Change Password Section */}
                                <div className="mt-6 bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
                                    <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                                        <KeyRound size={20} className="text-indigo-600" />
                                        Change Password
                                    </h3>

                                    {passwordMessage.text && (
                                        <div className={`mb-4 p-3 rounded-lg text-sm flex items-center gap-2 ${passwordMessage.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                                            {passwordMessage.type === 'success' ? <CheckCircle size={16} /> : <AlertTriangle size={16} />}
                                            {passwordMessage.text}
                                        </div>
                                    )}

                                    <form onSubmit={handleChangePassword} className="space-y-4">
                                        <div>
                                            <label className="block text-xs font-medium text-gray-700 mb-1">Current Password</label>
                                            <div className="relative">
                                                <Lock className="absolute left-3 top-2.5 text-gray-400" size={16} />
                                                <input
                                                    required
                                                    type="password"
                                                    value={passwordForm.currentPassword}
                                                    onChange={e => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                                                    className="w-full pl-10 p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-gray-800"
                                                    placeholder="Enter current password"
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-gray-700 mb-1">New Password</label>
                                            <div className="relative">
                                                <KeyRound className="absolute left-3 top-2.5 text-gray-400" size={16} />
                                                <input
                                                    required
                                                    type="password"
                                                    value={passwordForm.newPassword}
                                                    onChange={e => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                                                    className="w-full pl-10 p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-gray-800"
                                                    placeholder="Enter new password"
                                                    minLength={4}
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-gray-700 mb-1">Confirm New Password</label>
                                            <div className="relative">
                                                <KeyRound className="absolute left-3 top-2.5 text-gray-400" size={16} />
                                                <input
                                                    required
                                                    type="password"
                                                    value={passwordForm.confirmPassword}
                                                    onChange={e => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                                                    className="w-full pl-10 p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-gray-800"
                                                    placeholder="Confirm new password"
                                                    minLength={4}
                                                />
                                            </div>
                                        </div>
                                        <button
                                            type="submit"
                                            className="w-full py-2.5 bg-indigo-600 text-white rounded-xl shadow-lg hover:bg-indigo-700 flex items-center justify-center gap-2 font-medium"
                                        >
                                            <KeyRound size={18} />
                                            Update Password
                                        </button>
                                    </form>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Payment Modal - Enhanced Modern Design */}
            {isPaymentModalOpen && selectedTaxRecord && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
                        {/* Header */}
                        <div className="px-8 py-6 bg-gradient-to-r from-indigo-600 to-purple-600 flex justify-between items-center text-white">
                            <div className="flex items-center gap-3">
                                <div className="bg-white/20 p-2 rounded-xl backdrop-blur-sm">
                                    <CreditCard size={24} className="text-white" />
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold">Complete Payment</h2>
                                    <p className="text-indigo-100 text-sm">Securely pay your property taxes</p>
                                </div>
                            </div>
                            <button
                                onClick={() => {
                                    setIsPaymentModalOpen(false);
                                    setSelectedTaxRecord(null);
                                }}
                                className="text-white/80 hover:text-white bg-white/10 hover:bg-white/20 p-2 rounded-full transition-colors"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handlePaymentSubmit} className="p-8 space-y-8">
                            {/* Summary Cards */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="bg-gray-50 p-5 rounded-2xl border border-gray-100 shadow-sm flex items-start gap-4">
                                    <div className="bg-indigo-100 p-3 rounded-xl shrink-0">
                                        <Building size={20} className="text-indigo-600" />
                                    </div>
                                    <div>
                                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Property Details</p>
                                        <p className="font-bold text-gray-800 text-sm">{selectedTaxRecord.propertyId?.address || 'N/A'}</p>
                                        <p className="text-xs text-gray-500 mt-1 font-mono bg-gray-200 inline-block px-2 py-0.5 rounded">TAN: {selectedTaxRecord.taxAccountNumber}</p>
                                    </div>
                                </div>

                                <div className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-100 p-5 rounded-2xl shadow-sm flex items-center justify-between">
                                    <div>
                                        <p className="text-xs font-semibold text-amber-700 uppercase tracking-wider mb-1">Total Due</p>
                                        <p className="text-3xl font-black text-amber-600">
                                            {formatCurrency(selectedTaxRecord.amount - (selectedTaxRecord.paidAmount || 0))}
                                        </p>
                                    </div>
                                    <div className="bg-amber-100 p-3 rounded-full shrink-0">
                                        <AlertTriangle size={24} className="text-amber-600" />
                                    </div>
                                </div>
                            </div>

                            {/* Payment Method Cards */}
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-3">Select Payment Method</label>
                                <div className="grid grid-cols-3 gap-4">
                                    {[
                                        { id: 'Mobile Money', icon: <DollarSign size={20} />, label: 'Mobile Money', desc: 'Fast & Secure' },
                                        { id: 'Bank Transfer', icon: <Building size={20} />, label: 'Bank Transfer', desc: 'Direct Transfer' },
                                        { id: 'Cash', icon: <Receipt size={20} />, label: 'Cash', desc: 'At Tax Office', disabled: true }
                                    ].map((method) => (
                                        <button
                                            type="button"
                                            key={method.id}
                                            disabled={method.disabled}
                                            onClick={() => setPaymentForm({ ...paymentForm, paymentMethod: method.id })}
                                            className={`relative p-4 rounded-2xl border-2 transition-all flex flex-col items-center justify-center gap-2 text-center ${
                                                method.disabled ? 'opacity-50 cursor-not-allowed bg-gray-50 border-gray-200' :
                                                paymentForm.paymentMethod === method.id 
                                                ? 'border-indigo-600 bg-indigo-50 shadow-md ring-4 ring-indigo-50' 
                                                : 'border-gray-200 hover:border-indigo-300 hover:bg-gray-50'
                                            }`}
                                        >
                                            {paymentForm.paymentMethod === method.id && (
                                                <div className="absolute top-2 right-2 bg-indigo-600 text-white rounded-full p-0.5">
                                                    <CheckCircle size={14} />
                                                </div>
                                            )}
                                            <div className={`${paymentForm.paymentMethod === method.id ? 'text-indigo-600' : 'text-gray-500'}`}>
                                                {method.icon}
                                            </div>
                                            <div>
                                                <p className={`text-sm font-bold ${paymentForm.paymentMethod === method.id ? 'text-indigo-900' : 'text-gray-700'}`}>{method.label}</p>
                                                <p className="text-[10px] text-gray-500">{method.desc}</p>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="grid grid-cols-1 gap-6">
                                {/* Amount Input with Quick Select */}
                                <div>
                                    <div className="flex justify-between items-end mb-2">
                                        <label className="block text-sm font-semibold text-gray-700">Amount to Pay</label>
                                        <button 
                                            type="button"
                                            onClick={() => setPaymentForm({ ...paymentForm, amount: (selectedTaxRecord.amount - (selectedTaxRecord.paidAmount || 0)).toString() })}
                                            className="text-xs font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 px-3 py-1 rounded-full transition-colors"
                                        >
                                            Pay Full Amount
                                        </button>
                                    </div>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                            <span className="text-gray-500 font-bold text-lg">$</span>
                                        </div>
                                        <input
                                            type="number"
                                            required
                                            min="0.01"
                                            max={selectedTaxRecord.amount - (selectedTaxRecord.paidAmount || 0)}
                                            step="0.01"
                                            value={paymentForm.amount}
                                            onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                                            className="w-full pl-10 pr-4 py-4 text-xl font-bold bg-gray-50 border border-gray-200 rounded-2xl focus:bg-white focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 outline-none text-gray-800 transition-all"
                                            placeholder="0.00"
                                        />
                                    </div>
                                </div>

                                {/* Essential Payment Details */}
                                {paymentForm.paymentMethod === 'Mobile Money' && (
                                    <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                                            Mobile Money Phone Number <span className="text-red-500">*</span>
                                        </label>
                                        <div className="relative">
                                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                                <Tag size={18} className="text-gray-400" />
                                            </div>
                                            <input
                                                type="text"
                                                required
                                                value={paymentForm.reference}
                                                onChange={(e) => setPaymentForm({ ...paymentForm, reference: e.target.value })}
                                                className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 outline-none text-gray-800 transition-all"
                                                placeholder="e.g., 252 61..."
                                            />
                                        </div>
                                        <p className="text-xs text-gray-500 mt-2 ml-1">Enter the mobile number you are paying from.</p>
                                    </div>
                                )}

                                {paymentForm.paymentMethod === 'Bank Transfer' && (
                                    <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                                            Bank Account Name <span className="text-red-500">*</span>
                                        </label>
                                        <div className="relative">
                                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                                <User size={18} className="text-gray-400" />
                                            </div>
                                            <input
                                                type="text"
                                                required
                                                value={paymentForm.reference}
                                                onChange={(e) => setPaymentForm({ ...paymentForm, reference: e.target.value })}
                                                className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 outline-none text-gray-800 transition-all"
                                                placeholder="e.g., John Doe"
                                            />
                                        </div>
                                        <p className="text-xs text-gray-500 mt-2 ml-1">Enter the name on your bank account.</p>
                                    </div>
                                )}
                            </div>

                            <div className="bg-blue-50/50 border border-blue-100 p-4 rounded-xl flex gap-3 items-start">
                                <div className="bg-blue-100 p-1.5 rounded-full shrink-0">
                                    <Lock size={14} className="text-blue-600" />
                                </div>
                                <p className="text-xs text-blue-800 leading-relaxed">
                                    <strong>Secure Payment:</strong> Your transaction is encrypted and secure. 
                                    Payments are subject to verification before your balance is updated.
                                </p>
                            </div>

                            <div className="flex gap-4 pt-4 border-t border-gray-100">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setIsPaymentModalOpen(false);
                                        setSelectedTaxRecord(null);
                                    }}
                                    className="flex-1 py-4 font-bold text-gray-600 bg-gray-100 rounded-2xl hover:bg-gray-200 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="flex-[2] py-4 font-bold text-white bg-indigo-600 rounded-2xl hover:bg-indigo-700 shadow-lg hover:shadow-indigo-500/30 transition-all flex items-center justify-center gap-2"
                                >
                                    <DollarSign size={20} />
                                    Confirm Payment of {formatCurrency(paymentForm.amount || 0)}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Tax Details Modal */}
            {isDetailsModalOpen && viewTaxRecord && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden animate-in zoom-in-95">
                        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                            <h2 className="font-bold text-gray-800">Tax Record Details</h2>
                            <button
                                onClick={() => {
                                    setIsDetailsModalOpen(false);
                                    setViewTaxRecord(null);
                                }}
                                className="text-gray-400 hover:text-gray-600"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div className="p-6 space-y-6">
                            {/* Header Info Grid */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Property</p>
                                    <p className="font-bold text-gray-800 truncate">{viewTaxRecord.propertyId?.address || 'N/A'}</p>
                                    <p className="text-xs text-gray-500 mt-1">{viewTaxRecord.propertyId?.district}, Mogadishu</p>
                                </div>
                                <div className="bg-indigo-50 border border-indigo-100 p-4 rounded-xl">
                                    <p className="text-xs font-medium text-indigo-700 uppercase tracking-wide mb-1">Tax Account (TAN)</p>
                                    <p className="text-xl font-mono font-bold text-indigo-700">{viewTaxRecord.taxAccountNumber}</p>
                                    <p className="text-xs text-indigo-500 mt-1">Year: {viewTaxRecord.taxYear}</p>
                                </div>
                            </div>

                            {/* Calculation Details */}
                            <div>
                                <h3 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-2">
                                    <Building size={16} className="text-gray-500" /> Calculation Breakdown
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div className="p-3 border border-gray-200 rounded-lg">
                                        <p className="text-xs text-gray-500 mb-1">Rule Applied</p>
                                        <p className="font-medium text-gray-800 text-sm">{viewTaxRecord.calculationDetails?.ruleApplied || 'Standard Rate'}</p>
                                    </div>
                                    <div className="p-3 border border-gray-200 rounded-lg">
                                        <p className="text-xs text-gray-500 mb-1">Method</p>
                                        <p className="font-medium text-gray-800 text-sm">{viewTaxRecord.calculationDetails?.method || 'N/A'}</p>
                                    </div>
                                    <div className="p-3 border border-gray-200 rounded-lg">
                                        <p className="text-xs text-gray-500 mb-1">Rate</p>
                                        <p className="font-medium text-gray-800 text-sm">
                                            {typeof viewTaxRecord.calculationDetails?.rateApplied === 'number'
                                                ? `${viewTaxRecord.calculationDetails.rateApplied}%`
                                                : viewTaxRecord.calculationDetails?.rateApplied || 'N/A'}
                                        </p>
                                    </div>
                                </div>
                                {viewTaxRecord.calculationDetails?.note && (
                                    <div className="mt-3 p-3 bg-gray-50 rounded-lg text-xs text-gray-600 italic">
                                        Note: {viewTaxRecord.calculationDetails.note}
                                    </div>
                                )}
                            </div>

                            <hr className="border-gray-100" />

                            {/* Financial Summary */}
                            <div className="space-y-2">
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-gray-600">Total Tax Amount</span>
                                    <span className="font-bold text-gray-800">{formatCurrency(viewTaxRecord.amount)}</span>
                                </div>
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-gray-600">Amount Paid</span>
                                    <span className="font-bold text-green-600">-{formatCurrency(viewTaxRecord.paidAmount || 0)}</span>
                                </div>
                                <div className="flex justify-between items-center pt-2 border-t border-gray-100">
                                    <span className="font-medium text-gray-800">Balance Due</span>
                                    <span className="text-xl font-bold text-amber-600">
                                        {formatCurrency(viewTaxRecord.amount - (viewTaxRecord.paidAmount || 0))}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-end gap-3">
                            <button
                                onClick={() => {
                                    setIsDetailsModalOpen(false);
                                    setViewTaxRecord(null);
                                }}
                                className="px-5 py-2.5 bg-white border border-gray-300 text-gray-700 font-medium rounded-xl hover:bg-gray-50 shadow-sm transition-colors"
                            >
                                Close
                            </button>
                            {(viewTaxRecord.amount - (viewTaxRecord.paidAmount || 0)) > 0 && (
                                <button
                                    onClick={() => {
                                        setIsDetailsModalOpen(false);
                                        openPaymentModal(viewTaxRecord);
                                    }}
                                    className="px-5 py-2.5 bg-indigo-600 text-white font-medium rounded-xl hover:bg-indigo-700 shadow-md transition-colors flex items-center gap-2"
                                >
                                    <DollarSign size={18} /> Make Payment
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Receipt Modal */}
            {selectedReceipt && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
                        <div className="bg-gray-900 text-white p-6 text-center relative overflow-hidden">
                            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-400 via-teal-500 to-indigo-500"></div>
                            <div className="flex justify-center mb-3">
                                <div className="h-12 w-12 bg-white/10 rounded-full flex items-center justify-center backdrop-blur-md border border-white/20">
                                    <DollarSign size={24} className="text-emerald-400" />
                                </div>
                            </div>
                            <h3 className="text-lg font-bold tracking-wider">OFFICIAL RECEIPT</h3>
                            <p className="text-gray-400 text-xs uppercase tracking-widest">Revenue Authority</p>
                        </div>

                        <div className="p-8 bg-white relative">
                            <div className="text-center mb-8">
                                <p className="text-3xl font-bold text-gray-900">{formatCurrency(selectedReceipt.amount)}</p>
                                <p className="text-sm text-emerald-600 font-medium flex justify-center items-center gap-1 mt-1">
                                    <CheckCircle size={14} /> Payment Successful
                                </p>
                            </div>

                            <div className="space-y-4 text-sm">
                                <div className="flex justify-between border-b border-gray-100 pb-2">
                                    <span className="text-gray-500 flex items-center gap-1"><Tag size={14} /> Receipt No</span>
                                    <span className="font-mono font-medium text-gray-800">{selectedReceipt.id}</span>
                                </div>
                                <div className="flex justify-between border-b border-gray-100 pb-2">
                                    <span className="text-gray-500 flex items-center gap-1"><Calendar size={14} /> Date Paid</span>
                                    <span className="font-medium text-gray-800">{formatDate(selectedReceipt.date)}</span>
                                </div>
                                <div className="flex justify-between border-b border-gray-100 pb-2">
                                    <span className="text-gray-500 flex items-center gap-1"><User size={14} /> Payer Name</span>
                                    <span className="font-medium text-gray-800">{selectedReceipt.payer}</span>
                                </div>
                                <div className="flex justify-between border-b border-gray-100 pb-2">
                                    <span className="text-gray-500 flex items-center gap-1"><MapPin size={14} /> Property</span>
                                    <span className="font-medium text-gray-800">{selectedReceipt.propertyId}</span>
                                </div>
                                <div className="flex justify-between border-b border-gray-100 pb-2">
                                    <span className="text-gray-500 flex items-center gap-1"><CreditCard size={14} /> Payment Method</span>
                                    <span className="font-medium text-gray-800">{selectedReceipt.method}</span>
                                </div>
                            </div>

                            <div className="mt-8 pt-4 border-t-2 border-dashed border-gray-200">
                                <div className="h-12 bg-gray-100 rounded w-full flex items-center justify-center text-gray-400 text-xs tracking-[0.5em] font-mono">
                                    ||| || ||| || |||| |||
                                </div>
                            </div>
                        </div>

                        <div className="bg-gray-50 p-4 flex gap-3">
                            <button
                                onClick={() => setSelectedReceipt(null)}
                                className="flex-1 py-2.5 text-gray-600 font-medium hover:bg-gray-200 rounded-lg transition-colors"
                            >
                                Close
                            </button>
                            <button className="flex-1 py-2.5 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 shadow-lg flex justify-center items-center gap-2">
                                <Printer size={18} /> Print
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default OwnerPortal;
