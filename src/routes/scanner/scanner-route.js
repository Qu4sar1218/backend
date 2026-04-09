'use strict';
const express = require('express');
const scannerController = require('../../controllers/scanner/scanner-controller');
const { authenticateToken, authorizeRole } = require('../../middleware/auth');

const router = express.Router();

router.use(authenticateToken);
router.use(authorizeRole(['Admin', 'Teacher']));

router.get('/context/:terminalType', scannerController.getContext);

router.post('/hallway/record', scannerController.recordHallway);
router.post('/classroom/record', scannerController.recordClassroom);
router.post('/classroom/manual-present-override', scannerController.manualClassroomPresentOverride);
router.post('/classroom/manual-absent-override', scannerController.manualClassroomAbsentOverride);
router.post('/event/record', scannerController.recordEvent);

module.exports = router;
