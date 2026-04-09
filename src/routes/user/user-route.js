const express = require('express');
const userController = require('../../controllers/user/user-controller');
const { userUpload } = require('../../config/multer-config');
const { authenticateToken, authorizeRole } = require('../../middleware/auth');

const router = express.Router();

// Protect all user routes with authentication
router.use(authenticateToken);

// Routes with role-based authorization
router.post('/', authorizeRole(['Admin']), userUpload.single('image'), userController.createUser);
router.get('/', userController.getUsers);
router.get('/:id', userController.getUserById);
router.put('/:id', userUpload.single('image'), userController.updateUser);

module.exports = router; 