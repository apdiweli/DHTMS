const express = require('express');
const router = express.Router();
const taxController = require('../controllers/taxController');
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');

// Seed tax rules - Super Admin only
router.post('/seed', protect, authorize('Super Admin'), taxController.seedTaxRules);

// Recalculate all properties - Super Admin and Tax Officer
router.post('/recalculate-all', protect, authorize('Super Admin', 'Tax Officer'), taxController.recalculateAllProperties);

// Get tax rules - All authenticated users
router.get('/rules', protect, taxController.getTaxRules);

// Create tax rule - Super Admin and Tax Officer
router.post('/rules', protect, authorize('Super Admin', 'Tax Officer'), taxController.createTaxRule);

// Update tax rule - Super Admin and Tax Officer
router.put('/rules/:id', protect, authorize('Super Admin', 'Tax Officer'), taxController.updateTaxRule);

// Delete tax rule - Super Admin only
router.delete('/rules/:id', protect, authorize('Super Admin'), taxController.deleteTaxRule);

// Calculate property tax - All authenticated users
router.get('/calculate/:propertyId', protect, taxController.calculatePropertyTax);

// Generate tax record - Super Admin and Tax Officer
router.post('/generate', protect, authorize('Super Admin', 'Tax Officer'), taxController.generateTaxRecord);

// Generate ANNUAL tax for ALL properties - Super Admin and Tax Officer
router.post('/generate-annual', protect, authorize('Super Admin', 'Tax Officer'), taxController.generateAnnualTaxForAllProperties);

// Tax Records & Payments
// Get all tax records - All authenticated users (filtered by role in controller)
router.get('/records', protect, taxController.getAllTaxRecords);

// Record a payment - All authenticated users (Owners can only pay via Mobile Money/Bank Transfer)
router.post('/payments', protect, taxController.recordPayment);

// Update payment status - Super Admin and Tax Officer
router.put('/records/:id/status', protect, authorize('Super Admin', 'Tax Officer'), taxController.updatePaymentStatus);

// Send payment reminders - Super Admin and Tax Officer
router.post('/reminders', protect, authorize('Super Admin', 'Tax Officer'), taxController.sendPaymentReminders);

// Mark overdue taxes - Super Admin and Tax Officer
router.post('/mark-overdue', protect, authorize('Super Admin', 'Tax Officer'), taxController.markOverdueTaxes);

// Get Dashboard Reports
router.get('/reports', protect, authorize('Super Admin'), taxController.getReports);

module.exports = router;

