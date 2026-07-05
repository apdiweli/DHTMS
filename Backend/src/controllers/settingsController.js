const SystemSettings = require('../models/SystemSettings');
const { createAuditLog } = require('./auditController');

// Get system settings
exports.getSettings = async (req, res) => {
    try {
        const settings = await SystemSettings.getSettings();
        res.json({ success: true, data: settings });
    } catch (error) {
        console.error('Error fetching settings:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch settings' });
    }
};

// Update system settings
exports.updateSettings = async (req, res) => {
    try {
        const {
            entityName,
            contactEmail,
            twoFactorEnabled,
            minimumPasswordLength,
            mobileMoneyApiEndpoint,
            timezone,
            defaultCurrency
        } = req.body;

        let settings = await SystemSettings.getSettings();

        // Update fields
        if (entityName !== undefined) settings.entityName = entityName;
        if (contactEmail !== undefined) settings.contactEmail = contactEmail;
        if (twoFactorEnabled !== undefined) settings.twoFactorEnabled = twoFactorEnabled;
        if (minimumPasswordLength !== undefined) settings.minimumPasswordLength = minimumPasswordLength;
        if (mobileMoneyApiEndpoint !== undefined) settings.mobileMoneyApiEndpoint = mobileMoneyApiEndpoint;
        if (timezone !== undefined) settings.timezone = timezone;
        if (defaultCurrency !== undefined) settings.defaultCurrency = defaultCurrency;

        settings.lastUpdatedBy = req.user._id;
        settings.updatedAt = new Date();

        await settings.save();

        // Log audit
        await createAuditLog({
            userId: req.user._id,
            userName: req.user.name,
            userRole: req.user.role,
            action: 'UPDATE',
            targetType: 'SystemSettings',
            targetId: settings._id,
            details: `Updated system settings`,
            ipAddress: req.ip,
            severity: 'Medium'
        });

        res.json({ success: true, data: settings, message: 'Settings updated successfully' });
    } catch (error) {
        console.error('Error updating settings:', error);
        res.status(500).json({ success: false, error: 'Failed to update settings' });
    }
};

