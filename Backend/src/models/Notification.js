const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    type: {
        type: String,
        enum: [
            'TAX_GENERATED',
            'PAYMENT_RECEIVED',
            'PAYMENT_REMINDER',
            'PAYMENT_PARTIAL',
            'SYSTEM_ALERT',
            'TAX_EDITED',
            'TAX_CANCELLED',
            'TAX_OVERDUE',
            'LARGE_TAX',
            'OFFICER_STATUS',
            'OWNER_ACTION',
            'PAYMENT_FAILED',
            'SUSPICIOUS_ACTIVITY'
        ],
        required: true
    },
    title: {
        type: String,
        required: true
    },
    message: {
        type: String,
        required: true
    },
    relatedEntity: {
        propertyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Property' },
        taxRecordId: { type: mongoose.Schema.Types.ObjectId, ref: 'TaxRecord' },
        ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        amount: { type: Number },
        taxYear: { type: Number },
        tan: { type: String }
    },
    isRead: {
        type: Boolean,
        default: false
    },
    priority: {
        type: String,
        enum: ['low', 'medium', 'high'],
        default: 'medium'
    }
}, { timestamps: true });

// Index for efficient queries
notificationSchema.index({ userId: 1, isRead: 1, createdAt: -1 });

module.exports = mongoose.model('Notification', notificationSchema);
