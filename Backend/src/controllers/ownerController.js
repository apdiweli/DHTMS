const User = require('../models/User');
const Owner = require('../models/Owner'); // Kept for migration
const Property = require('../models/Property');
const bcrypt = require('bcryptjs');
const SystemSettings = require('../models/SystemSettings');

// Helper to calculate property stats for users
const attachPropertyStats = async (users) => {
    // Get all user IDs
    const userIds = users.map(u => u._id);

    // Aggregate property values and counts where ownerId matches user._id
    // Note: Property model refers to owner via 'ownerId'. 
    // PREVIOUSLY: ownerId referred to Owner._id.
    // NOW: ownerId will refer to User._id (since we are merging).
    // During migration, we need to ensure Property.ownerId points to the User._id.

    // For now, let's assume Property.ownerId refers to the correct ID (User ID) after migration.
    // Logic: 
    // If we migrate Owner -> User, the User._id will vary. 
    // *Correction*: We can't easily change Property.ownerId to User._id in one go without breaking foreign keys if we create NEW users.
    // Strategy: 
    // 1. If Owner matches User (linked), we use User._id. 
    // 2. We need to update Properties to point to User._id.

    const propertyStats = await Property.aggregate([
        { $match: { ownerId: { $in: userIds } } },
        {
            $group: {
                _id: '$ownerId',
                totalValue: { $sum: '$value' },
                propertyCount: { $sum: 1 }
            }
        }
    ]);

    const statsMap = {};
    propertyStats.forEach(stat => {
        statsMap[stat._id.toString()] = {
            totalValue: stat.totalValue,
            propertyCount: stat.propertyCount
        };
    });

    return users.map(user => {
        const stats = statsMap[user._id.toString()] || { totalValue: 0, propertyCount: 0 };
        return {
            ...user, // .lean() is needed before this or user.toObject()
            totalValue: stats.totalValue,
            properties: stats.propertyCount
        };
    });
};

