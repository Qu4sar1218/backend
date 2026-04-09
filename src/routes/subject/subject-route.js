'use strict';
const express = require('express');
const subjectController = require('../../controllers/subject/subject-controller');
const { authenticateToken, authorizeRole } = require('../../middleware/auth');

const router = express.Router();

router.use(authenticateToken);
router.use(authorizeRole(['Admin']));

router.get('/', subjectController.getSubjects);
router.get('/:id', subjectController.getSubjectById);
router.post('/', subjectController.createSubject);
router.put('/:id', subjectController.updateSubject);

module.exports = router;
