const express = require('express');
const router = express.Router();
const { getOwners, createOwner, getOwnerById, updateOwner, deleteOwner, migrateOwners } = require('../controllers/ownerController');
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');

// Data Migration Route (Super Admin only)
router.post('/migrate-data', protect, authorize('Super Admin'), migrateOwners);

// Get all owners - All authenticated users (filtered by role in controller)
router.get('/', protect, getOwners);

// Create owner - Super Admin and Tax Officer only
router.post('/', protect, authorize('Super Admin', 'Tax Officer'), createOwner);

// Get single owner - All authenticated users (filtered by role in controller)
router.get('/:id', protect, getOwnerById);

// Update owner - Super Admin and Tax Officer only
router.put('/:id', protect, authorize('Super Admin', 'Tax Officer'), updateOwner);

// Delete owner - Super Admin and Tax Officer only
router.delete('/:id', protect, authorize('Super Admin', 'Tax Officer'), deleteOwner);

module.exports = router;

