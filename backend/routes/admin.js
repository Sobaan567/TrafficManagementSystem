const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { authenticate, authorize } = require('../middleware/auth');

router.get('/overview', authenticate, authorize('Admin'), adminController.getAdminOverview);
router.get('/search', authenticate, authorize('Admin', 'Officer'), adminController.globalSearch);
router.get('/users', authenticate, authorize('Admin'), adminController.getManagedUsers);
router.post('/users', authenticate, authorize('Admin'), adminController.createManagedUser);
router.put('/users/:userId', authenticate, authorize('Admin'), adminController.updateManagedUser);
router.put('/users/:userId/active', authenticate, authorize('Admin'), adminController.setManagedUserActive);

module.exports = router;
