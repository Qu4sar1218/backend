'use strict';

const express = require('express');
const attendancePolicyController = require('../../controllers/attendance-policy/attendance-policy-controller');
const { authenticateToken, authorizeRole } = require('../../middleware/auth');

const router = express.Router();

router.use(authenticateToken);

router.get(
  '/school-default',
  authorizeRole(['Admin', 'Teacher']),
  attendancePolicyController.getSchoolDefault
);
router.put('/school-default', authorizeRole(['Admin']), attendancePolicyController.putSchoolDefault);

router.get(
  '/my-assignments',
  authorizeRole(['Teacher']),
  attendancePolicyController.getMyAssignments
);

router.put(
  '/assignments/:assignmentId',
  authorizeRole(['Admin', 'Teacher']),
  attendancePolicyController.putAssignment
);

module.exports = router;
