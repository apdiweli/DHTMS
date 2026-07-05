const TaxRule = require('../models/TaxRule');
const TaxRecord = require('../models/TaxRecord');
const Property = require('../models/Property');
const User = require('../models/User'); // Unified Schema: Owner is User
const { calculateTaxForProperty } = require('../services/taxCalculator');

// Seed the Tax Rules as per requirements
exports.seedTaxRules = async (req, res) => {
    try {
        await TaxRule.deleteMany({}); // Clear old rules

        const rules = [
            // RESIDENTIAL
            { ruleName: 'Apartment Unit Tax', propertyType: 'Residential', buildingType: 'Apartment', calculationMethod: 'PerUnit', rate: 10 },
            { ruleName: 'Apartment Floor Tax', propertyType: 'Residential', buildingType: 'Apartment', calculationMethod: 'PerFloor', rate: 30 }, // Alternative rule? System needs help to pick. Defaulting to one or storing multiples? Let's generic seeded list.
            // Note: The system will pick the specific rule. We might need "Active" flag toggling if multiple apply to same type.
            // For now, let's seed the most logical defaults or unique types.

            // Actually, "Apartment" listed with 3 options: Unit, Floor, m2. 
            // We'll create unique building types or variants to support testing all.
            // Or better, we assume the Admin selects the rule logic for the year.
            // Let's seed "Apartment" with 'PerUnit' as default for now.

            { ruleName: 'Apartment Default', propertyType: 'Residential', buildingType: 'Apartment', calculationMethod: 'PerUnit', rate: 10 },
            { ruleName: 'Villa', propertyType: 'Residential', buildingType: 'Villa', calculationMethod: 'PerM2', rate: 0.5 },
            { ruleName: 'Luxury Villa', propertyType: 'Residential', buildingType: 'Luxury Villa', calculationMethod: 'Percentage', rate: 0.5 }, // 0.5% value
            { ruleName: 'Corrugated House', propertyType: 'Residential', buildingType: 'Corrugated Sheet House', calculationMethod: 'Fixed', rate: 15 }, // Avg of 10-20



            // INDUSTRIAL
            { ruleName: 'Factory Fixed', propertyType: 'Industrial', buildingType: 'Factory', calculationMethod: 'Fixed', rate: 500 },
            { ruleName: 'Warehouse Area', propertyType: 'Industrial', buildingType: 'Warehouse', calculationMethod: 'PerM2', rate: 1 },
            { ruleName: 'Workshop Fixed', propertyType: 'Industrial', buildingType: 'Workshop', calculationMethod: 'Fixed', rate: 100 },

            // AGRICULTURAL
            { ruleName: 'Farm', propertyType: 'Agricultural', buildingType: 'Farm', calculationMethod: 'Exempt', rate: 0 },
            { ruleName: 'Livestock Land', propertyType: 'Agricultural', buildingType: 'Livestock land', calculationMethod: 'PerM2', rate: 0.1 },

            // EXEMPT
            { ruleName: 'Mosque', propertyType: 'Religious', buildingType: 'Mosque', calculationMethod: 'Exempt', rate: 0 },
            { ruleName: 'Government', propertyType: 'Government', buildingType: 'Government Building', calculationMethod: 'Exempt', rate: 0 },
            { ruleName: 'Charity', propertyType: 'Charity', buildingType: 'Charity Building', calculationMethod: 'Exempt', rate: 0 }
        ];

        await TaxRule.insertMany(rules);
        res.json({ message: 'Tax Rules Seeded Successfully', count: rules.length });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Calculate and Preview Tax for a Property
exports.calculatePropertyTax = async (req, res) => {
    try {
        const { propertyId } = req.params;
        const property = await Property.findById(propertyId);
        if (!property) return res.status(404).json({ error: 'Property not found' });

        const taxResult = await calculateTaxForProperty(property);
        res.json({ propertyId, ...taxResult });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Generate Tax Record (Save to DB)
exports.generateTaxRecord = async (req, res) => {
    try {
        const { propertyId, year } = req.body;
        const property = await Property.findById(propertyId);
        if (!property) return res.status(404).json({ error: 'Property not found' });

        // Tax Officers can only generate tax records for properties in their jurisdiction
        if (req.user.role === 'Tax Officer') {
            if (property.district !== req.user.jurisdiction) {
                return res.status(403).json({
                    error: `You can only generate tax records for properties in ${req.user.jurisdiction}. This property is in ${property.district}.`
                });
            }
        }


        const taxYear = year || new Date().getFullYear();

        // Restore tax calculation
        const taxResult = await calculateTaxForProperty(property);

        if (taxResult.breakdown && taxResult.breakdown.error) {
            return res.status(400).json({
                error: `Cannot generate tax: ${taxResult.breakdown.error}`
            });
        }

        // Check if tax record already exists for this property and year
        const existingRecord = await TaxRecord.findOne({
            propertyId: property._id,
            taxYear: taxYear
        });

        if (existingRecord) {
            return res.status(400).json({
                error: `Tax record already exists for this property for year ${taxYear}. TAN: ${existingRecord.taxAccountNumber}`
            });
        }


        // Generate unique TAN
        const { generateTAN } = require('../utils/tanGenerator');
        const tan = await generateTAN(taxYear);

        const record = new TaxRecord({
            taxAccountNumber: tan,
            propertyId: property._id,
            ownerId: property.ownerId,
            taxYear: taxYear,
            amount: taxResult.amount,
            status: 'Pending',
            calculationDetails: {
                ruleApplied: taxResult.breakdown.rule,
                method: taxResult.breakdown.method,
                rateApplied: taxResult.breakdown.rate,
                note: taxResult.breakdown.details
            }
        });

        await record.save();

        // Update property with TAN if not already set
        if (!property.taxAccountNumber) {
            property.taxAccountNumber = tan;
        }

        // Update property status to Active (since tax has been generated)
        property.status = 'Active';
        await property.save();

        const notificationService = require('../services/notificationService');

        // Check for Large Tax Amount (> 5000)
        if (record.amount > 5000) {
            try {
                await notificationService.notifyLargeTax(record, property);
            } catch (adminNotifError) {
                console.error('Failed to send large tax notification:', adminNotifError);
            }
        }

        // Send notification to property owner
        // Send notification to property owner
        try {
            // Unified Schema: property.ownerId is the User (Owner)
            const owner = await User.findById(property.ownerId);
            if (owner) {
                const notificationService = require('../services/notificationService');
                await notificationService.notifyTaxGenerated(record, property, owner);
            }
        } catch (notifError) {
            console.error('Failed to send tax generation notification:', notifError);
            // Don't fail the request if notification fails
        }

        const AuditLog = require('../models/AuditLog');
        await AuditLog.create({
            userId: req.user ? req.user._id : null,
            userName: req.user ? req.user.name : 'System',
            userRole: req.user ? req.user.role : 'System',
            action: 'GENERATE_TAX',
            targetType: 'TaxRecord',
            targetId: record._id.toString(),
            targetName: record.taxAccountNumber,
            details: `Generated tax record for property ${property.address}`,
            ipAddress: req.ip || ''
        });

        res.json(record);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Recalculate Tax For ALL Properties
exports.recalculateAllProperties = async (req, res) => {
    try {
        const properties = await Property.find();
        let updatedCount = 0;
        let errors = [];

        for (const property of properties) {
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
                await property.save();
                updatedCount++;
            } catch (err) {
                errors.push({ id: property._id, error: err.message });
            }
        }

        res.json({
            message: 'Bulk recalculation completed',
            totalProcessed: properties.length,
            updatedSuccess: updatedCount,
            errors
        });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Generate Annual Tax For ALL Properties (Bulk)
exports.generateAnnualTaxForAllProperties = async (req, res) => {
    try {
        const { year } = req.body; // Optional: Allow specifying year
        const taxYear = year || new Date().getFullYear();

        // Build query for properties
        let query = { status: 'Active' }; // Only generate for active properties

        // If Tax Officer, restrict to jurisdiction
        if (req.user.role === 'Tax Officer') {
            query.district = req.user.jurisdiction;
        }

        const properties = await Property.find(query);
        const { generateTAN } = require('../utils/tanGenerator');
        const notificationService = require('../services/notificationService');

        let stats = {
            total: properties.length,
            generated: 0,
            skipped: 0,
            failed: 0,
            errors: []
        };

        for (const property of properties) {
            try {
                // Check if tax record already exists
                const existingRecord = await TaxRecord.findOne({
                    propertyId: property._id,
                    taxYear: taxYear
                });

                if (existingRecord) {
                    stats.skipped++;
                    continue;
                }

                // Calculate Tax
                const taxResult = await calculateTaxForProperty(property);

                if (taxResult.breakdown && taxResult.breakdown.error) {
                    throw new Error(`Cannot generate tax: ${taxResult.breakdown.error}`);
                }

                // Generate TAN
                const tan = await generateTAN(taxYear);

                // Create Record
                const record = new TaxRecord({
                    taxAccountNumber: tan,
                    propertyId: property._id,
                    ownerId: property.ownerId,
                    taxYear: taxYear,
                    amount: taxResult.amount,
                    status: 'Pending',
                    calculationDetails: {
                        ruleApplied: taxResult.breakdown.rule,
                        method: taxResult.breakdown.method,
                        rateApplied: taxResult.breakdown.rate,
                        note: taxResult.breakdown.details
                    }
                });

                await record.save();

                // Update property with TAN if missing
                if (!property.taxAccountNumber) {
                    property.taxAccountNumber = tan;
                    await property.save();
                }

                stats.generated++;

                // Async Notifications (Don't await to speed up loop?) 
                // Better to await to avoid overwhelming or use a queue. For now await but catch individual errors.
                try {
                    if (record.amount > 5000) {
                        await notificationService.notifyLargeTax(record, property);
                    }
                    const owner = await User.findById(property.ownerId);
                    if (owner) {
                        await notificationService.notifyTaxGenerated(record, property, owner);
                    }
                } catch (notifErr) {
                    console.error(`Notification failed for property ${property._id}:`, notifErr.message);
                }

            } catch (err) {
                stats.failed++;
                stats.errors.push({ propertyId: property._id, error: err.message });
            }
        }

        res.json({
            message: `Annual Tax Generation for ${taxYear} Completed`,
            stats
        });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Get Rules
exports.getTaxRules = async (req, res) => {
    try {
        const rules = await TaxRule.find();
        res.json(rules);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Create New Rule
exports.createTaxRule = async (req, res) => {
    try {
        const ruleData = req.body;
        if (req.user) {
            ruleData.createdBy = req.user._id;
        }
        const newRule = new TaxRule(ruleData);
        await newRule.save();

        const AuditLog = require('../models/AuditLog');
        await AuditLog.create({
            userId: req.user ? req.user._id : null,
            userName: req.user ? req.user.name : 'System',
            userRole: req.user ? req.user.role : 'System',
            action: 'CREATE_RULE',
            targetType: 'TaxRule',
            targetId: newRule._id.toString(),
            targetName: newRule.ruleName,
            details: `Created new Tax Rule: ${newRule.ruleName}`,
            ipAddress: req.ip || ''
        });

        res.status(201).json(newRule);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

// Update Tax Rule
exports.updateTaxRule = async (req, res) => {
    try {
        const { id } = req.params;
        const ruleData = { ...req.body };

        // Track who updated it
        if (req.user) {
            ruleData.updatedBy = req.user._id;
        }

        const updatedRule = await TaxRule.findByIdAndUpdate(
            id,
            { $set: ruleData },
            { new: true, runValidators: true }
        );

        if (!updatedRule) {
            return res.status(404).json({ error: 'Tax Rule not found' });
        }

        const AuditLog = require('../models/AuditLog');
        await AuditLog.create({
            userId: req.user ? req.user._id : null,
            userName: req.user ? req.user.name : 'System',
            userRole: req.user ? req.user.role : 'System',
            action: 'UPDATE_RULE',
            targetType: 'TaxRule',
            targetId: updatedRule._id.toString(),
            targetName: updatedRule.ruleName,
            details: `Updated Tax Rule: ${updatedRule.ruleName}`,
            ipAddress: req.ip || ''
        });

        res.json(updatedRule);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};


// Delete Tax Rule
exports.deleteTaxRule = async (req, res) => {
    try {
        const { id } = req.params;
        const deletedRule = await TaxRule.findByIdAndDelete(id);

        if (!deletedRule) {
            return res.status(404).json({ error: 'Tax Rule not found' });
        }

        const AuditLog = require('../models/AuditLog');
        await AuditLog.create({
            userId: req.user ? req.user._id : null,
            userName: req.user ? req.user.name : 'System',
            userRole: req.user ? req.user.role : 'System',
            action: 'DELETE_RULE',
            targetType: 'TaxRule',
            targetId: deletedRule._id.toString(),
            targetName: deletedRule.ruleName,
            details: `Deleted Tax Rule: ${deletedRule.ruleName}`,
            ipAddress: req.ip || ''
        });

        res.json({ message: 'Tax rule deleted successfully', rule: deletedRule });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Get All Tax Records (for Payment Records page)
exports.getAllTaxRecords = async (req, res) => {
    try {
        let query = {};

        // Extract propertyId from query if provided
        const { propertyId } = req.query;

        // If user is an Owner, only show tax records for their properties
        if (req.user.role === 'Owner') {
            const owner = req.user;
            const properties = await Property.find({ ownerId: owner._id });
            const propertyIds = properties.map(p => p._id.toString());

            if (propertyId) {
                if (!propertyIds.includes(propertyId)) return res.status(403).json({ success: false, message: 'Access denied' });
                query.propertyId = propertyId;
            } else {
                query.propertyId = { $in: propertyIds };
            }
        } else if (req.user.role === 'Tax Officer') {
            const properties = await Property.find({ district: req.user.jurisdiction });
            const propertyIds = properties.map(p => p._id.toString());
            
            if (propertyId) {
                if (!propertyIds.includes(propertyId)) return res.status(403).json({ success: false, message: 'Access denied' });
                query.propertyId = propertyId;
            } else {
                query.propertyId = { $in: propertyIds };
            }
        } else {
            // Super Admin
            if (propertyId) {
                query.propertyId = propertyId;
            }
        }

        const taxRecords = await TaxRecord.find(query)
            .populate('propertyId', 'address district taxAccountNumber')
            .populate({
                path: 'ownerId',
                select: 'name contact phone'
            })
            .sort({ createdAt: -1 });

        res.json({ success: true, data: taxRecords });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Record a Payment
exports.recordPayment = async (req, res) => {
    try {
        const { taxRecordId, amount, paymentMethod, reference } = req.body;

        const taxRecord = await TaxRecord.findById(taxRecordId).populate('propertyId');
        if (!taxRecord) return res.status(404).json({ error: 'Tax record not found' });

        // Role-based payment validation
        if (req.user.role === 'Owner') {
            // Owners can only pay via Mobile Money or Bank Transfer
            if (paymentMethod === 'Cash') {
                return res.status(403).json({
                    error: 'Cash payments must be processed by a tax officer. Please visit the tax office to make cash payments.'
                });
            }

            // Verify that the owner is paying for their own property
            // Unified Schema: req.user IS the owner
            if (taxRecord.propertyId.ownerId.toString() !== req.user._id.toString()) {
                return res.status(403).json({ error: 'You can only pay taxes for your own properties' });
            }
        } else if (req.user.role === 'Tax Officer') {
            // Tax Officers can only process payments for properties in their jurisdiction
            if (taxRecord.propertyId.district !== req.user.jurisdiction) {
                return res.status(403).json({
                    error: `You can only process payments for properties in ${req.user.jurisdiction}. This property is in ${taxRecord.propertyId.district}.`
                });
            }
        }
        // Super Admin can process any payment method for any district

        const paymentAmount = Number(amount);
        if (isNaN(paymentAmount) || paymentAmount <= 0) {
            return res.status(400).json({ error: 'Invalid payment amount' });
        }

        const currentPaid = taxRecord.paidAmount || 0;
        const balance = taxRecord.amount - currentPaid;

        if (paymentAmount > balance) {
            return res.status(400).json({ 
                error: `Payment amount ($${paymentAmount}) exceeds the remaining balance ($${balance}).` 
            });
        }

        // Update payment details
        taxRecord.paidAmount = currentPaid + paymentAmount;
        taxRecord.paidDate = new Date();

        // Update status based on payment
        if (taxRecord.paidAmount >= taxRecord.amount) {
            taxRecord.status = 'Paid';
            // Sync with Property model for Map View
            await Property.findByIdAndUpdate(taxRecord.propertyId._id || taxRecord.propertyId, { paymentStatus: 'paid' });
        } else if (taxRecord.paidAmount > 0) {
            taxRecord.status = 'Partially Paid';
        }

        await taxRecord.save();

        // Send notifications to tax officer and admin
        try {
            const notificationService = require('../services/notificationService');
            await notificationService.notifyPaymentReceived(
                taxRecord,
                taxRecord.propertyId,
                Number(amount),
                req.user.name
            );
        } catch (notifError) {
            console.error('Failed to send payment notification:', notifError);
            // Don't fail the request if notification fails
        }

        const AuditLog = require('../models/AuditLog');
        await AuditLog.create({
            userId: req.user ? req.user._id : null,
            userName: req.user ? req.user.name : 'System',
            userRole: req.user ? req.user.role : 'System',
            action: 'RECORD_PAYMENT',
            targetType: 'Payment',
            targetId: taxRecord._id.toString(),
            targetName: taxRecord.taxAccountNumber,
            details: `Recorded payment of $${amount} for TAN: ${taxRecord.taxAccountNumber}`,
            ipAddress: req.ip || ''
        });

        res.json({
            message: 'Payment recorded successfully',
            taxRecord,
            paymentDetails: {
                amount,
                method: paymentMethod,
                reference,
                date: new Date(),
                paidBy: req.user.name
            }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Update Payment Status
exports.updatePaymentStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        const taxRecord = await TaxRecord.findByIdAndUpdate(
            id,
            { status },
            { new: true }
        ).populate('propertyId', 'address district')
            .populate('ownerId', 'name');

        if (!taxRecord) return res.status(404).json({ error: 'Tax record not found' });

        // Sync with Property model for Map View
        if (status === 'Paid') {
             await Property.findByIdAndUpdate(taxRecord.propertyId._id, { paymentStatus: 'paid' });
        } else {
             await Property.findByIdAndUpdate(taxRecord.propertyId._id, { paymentStatus: 'unpaid' });
        }

        res.json(taxRecord);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};


// Mark Overdue Taxes
exports.markOverdueTaxes = async (req, res) => {
    try {
        const today = new Date();
        const overdueRecords = await TaxRecord.find({
            status: { $in: ['Pending', 'Partially Paid'] },
            dueDate: { $lt: today }
        });

        const notificationService = require('../services/notificationService');
        let count = 0;

        for (const record of overdueRecords) {
            record.status = 'Overdue';
            await record.save();
            count++;

            try {
                const property = await Property.findById(record.propertyId);
                const owner = await User.findById(record.ownerId);
                if (property && owner) {
                    await notificationService.notifyPaymentReminder(record, property, owner);
                }
            } catch (err) {
                console.error('Failed to send overdue notification:', err);
            }
        }

        res.json({ message: `Marked ${count} records as Overdue`, count });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Send Payment Reminders to Unpaid Tax Records
exports.sendPaymentReminders = async (req, res) => {
    try {
        const { taxRecordIds } = req.body; // Array of tax record IDs to remind

        if (!taxRecordIds || !Array.isArray(taxRecordIds) || taxRecordIds.length === 0) {
            return res.status(400).json({ error: 'Please provide an array of tax record IDs' });
        }

        const results = [];
        const notificationService = require('../services/notificationService');

        for (const taxRecordId of taxRecordIds) {
            try {
                const taxRecord = await TaxRecord.findById(taxRecordId);
                if (!taxRecord) {
                    results.push({ taxRecordId, status: 'failed', error: 'Tax record not found' });
                    continue;
                }

                // Only send reminders for unpaid taxes
                if (taxRecord.status === 'Paid') {
                    results.push({ taxRecordId, status: 'skipped', reason: 'Already paid' });
                    continue;
                }

                const property = await Property.findById(taxRecord.propertyId);
                if (!property) {
                    results.push({ taxRecordId, status: 'failed', error: 'Property not found' });
                    continue;
                }

                const owner = await User.findById(taxRecord.ownerId);
                if (!owner) {
                    results.push({ taxRecordId, status: 'failed', error: 'Owner not found' });
                    continue;
                }

                // Send reminder notification
                await notificationService.notifyPaymentReminder(taxRecord, property, owner);
                results.push({
                    taxRecordId,
                    status: 'success',
                    owner: owner.name,
                    property: property.address,
                    amount: taxRecord.amount
                });

            } catch (error) {
                results.push({ taxRecordId, status: 'failed', error: error.message });
            }
        }

        const successCount = results.filter(r => r.status === 'success').length;
        const failedCount = results.filter(r => r.status === 'failed').length;
        const skippedCount = results.filter(r => r.status === 'skipped').length;

        res.json({
            message: `Reminders sent: ${successCount} successful, ${failedCount} failed, ${skippedCount} skipped`,
            summary: { successCount, failedCount, skippedCount },
            details: results
        });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Get Dashboard Reports (Scenario 9)
exports.getReports = async (req, res) => {
    try {
        const totalProperties = await Property.countDocuments();
        
        const paidTaxesRecords = await TaxRecord.find({ status: { $in: ['Paid', 'Partially Paid'] } });
        let paidTaxesCount = paidTaxesRecords.length;
        let totalRevenue = 0;
        paidTaxesRecords.forEach(r => {
            totalRevenue += (r.paidAmount || 0);
        });

        const unpaidTaxesCount = await TaxRecord.countDocuments({ status: { $in: ['Pending', 'Overdue'] } });

        res.json({
            totalRevenue,
            totalProperties,
            paidTaxes: paidTaxesCount,
            unpaidTaxes: unpaidTaxesCount
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

