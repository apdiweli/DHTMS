const Property = require('../models/Property');
const User = require('../models/User'); // Unified Schema: Owners are Users

exports.getProperties = async (req, res) => {
    try {
        let query = {};

        // If user is an Owner, only show their properties
        if (req.user.role === 'Owner') {
            // Check if user is valid? (Optional, req.user exists)
            query.ownerId = req.user._id;
        } else if (req.user.role === 'Tax Officer') {
            // Tax Officers can only see properties in their assigned jurisdiction (district)
            query.district = req.user.jurisdiction;
        }
        // Super Admin can see all properties

        const properties = await Property.find(query).populate('ownerId', 'name email');
        res.json(properties);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const { calculateTaxForProperty } = require('../services/taxCalculator');

exports.createProperty = async (req, res) => {
    try {
        // Extract all fields including new structure/land details
        // Helper to normalize fields (take first value if array)
        const normalize = (val) => Array.isArray(val) && val.length > 0 ? val[0] : val;

        const ownerId = normalize(req.body.ownerId);
        const address = normalize(req.body.address);
        const district = normalize(req.body.district);
        const zone = normalize(req.body.zone);
        const propertyType = normalize(req.body.propertyType);
        const buildingType = normalize(req.body.buildingType);
        const value = normalize(req.body.value);
        const estimatedRevenue = normalize(req.body.estimatedRevenue);
        const isMixedUse = normalize(req.body.isMixedUse);
        let mixedUseDetails = normalize(req.body.mixedUseDetails);

        // Parse nested objects if they are strings (FormData sends them as strings)
        let { landDetails, structureDetails } = req.body;
        if (typeof landDetails === 'string') {
            try { landDetails = JSON.parse(landDetails); } catch (e) { }
        }
        if (typeof structureDetails === 'string') {
            try { structureDetails = JSON.parse(structureDetails); } catch (e) { }
        }

        if (req.user.role === 'Tax Officer') {
            if (district !== req.user.jurisdiction) {
                return res.status(403).json({
                    message: `You can only create properties in ${req.user.jurisdiction}. Cannot create property in ${district}.`
                });
            }
        }

        // Validate Owner Exists (Must be a User)
        const ownerExists = await User.findById(ownerId);
        if (!ownerExists) {
            return res.status(404).json({ message: 'Owner not found. Please provide a valid Owner ID.' });
        }
        // Strict check: Ensure the referenced User is arguably an Owner role? 
        // Or maybe any user can own property? Let's assume Role must be Owner.
        if (ownerExists.role !== 'Owner') {
            return res.status(400).json({ message: 'The selected user is not a registered Owner.' });
        }

        // Create the property object instance (but don't save yet to calculate tax)
        // Parse mapPolygon if provided as JSON string
        let mapPolygon = normalize(req.body.mapPolygon);
        if (typeof mapPolygon === 'string') {
            try { mapPolygon = JSON.parse(mapPolygon); } catch (e) { mapPolygon = undefined; }
        }

        const propertyData = {
            ownerId, address, district, zone,
            propertyType, buildingType,
            value, estimatedRevenue,
            landDetails, structureDetails,
            isMixedUse, mixedUseDetails,
            mapPolygon: mapPolygon || undefined,
            paymentStatus: 'unpaid'
        };

        // Handle File Uploads
        if (req.files) {
            propertyData.documents = {};
            if (req.files.titleDeed) {
                propertyData.documents.titleDeed = req.files.titleDeed[0].path;
            }
            if (req.files.passportImage) {
                propertyData.documents.passportImage = req.files.passportImage[0].path;
            }
        }

        // Auto-calculate tax if possible
        let calculatedTax = 0;
        let taxDetails = {};

        try {
            const taxResult = await calculateTaxForProperty(propertyData);
            if (taxResult.breakdown && !taxResult.breakdown.error) {
                calculatedTax = taxResult.amount;
                taxDetails = {
                    rule: taxResult.breakdown.rule,
                    rate: taxResult.breakdown.rate,
                    method: taxResult.breakdown.method,
                    breakdown: taxResult.breakdown.details,
                    lastCalculated: new Date()
                };
            } else if (taxResult.breakdown && taxResult.breakdown.error) {
                console.error("Tax Auto-Calc Error:", taxResult.breakdown.error);
                taxDetails = {
                    breakdown: `Error: ${taxResult.breakdown.error}`
                }
            }
        } catch (err) {
            console.error("Tax Auto-Calc Failed:", err.message);
        }

        const property = await Property.create({
            ...propertyData,
            calculatedTax: calculatedTax || 0,
            taxDetails,
            createdBy: req.user ? req.user._id : null
        });

        const AuditLog = require('../models/AuditLog');
        await AuditLog.create({
            userId: req.user ? req.user._id : null,
            userName: req.user ? req.user.name : 'System',
            userRole: req.user ? req.user.role : 'System',
            action: 'CREATE_PROPERTY',
            targetType: 'Property',
            targetId: property._id.toString(),
            targetName: property.address,
            details: `Registered new Property at ${property.address}`,
            ipAddress: req.ip || ''
        });

        res.status(201).json(property);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

exports.getPropertyById = async (req, res) => {
    try {
        const property = await Property.findById(req.params.id).populate('ownerId', 'name email');

        if (!property) {
            return res.status(404).json({ message: 'Property not found' });
        }

        // If user is an Owner, verify they own this property
        if (req.user.role === 'Owner') {
            if (property.ownerId._id.toString() !== req.user._id.toString()) {
                return res.status(403).json({
                    message: 'Access denied. You can only view your own properties.'
                });
            }
        }
        // If user is Tax Officer, verify they created this property
        else if (req.user.role === 'Tax Officer') {
            if (!property.createdBy || property.createdBy.toString() !== req.user._id.toString()) {
                return res.status(403).json({
                    message: 'Access denied. You can only view properties you registered.'
                });
            }
        }

        res.json(property);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.updateProperty = async (req, res) => {
    try {
        const property = await Property.findById(req.params.id);
        if (property) {
            // If Tax Officer, only allow editing properties they created
            if (req.user && req.user.role === 'Tax Officer') {
                if (!property.createdBy || property.createdBy.toString() !== req.user._id.toString()) {
                    return res.status(403).json({ message: 'Access denied. Tax Officers can only edit properties they created.' });
                }
            }

            // Safely parse nested objects that may arrive as JSON strings
            const body = { ...req.body };
            if (typeof body.landDetails === 'string') {
                try { body.landDetails = JSON.parse(body.landDetails); } catch (e) { delete body.landDetails; }
            }
            if (typeof body.structureDetails === 'string') {
                try { body.structureDetails = JSON.parse(body.structureDetails); } catch (e) { delete body.structureDetails; }
            }
            if (typeof body.mapPolygon === 'string') {
                try { body.mapPolygon = JSON.parse(body.mapPolygon); } catch (e) { delete body.mapPolygon; }
            }

            // Only update allowed fields (prevent overwriting system fields)
            const allowedFields = [
                'ownerId', 'address', 'district', 'zone', 'propertyType', 'buildingType',
                'value', 'estimatedRevenue', 'landDetails', 'structureDetails',
                'isMixedUse', 'mixedUseDetails', 'mapPolygon', 'status', 'paymentStatus'
            ];
            allowedFields.forEach(field => {
                if (body[field] !== undefined) {
                    property[field] = body[field];
                }
            });

            if (req.user) {
                property.updatedBy = req.user._id;
            }

            // Recalculate tax on update
            try {
                const taxResult = await calculateTaxForProperty(property);
                if (taxResult.breakdown && !taxResult.breakdown.error) {
                    property.calculatedTax = taxResult.amount;
                    property.taxDetails = {
                        rule: taxResult.breakdown.rule,
                        rate: taxResult.breakdown.rate,
                        method: taxResult.breakdown.method,
                        breakdown: taxResult.breakdown.details,
                        lastCalculated: new Date()
                    };
                } else if (taxResult.breakdown && taxResult.breakdown.error) {
                    property.calculatedTax = 0;
                    property.taxDetails = {
                        breakdown: `Error: ${taxResult.breakdown.error}`
                    };
                }
            } catch (err) {
                console.error("Tax Recalc Failed:", err.message);
            }

            const updatedProperty = await property.save();

            const AuditLog = require('../models/AuditLog');
            await AuditLog.create({
                userId: req.user ? req.user._id : null,
                userName: req.user ? req.user.name : 'System',
                userRole: req.user ? req.user.role : 'System',
                action: 'UPDATE_PROPERTY',
                targetType: 'Property',
                targetId: updatedProperty._id.toString(),
                targetName: updatedProperty.address,
                details: `Updated Property at ${updatedProperty.address}`,
                ipAddress: req.ip || ''
            });

            res.json(updatedProperty);
        } else {
            res.status(404).json({ message: 'Property not found' });
        }
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};


exports.deleteProperty = async (req, res) => {
    try {
        const property = await Property.findByIdAndDelete(req.params.id);
        if (property) {
            const AuditLog = require('../models/AuditLog');
            await AuditLog.create({
                userId: req.user ? req.user._id : null,
                userName: req.user ? req.user.name : 'System',
                userRole: req.user ? req.user.role : 'System',
                action: 'DELETE_PROPERTY',
                targetType: 'Property',
                targetId: property._id.toString(),
                targetName: property.address,
                details: `Deleted Property at ${property.address}`,
                ipAddress: req.ip || ''
            });

            res.json({ message: 'Property removed' });
        } else {
            res.status(404).json({ message: 'Property not found' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// GET /api/properties/map — lightweight endpoint for map display
exports.getMapProperties = async (req, res) => {
    try {
        let query = {};
        if (req.user.role === 'Owner') {
            query.ownerId = req.user._id;
        } else if (req.user.role === 'Tax Officer') {
            query.district = req.user.jurisdiction; // Restrict map to their assigned district
        }

        const properties = await Property.find(query)
            .populate('ownerId', 'name email')
            .select('_id address district zone propertyType buildingType taxAccountNumber mapPolygon paymentStatus status calculatedTax taxAccountNumber createdAt');

        res.json(properties);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// PATCH /api/properties/:id/payment-status
exports.updatePaymentStatus = async (req, res) => {
    try {
        const { paymentStatus } = req.body;
        if (!['paid', 'unpaid'].includes(paymentStatus)) {
            return res.status(400).json({ message: 'Invalid paymentStatus. Use paid or unpaid.' });
        }
        const property = await Property.findByIdAndUpdate(
            req.params.id,
            { paymentStatus },
            { new: true }
        );
        if (!property) return res.status(404).json({ message: 'Property not found' });
        res.json(property);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// GET /api/properties/district-performance — Admin only aggregation
exports.getDistrictPerformance = async (req, res) => {
    try {
        const allProperties = await Property.find({})
            .select('district propertyType buildingType paymentStatus calculatedTax value status createdAt');

        // Aggregate by district
        const districtMap = {};

        allProperties.forEach(p => {
            const d = p.district || 'Unassigned';
            if (!districtMap[d]) {
                districtMap[d] = {
                    district: d,
                    totalProperties: 0,
                    paidProperties: 0,
                    unpaidProperties: 0,
                    activeProperties: 0,
                    inactiveProperties: 0,
                    totalTaxAssessed: 0,
                    totalTaxCollected: 0,
                    totalTaxPending: 0,
                    totalPropertyValue: 0,
                    propertyTypes: {},
                    buildingTypes: {},
                    monthlyRegistrations: {},
                };
            }

            const dist = districtMap[d];
            dist.totalProperties++;
            dist.totalPropertyValue += p.value || 0;
            dist.totalTaxAssessed += p.calculatedTax || 0;

            if (p.paymentStatus === 'paid') {
                dist.paidProperties++;
                dist.totalTaxCollected += p.calculatedTax || 0;
            } else {
                dist.unpaidProperties++;
                dist.totalTaxPending += p.calculatedTax || 0;
            }

            if (p.status === 'Active') dist.activeProperties++;
            else dist.inactiveProperties++;

            // Property type breakdown
            const pType = p.propertyType || 'Unknown';
            dist.propertyTypes[pType] = (dist.propertyTypes[pType] || 0) + 1;

            // Building type breakdown
            const bType = p.buildingType || 'Unknown';
            dist.buildingTypes[bType] = (dist.buildingTypes[bType] || 0) + 1;

            // Monthly registrations (last 6 months)
            if (p.createdAt) {
                const monthKey = new Date(p.createdAt).toISOString().substring(0, 7); // YYYY-MM
                dist.monthlyRegistrations[monthKey] = (dist.monthlyRegistrations[monthKey] || 0) + 1;
            }
        });

        // Convert to array and compute collection rate
        const result = Object.values(districtMap).map(d => ({
            ...d,
            collectionRate: d.totalTaxAssessed > 0
                ? Math.round((d.totalTaxCollected / d.totalTaxAssessed) * 100)
                : 0,
            averagePropertyValue: d.totalProperties > 0
                ? Math.round(d.totalPropertyValue / d.totalProperties)
                : 0,
            averageTaxPerProperty: d.totalProperties > 0
                ? Math.round(d.totalTaxAssessed / d.totalProperties)
                : 0,
            propertyTypesArray: Object.entries(d.propertyTypes).map(([name, count]) => ({ name, count })),
            buildingTypesArray: Object.entries(d.buildingTypes).map(([name, count]) => ({ name, count })),
            monthlyRegistrationsArray: Object.entries(d.monthlyRegistrations)
                .sort(([a], [b]) => a.localeCompare(b))
                .slice(-6)
                .map(([month, count]) => ({ month, count })),
        })).sort((a, b) => b.totalTaxAssessed - a.totalTaxAssessed);

        res.json(result);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
