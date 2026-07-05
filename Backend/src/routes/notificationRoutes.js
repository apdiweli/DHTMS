const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const notificationService = require('../services/notificationService');

// Get user's notifications
router.get('/', protect, async (req, res) => {
    try {
        const { unreadOnly, limit } = req.query;
        const notifications = await notificationService.getUserNotifications(
            req.user._id,
            unreadOnly === 'true',
            limit ? parseInt(limit) : 50
        );

        res.json({
            success: true,
            data: notifications
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// Get unread notification count
router.get('/unread-count', protect, async (req, res) => {
    try {
        const count = await notificationService.getUnreadCount(req.user._id);
        res.json({
            success: true,
            count
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// Mark notification as read
router.put('/:id/read', protect, async (req, res) => {
    try {
        const notification = await notificationService.markAsRead(
            req.params.id,
            req.user._id
        );

        if (!notification) {
            return res.status(404).json({
                success: false,
                message: 'Notification not found'
            });
        }

        res.json({
            success: true,
            data: notification
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// Mark all notifications as read
router.put('/read-all', protect, async (req, res) => {
    try {
        const result = await notificationService.markAllAsRead(req.user._id);
        res.json({
            success: true,
            message: `${result.modifiedCount} notifications marked as read`
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// Delete a notification
router.delete('/:id', protect, async (req, res) => {
    try {
        const notification = await notificationService.deleteNotification(
            req.params.id,
            req.user._id
        );

        if (!notification) {
            return res.status(404).json({
                success: false,
                message: 'Notification not found'
            });
        }

        res.json({
            success: true,
            message: 'Notification deleted'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

module.exports = router;
