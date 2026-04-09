const express = require('express');
const timelogDeviceController = require('../../controllers/timelog-device/timelog-device-controller');
const { authenticateToken, authorizeRole } = require('../../middleware/auth');

const router = express.Router();

router.use(authenticateToken);

router.get('/', timelogDeviceController.getDevices);
router.get('/by-code/:code', timelogDeviceController.getDeviceByCode);
router.get('/:id', timelogDeviceController.getDeviceById);
router.put('/:id', authorizeRole(['Admin']), timelogDeviceController.updateDevice);

module.exports = router;
