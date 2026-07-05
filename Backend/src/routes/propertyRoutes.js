const express = require('express');
const router = express.Router();
const {
    getProperties, createProperty, getPropertyById,
    updateProperty, deleteProperty,
    getMapProperties, updatePaymentStatus
} = require('../controllers/propertyController');
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');
const upload = require('../middleware/uploadMiddleware');

// Map data endpoint (must be before /:id to avoid route conflict)
router.get('/map', protect, getMapProperties);

// Get all properties
router.get('/', protect, getProperties);

// Create property
router.post('/', protect, authorize('Super Admin', 'Tax Officer'), upload.fields([
    { name: 'titleDeed', maxCount: 1 },
    { name: 'passportImage', maxCount: 1 }
]), createProperty);

// Get single property
router.get('/:id', protect, getPropertyById);

// Update property
router.put('/:id', protect, authorize('Super Admin', 'Tax Officer'), updateProperty);

// Delete property
router.delete('/:id', protect, authorize('Super Admin', 'Tax Officer'), deleteProperty);

// Update payment status (for map color-coding)
router.patch('/:id/payment-status', protect, authorize('Super Admin', 'Tax Officer'), updatePaymentStatus);

module.exports = router;
