'use strict';

const express = require('express');
const emailLogController = require('../../controllers/email-log/email-log-controller');
const { authenticateToken, authorizeRole } = require('../../middleware/auth');

const router = express.Router();

router.use(authenticateToken);
router.use(authorizeRole(['Admin']));

router.get('/', emailLogController.listEmailLogs);
router.get('/:id', emailLogController.getEmailLogById);

module.exports = router;
