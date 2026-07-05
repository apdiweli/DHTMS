import React, { useState, useMemo, useEffect } from 'react';
import {
    DollarSign, ClipboardList, PlusCircle, Search, MapPin, AlertTriangle,
    Lock, Eye, Download, Calendar, Filter, X, CheckCircle, Clock,
    CreditCard, Smartphone, Banknote, Printer, Copy, MoreHorizontal,
    FileText, User, Tag, TrendingUp, TrendingDown, Layers
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { getTaxRecords, recordPayment, getProperties, sendPaymentReminders } from '../services/api';

// Define the available status options
const STATUS_OPTIONS = ['All', 'Pending', 'Paid', 'Overdue', 'Partially Paid'];



// 5. NEW: A simple form modal (Mockup)
const NewPaymentFormModal = ({ isOpen, onClose, onSubmit, taxRecords, properties }) => {
    const [formData, setFormData] = useState({
        taxRecordId: '',
        amount: '',
        paymentMethod: 'Cash',
        reference: ''
    });

    if (!isOpen) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        await onSubmit(formData);
        setFormData({ taxRecordId: '', amount: '', paymentMethod: 'Cash', reference: '' });
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
            <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-xl shadow-2xl relative animate-in slide-in-from-top-10 duration-300">
                <div className="flex justify-between items-center p-6 border-b border-gray-100 dark:border-slate-800">
                    <h2 className="text-xl font-bold text-gray-800 dark:text-white flex items-center gap-2"><PlusCircle size={20} className="text-emerald-500" /> Record New Payment</h2>
                    <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-full transition-colors"><X size={20} /></button>
                </div>
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div>
                        <label htmlFor="taxRecord" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tax Record (TAN)</label>
                        <select
                            id="taxRecord"
                            required
                            value={formData.taxRecordId}
                            onChange={e => setFormData({ ...formData, taxRecordId: e.target.value })}
                            className="w-full p-2 border-gray-300 dark:border-slate-700 rounded-lg shadow-sm focus:border-indigo-500 focus:ring-indigo-500 bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
                        >
                            <option value="">Select Tax Record</option>
                            {taxRecords.filter(r => r.status === 'Pending' || r.status === 'Partially Paid').map(record => (
                                <option key={record._id} value={record._id}>
                                    {record.taxAccountNumber} - ${record.amount} - Property: {record.propertyId?.taxAccountNumber || record.propertyId?.address || 'N/A'} - Owner: {record.ownerId?.name || 'N/A'}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label htmlFor="amount" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Amount ($)</label>
                        <input
                            type="number"
                            id="amount"
                            required
                            value={formData.amount}
                            onChange={e => setFormData({ ...formData, amount: e.target.value })}
                            className="w-full p-2 border-gray-300 dark:border-slate-700 rounded-lg shadow-sm focus:border-indigo-500 focus:ring-indigo-500 bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
                            placeholder="e.g., 2500"
                        />
                    </div>
                    <div>
                        <label htmlFor="reference" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Reference Number</label>
                        <input
                            type="text"
                            id="reference"
                            value={formData.reference}
                            onChange={e => setFormData({ ...formData, reference: e.target.value })}
                            className="w-full p-2 border-gray-300 dark:border-slate-700 rounded-lg shadow-sm focus:border-indigo-500 focus:ring-indigo-500 bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
                            placeholder="e.g., CASH-REC-001"
                        />
                    </div>
                    <div>
                        <label htmlFor="method" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Payment Method</label>
                        <select
                            id="method"
                            required
                            value={formData.paymentMethod}
                            onChange={e => setFormData({ ...formData, paymentMethod: e.target.value })}
                            className="w-full p-2 border-gray-300 dark:border-slate-700 rounded-lg shadow-sm focus:border-indigo-500 focus:ring-indigo-500 bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
                        >
                            <option value="Cash">Cash</option>
                            <option value="Bank Transfer">Bank Transfer</option>
                            <option value="Mobile Money">Mobile Money</option>
                        </select>
                    </div>

                    <div className="pt-4">
                        <button type="submit" className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 shadow-lg shadow-emerald-200 dark:shadow-emerald-900/40 transition-all font-semibold">
                            Submit Payment
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
// END NEW: Simple form modal

export default function PaymentRecords() {
    const { user } = useAuth();
    const [taxRecords, setTaxRecords] = useState([]);
    const [properties, setProperties] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('All');
    const [selectedReceipt, setSelectedReceipt] = useState(null);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    // Fetch tax records on mount
    useEffect(() => {
        fetchTaxRecords();
    }, []);

    const fetchTaxRecords = async () => {
        try {
            setIsLoading(true);
            const [taxResponse, propResponse] = await Promise.all([
                getTaxRecords(),
                getProperties()
            ]);

            // Backend returns { success: true, data: [...] }
            // Axios wraps it in response.data
            const records = taxResponse.data?.data || taxResponse.data || [];
            setTaxRecords(Array.isArray(records) ? records : []);

            const props = propResponse.data || [];
            setProperties(Array.isArray(props) ? props : []);
        } catch (error) {
            console.error('Error fetching data:', error);
            setTaxRecords([]); // Set empty array on error
            setProperties([]);
        } finally {
            setIsLoading(false);
        }
    };

    // Handle payment submission
    const handlePaymentSubmit = async (formData) => {
        try {
            await recordPayment(formData);
            alert('Payment recorded successfully!');
            fetchTaxRecords(); // Refresh data
        } catch (error) {
            console.error('Error recording payment:', error);
            alert('Failed to record payment');
        }
    };

    // Handle sending payment reminders
    const handleSendReminders = async () => {
        try {
            // Get all unpaid tax records
            const unpaidRecords = taxRecords.filter(r => r.status === 'Pending' || r.status === 'Overdue' || r.status === 'Partially Paid');

            if (unpaidRecords.length === 0) {
                alert('No unpaid tax records found!');
                return;
            }

            const confirmSend = window.confirm(`Send payment reminders to ${unpaidRecords.length} owners with unpaid taxes?`);
            if (!confirmSend) return;

            const taxRecordIds = unpaidRecords.map(r => r._id);
            const response = await sendPaymentReminders(taxRecordIds);

            alert(response.data.message);
            fetchTaxRecords(); // Refresh data
        } catch (error) {
            console.error('Error sending reminders:', error);
            alert('Failed to send reminders');
        }
    };

    // --- STATS CALCULATION ---
    const stats = useMemo(() => {
        return {
            totalRevenue: taxRecords.reduce((acc, curr) => curr.status === 'Paid' ? acc + curr.paidAmount : acc, 0),
            pendingClearance: taxRecords.filter(p => p.status === 'Pending').reduce((acc, curr) => acc + curr.amount, 0),
            transactions: taxRecords.length,
            todayCount: taxRecords.filter(p => {
                const recordDate = new Date(p.createdAt);
                const today = new Date();
                return recordDate.toDateString() === today.toDateString();
            }).length
        };
    }, [taxRecords]);

    // Handle exporting payment records to CSV
    const handleExportLog = () => {
        try {
            // Prepare CSV headers
            const headers = ['TAN', 'Property Address', 'Owner Name', 'Amount', 'Paid Amount', 'Status', 'Tax Year', 'Created Date'];

            // Prepare CSV rows
            const rows = filteredRecords.map(record => [
                record.taxAccountNumber || '',
                record.propertyId?.address || 'N/A',
                record.ownerId?.name || 'N/A',
                record.amount.toFixed(2),
                (record.paidAmount || 0).toFixed(2),
                record.status,
                record.taxYear || new Date().getFullYear(),
                formatDate(record.createdAt)
            ]);

            // Combine headers and rows
            const csvContent = [
                headers.join(','),
                ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
            ].join('\n');

            // Create blob and download
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            const url = URL.createObjectURL(blob);

            link.setAttribute('href', url);
            link.setAttribute('download', `payment_records_${new Date().toISOString().split('T')[0]}.csv`);
            link.style.visibility = 'hidden';

            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            alert(`Exported ${filteredRecords.length} records successfully!`);
        } catch (error) {
            console.error('Error exporting records:', error);
            alert('Failed to export records');
        }
    };

    // --- PERMISSION GATE (Unchanged) ---
    if (!user.permissions.canProcessPayment) {
        return (
            <div className="flex flex-col items-center justify-center h-64 bg-red-50 rounded-xl border border-red-100 m-6">
                <div className="bg-red-100 p-4 rounded-full mb-4"><Lock className="text-red-600" size={32} /></div>
                <h2 className="text-xl font-bold text-gray-800">Restricted Access</h2>
                <p className="text-gray-500">Financial records require higher clearance.</p>
            </div>
        );
    }

    // --- FILTERING ---
    const filteredRecords = taxRecords.filter(record => {
        // Only show records with valid property references
        if (!record.propertyId) return false;

        const propertyAddress = record.propertyId?.address || '';
        const ownerName = record.ownerId?.name || '';
        const tan = record.taxAccountNumber || '';

        const matchesSearch =
            propertyAddress.toLowerCase().includes(searchTerm.toLowerCase()) ||
            ownerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            tan.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = statusFilter === 'All' || record.status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    // --- HELPERS (Unchanged) ---
    const formatCurrency = (amount) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
    const formatDate = (dateStr) => new Date(dateStr).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

    const getMethodIcon = (method) => {
        if (method === 'Cash') return <Banknote size={16} />;
        if (method === 'Mobile Money') return <Smartphone size={16} />;
        return <CreditCard size={16} />;
    };

    const getStatusIcon = (status) => {
        switch (status) {
            case 'Verified': return <CheckCircle size={14} />;
            case 'Completed': return <FileText size={14} />;
            case 'Pending': return <Clock size={14} />;
            default: return <Layers size={14} />;
        }
    };

    const getStatusStyle = (status) => {
        switch (status) {
            case 'Verified':
                return 'bg-blue-100 text-blue-700 border-blue-200';
            case 'Completed':
                return 'bg-gray-100 text-gray-700 border-gray-200';
            case 'Pending':
                return 'bg-amber-100 text-amber-700 border-amber-200';
            default:
                return 'bg-gray-100 text-gray-700';
        }
    };

    // Corrected Table Header for consistent padding and alignment
    const TableHeader = () => (
        <thead className="bg-gray-50 dark:bg-slate-800/50 border-b border-gray-100 dark:border-slate-800">
            <tr>
                <th className="p-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Transaction Info</th>
                <th className="p-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Property & Payer</th>
                <th className="p-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Amount</th>
                <th className="p-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                {/* 1. Removed 'text-right' to align actions to the left */}
                <th className="p-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
            </tr>
        </thead>
    );

    return (
        <div className="space-y-6 animate-in fade-in duration-500">

            {/* 1. Header & Stats Pulse (Unchanged) */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
                        <TrendingUp size={24} className="text-emerald-600 dark:text-emerald-400" /> Revenue Operations
                    </h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Track collections, verify transactions, and issue receipts.</p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={handleExportLog}
                        className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-600 dark:text-gray-300 rounded-xl hover:bg-gray-50 dark:hover:bg-slate-700 shadow-sm transition-all"
                    >
                        <Download size={18} /> Export Log
                    </button>
                    <button
                        onClick={handleSendReminders}
                        className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-xl hover:bg-orange-700 shadow-lg shadow-orange-200 dark:shadow-orange-900/40 transition-all"
                    >
                        <AlertTriangle size={18} /> Send Reminders
                    </button>
                    <button
                        onClick={() => setIsFormOpen(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 shadow-lg shadow-emerald-200 dark:shadow-emerald-900/40 transition-all"
                    >
                        <PlusCircle size={18} /> Record Payment
                    </button>
                </div>
            </div>

            {/* Financial Pulse Cards (Unchanged) */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl p-5 text-white shadow-lg">
                    <p className="text-emerald-100 text-xs font-medium uppercase tracking-wider mb-1">Total Revenue Collected</p>
                    <div className="flex items-end justify-between">
                        <span className="text-3xl font-bold">{formatCurrency(stats.totalRevenue)}</span>
                        <div className="bg-white/20 p-2 rounded-lg"><DollarSign size={20} /></div>
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm transition-colors">
                    <p className="text-gray-500 dark:text-gray-400 text-xs font-medium uppercase tracking-wider mb-1">Pending Clearance</p>
                    <div className="flex items-end justify-between">
                        <span className="text-2xl font-bold text-amber-500">{formatCurrency(stats.pendingClearance)}</span>
                        <div className="bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 p-2 rounded-lg"><Clock size={20} /></div>
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm transition-colors">
                    <p className="text-gray-500 dark:text-gray-400 text-xs font-medium uppercase tracking-wider mb-1">Transactions Today</p>
                    <div className="flex items-end justify-between">
                        <span className="text-2xl font-bold text-gray-800 dark:text-white">{stats.todayCount}</span>
                        <div className="bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 p-2 rounded-lg"><ClipboardList size={20} /></div>
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm transition-colors">
                    <p className="text-gray-500 dark:text-gray-400 text-xs font-medium uppercase tracking-wider mb-1">Success Rate</p>
                    <div className="flex items-end justify-between">
                        <span className="text-2xl font-bold text-gray-800 dark:text-white">98.2%</span>
                        <div className="bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 p-2 rounded-lg"><CheckCircle size={20} /></div>
                    </div>
                </div>
            </div>

            <hr className="border-gray-200" />

            {/* 2. Advanced Toolbar (With Select Filter) (Unchanged, but added aria-label for accessibility) */}
            <div className="bg-white dark:bg-slate-900 p-2 rounded-xl border border-gray-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row gap-2 transition-colors">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
                    <input
                        type="text"
                        placeholder="Search Property, Payer, or Ref ID..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-slate-800 border-transparent rounded-lg focus:bg-white dark:focus:bg-slate-700 focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-sm text-gray-900 dark:text-white"
                        aria-label="Search payments" // Added accessibility label
                    />
                </div>

                {/* Status Filter using Select */}
                <div className="relative flex items-center gap-2">
                    <Filter className="text-gray-400 ml-2 absolute left-0" size={18} />
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="w-full md:w-auto appearance-none bg-gray-50 dark:bg-slate-800 border border-transparent rounded-lg py-2 pl-8 pr-8 text-sm font-medium text-gray-700 dark:text-gray-300 focus:bg-white dark:focus:bg-slate-700 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                        aria-label="Filter by status"
                    >
                        <option value="All">All Statuses</option>
                        {STATUS_OPTIONS.filter(s => s !== 'All').map(status => (
                            <option key={status} value={status}>
                                {status}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            {/* 3. Payment Records Table */}
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-800 shadow-sm overflow-hidden transition-colors">
                {isLoading ? (
                    <div className="flex items-center justify-center h-64">
                        <div className="text-gray-500 dark:text-gray-400">Loading tax records...</div>
                    </div>
                ) : filteredRecords.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-64 text-gray-500 dark:text-gray-400">
                        <AlertTriangle size={48} className="mb-4 text-gray-300 dark:text-gray-600" />
                        <p className="text-lg font-medium">No records found</p>
                        <p className="text-sm">Try adjusting your search or filters</p>
                    </div>
                ) : (
                    <table className="w-full">
                        <TableHeader />
                        <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                            {filteredRecords.map((record) => (
                                <tr key={record._id} className="hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors">
                                    <td className="p-4">
                                        <div className="flex items-start gap-3">
                                            <div className="bg-indigo-50 dark:bg-indigo-900/20 p-2 rounded-lg">
                                                <FileText size={18} className="text-indigo-600 dark:text-indigo-400" />
                                            </div>
                                            <div>
                                                <p className="font-mono text-sm font-bold text-gray-800 dark:text-white">{record.taxAccountNumber}</p>
                                                <p className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                                                    <Calendar size={12} /> {formatDate(record.createdAt)}
                                                </p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="p-4">
                                        <div>
                                            <p className="text-sm font-medium text-gray-800 dark:text-white flex items-center gap-1">
                                                <Tag size={14} className="text-gray-400" />
                                                Property ID: {record.propertyId?.taxAccountNumber || 'N/A'}
                                            </p>
                                            <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1 mt-1">
                                                <MapPin size={12} />
                                                {record.propertyId?.address || 'N/A'}
                                            </p>
                                            <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1 mt-1">
                                                <User size={12} />
                                                Owner: {record.ownerId?.name || 'N/A'}
                                            </p>
                                        </div>
                                    </td>
                                    <td className="p-4">
                                        <div>
                                            <p className="text-lg font-bold text-gray-800 dark:text-white">{formatCurrency(record.amount)}</p>
                                            {record.paidAmount > 0 && (
                                                <p className="text-xs text-emerald-600 font-medium">
                                                    Paid: {formatCurrency(record.paidAmount)}
                                                </p>
                                            )}
                                        </div>
                                    </td>
                                    <td className="p-4">
                                        <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium border ${getStatusStyle(record.status)}`}>
                                            {getStatusIcon(record.status)}
                                            {record.status}
                                        </span>
                                    </td>
                                    <td className="p-4">
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => setSelectedReceipt({
                                                    id: record.taxAccountNumber,
                                                    amount: record.paidAmount || record.amount,
                                                    date: record.updatedAt,
                                                    payer: record.ownerId?.name || 'N/A',
                                                    propertyId: record.propertyId?.address || 'N/A',
                                                    method: 'Cash',
                                                    ref: record.taxAccountNumber
                                                })}
                                                className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                                                title="View Receipt"
                                            >
                                                <Eye size={18} />
                                            </button>
                                            <button
                                                className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                                                title="More Actions"
                                            >
                                                <MoreHorizontal size={18} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {/* 4. DIGITAL RECEIPT MODAL */}
            {selectedReceipt && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
                    <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-xl shadow-2xl overflow-hidden relative">

                        {/* Receipt Header (Ticket Style) */}
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

                        {/* Receipt Body (Tear-off effect) */}
                        <div className="p-8 bg-white dark:bg-slate-900 relative">
                            <div className="text-center mb-8">
                                <p className="text-3xl font-bold text-gray-900 dark:text-white">{formatCurrency(selectedReceipt.amount)}</p>
                                <p className="text-sm text-emerald-600 font-medium flex justify-center items-center gap-1 mt-1">
                                    <CheckCircle size={14} /> Payment Successful
                                </p>
                            </div>

                            <div className="space-y-4 text-sm">
                                <div className="flex justify-between border-b border-gray-100 dark:border-slate-800 pb-2">
                                    <span className="text-gray-500 dark:text-gray-400 flex items-center gap-1"><Tag size={14} /> Receipt No</span>
                                    <span className="font-mono font-medium text-gray-800 dark:text-white">{selectedReceipt.id}</span>
                                </div>
                                <div className="flex justify-between border-b border-gray-100 dark:border-slate-800 pb-2">
                                    <span className="text-gray-500 dark:text-gray-400 flex items-center gap-1"><Calendar size={14} /> Date Paid</span>
                                    <span className="font-medium text-gray-800 dark:text-white">{formatDate(selectedReceipt.date)}</span>
                                </div>
                                <div className="flex justify-between border-b border-gray-100 dark:border-slate-800 pb-2">
                                    <span className="text-gray-500 dark:text-gray-400 flex items-center gap-1"><User size={14} /> Payer Name</span>
                                    <span className="font-medium text-gray-800 dark:text-white">{selectedReceipt.payer}</span>
                                </div>
                                <div className="flex justify-between border-b border-gray-100 dark:border-slate-800 pb-2">
                                    <span className="text-gray-500 dark:text-gray-400 flex items-center gap-1"><MapPin size={14} /> Property ID</span>
                                    <span className="font-medium text-gray-800 dark:text-white">{selectedReceipt.propertyId}</span>
                                </div>
                                <div className="flex justify-between border-b border-gray-100 dark:border-slate-800 pb-2">
                                    <span className="text-gray-500 dark:text-gray-400 flex items-center gap-1"><CreditCard size={14} /> Payment Method</span>
                                    <span className="font-medium text-gray-800 dark:text-white">{selectedReceipt.method}</span>
                                </div>
                                <div className="flex justify-between pb-2">
                                    <span className="text-gray-500 dark:text-gray-400 flex items-center gap-1"><FileText size={14} /> Reference</span>
                                    <span className="font-mono text-xs bg-gray-100 dark:bg-slate-800 px-2 py-1 rounded">{selectedReceipt.ref}</span>
                                </div>
                            </div>

                            {/* Barcode Mockup */}
                            <div className="mt-8 pt-4 border-t-2 border-dashed border-gray-200">
                                <div className="h-12 bg-gray-100 rounded w-full flex items-center justify-center text-gray-400 text-xs tracking-[0.5em] font-mono">
                                    ||| || ||| || |||| |||
                                </div>
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="bg-gray-50 dark:bg-slate-800/30 p-4 flex gap-3">
                            <button onClick={() => setSelectedReceipt(null)} className="flex-1 py-2.5 text-gray-600 dark:text-gray-300 font-medium hover:bg-gray-200 dark:hover:bg-slate-700 rounded-lg transition-colors">Close</button>
                            <button className="flex-1 py-2.5 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 shadow-lg flex justify-center items-center gap-2">
                                <Printer size={18} /> Print
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* 5. New Payment Form Modal */}
            <NewPaymentFormModal isOpen={isFormOpen} onClose={() => setIsFormOpen(false)} onSubmit={handlePaymentSubmit} taxRecords={taxRecords} properties={properties} />
        </div>
    );
}