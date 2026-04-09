const express = require('express');
const studentController = require('../../controllers/student/student-controller');
const studentEnrollmentController = require('../../controllers/student-enrollment/student-enrollment-controller');
const studentSubjectAssignmentController = require('../../controllers/student-subject-assignment/student-subject-assignment-controller');
const { authenticateToken, authorizeRole } = require('../../middleware/auth');
const { credentialUpload } = require('../../config/multer-config');

const router = express.Router();

router.use(authenticateToken);

router.get('/', studentController.getStudents);
router.get('/eligible-for-face', studentController.getEligibleStudentsForFace);
router.get('/with-face-credentials', studentController.getStudentsWithFaceCredentials);
router.post('/', authorizeRole(['Admin']), studentController.createStudent);
router.get('/:studentId/credentials', studentController.getStudentCredentials);
router.post('/:studentId/credentials', credentialUpload.single('thumbnail'), studentController.enrollFaceCredential);
router.post('/:studentId/credentials/replace', credentialUpload.single('thumbnail'), studentController.replaceFaceCredential);
router.delete('/:studentId/credentials/:credentialId', studentController.deleteCredential);
router.get('/:studentId/enrollments', studentEnrollmentController.getStudentEnrollments);
router.post('/:studentId/enrollments', authorizeRole(['Admin']), studentEnrollmentController.createStudentEnrollment);
router.get('/:studentId/subject-assignments', authorizeRole(['Admin']), studentSubjectAssignmentController.getStudentSubjectAssignments);
router.post('/:studentId/subject-assignments', authorizeRole(['Admin']), studentSubjectAssignmentController.createStudentSubjectAssignment);
router.get('/:studentId/final-schedule', authorizeRole(['Admin']), studentSubjectAssignmentController.getStudentFinalSchedule);
router.get('/:id', studentController.getStudentById);
router.put('/:id', authorizeRole(['Admin']), studentController.updateStudent);

module.exports = router;
