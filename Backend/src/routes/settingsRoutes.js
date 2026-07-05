const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/authMiddleware');
const {
    getSettings,
    updateSettings
} = require('../controllers/settingsController');

// All routes require authentication and Super Admin role
router.use(protect);
router.use(authorize('Super Admin'));

router.get('/', getSettings);
router.put('/', updateSettings);

module.exports = router;
