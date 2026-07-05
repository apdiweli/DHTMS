import axios from 'axios';

const API_URL = 'http://localhost:5002/api';

const api = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Add a request interceptor to include the token if available
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

export const getOwners = () => api.get('/owners');
export const createOwner = (data) => api.post('/owners', data);
export const updateOwner = (id, data) => api.put(`/owners/${id}`, data);
export const deleteOwner = (id) => api.delete(`/owners/${id}`);

export const getProperties = () => api.get('/properties');
export const getMapProperties = () => api.get('/properties/map');
export const createProperty = (data) => api.post('/properties', data);
export const updateProperty = (id, data) => api.put(`/properties/${id}`, data);
export const deleteProperty = (id) => api.delete(`/properties/${id}`);
export const updatePropertyPaymentStatus = (id, paymentStatus) => api.patch(`/properties/${id}/payment-status`, { paymentStatus });


export const getTaxRules = () => api.get('/taxes/rules');
export const createTaxRule = (data) => api.post('/taxes/rules', data);
export const updateTaxRule = (id, data) => api.put(`/taxes/rules/${id}`, data);
export const deleteTaxRule = (id) => api.delete(`/taxes/rules/${id}`);
export const recalculateAllTaxes = () => api.post('/taxes/recalculate-all');

export const calculatePropertyTax = (propertyId) => api.get(`/taxes/calculate/${propertyId}`);
export const generateTaxRecord = (data) => api.post('/taxes/generate', data);

// Tax Records & Payments
export const getTaxRecordsByProperty = (propertyId) => api.get(`/taxes/records?propertyId=${propertyId}`);
export const getTaxRecords = () => api.get('/taxes/records');
export const recordPayment = (data) => api.post('/taxes/payments', data);
export const updatePaymentStatus = (id, status) => api.put(`/taxes/records/${id}/status`, { status });
export const sendPaymentReminders = (taxRecordIds) => api.post('/taxes/reminders', { taxRecordIds });

// User Management
export const getUsers = () => api.get('/users');
export const getUserById = (id) => api.get(`/users/${id}`);
export const createUser = (data) => api.post('/users', data);
export const updateUser = (id, data) => api.put(`/users/${id}`, data);
export const updateUserPermissions = (id, permissions) => api.put(`/users/${id}/permissions`, { permissions });
export const updateUserStatus = (id, status) => api.put(`/users/${id}/status`, { status });
export const deleteUser = (userId) => api.delete(`/users/${userId}`);
export const getUsersByRole = (role) => api.get(`/users/role/${role}`);

// Notification APIs
export const getNotifications = (unreadOnly = false) => api.get('/notifications', { params: { unreadOnly } });
export const getUnreadCount = () => api.get('/notifications/unread-count');
export const markNotificationAsRead = (id) => api.put(`/notifications/${id}/read`);
export const markAllNotificationsAsRead = () => api.put('/notifications/read-all');
export const deleteNotification = (id) => api.delete(`/notifications/${id}`);

// Audit Log APIs
export const getAuditLogs = (params) => api.get('/audit', { params });
export const getAuditLogById = (id) => api.get(`/audit/${id}`);

export const globalSearch = (query) => api.get(`/search?q=${query}`);

// Settings APIs
export const getSettings = () => api.get('/settings');
export const updateSettings = (data) => api.put('/settings', data);

// Support APIs
export const createSupportTicket = (data) => api.post('/support', data);
export const getSupportTickets = (params) => api.get('/support', { params });
export const getSupportTicket = (id) => api.get(`/support/${id}`);
export const addTicketResponse = (id, message) => api.post(`/support/${id}/responses`, { message });
export const updateTicketStatus = (id, status) => api.put(`/support/${id}/status`, { status });
export const assignTicket = (id, assignedTo) => api.put(`/support/${id}/assign`, { assignedTo });

// Property Transfer endpoints
export const getPropertyTransfers = () => api.get('/property-transfers');
export const getPropertyTransferById = (id) => api.get(`/property-transfers/${id}`);
export const getTransferHistoryByProperty = (propertyId) => api.get(`/property-transfers/property/${propertyId}`);
export const createPropertyTransfer = (data) => api.post('/property-transfers', data);
export const approvePropertyTransfer = (id) => api.put(`/property-transfers/${id}/approve`);
export const rejectPropertyTransfer = (id, reason) => api.put(`/property-transfers/${id}/reject`, { reason });
export const ownerApprovePropertyTransfer = (id) => api.put(`/property-transfers/${id}/owner-approve`);
export const ownerRejectPropertyTransfer = (id, reason) => api.put(`/property-transfers/${id}/owner-reject`, { reason });

// Password Management
export const resetOwnerPassword = (userId, newPassword) => api.put(`/users/${userId}/reset-password`, { newPassword });
export const changeOwnPassword = (currentPassword, newPassword) => api.put('/users/change-password', { currentPassword, newPassword });

export default api;
