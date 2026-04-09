'use strict';

const express = require('express');
const reportsController = require('../../controllers/reports/reports-controller');
const { authenticateToken, authorizeRole } = require('../../middleware/auth');

const router = express.Router();

router.use(authenticateToken);

router.get(
  '/terminal-analytics',
  authorizeRole(['Admin']),
  reportsController.getTerminalAnalytics
);
router.get(
  '/section-attendance',
  authorizeRole(['Admin']),
  reportsController.getSectionAttendance
);
router.get(
  '/hallway-daily-comparison',
  authorizeRole(['Admin']),
  reportsController.getHallwayDailyComparison
);
router.get(
  '/section-attendance-by-subject',
  authorizeRole(['Admin']),
  reportsController.getSectionAttendanceBySubject
);
router.get(
  '/section-attendance-trend',
  authorizeRole(['Admin']),
  reportsController.getSectionAttendanceTrend
);
router.get(
  '/export-hallway-csv',
  authorizeRole(['Admin']),
  reportsController.exportHallwayCsv
);
router.get(
  '/export-classroom-csv',
  authorizeRole(['Admin']),
  reportsController.exportClassroomCsv
);
router.get(
  '/export-event-csv',
  authorizeRole(['Admin']),
  reportsController.exportEventCsv
);

module.exports = router;
