const mongoose = require('mongoose');

const propertyTransferSchema = new mongoose.Schema({
    transferNumber: { type: String, unique: true, required: true },
    propertyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Property', required: true },
    previousOwnerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    newOwnerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    
    transferType: { 
        type: String, 
        required: true,
        enum: ['Sale', 'Inheritance', 'Gift', 'Government Allocation', 'Court Order']
    },
    transferReason: { type: String },
    
    transferDate: { type: Date, required: true },
    saleValue: { type: Number, default: 0 },
    
    previousTaxStatus: { 
        type: String,
        enum: ['Paid', 'Unpaid', 'Overdue', 'Unknown'],
        default: 'Unknown'
    },
    
    transferFee: { type: Number, default: 0 },
    feePaid: { type: Boolean, default: false },
    feeStatus: { 
        type: String,
        enum: ['Pending', 'Paid', 'Exempt'],
        default: 'Pending'
    },
    
    notes: { type: String },
    
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    
    ownerApprovalStatus: {
        type: String,
        enum: ['Pending', 'Approved', 'Rejected', 'Not Required'],
        default: 'Pending'
    },
    ownerApprovalDate: { type: Date },
    
    status: { 
        type: String,
        enum: ['Pending', 'Approved', 'Rejected', 'Completed'],
        default: 'Pending'
    },
    
    supportingDocuments: [{
        name: String,
        path: String,
        uploadDate: { type: Date, default: Date.now }
    }]
}, { timestamps: true });

// Auto-generate transferNumber before saving if not provided
propertyTransferSchema.pre('validate', async function() {
    if (!this.transferNumber) {
        const date = new Date();
        const year = date.getFullYear();
        // Simple sequential number (in production, use a more robust counter or atomic operation)
        const count = await mongoose.model('PropertyTransfer').countDocuments();
        this.transferNumber = `TRF-${year}-${(count + 1).toString().padStart(3, '0')}`;
    }
    
    // Auto-calculate 2% fee for Sales if not set
    if (this.transferType === 'Sale' && this.saleValue > 0 && !this.transferFee) {
        this.transferFee = this.saleValue * 0.02;
    }

    // Auto-set owner approval status for non-voluntary transfers
    if (this.transferType === 'Court Order' || this.transferType === 'Government Allocation') {
        this.ownerApprovalStatus = 'Not Required';
    }
});

module.exports = mongoose.model('PropertyTransfer', propertyTransferSchema);
