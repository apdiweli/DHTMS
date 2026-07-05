const mongoose = require('mongoose');

const ownerSchema = new mongoose.Schema({
    id: { type: String, unique: true }, // Custom ID like OWN-001
    name: { type: String, required: true },
    type: { type: String, enum: ['Individual', 'Business', 'Trust', 'Government'], default: 'Individual' },
    contact: { type: String }, // Email
    phone: { type: String },
    district: { type: String },
    riskLevel: { type: String, enum: ['Low', 'Medium', 'High'], default: 'Low' },
    status: { type: String, enum: ['Active', 'Suspended'], default: 'Active' },
    verified: { type: Boolean, default: false },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // Link to User account
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

module.exports = mongoose.model('Owner', ownerSchema);
