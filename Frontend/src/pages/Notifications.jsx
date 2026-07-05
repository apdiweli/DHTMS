import { useState, useEffect } from 'react';
import { useNotifications } from '../context/NotificationContext';
import {
    FaBell,
    FaMoneyBillWave,
    FaFileInvoiceDollar,
    FaExclamationTriangle,
    FaUserShield,
    FaUserCheck,
    FaInfoCircle,
    FaCheckDouble,
    FaFilter
} from 'react-icons/fa';
import './Notifications.css';

const Notifications = () => {
    const { notifications, markAsRead, markAllAsRead, fetchNotifications } = useNotifications();
    const [filter, setFilter] = useState('All');
    const [filteredNotifications, setFilteredNotifications] = useState([]);

    // Filter categories
    const filters = [
        { label: 'All', value: 'All' },
        { label: 'Tax Generated', value: 'TAX_GENERATED' },
        { label: 'Payments', value: ['PAYMENT_RECEIVED', 'PAYMENT_PARTIAL', 'PAYMENT_FAILED'] },
        { label: 'Overdue', value: 'TAX_OVERDUE' },
        { label: 'System', value: ['SYSTEM_ALERT', 'OFFICER_STATUS', 'OWNER_ACTION', 'SUSPICIOUS_ACTIVITY'] }
    ];

    useEffect(() => {
        // Refresh notifications on mount
        fetchNotifications();
    }, []);

    useEffect(() => {
        if (filter === 'All') {
            setFilteredNotifications(notifications);
        } else {
            const currentFilter = filters.find(f => f.label === filter);
            if (Array.isArray(currentFilter.value)) {
                setFilteredNotifications(notifications.filter(n => currentFilter.value.includes(n.type)));
            } else {
                setFilteredNotifications(notifications.filter(n => n.type === currentFilter.value));
            }
        }
    }, [notifications, filter]);

    const getIcon = (type) => {
        switch (type) {
            case 'TAX_GENERATED': return <FaFileInvoiceDollar className="text-blue-500" />;
            case 'PAYMENT_RECEIVED': return <FaMoneyBillWave className="text-green-500" />;
            case 'PAYMENT_PARTIAL': return <FaMoneyBillWave className="text-yellow-500" />;
            case 'TAX_OVERDUE': return <FaExclamationTriangle className="text-red-500" />;
            case 'LARGE_TAX': return <FaExclamationTriangle className="text-purple-500" />;
            case 'OFFICER_STATUS': return <FaUserShield className="text-orange-500" />;
            case 'OWNER_ACTION': return <FaUserCheck className="text-teal-500" />;
            case 'SYSTEM_ALERT': return <FaExclamationTriangle className="text-red-600" />;
            default: return <FaBell className="text-gray-500" />;
        }
    };

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return new Intl.DateTimeFormat('en-US', {
            month: 'short', day: 'numeric',
            hour: 'numeric', minute: 'numeric',
            hour12: true
        }).format(date);
    };

    return (
        <div className="notifications-page p-6">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">Notifications</h1>
                    <p className="text-gray-600">Stay updated with system activities</p>
                </div>
                <button
                    onClick={() => markAllAsRead()}
                    className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                >
                    <FaCheckDouble /> Mark All as Read
                </button>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-2 mb-6 bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                <div className="flex items-center mr-2 text-gray-500">
                    <FaFilter className="mr-2" /> Filter by:
                </div>
                {filters.map((f) => (
                    <button
                        key={f.label}
                        onClick={() => setFilter(f.label)}
                        className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${filter === f.label
                                ? 'bg-blue-100 text-blue-700 ring-2 ring-blue-500 ring-offset-1'
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            }`}
                    >
                        {f.label}
                    </button>
                ))}
            </div>

            {/* Notifications List */}
            <div className="space-y-4">
                {filteredNotifications.length > 0 ? (
                    filteredNotifications.map((notification) => (
                        <div
                            key={notification._id}
                            className={`relative flex gap-4 p-5 rounded-xl border transition-all ${notification.isRead
                                    ? 'bg-white border-gray-100'
                                    : 'bg-blue-50 border-blue-200 shadow-sm'
                                }`}
                        >
                            <div className={`p-3 rounded-full h-fit ${notification.isRead ? 'bg-gray-100' : 'bg-white shadow-sm'
                                }`}>
                                <div className="text-xl">
                                    {getIcon(notification.type)}
                                </div>
                            </div>

                            <div className="flex-1">
                                <div className="flex justify-between items-start mb-1">
                                    <h3 className={`text-lg font-semibold ${notification.isRead ? 'text-gray-800' : 'text-blue-900'
                                        }`}>
                                        {notification.title}
                                    </h3>
                                    <span className="text-xs text-gray-400 whitespace-nowrap ml-4">
                                        {formatDate(notification.createdAt)}
                                    </span>
                                </div>
                                <p className={`text-sm mb-3 ${notification.isRead ? 'text-gray-600' : 'text-blue-800'
                                    }`}>
                                    {notification.message}
                                </p>

                                <div className="flex justify-between items-center mt-2">
                                    <span className={`text-xs px-2 py-1 rounded bg-gray-100 text-gray-500 border border-gray-200`}>
                                        {notification.type.replace(/_/g, ' ')}
                                    </span>

                                    {!notification.isRead && (
                                        <button
                                            onClick={() => markAsRead(notification._id)}
                                            className="text-xs font-medium text-blue-600 hover:text-blue-800 hover:underline"
                                        >
                                            Mark as read
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Unread indicator dot */}
                            {!notification.isRead && (
                                <div className="absolute top-5 right-5 w-2 h-2 rounded-full bg-blue-500"></div>
                            )}
                        </div>
                    ))
                ) : (
                    <div className="text-center py-16 bg-white rounded-xl border border-dashed border-gray-300">
                        <div className="mx-auto w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                            <FaBell className="text-gray-300 text-2xl" />
                        </div>
                        <h3 className="text-lg font-medium text-gray-900">No notifications found</h3>
                        <p className="text-gray-500 mt-1">
                            {filter === 'All'
                                ? "You're all caught up! No notifications to display."
                                : `No notifications found with filter "${filter}".`}
                        </p>
                        {filter !== 'All' && (
                            <button
                                onClick={() => setFilter('All')}
                                className="mt-4 text-sm text-blue-600 hover:underline"
                            >
                                Clear filters
                            </button>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default Notifications;
