const express = require('express');
const router = express.Router();
const violationController = require('../controllers/violationController');
const { authenticate, authorize } = require('../middleware/auth');

// Officer adds violation + auto-generates challan
router.post('/officer-add', authenticate, authorize('Officer', 'Admin'), violationController.officerAddViolation);

module.exports = router;
