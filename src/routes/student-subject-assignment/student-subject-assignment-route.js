'use strict';
const express = require('express');
const studentSubjectAssignmentController = require('../../controllers/student-subject-assignment/student-subject-assignment-controller');
const { authenticateToken, authorizeRole } = require('../../middleware/auth');

const router = express.Router();

router.use(authenticateToken);
router.use(authorizeRole(['Admin']));

router.get('/', studentSubjectAssignmentController.listStudentSubjectAssignmentsForAdmin);
router.patch('/:id', studentSubjectAssignmentController.updateStudentSubjectAssignment);
router.delete('/:id', studentSubjectAssignmentController.deleteStudentSubjectAssignment);

module.exports = router;
