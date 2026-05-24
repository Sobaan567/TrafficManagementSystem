const express = require('express');
const router = express.Router();
const officerController = require('../controllers/officerController');
const { authenticate, authorize } = require('../middleware/auth');

/**
 * GET /api/officers
 * Get all officers (Admin only)
 */
router.get('/', authenticate, authorize('Admin'), officerController.getOfficers);

/**
 * GET /api/officers/:officerId
 * Get specific officer details
 */
router.get('/:officerId', authenticate, officerController.getOfficerDetails);

/**
 * PUT /api/officers/:officerId/location
 * Update officer location (Officers only)
 */
router.put('/:officerId/location', authenticate, authorize('Officer'), officerController.updateOfficerLocation);

/**
 * GET /api/officers/:officerId/stats
 * Get officer performance statistics
 */
router.get('/:officerId/stats', authenticate, officerController.getOfficerStats);

/**
 * GET /api/officers/:officerId/challans
 * Get officer's challan history
 */
router.get('/:officerId/challans', authenticate, officerController.getOfficerChallanHistory);

module.exports = router;
