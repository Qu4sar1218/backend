'use strict';
const express = require('express');
const sectionController = require('../../controllers/section/section-controller');
const { authenticateToken, authorizeRole } = require('../../middleware/auth');

const router = express.Router();

router.use(authenticateToken);
router.use(authorizeRole(['Admin']));

router.get('/', sectionController.getSections);
router.get('/:id', sectionController.getSectionById);
router.get('/:id/subject-teachers', sectionController.getSectionSubjectTeachers);
router.post('/:id/subject-teachers', sectionController.assignSectionSubjectTeachers);
router.delete('/:id/subject-teachers/:subjectId/:teacherId', sectionController.removeSectionSubjectTeacher);
router.post('/', sectionController.createSection);
router.put('/:id', sectionController.updateSection);

module.exports = router;
