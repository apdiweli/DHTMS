const AuditLog = require('../models/AuditLog');

// Helper function to create audit log
const createAuditLog = async ({ userId, userName, userRole, action, targetType, targetId, targetName, details, ipAddress, severity = 'Low' }) => {
    try {
        const auditLog = new AuditLog({
            userId,
            userName,
            userRole,
            action,
            targetType,
            targetId,
            targetName,
            details,
            ipAddress,
            severity
        });
        await auditLog.save();
        return auditLog;
    } catch (error) {
        console.error('Error creating audit log:', error);
    }
};

// Get all audit logs with filtering and pagination
exports.getAuditLogs = async (req, res) => {
    try {
        const {
            action,
            userId,
            severity,
            startDate,
            endDate,
            search,
            page = 1,
            limit = 50
        } = req.query;

        // Build query
        const query = {};

        if (action) query.action = action;
        if (userId) query.userId = userId;
        if (severity) query.severity = severity;

        // Date range filter
        if (startDate || endDate) {
            query.createdAt = {};
            if (startDate) query.createdAt.$gte = new Date(startDate);
            if (endDate) query.createdAt.$lte = new Date(endDate);
        }

        // Search filter
        if (search) {
            query.$or = [
                { userName: { $regex: search, $options: 'i' } },
                { targetName: { $regex: search, $options: 'i' } },
                { details: { $regex: search, $options: 'i' } }
            ];
        }

        // Calculate pagination
        const skip = (parseInt(page) - 1) * parseInt(limit);

        // Get total count for pagination
        const total = await AuditLog.countDocuments(query);

        // Get audit logs
        const auditLogs = await AuditLog.find(query)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(parseInt(limit))
            .populate('userId', 'name email role');

        res.json({
            success: true,
            data: auditLogs,
            pagination: {
                total,
                page: parseInt(page),
                limit: parseInt(limit),
                pages: Math.ceil(total / parseInt(limit))
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Get single audit log
exports.getAuditLogById = async (req, res) => {
    try {
        const auditLog = await AuditLog.findById(req.params.id)
            .populate('userId', 'name email role');

        if (!auditLog) {
            return res.status(404).json({ success: false, message: 'Audit log not found' });
        }

        res.json({ success: true, data: auditLog });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Export the helper function
exports.createAuditLog = createAuditLog;
