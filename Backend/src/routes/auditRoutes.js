const express = require('express');
const router = express.Router();
const { getAuditLogs, getAuditLogById } = require('../controllers/auditController');
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');

// All audit routes require authentication and Super Admin role
router.get('/', protect, authorize('Super Admin'), getAuditLogs);
router.get('/:id', protect, authorize('Super Admin'), getAuditLogById);

module.exports = router;
