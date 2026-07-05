const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: false // System actions may not have a user
    },
    userName: {
        type: String,
        required: true
    },
    userRole: {
        type: String,
        required: false
    },
    action: {
        type: String,
        required: true,
        enum: [
            // Authentication
            'LOGIN_SUCCESS', 'LOGIN_FAIL', 'LOGOUT',
            // Properties
            'CREATE_PROPERTY', 'UPDATE_PROPERTY', 'DELETE_PROPERTY',
            // Owners
            'CREATE_OWNER', 'UPDATE_OWNER', 'DELETE_OWNER',
            // Tax Records
            'GENERATE_TAX', 'UPDATE_TAX', 'DELETE_TAX',
            // Payments
            'RECORD_PAYMENT', 'UPDATE_PAYMENT',
            // Users
            'CREATE_USER', 'UPDATE_USER', 'DELETE_USER', 'UPDATE_PERMISSIONS', 'UPDATE_USER_STATUS',
            // Tax Rules
            'CREATE_RULE', 'UPDATE_RULE', 'DELETE_RULE',
            // Generic actions
            'CREATE', 'UPDATE', 'DELETE', 'VIEW',
            // Property Transfers
            'PROPERTY_TRANSFER'
        ]
    },
    targetType: {
        type: String,
        enum: ['User', 'Property', 'Owner', 'TaxRecord', 'Payment', 'TaxRule', 'System', 'SystemSettings', 'SupportTicket', 'PropertyTransfer'],
        required: false
    },
    targetId: {
        type: String,
        required: false
    },
    targetName: {
        type: String,
        required: false
    },
    details: {
        type: String,
        required: true
    },
    ipAddress: {
        type: String,
        required: false
    },
    severity: {
        type: String,
        enum: ['Low', 'Medium', 'High'],
        default: 'Low'
    }
}, {
    timestamps: true
});

// Index for faster queries
auditLogSchema.index({ action: 1, createdAt: -1 });
auditLogSchema.index({ userId: 1, createdAt: -1 });
auditLogSchema.index({ severity: 1, createdAt: -1 });

module.exports = mongoose.model('AuditLog', auditLogSchema);