exports.getOwners = async (req, res) => {
    try {
        let query = { role: 'Owner' };

        // If user is an Owner, only show their own record
        if (req.user.role === 'Owner') {
            query._id = req.user._id;
        } else if (req.user.role === 'Tax Officer') {
            // Tax Officers can only see owners they registered
            query.createdBy = req.user._id;
        }

        const owners = await User.find(query).select('-password').lean();
        const ownersWithStats = await attachPropertyStats(owners);

        res.json(ownersWithStats);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.createOwner = async (req, res) => {
    const { name, email, phone, district, type, riskLevel, verified, password, status } = req.body;

    // Check if email already exists
    const contactEmail = email; // Map frontend 'contact' or 'email'

    try {
        // Generate new Owner ID
        const lastUser = await User.findOne({ ownerId: { $exists: true } }).sort({ ownerId: -1 });
        let newId = 'OWN-001';
        if (lastUser && lastUser.ownerId) {
            const lastIdNum = parseInt(lastUser.ownerId.split('-')[1]);
            newId = `OWN-${String(lastIdNum + 1).padStart(3, '0')}`;
        }

        const settings = await SystemSettings.getSettings();
        const defaultPassword = password || 'Owner@123';

        if (defaultPassword.length < settings.minimumPasswordLength) {
            return res.status(400).json({ success: false, message: `Password must be at least ${settings.minimumPasswordLength} chars` });
        }

        const userExists = await User.findOne({ email: contactEmail });
        if (userExists) {
            return res.status(400).json({ success: false, message: 'User with this email already exists.' });
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(defaultPassword, salt);

        const newUser = await User.create({
            ownerId: newId,
            name,
            email: contactEmail,
            phone,
            password: hashedPassword,
            role: 'Owner',
            jurisdiction: district || 'N/A', // Map district -> jurisdiction
            type: type || 'Individual',
            riskLevel: riskLevel || 'Low',
            verified: verified || false,
            status: status || 'Active',
            permissions: {
                canManageUsers: false,
                canAudit: false,
                canViewReports: false,
                canCreateProperty: false,
                canEditTaxRate: false,
                canProcessPayment: true
            },
            createdBy: req.user ? req.user._id : null
        });

        // Return without password
        const userResponse = newUser.toObject();
        delete userResponse.password;

        // Notification
        try {
            const notificationService = require('../services/notificationService');
            // Mocking an updated owner object structure for notification
            const notifPayload = { ...userResponse, id: newId, contact: contactEmail };
            await notificationService.notifyOwnerAction(notifPayload, 'Registered');
        } catch (e) { console.error(e); }

        // Create Audit Log
        const AuditLog = require('../models/AuditLog');
        await AuditLog.create({
            userId: req.user ? req.user._id : null,
            userName: req.user ? req.user.name : 'System',
            userRole: req.user ? req.user.role : 'System',
            action: 'CREATE_OWNER',
            targetType: 'User',
            targetId: newUser._id.toString(),
            targetName: newUser.name,
            details: `Registered new Owner: ${newUser.name}`,
            ipAddress: req.ip || ''
        });

        res.status(201).json({ success: true, data: userResponse, message: 'Owner created successfully' });

    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

exports.getOwnerById = async (req, res) => {
    try {
        const owner = await User.findById(req.params.id).select('-password').lean();

        if (!owner || owner.role !== 'Owner') {
            return res.status(404).json({ message: 'Owner not found' });
        }

        // Permission checks
        if (req.user.role === 'Owner' && owner._id.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Access denied.' });
        }
        if (req.user.role === 'Tax Officer' && owner.createdBy?.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Access denied.' });
        }

        res.json(owner);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.updateOwner = async (req, res) => {
    try {
        const owner = await User.findById(req.params.id);
        if (!owner || owner.role !== 'Owner') {
            return res.status(404).json({ message: 'Owner not found' });
        }

        // Update fields
        const allowedUpdates = ['name', 'email', 'phone', 'jurisdiction', 'status', 'type', 'riskLevel', 'verified'];
        allowedUpdates.forEach(field => {
            if (req.body[field] !== undefined) owner[field] = req.body[field];
        });

        // Map district -> jurisdiction if passed
        if (req.body.district) owner.jurisdiction = req.body.district;
        // Map contact -> email
        if (req.body.contact) owner.email = req.body.contact;

        if (req.user) owner.updatedBy = req.user._id;

        await owner.save();

        const response = owner.toObject();
        delete response.password;
        res.json(response);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

exports.deleteOwner = async (req, res) => {
    try {
        const owner = await User.findById(req.params.id);
        if (!owner || owner.role !== 'Owner') {
            return res.status(404).json({ message: 'Owner not found' });
        }

        // Check properties
        const propertyCount = await Property.countDocuments({ ownerId: owner._id });
        if (propertyCount > 0) {
            return res.status(400).json({
                message: `Cannot delete owner. This owner has ${propertyCount} property/properties.`,
                propertyCount
            });
        }

        await owner.deleteOne();
        res.json({ message: 'Owner deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// --- MIGRATION UTILS ---

exports.migrateOwners = async (req, res) => {
    try {
        const oldOwners = await Owner.find({});
        let migratedCount = 0;
        let errors = [];

        for (const oldOwner of oldOwners) {
            try {
                // Check if user already linked
                let user;
                if (oldOwner.userId) {
                    user = await User.findById(oldOwner.userId);
                    if (user) {
                        // Update existing User
                        user.ownerId = oldOwner.id;
                        user.type = oldOwner.type;
                        user.phone = oldOwner.phone;
                        user.riskLevel = oldOwner.riskLevel;
                        user.verified = oldOwner.verified;
                        user.role = 'Owner';
                        // Map district
                        if (!user.jurisdiction || user.jurisdiction === 'All Districts') {
                            user.jurisdiction = oldOwner.district;
                        }
                        await user.save();

                        // Update Properties to point to User ID
                        await Property.updateMany({ ownerId: oldOwner._id }, { ownerId: user._id });

                        migratedCount++;
                        continue;
                    }
                }

                // If no user linked, create new User
                // We need email. Use contact or dummy.
                const email = oldOwner.contact || `owner_${oldOwner.id.toLowerCase()}@example.com`;

                // Check if email exists
                const existingUser = await User.findOne({ email });
                if (existingUser) {
                    // Update that user if found by email
                    existingUser.ownerId = oldOwner.id;
                    existingUser.type = oldOwner.type;
                    existingUser.phone = oldOwner.phone;
                    existingUser.role = 'Owner';
                    await existingUser.save();

                    await Property.updateMany({ ownerId: oldOwner._id }, { ownerId: existingUser._id });
                    migratedCount++;
                } else {
                    // Create new
                    const salt = await bcrypt.genSalt(10);
                    const hashedPassword = await bcrypt.hash('Owner@123', salt);

                    const newUser = await User.create({
                        ownerId: oldOwner.id,
                        name: oldOwner.name,
                        email: email,
                        password: hashedPassword,
                        role: 'Owner',
                        jurisdiction: oldOwner.district || 'N/A',
                        type: oldOwner.type,
                        phone: oldOwner.phone,
                        riskLevel: oldOwner.riskLevel,
                        verified: oldOwner.verified,
                        status: oldOwner.status,
                        permissions: { canProcessPayment: true },
                        createdBy: oldOwner.createdBy // Preserve creator
                    });

                    // Update Properties to point to NEW User ID
                    await Property.updateMany({ ownerId: oldOwner._id }, { ownerId: newUser._id });
                    migratedCount++;
                }

            } catch (err) {
                console.error(`Failed to migrate owner ${oldOwner.id}:`, err);
                errors.push({ id: oldOwner.id, error: err.message });
            }
        }

        res.json({
            success: true,
            message: `Migration complete. Migrated ${migratedCount} owners.`,
            errors
        });

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
