const express = require('express');
const authRoutes = require('./auth/auth-route');
const userRoutes = require('./user/user-route');
const studentRoutes = require('./student/student-route');
const rawTimelogRoutes = require('./raw-timelog/raw-timelog-route');
const timelogDeviceRoutes = require('./timelog-device/timelog-device-route');
const courseRoutes = require('./course/course-route');
const subjectRoutes = require('./subject/subject-route');
const departmentRoutes = require('./department/department-route');
const teacherRoutes = require('./teacher/teacher-route');
const sectionRoutes = require('./section/section-route');
const studentEnrollmentRoutes = require('./student-enrollment/student-enrollment-route');
const studentSubjectAssignmentRoutes = require('./student-subject-assignment/student-subject-assignment-route');
const teacherSubjectListRoutes = require('./teacher-subject/teacher-subject-list-route');
const sectionSubjectAssignmentRoutes = require('./section-subject-assignment/section-subject-assignment-route');
const eventRoutes = require('./event/event-route');
const scannerRoutes = require('./scanner/scanner-route');
const dashboardRoutes = require('./dashboard/dashboard-route');
const paymentRoutes = require('./payment/payment-route');
const attendancePolicyRoutes = require('./attendance-policy/attendance-policy-route');
const reportsRoutes = require('./reports/reports-route');
const emailLogRoutes = require('./email-log/email-log-route');
const router = express.Router();

const testEmailRoute = require('./email/test-email-route');


// Mount the routes
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/students', studentRoutes);
router.use('/raw-timelogs', rawTimelogRoutes);
router.use('/timelog-devices', timelogDeviceRoutes);
router.use('/courses', courseRoutes);
router.use('/subjects', subjectRoutes);
router.use('/departments', departmentRoutes);
router.use('/teachers', teacherRoutes);
router.use('/sections', sectionRoutes);
router.use('/student-enrollments', studentEnrollmentRoutes);
router.use('/student-subject-assignments', studentSubjectAssignmentRoutes);
router.use('/teacher-subjects', teacherSubjectListRoutes);
router.use('/section-subject-assignments', sectionSubjectAssignmentRoutes);
router.use('/events', eventRoutes);
router.use('/scanner', scannerRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/payments', paymentRoutes);
router.use('/attendance-policies', attendancePolicyRoutes);
router.use('/reports', reportsRoutes);
router.use('/email-logs', emailLogRoutes);
router.use('/emails', testEmailRoute);


module.exports = router; 