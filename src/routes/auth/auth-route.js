const express = require('express');
const authController = require('../../controllers/auth/auth-controller');
const { authenticateToken, blacklistTokenMiddleware } = require('../../middleware/auth');
const { userUpload } = require('../../config/multer-config');

const router = express.Router();

// Login route - public
router.post('/login', authController.login);

// Refresh token route - public
router.post('/refresh-token', authController.refreshToken);

// Logout route - protected
router.post('/logout', authenticateToken, blacklistTokenMiddleware, authController.logout);

// Logout from all devices - protected
router.post('/logout-all', authenticateToken, authController.logoutAll);

// Validate token route - public
router.post('/validate-token', authController.validateToken);

// Change password route - protected
router.post('/change-password', authenticateToken, authController.changePassword);

// Get current user info - protected
router.get('/me', authenticateToken, authController.getCurrentUser);

// Update own profile - protected
router.put('/profile', authenticateToken, userUpload.single('image'), authController.updateProfile);

module.exports = router; 