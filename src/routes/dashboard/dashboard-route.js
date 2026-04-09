'use strict';

const express = require('express');
const dashboardController = require('../../controllers/dashboard/dashboard-controller');
const { authenticateToken, authorizeRole } = require('../../middleware/auth');

const router = express.Router();

router.use(authenticateToken);

router.get('/admin-stats', authorizeRole(['Admin']), dashboardController.getAdminStats);
router.get('/hallway-week', authorizeRole(['Admin']), dashboardController.getHallwayWeek);
router.get('/teacher-weekly-schedule', authorizeRole(['Teacher', 'Admin']), dashboardController.getTeacherWeeklySchedule);
router.get('/student-weekly-schedule', authorizeRole(['Student', 'Admin']), dashboardController.getStudentWeeklySchedule);
router.get('/student-today-schedule', authorizeRole(['Student', 'Admin']), dashboardController.getStudentTodaySchedule);
router.get('/student-attendance', authorizeRole(['Student', 'Admin']), dashboardController.getStudentAttendance);
router.get('/student-attendance-summary', authorizeRole(['Student', 'Admin']), dashboardController.getStudentAttendanceSummary);
router.get(
  '/student-terminal-timelog-summary',
  authorizeRole(['Student', 'Admin']),
  dashboardController.getStudentTerminalTimelogSummary
);
router.get('/teacher-assigned-sections', authorizeRole(['Teacher', 'Admin']), dashboardController.getTeacherAssignedSections);
router.get('/teacher-teaching-assignments', authorizeRole(['Teacher', 'Admin']), dashboardController.getTeacherTeachingAssignments);
router.get('/teacher-attendance', authorizeRole(['Teacher', 'Admin']), dashboardController.getTeacherAttendance);
router.get('/teacher-attendance-summary', authorizeRole(['Teacher', 'Admin']), dashboardController.getTeacherAttendanceSummary);
router.get('/teacher-attendance-metrics', authorizeRole(['Teacher', 'Admin']), dashboardController.getTeacherAttendanceMetrics);
router.get('/admin-active-event-attendance', authorizeRole(['Admin']), dashboardController.getAdminActiveEventAttendance);
router.get('/teacher-active-event-attendance', authorizeRole(['Teacher']), dashboardController.getTeacherActiveEventAttendance);

module.exports = router;
