const mongoose = require('mongoose');

const supportTicketSchema = new mongoose.Schema({
    ticketNumber: {
        type: String,
        unique: true,
        required: false
    },
    subject: {
        type: String,
        required: true,
        trim: true
    },
    category: {
        type: String,
        required: true,
        enum: ['Technical Issue', 'Payment Problem', 'Account Access', 'General Inquiry', 'Feature Request', 'Bug Report']
    },
    priority: {
        type: String,
        default: 'Medium',
        enum: ['Low', 'Medium', 'High', 'Urgent']
    },
    description: {
        type: String,
        required: true
    },
    status: {
        type: String,
        default: 'Open',
        enum: ['Open', 'In Progress', 'Resolved', 'Closed']
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    assignedTo: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    responses: [{
        message: String,
        respondedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        respondedAt: {
            type: Date,
            default: Date.now
        }
    }],
    resolvedAt: Date,
    closedAt: Date
}, {
    timestamps: true
});

// Generate ticket number before saving
supportTicketSchema.pre('save', async function () {
    if (!this.ticketNumber) {
        const count = await this.constructor.countDocuments();
        this.ticketNumber = `TICKET-${String(count + 1).padStart(6, '0')}`;
    }
});

module.exports = mongoose.model('SupportTicket', supportTicketSchema);
