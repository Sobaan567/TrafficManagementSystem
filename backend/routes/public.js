const express = require('express');
const router = express.Router();
const publicController = require('../controllers/publicController');
const { authenticate, optionalAuthenticate, authorize } = require('../middleware/auth');

/**
 * Public portal endpoints (NO AUTH)
 *
 * These endpoints are intentionally limited to aggregated / non-sensitive fields
 * and require a second factor (registrationNumber) when looking up a challan.
 */

/**
 * GET /api/public/challan/:challanNumber
 * Query params:
 * - registrationNumber (required)
 */
router.get('/challan/:challanNumber', publicController.getPublicChallanByNumber);
router.get('/verify-challan/:token', publicController.verifyPublicChallanToken);

/**
 * GET /api/public/vehicle/:registrationNumber
 * Query params:
 * - ownerPhoneLast4 (optional, recommended)
 *
 * If ownerPhoneLast4 is provided, results are returned only when it matches the
 * vehicle's OwnerPhone OR a challan's OwnerPhone (last 4 digits).
 */
router.get('/vehicle/:registrationNumber', publicController.getPublicVehicleSummary);

/**
 * POST /api/public/register
 *
 * Register a citizen account using NIC and vehicle number. Anonymous public
 * lookups remain available through the existing endpoints above.
 */
router.post('/register', publicController.registerPublicCitizen);

/**
 * GET /api/public/me
 *
 * Registered citizen dashboard summary.
 */
router.get('/me', authenticate, publicController.getPublicCitizenDashboard);
router.put('/me', authenticate, publicController.updatePublicCitizenProfile);

router.get('/appeals', authenticate, publicController.getPublicChallanAppeals);
router.post('/appeals', authenticate, publicController.createPublicChallanAppeal);

router.get('/officer/appeals', authenticate, authorize('Officer', 'Admin'), publicController.getOfficerPublicAppeals);
router.put('/officer/appeals/:appealId', authenticate, authorize('Officer', 'Admin'), publicController.updateOfficerPublicAppeal);

router.post('/complaints', optionalAuthenticate, publicController.createPublicComplaint);
router.get('/complaints/map', publicController.getPublicComplaintMap);
router.get('/complaints/track/:trackingCode', publicController.trackPublicComplaint);
router.get('/complaints', authenticate, publicController.getPublicComplaints);
router.get('/officer/complaints', authenticate, authorize('Officer', 'Admin'), publicController.getOfficerPublicComplaints);
router.put('/officer/complaints/:complaintId', authenticate, authorize('Officer', 'Admin'), publicController.updateOfficerPublicComplaint);

router.get('/subscriptions', authenticate, publicController.getPublicAlertSubscriptions);
router.post('/subscriptions', authenticate, publicController.createPublicAlertSubscription);
router.delete('/subscriptions/:subscriptionId', authenticate, publicController.deletePublicAlertSubscription);

/**
 * POST /api/public/vehicle/:registrationNumber/payment
 *
 * Public payment endpoint. Marks unpaid/partial challans for the
 * vehicle as paid so the public tracker keeps showing Paid on future searches.
 */
router.post('/vehicle/:registrationNumber/payment', publicController.payPublicVehicleChallans);

module.exports = router;
