const express = require('express');
const router = express.Router();
const challanController = require('../controllers/challanController');
const { authenticate, authorize } = require('../middleware/auth');

// ✅ PUBLIC - no auth required (must be before /:challanId)
router.get('/public/vehicle/:registrationNumber', challanController.getPublicChallans);

// Protected routes
router.get('/', authenticate, challanController.getChallans);
router.get('/stats/summary', authenticate, challanController.getChallanStats);
router.get('/:challanId', authenticate, challanController.getChallanDetails);
router.post('/', authenticate, authorize('Officer', 'Admin'), challanController.createChallan);
router.put('/:challanId', authenticate, authorize('Officer', 'Admin'), challanController.updateChallan);
router.delete('/:challanId', authenticate, authorize('Admin'), challanController.deleteChallan);
router.post('/:challanId/payment', authenticate, challanController.payChallan);
router.get('/:challanId/pdf', authenticate, challanController.generateChallanPDF);
router.post('/:challanId/notify', authenticate, authorize('Officer', 'Admin'), challanController.sendChallanNotification);
router.post('/:challanId/appeal', authenticate, challanController.appealChallan);

module.exports = router;
