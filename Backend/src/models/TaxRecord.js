const mongoose = require('mongoose');

const taxRecordSchema = new mongoose.Schema({
    taxAccountNumber: { type: String, unique: true, required: true }, // TAN: e.g., TAN-2025-000001
    propertyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Property', required: true },
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    taxYear: { type: Number, required: true },
    amount: { type: Number, required: true },
    status: {
        type: String,
        enum: ['Pending', 'Paid', 'Overdue', 'Partially Paid'],
        default: 'Pending'
    },
    dueDate: { type: Date },
    paidDate: { type: Date },
    paidAmount: { type: Number, default: 0 },

    // Snapshot of how the tax was calculated
    calculationDetails: {
        ruleApplied: { type: String }, // Name of the rule used
        baseValue: { type: Number }, // The value used for calculation (e.g., area, units, or price)
        rateApplied: { type: Number },
        method: { type: String },
        note: { type: String }
    }
}, { timestamps: true });

// Compound index to prevent duplicate tax records for the same property in the same year
taxRecordSchema.index({ propertyId: 1, taxYear: 1 }, { unique: true });

module.exports = mongoose.model('TaxRecord', taxRecordSchema);
