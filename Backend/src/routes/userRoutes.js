const express = require('express');
const router = express.Router();
const {
    getAllUsers,
    getUserById,
    createUser,
    updateUser,
    updateUserPermissions,
    updateUserStatus,
    deleteUser,
    getUsersByRole,
    resetOwnerPassword,
    changeOwnPassword
} = require('../controllers/userController');
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');

// Get all users - Super Admin and Tax Officer can view
router.get('/', protect, authorize('Super Admin', 'Tax Officer'), getAllUsers);

// Get users by role - Super Admin and Tax Officer can view
router.get('/role/:role', protect, authorize('Super Admin', 'Tax Officer'), getUsersByRole);

// Change own password - Any authenticated user
router.put('/change-password', protect, changeOwnPassword);

// Get single user - Authenticated users can view (Controller handles permission check)
router.get('/:id', protect, getUserById);

// Create new user - Only Super Admin
router.post('/', protect, authorize('Super Admin'), createUser);

// Update user - Only Super Admin
router.put('/:id', protect, authorize('Super Admin'), updateUser);

// Update user permissions - Only Super Admin
router.put('/:id/permissions', protect, authorize('Super Admin'), updateUserPermissions);

// Update user status - Only Super Admin
router.put('/:id/status', protect, authorize('Super Admin'), updateUserStatus);

// Delete user - Only Super Admin
router.delete('/:id', protect, authorize('Super Admin'), deleteUser);

// Reset owner password - Tax Officer or Super Admin
router.put('/:id/reset-password', protect, authorize('Super Admin', 'Tax Officer'), resetOwnerPassword);

module.exports = router;

