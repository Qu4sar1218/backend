'use strict';
const express = require('express');
const studentEnrollmentController = require('../../controllers/student-enrollment/student-enrollment-controller');
const { authenticateToken, authorizeRole } = require('../../middleware/auth');

const router = express.Router();

router.use(authenticateToken);

router.get('/', authorizeRole(['Admin']), studentEnrollmentController.getAllEnrollments);
router.patch('/:id', authorizeRole(['Admin']), studentEnrollmentController.updateStudentEnrollment);

module.exports = router;
