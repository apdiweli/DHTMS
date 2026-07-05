const mongoose = require('mongoose');

const taxRuleSchema = new mongoose.Schema({
    ruleName: { type: String, required: true, unique: true }, // e.g., "Residential Apartment Per Unit"
    propertyType: {
        type: String,
        required: true,
        enum: ['Residential', 'Industrial', 'Agricultural', 'Religious', 'Government', 'Charity', 'Educational']
    },
    buildingType: { type: String }, // e.g., 'Apartment', 'Villa' - Optional as some rules apply to whole categories
    calculationMethod: {
        type: String,
        required: true,
        enum: ['Fixed', 'PerFloor', 'PerUnit', 'PerM2', 'PerHectare', 'PerHalfHectare', 'Percentage', 'Exempt']
    },
    rate: { type: Number, required: true }, // The dollar amount or percentage value
    description: { type: String },
    isActive: { type: Boolean, default: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

module.exports = mongoose.model('TaxRule', taxRuleSchema);
