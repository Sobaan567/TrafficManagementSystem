const express = require('express');
const router = express.Router();
const activityController = require('../controllers/activityController');
const { authenticate, authorize } = require('../middleware/auth');

router.get('/', authenticate, authorize('Officer', 'Admin'), activityController.getActivityLogs);

module.exports = router;
