const mongoose = require('mongoose');

const propertySchema = new mongoose.Schema({
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    address: { type: String, required: true },
    district: { type: String },
    zone: { type: String, required: true }, // Added zone field
    documents: {
        titleDeed: { type: String }, // Path to Title Deed file
        passportImage: { type: String } // Path to Owner's ID/Passport file
    },

    // Core Classification
    propertyType: {
        type: String,
        required: true,
        enum: ['Residential', 'Industrial', 'Agricultural', 'Religious', 'Government', 'Charity', 'Educational']
    },
    buildingType: {
        type: String,
        // Examples: Apartment, Villa, Corrugated Sheet House, Shop, Office, Mall, Factory, Detailed lists handled in validation or frontend
        required: true
    },

    // Financials
    value: { type: Number, default: 0 }, // Property Value (for Percentage based tax)
    estimatedRevenue: { type: Number, default: 0 }, // For Commercial revenue based tax

    // Land Details (Standard land = 20m x 15m = 300sqm)
    landDetails: {
        landCount: { type: Number, default: 1 }, // how many "lands"
        totalAreaSqm: { type: Number, default: 300 }, // usually landCount * 300, but can be custom
    },

    // Structure Details (Critical for Apartments/Floors/Units tax)
    structureDetails: {
        floors: { type: Number, default: 1 }, // G+X
        unitsPerFloor: { type: Number, default: 1 },
        totalUnits: { type: Number, default: 1 }, // Usually floors * unitsPerFloor
        totalFloorArea: { type: Number, default: 0 } // Total built-up area
    },

    // Usage details
    isMixedUse: { type: Boolean, default: false },
    mixedUseDetails: {
        residentialFloors: { type: Number, default: 0 },
        commercialFloors: { type: Number, default: 0 }
    },

    // For exemptions or specific overrides
    taxRuleOverride: { type: mongoose.Schema.Types.ObjectId, ref: 'TaxRule' },
    isExempt: { type: Boolean, default: false },

    // Tax Account Number (TAN) - Unique identifier for tax purposes
    taxAccountNumber: { type: String, unique: true, sparse: true },

    // Property Status
    status: {
        type: String,
        enum: ['Active', 'Inactive', 'Pending'],
        default: 'Active'
    },

    // Tax Calculation Result
    calculatedTax: { type: Number, default: 0, required: false },
    taxDetails: {
        rule: { type: String },
        rate: { type: Number },
        method: { type: String },
        breakdown: { type: String },
        lastCalculated: { type: Date }
    },

    // Map / GeoJSON
    mapPolygon: {
        type: {
            type: String,
            enum: ['Polygon'],
            default: 'Polygon'
        },
        coordinates: {
            type: [[[Number]]], // Array of rings, each ring is array of [lng, lat]
            default: undefined
        }
    },

    // Payment status (for map color-coding)
    paymentStatus: {
        type: String,
        enum: ['paid', 'unpaid'],
        default: 'unpaid'
    },

    // Audit Fields
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

module.exports = mongoose.model('Property', propertySchema);
