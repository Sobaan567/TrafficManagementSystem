const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');
const { authenticate, authorize } = require('../middleware/auth');

/**
 * GET /api/reports/traffic
 * Get traffic report
 */
router.get('/traffic', authenticate, reportController.getTrafficReport);

/**
 * GET /api/reports/challan
 * Get challan report
 */
router.get('/challan', authenticate, reportController.getChallanReport);

/**
 * GET /api/reports/violations
 * Get violations report
 */
router.get('/violations', authenticate, reportController.getViolationReport);

/**
 * GET /api/reports/officer/:officerId
 * Get officer performance report
 */
router.get('/officer/:officerId', authenticate, authorize('Admin'), reportController.getOfficerPerformanceReport);

/**
 * GET /api/reports/zone/:locationId
 * Get zone analytics
 */
router.get('/zone/:locationId', authenticate, reportController.getZoneAnalytics);

/**
 * POST /api/reports/custom
 * Generate custom report
 */
router.post('/custom', authenticate, reportController.generateCustomReport);

/**
 * GET /api/reports/export
 * Export report in various formats
 */
router.get('/export', authenticate, reportController.exportReport);

/**
 * GET /api/reports/statistics
 * Get system-wide statistics
 */
router.get('/statistics', authenticate, reportController.getStatistics);

module.exports = router;
