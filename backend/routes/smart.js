const express = require('express');
const router = express.Router();
const smartFeatureController = require('../controllers/smartFeatureController');
const { authenticate, authorize } = require('../middleware/auth');

router.get('/overview', authenticate, authorize('Officer', 'Admin', 'Supervisor'), smartFeatureController.getSmartOverview);
router.get('/feature-suite', authenticate, authorize('Officer', 'Admin', 'Supervisor'), smartFeatureController.getFeatureSuite);
router.post('/incidents', authenticate, authorize('Officer', 'Admin', 'Supervisor'), smartFeatureController.createIncident);
router.post('/anonymous-driving-reports', authenticate, smartFeatureController.createAnonymousDrivingReport);
router.post('/closures', authenticate, authorize('Officer', 'Admin', 'Supervisor'), smartFeatureController.createRoadClosure);
router.post('/payment-plans', authenticate, authorize('Officer', 'Admin', 'Supervisor'), smartFeatureController.createPaymentPlan);
router.post('/saved-routes', authenticate, smartFeatureController.createSavedRoute);
router.post('/broadcast-notifications', authenticate, authorize('Officer', 'Admin', 'Supervisor'), smartFeatureController.broadcastSmartNotification);
router.post('/monthly-report', authenticate, authorize('Officer', 'Admin', 'Supervisor'), smartFeatureController.generateMonthlySmartReport);
router.post('/plate-recognition', authenticate, authorize('Officer', 'Admin', 'Supervisor'), smartFeatureController.recognizePlate);
router.post('/voice-challan-drafts', authenticate, authorize('Officer', 'Admin', 'Supervisor'), smartFeatureController.createVoiceChallanDraft);
router.get('/demerits/:registrationNumber', authenticate, smartFeatureController.getDemeritProfile);
router.post('/demerits', authenticate, authorize('Officer', 'Admin', 'Supervisor'), smartFeatureController.addManualDemerit);
router.get('/license-review/:registrationNumber', authenticate, authorize('Officer', 'Admin', 'Supervisor'), smartFeatureController.getLicenseReview);
router.get('/demerit-reductions', authenticate, authorize('Officer', 'Admin', 'Supervisor'), smartFeatureController.getDemeritReductionRequests);
router.post('/demerit-reductions', authenticate, smartFeatureController.createDemeritReductionRequest);
router.put('/demerit-reductions/:requestId', authenticate, authorize('Officer', 'Admin', 'Supervisor'), smartFeatureController.updateDemeritReductionRequest);
router.post('/safety-courses', authenticate, smartFeatureController.completeSafetyCourse);

module.exports = router;
