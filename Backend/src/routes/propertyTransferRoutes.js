const express = require('express');
const router = express.Router();
const propertyTransferController = require('../controllers/propertyTransferController');
const { protect, authorize } = require('../middleware/authMiddleware');

// Get all transfers
router.get('/', protect, propertyTransferController.getAllTransfers);

// Get specific transfer
router.get('/:id', protect, propertyTransferController.getTransferById);

// Get transfer history for property
router.get('/property/:propertyId', protect, propertyTransferController.getHistoryByProperty);

// Create transfer (Tax Officer or Super Admin)
router.post('/', protect, authorize('Super Admin', 'Tax Officer'), propertyTransferController.createTransfer);

// Approve transfer (Super Admin only)
router.put('/:id/approve', protect, authorize('Super Admin'), propertyTransferController.approveTransfer);

// Reject transfer (Super Admin only)
router.put('/:id/reject', protect, authorize('Super Admin'), propertyTransferController.rejectTransfer);

// Owner Actions on Transfer Request
router.put('/:id/owner-approve', protect, authorize('Owner'), propertyTransferController.ownerApproveTransfer);
router.put('/:id/owner-reject', protect, authorize('Owner'), propertyTransferController.ownerRejectTransfer);

module.exports = router;
