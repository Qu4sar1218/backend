'use strict';
const express = require('express');
const teacherController = require('../../controllers/teacher/teacher-controller');
const { authenticateToken, authorizeRole } = require('../../middleware/auth');

const router = express.Router();

router.use(authenticateToken);
router.use(authorizeRole(['Admin']));

router.get('/', teacherController.getTeachers);
router.get('/:id', teacherController.getTeacherById);
router.get('/:id/subjects', teacherController.getTeacherSubjects);
router.post('/:id/subjects', teacherController.assignSubjectsToTeacher);
router.delete('/:id/subjects/:subjectId', teacherController.removeTeacherSubject);
router.post('/', teacherController.createTeacher);
router.put('/:id', teacherController.updateTeacher);

module.exports = router;
