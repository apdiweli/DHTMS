const PropertyTransfer = require('../models/PropertyTransfer');
const Property = require('../models/Property');
const Owner = require('../models/Owner');
const AuditLog = require('../models/AuditLog');
const TaxRecord = require('../models/TaxRecord');
const notificationService = require('../services/notificationService');
const User = require('../models/User');

// Create a new Property Transfer
exports.createTransfer = async (req, res) => {
    try {
        const { propertyId, newOwnerId, transferType, transferReason, transferDate, saleValue, notes } = req.body;

        const property = await Property.findById(propertyId);
        if (!property) {
            return res.status(404).json({ success: false, message: 'Property not found' });
        }

        // The property's owner is tracked in the User collection, referenced by property.ownerId
        const previousOwnerId = property.ownerId;
        if (!previousOwnerId) {
            return res.status(404).json({ success: false, message: 'Current property owner record not found' });
        }

        const previousOwner = await User.findById(previousOwnerId);
        const newOwner = await User.findById(newOwnerId);
        if (!previousOwner || !newOwner) {
            return res.status(404).json({ success: false, message: 'Owner user records not found' });
        }

        // Prevent transfer to the same owner
        if (previousOwnerId.toString() === newOwnerId.toString()) {
            return res.status(400).json({ success: false, message: 'Cannot transfer property to the current owner' });
        }

        // Check outstanding taxes
        const unpaidTaxes = await TaxRecord.find({
            propertyId: property._id,
            status: { $in: ['Unpaid', 'Partially Paid', 'Overdue'] }
        });

        const previousTaxStatus = unpaidTaxes.length > 0 ? 'Unpaid' : 'Paid';

        // Automatically calculate fee if sale
        let transferFee = 0;
        if (transferType === 'Sale' && saleValue) {
            transferFee = parseFloat(saleValue) * 0.02; // 2% fee
        }

        const transfer = new PropertyTransfer({
            propertyId,
            previousOwnerId,
            newOwnerId,
            transferType,
            transferReason,
            transferDate,
            saleValue: saleValue || 0,
            previousTaxStatus,
            transferFee,
            feeStatus: transferFee > 0 ? 'Pending' : 'Exempt',
            notes,
            createdBy: req.user._id,
            status: 'Pending'
        });

        await transfer.save();

        // Notify Admins of new transfer request
        try {
            await notificationService.notifyAdminEvent(
                'CREATE',
                'New Property Transfer Requested',
                `Transfer ${transfer.transferNumber} for property at ${property.address} is pending approval.`,
                { transferId: transfer._id },
                'medium'
            );

            // Notify initial owner if approval is required
            if (transfer.ownerApprovalStatus === 'Pending') {
                await notificationService.notifyOwnerTransferRequest(transfer, property, previousOwner, newOwner);
            }
        } catch (notifErr) {
            console.error('Notification error (non-fatal):', notifErr.message);
        }

        res.status(201).json({ success: true, data: transfer, message: 'Property transfer request created successfully' });
    } catch (error) {
        console.error('Create transfer error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// Get all property transfers
exports.getAllTransfers = async (req, res) => {
    try {
        let query = {};
        if (req.user.role === 'Owner') {
            query = { 
                $or: [
                    { previousOwnerId: req.user._id },
                    { newOwnerId: req.user._id }
                ]
            };
        }

        const transfers = await PropertyTransfer.find(query)
            .populate('propertyId', 'address taxAccountNumber district')
            .populate('previousOwnerId', 'name id')
            .populate('newOwnerId', 'name id')
            .populate('approvedBy', 'name')
            .populate('createdBy', 'name')
            .sort({ createdAt: -1 });

        res.json({ success: true, data: transfers });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Get transfer by ID
exports.getTransferById = async (req, res) => {
    try {
        const transfer = await PropertyTransfer.findById(req.params.id)
            .populate('propertyId')
            .populate('previousOwnerId')
            .populate('newOwnerId')
            .populate('createdBy', 'name')
            .populate('approvedBy', 'name');

        if (!transfer) {
            return res.status(404).json({ success: false, message: 'Transfer not found' });
        }

        res.json({ success: true, data: transfer });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Approve Transfer - updates Property.ownerId to new owner's userId
exports.approveTransfer = async (req, res) => {
    try {
        const transfer = await PropertyTransfer.findById(req.params.id)
            .populate('newOwnerId')
            .populate('previousOwnerId');

        if (!transfer) {
            return res.status(404).json({ success: false, message: 'Transfer not found' });
        }

        if (transfer.status !== 'Pending') {
            return res.status(400).json({ success: false, message: `Transfer is already ${transfer.status}` });
        }

        // Check if owner approval is required and complete
        if (transfer.ownerApprovalStatus === 'Pending') {
            return res.status(400).json({ success: false, message: 'Cannot approve: Waiting for initial owner to approve the transfer.' });
        }
        if (transfer.ownerApprovalStatus === 'Rejected') {
            return res.status(400).json({ success: false, message: 'Cannot approve: The initial owner has rejected this transfer.' });
        }

        const newOwner = await User.findById(transfer.newOwnerId);
        if (!newOwner) {
            return res.status(404).json({ success: false, message: 'New owner record not found in system' });
        }

        // Update Property owner
        const property = await Property.findById(transfer.propertyId);
        property.ownerId = newOwner._id;
        await property.save();

        // Update Transfer status
        transfer.status = 'Approved';
        transfer.approvedBy = req.user._id;
        await transfer.save();

        // Create Audit Log with correct schema fields
        try {
            await AuditLog.create({
                userId: req.user._id,
                userName: req.user.name,
                userRole: req.user.role,
                action: 'PROPERTY_TRANSFER',
                targetType: 'PropertyTransfer',
                targetId: transfer._id.toString(),
                targetName: transfer.transferNumber,
                details: `Property at ${property.address} transferred from owner ID ${transfer.previousOwnerId} to ${newOwner.name} via ${transfer.transferType}`,
                ipAddress: req.ip,
                severity: 'High'
            });
        } catch (auditErr) {
            console.error('Audit log error (non-fatal):', auditErr.message);
        }

        // Send notifications to old and new owners
        try {
            const oldOwner = await Owner.findById(transfer.previousOwnerId);
            if (oldOwner && oldOwner.userId) {
                await notificationService.createNotification(
                    oldOwner.userId,
                    'UPDATE',
                    'Property Transferred',
                    `Your property at ${property.address} has been successfully transferred. Transfer reference: ${transfer.transferNumber}.`,
                    { transferId: transfer._id },
                    'high'
                );
            }
            if (newOwner.userId) {
                await notificationService.createNotification(
                    newOwner.userId,
                    'UPDATE',
                    'Property Acquired',
                    `Property at ${property.address} has been transferred to you. Transfer reference: ${transfer.transferNumber}.`,
                    { transferId: transfer._id },
                    'high'
                );
            }
        } catch (notifErr) {
            console.error('Notification error (non-fatal):', notifErr.message);
        }

        res.json({ success: true, message: 'Property transfer approved successfully', data: transfer });
    } catch (error) {
        console.error('Approve transfer error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// Reject Transfer
exports.rejectTransfer = async (req, res) => {
    try {
        const transfer = await PropertyTransfer.findById(req.params.id);

        if (!transfer) {
            return res.status(404).json({ success: false, message: 'Transfer not found' });
        }

        if (transfer.status !== 'Pending') {
            return res.status(400).json({ success: false, message: `Transfer is already ${transfer.status}` });
        }

        transfer.status = 'Rejected';
        transfer.approvedBy = req.user._id;
        if (req.body.reason) {
            transfer.notes = `[REJECTED] ${req.body.reason}`;
        }
        await transfer.save();

        // Audit log
        try {
            await AuditLog.create({
                userId: req.user._id,
                userName: req.user.name,
                userRole: req.user.role,
                action: 'PROPERTY_TRANSFER',
                targetType: 'PropertyTransfer',
                targetId: transfer._id.toString(),
                targetName: transfer.transferNumber,
                details: `Transfer ${transfer.transferNumber} was rejected. Reason: ${req.body.reason || 'No reason provided'}`,
                ipAddress: req.ip,
                severity: 'Medium'
            });
        } catch (auditErr) {
            console.error('Audit log error (non-fatal):', auditErr.message);
        }

        res.json({ success: true, message: 'Property transfer rejected', data: transfer });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Get transfer history for a specific property
exports.getHistoryByProperty = async (req, res) => {
    try {
        const transfers = await PropertyTransfer.find({ propertyId: req.params.propertyId })
            .populate('previousOwnerId', 'name id')
            .populate('newOwnerId', 'name id')
            .populate('approvedBy', 'name')
            .sort({ transferDate: -1 });

        res.json({ success: true, data: transfers });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Owner Approve Transfer
exports.ownerApproveTransfer = async (req, res) => {
    try {
        const transfer = await PropertyTransfer.findById(req.params.id);

        if (!transfer) {
            return res.status(404).json({ success: false, message: 'Transfer not found' });
        }

        if (transfer.previousOwnerId.toString() !== req.user._id.toString()) {
            return res.status(403).json({ success: false, message: 'Not authorized to approve this transfer' });
        }

        if (transfer.ownerApprovalStatus !== 'Pending') {
            return res.status(400).json({ success: false, message: `Owner approval is already ${transfer.ownerApprovalStatus}` });
        }

        transfer.ownerApprovalStatus = 'Approved';
        transfer.ownerApprovalDate = new Date();
        await transfer.save();

        res.json({ success: true, message: 'Transfer request approved successfully' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Owner Reject Transfer
exports.ownerRejectTransfer = async (req, res) => {
    try {
        const transfer = await PropertyTransfer.findById(req.params.id);

        if (!transfer) {
            return res.status(404).json({ success: false, message: 'Transfer not found' });
        }

        if (transfer.previousOwnerId.toString() !== req.user._id.toString()) {
            return res.status(403).json({ success: false, message: 'Not authorized to reject this transfer' });
        }

        if (transfer.ownerApprovalStatus !== 'Pending') {
            return res.status(400).json({ success: false, message: `Owner approval is already ${transfer.ownerApprovalStatus}` });
        }

        transfer.ownerApprovalStatus = 'Rejected';
        transfer.ownerApprovalDate = new Date();
        
        // If owner rejects, the entire transfer request should fail.
        transfer.status = 'Rejected';
        if (req.body.reason) {
            transfer.notes = (transfer.notes ? transfer.notes + '\n' : '') + `Rejected by initial owner. Reason: ${req.body.reason}`;
        } else {
            transfer.notes = (transfer.notes ? transfer.notes + '\n' : '') + `Rejected by initial owner.`;
        }

        await transfer.save();

        res.json({ success: true, message: 'Transfer request rejected successfully' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
