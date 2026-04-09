'use strict';
const express = require('express');
const teacherAssignmentAdminController = require('../../controllers/teacher-assignment-admin-controller');
const { authenticateToken, authorizeRole } = require('../../middleware/auth');

const router = express.Router();

router.use(authenticateToken);
router.get('/', authorizeRole(['Admin']), teacherAssignmentAdminController.getAllTeacherSubjects);

module.exports = router;
