'use strict';
const scannerUseCases = require('../../use-cases/scanner/scanner-use-cases');

function buildHandler(terminalType) {
  return async (req, res) => {
    try {
      const timelog = await scannerUseCases.recordAttendance({
        terminalType,
        studentId: req.body.student_id || null,
        studentNumber: req.body.student_number || null,
        logDatetime: req.body.log_datetime,
        logType: req.body.log_type || 'AUTO',
        verificationMethod: req.body.verification_method,
        verificationScore: req.body.verification_score || null,
        eventId: req.body.event_id || null,
        actorUserId: req.user?.id || null,
        actorRoleName: req.user?.role?.name || null,
        schoolId: req.user?.schoolId || null
      });

      res.status(201).json(timelog);
    } catch (error) {
      const status = error.statusCode || 400;
      res.status(status).json({ error: error.message });
    }
  };
}

const scannerController = {
  getContext: async (req, res) => {
    try {
      const { terminalType } = req.params;
      const ctx = await scannerUseCases.getTerminalContext({
        terminalType,
        actorUserId: req.user?.id || null,
        actorRoleName: req.user?.role?.name || null
      });
      res.json(ctx);
    } catch (error) {
      const status = error.statusCode || 400;
      res.status(status).json({ error: error.message });
    }
  },

  recordHallway: buildHandler('hallway'),
  recordClassroom: buildHandler('classroom'),
  recordEvent: buildHandler('event'),
  manualClassroomPresentOverride: async (req, res) => {
    try {
      const result = await scannerUseCases.manualClassroomPresentOverride({
        studentId: req.body.student_id || null,
        assignmentId: req.body.assignment_id || null,
        attendanceDate: req.body.attendance_date || null,
        actorUserId: req.user?.id || null,
        actorRoleName: req.user?.role?.name || null
      });
      res.status(201).json(result);
    } catch (error) {
      const status = error.statusCode || 400;
      res.status(status).json({ error: error.message });
    }
  },
  manualClassroomAbsentOverride: async (req, res) => {
    try {
      const result = await scannerUseCases.manualClassroomAbsentOverride({
        studentId: req.body.student_id || null,
        assignmentId: req.body.assignment_id || null,
        attendanceDate: req.body.attendance_date || null,
        actorUserId: req.user?.id || null,
        actorRoleName: req.user?.role?.name || null
      });
      res.status(200).json(result);
    } catch (error) {
      const status = error.statusCode || 400;
      res.status(status).json({ error: error.message });
    }
  }
};

module.exports = scannerController;
