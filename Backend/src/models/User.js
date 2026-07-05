const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: {
        type: String,
        enum: ['Super Admin', 'Tax Officer', 'Owner'],
        default: 'Owner'
    },
    jurisdiction: {
        type: String,
        default: 'All Districts'
    },
    status: {
        type: String,
        enum: ['Active', 'Suspended', 'Inactive'],
        default: 'Active'
    },
    permissions: {
        type: Object,
        default: {}
    },
    // Owner Specific Fields
    ownerId: { type: String, unique: true, sparse: true }, // Custom ID like OWN-001
    type: { type: String, enum: ['Individual', 'Business', 'Trust', 'Government'], default: 'Individual' },
    phone: { type: String },
    riskLevel: { type: String, enum: ['Low', 'Medium', 'High'], default: 'Low' },
    verified: { type: Boolean, default: false },

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
