import React, { useState, useEffect } from 'react';
import {
    ClipboardList,
    Search,
    User,
    AlertTriangle,
    Lock,
    X,
    ChevronDown,
    Zap,
    Shield,
    Calendar,
    Filter,
    Loader,
    ChevronLeft,
    ChevronRight,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { getAuditLogs } from '../services/api';

// Action type options for filtering
const ACTION_TYPES = [
    { label: 'All Actions', value: '' },
    { label: 'Login Success', value: 'LOGIN_SUCCESS' },
    { label: 'Login Failure', value: 'LOGIN_FAIL' },
    { label: 'Create Property', value: 'CREATE_PROPERTY' },
    { label: 'Update Property', value: 'UPDATE_PROPERTY' },
    { label: 'Delete Property', value: 'DELETE_PROPERTY' },
    { label: 'Create Owner', value: 'CREATE_OWNER' },
    { label: 'Update Owner', value: 'UPDATE_OWNER' },
    { label: 'Delete Owner', value: 'DELETE_OWNER' },
    { label: 'Generate Tax', value: 'GENERATE_TAX' },
    { label: 'Record Payment', value: 'RECORD_PAYMENT' },
    { label: 'Create User', value: 'CREATE_USER' },
    { label: 'Update User', value: 'UPDATE_USER' },
    { label: 'Delete User', value: 'DELETE_USER' },
    { label: 'Update Permissions', value: 'UPDATE_PERMISSIONS' },
];

const SEVERITY_LEVELS = [
    { label: 'All Severity', value: '' },
    { label: 'High', value: 'High' },
    { label: 'Medium', value: 'Medium' },
    { label: 'Low', value: 'Low' },
];

/**
 * Audit Log Component
 * Displays a chronological, searchable record of all key system events.
 */
export default function AuditLog() {
    const { user } = useAuth();
    const [auditLogs, setAuditLogs] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterAction, setFilterAction] = useState('');
    const [filterSeverity, setFilterSeverity] = useState('');
    const [pagination, setPagination] = useState({
        page: 1,
        limit: 20,
        total: 0,
        pages: 0
    });

    // Fetch audit logs on mount and when filters change
    useEffect(() => {
        fetchAuditLogs();
    }, [filterAction, filterSeverity, pagination.page]);

    const fetchAuditLogs = async () => {
        try {
            setIsLoading(true);
            const params = {
                page: pagination.page,
                limit: pagination.limit,
            };

            if (filterAction) params.action = filterAction;
            if (filterSeverity) params.severity = filterSeverity;
            if (searchTerm) params.search = searchTerm;

            const response = await getAuditLogs(params);
            setAuditLogs(response.data.data || []);
            setPagination(response.data.pagination || pagination);
        } catch (error) {
            console.error('Error fetching audit logs:', error);
            setAuditLogs([]);
        } finally {
            setIsLoading(false);
        }
    };

    // Handle search with debounce
    const handleSearch = () => {
        setPagination({ ...pagination, page: 1 });
        fetchAuditLogs();
    };

    // Clear all filters
    const clearFilters = () => {
        setSearchTerm('');
        setFilterAction('');
        setFilterSeverity('');
        setPagination({ ...pagination, page: 1 });
    };

    // Permission Check
    if (!user.permissions.canAudit) {
        return (
            <div className="flex flex-col items-center justify-center h-96 bg-red-50 rounded-xl border border-red-100 m-6">
                <div className="bg-red-100 p-4 rounded-full mb-4">
                    <Lock className="text-red-600" size={32} />
                </div>
                <h2 className="text-xl font-bold text-gray-800">Access Denied</h2>
                <p className="text-gray-600 mt-2">You must have audit privileges to view the system audit log.</p>
            </div>
        );
    }

    // Helper Functions
    const getSeverityClasses = (severity) => {
        switch (severity) {
            case 'High': return 'bg-red-100 text-red-800 border-red-300';
            case 'Medium': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
            case 'Low': return 'bg-blue-100 text-blue-800 border-blue-300';
            default: return 'bg-gray-100 text-gray-700 border-gray-300';
        }
    };

    const getSeverityIcon = (severity) => {
        switch (severity) {
            case 'High': return <Zap size={14} className="text-red-600" />;
            case 'Medium': return <AlertTriangle size={14} className="text-yellow-600" />;
            case 'Low': return <Shield size={14} className="text-blue-600" />;
            default: return <ClipboardList size={14} />;
        }
    };

    const formatActionName = (action) => {
        return action.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
    };

    const formatDate = (dateStr) => {
        const date = new Date(dateStr);
        return date.toLocaleString('en-US', {
            month: 'short',
            day: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
    };

    return (
        <div className="space-y-6">
            {/* Page Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-800 dark:text-white flex items-center gap-3">
                        <ClipboardList className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
                        System Audit Log
                    </h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Track all system activities and user actions</p>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300 bg-white dark:bg-slate-800 px-4 py-2 rounded-lg border border-gray-200 dark:border-slate-700">
                    <Calendar size={16} />
                    <span>{pagination.total} Total Events</span>
                </div>
            </div>

            {/* Filter and Search Bar */}
            <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 shadow-sm rounded-xl p-4 transition-colors">
                <div className="flex flex-col lg:flex-row gap-4">
                    {/* Search Input */}
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                        <input
                            type="text"
                            placeholder="Search by user, target, or details..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-200"
                        />
                    </div>

                    {/* Action Type Filter */}
                    <div className="w-full lg:w-56 relative">
                        <select
                            value={filterAction}
                            onChange={(e) => setFilterAction(e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm appearance-none bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-200 pr-10"
                        >
                            {ACTION_TYPES.map(action => (
                                <option key={action.value} value={action.value}>{action.label}</option>
                            ))}
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 pointer-events-none" size={16} />
                    </div>

                    {/* Severity Filter */}
                    <div className="w-full lg:w-48 relative">
                        <select
                            value={filterSeverity}
                            onChange={(e) => setFilterSeverity(e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm appearance-none bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-200 pr-10"
                        >
                            {SEVERITY_LEVELS.map(level => (
                                <option key={level.value} value={level.value}>{level.label}</option>
                            ))}
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 pointer-events-none" size={16} />
                    </div>

                    {/* Search Button */}
                    <button
                        onClick={handleSearch}
                        className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium shadow-md shadow-indigo-200 dark:shadow-indigo-900/40"
                    >
                        Search
                    </button>

                    {/* Clear Filters */}
                    {(searchTerm || filterAction || filterSeverity) && (
                        <button
                            onClick={clearFilters}
                            className="flex items-center gap-1 px-3 py-2 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors border border-red-200 dark:border-red-900/50"
                        >
                            <X size={16} /> Clear
                        </button>
                    )}
                </div>
            </div>

            {/* Audit Log Table */}
            <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 shadow-sm rounded-xl overflow-hidden transition-colors">
                {isLoading ? (
                    <div className="flex items-center justify-center h-96">
                        <div className="text-center">
                            <Loader className="w-12 h-12 mx-auto mb-4 animate-spin text-indigo-600 dark:text-indigo-400" />
                            <p className="text-gray-600 dark:text-gray-400">Loading audit logs...</p>
                        </div>
                    </div>
                ) : auditLogs.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-96 text-gray-500 dark:text-gray-400">
                        <AlertTriangle size={48} className="mb-4 text-gray-300 dark:text-gray-600" />
                        <p className="text-lg font-medium">No audit events found</p>
                        <p className="text-sm">Try adjusting your search or filters</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-800">
                            <thead className="bg-gray-50 dark:bg-slate-800/50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Timestamp</th>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">User</th>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Action</th>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Details</th>
                                    <th className="px-6 py-3 text-center text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Severity</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white dark:bg-slate-900 divide-y divide-gray-100 dark:divide-slate-800">
                                {auditLogs.map((log) => (
                                    <tr key={log._id} className="hover:bg-indigo-50/30 dark:hover:bg-slate-800/50 transition-colors">
                                        <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-500 dark:text-gray-400 font-mono">
                                            {formatDate(log.createdAt)}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center gap-2">
                                                <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
                                                    <User size={14} className="text-indigo-600 dark:text-indigo-400" />
                                                </div>
                                                <div>
                                                    <p className="text-sm font-medium text-gray-800 dark:text-white">{log.userName}</p>
                                                    {log.userRole && (
                                                        <p className="text-xs text-gray-500 dark:text-gray-400">{log.userRole}</p>
                                                    )}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 dark:bg-indigo-900/30 text-indigo-800 dark:text-indigo-300">
                                                {formatActionName(log.action)}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-700 dark:text-gray-300 max-w-md">
                                            <div className="line-clamp-2">
                                                {log.targetName && (
                                                    <span className="font-semibold text-gray-900 dark:text-white">{log.targetName}: </span>
                                                )}
                                                {log.details}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border ${getSeverityClasses(log.severity)}`}>
                                                {getSeverityIcon(log.severity)}
                                                {log.severity}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Pagination */}
            {!isLoading && auditLogs.length > 0 && (
                <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl p-4 transition-colors">
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                        Showing <span className="font-medium text-gray-900 dark:text-white">{((pagination.page - 1) * pagination.limit) + 1}</span> to{' '}
                        <span className="font-medium text-gray-900 dark:text-white">{Math.min(pagination.page * pagination.limit, pagination.total)}</span> of{' '}
                        <span className="font-medium text-gray-900 dark:text-white">{pagination.total}</span> events
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setPagination({ ...pagination, page: pagination.page - 1 })}
                            disabled={pagination.page === 1}
                            className="flex items-center gap-1 px-3 py-2 border border-gray-300 dark:border-slate-700 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            <ChevronLeft size={16} /> Previous
                        </button>
                        <div className="flex items-center gap-1">
                            {[...Array(Math.min(5, pagination.pages))].map((_, i) => {
                                const pageNum = i + 1;
                                return (
                                    <button
                                        key={pageNum}
                                        onClick={() => setPagination({ ...pagination, page: pageNum })}
                                        className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${pagination.page === pageNum
                                            ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200 dark:shadow-indigo-900/40'
                                            : 'border border-gray-300 dark:border-slate-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-800'
                                            }`}
                                    >
                                        {pageNum}
                                    </button>
                                );
                            })}
                        </div>
                        <button
                            onClick={() => setPagination({ ...pagination, page: pagination.page + 1 })}
                            disabled={pagination.page === pagination.pages}
                            className="flex items-center gap-1 px-3 py-2 border border-gray-300 dark:border-slate-700 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            Next <ChevronRight size={16} />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}