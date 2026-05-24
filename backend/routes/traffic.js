const express = require('express');
const router = express.Router();
const trafficController = require('../controllers/trafficController');
const { authenticate, authorize } = require('../middleware/auth');

// Public - no auth required
router.get('/situations', trafficController.getTrafficSituations);

// Officer/Admin only
router.post('/situations', authenticate, authorize('Officer', 'Admin'), trafficController.addTrafficSituation);

router.get('/status', authenticate, trafficController.getTrafficStatus);
router.get('/jams', authenticate, trafficController.getTrafficJams);
router.get('/heatmap', authenticate, trafficController.getTrafficHeatmap);
router.post('/events', authenticate, authorize('Officer', 'Admin'), trafficController.reportTrafficEvent);
router.get('/events', authenticate, trafficController.getTrafficEvents);
router.put('/events/:eventId', authenticate, authorize('Officer', 'Admin'), trafficController.updateTrafficEvent);
router.get('/cameras', authenticate, trafficController.getCameras);
router.get('/cameras/:cameraId/feed', authenticate, trafficController.getCameraFeed);
router.get('/locations', authenticate, trafficController.getLocations);
router.get('/locations/:locationId', authenticate, trafficController.getLocationDetails);

module.exports = router;
