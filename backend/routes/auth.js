const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');

/**
 * POST /api/auth/login
 * User login - returns JWT token
 */
router.post('/login', authController.login);

/**
 * POST /api/auth/register
 * User registration
 */
router.post('/register', authController.register);

/**
 * POST /api/auth/logout
 * User logout
 */
router.post('/logout', authenticate, authController.logout);

/**
 * POST /api/auth/refresh
 * Refresh JWT token
 */
router.post('/refresh', authController.refreshToken);

/**
 * GET /api/auth/profile
 * Get current user profile
 */
router.get('/profile', authenticate, authController.getProfile);

/**
 * PUT /api/auth/profile
 * Update user profile
 */
router.put('/profile', authenticate, authController.updateProfile);

/**
 * POST /api/auth/change-password
 * Change user password
 */
router.post('/change-password', authenticate, authController.changePassword);

/**
 * POST /api/auth/forgot-password
 * Request password reset
 */
router.post('/forgot-password', authController.forgotPassword);

/**
 * POST /api/auth/reset-password
 * Reset password with token
 */
router.post('/reset-password', authController.resetPassword);

module.exports = router;
