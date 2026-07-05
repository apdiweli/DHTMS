const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/authMiddleware');
const {
    createTicket,
    getTickets,
    getTicket,
    addResponse,
    updateTicketStatus,
    assignTicket
} = require('../controllers/supportController');

// All routes require authentication
router.use(protect);

// Create and get tickets (all authenticated users)
router.post('/', createTicket);
router.get('/', getTickets);

// Get single ticket
router.get('/:id', getTicket);

// Add response to ticket
router.post('/:id/responses', addResponse);

// Update ticket status (Super Admin only)
router.put('/:id/status', authorize('Super Admin'), updateTicketStatus);

// Assign ticket (Super Admin only)
router.put('/:id/assign', authorize('Super Admin'), assignTicket);

module.exports = router;
