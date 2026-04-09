'use strict';
const express = require('express');
const courseController = require('../../controllers/course/course-controller');
const { authenticateToken, authorizeRole } = require('../../middleware/auth');

const router = express.Router();

router.use(authenticateToken);
router.use(authorizeRole(['Admin']));

router.get('/', courseController.getCourses);
router.get('/:id', courseController.getCourseById);
router.get('/:id/subjects', courseController.getCourseSubjects);
router.post('/:id/subjects', courseController.assignSubjectsToCourse);
router.delete('/:id/subjects/:subjectId', courseController.removeCourseSubject);
router.post('/', courseController.createCourse);
router.put('/:id', courseController.updateCourse);

module.exports = router;
