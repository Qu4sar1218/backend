'use strict';

const dashboardUseCases = require('../../use-cases/dashboard/dashboard-use-cases');

const dashboardController = {
  getAdminStats: async (req, res) => {
    try {
      const payload = await dashboardUseCases.getAdminStats();
      res.status(200).json(payload);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },
  getHallwayWeek: async (req, res) => {
    try {
      const payload = await dashboardUseCases.getHallwayWeekStats();
      res.status(200).json(payload);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },
  getTeacherWeeklySchedule: async (req, res) => {
    try {
      const payload = await dashboardUseCases.getTeacherWeeklySchedule(req.user);
      res.status(200).json(payload);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },
  getStudentWeeklySchedule: async (req, res) => {
    try {
      const payload = await dashboardUseCases.getStudentWeeklySchedule(req.user);
      res.status(200).json(payload);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },
  getStudentTodaySchedule: async (req, res) => {
    try {
      const payload = await dashboardUseCases.getStudentTodaySchedule(req.user);
      res.status(200).json(payload);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },
  getStudentAttendance: async (req, res) => {
    try {
      const payload = await dashboardUseCases.getStudentAttendance(req.user, req.query);
      res.status(200).json(payload);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },
  getStudentAttendanceSummary: async (req, res) => {
    try {
      const payload = await dashboardUseCases.getStudentAttendanceSummary(req.user, req.query);
      res.status(200).json(payload);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },
  getStudentTerminalTimelogSummary: async (req, res) => {
    try {
      const payload = await dashboardUseCases.getStudentTerminalTimelogSummary(req.user, req.query);
      res.status(200).json(payload);
    } catch (error) {
      const status = error.statusCode || 500;
      res.status(status).json({ error: error.message });
    }
  },
  getTeacherAssignedSections: async (req, res) => {
    try {
      const payload = await dashboardUseCases.getTeacherAssignedSections(req.user, req.query);
      res.status(200).json(payload);
    } catch (error) {
      const status = error.statusCode || 500;
      res.status(status).json({ error: error.message });
    }
  },
  getTeacherTeachingAssignments: async (req, res) => {
    try {
      const payload = await dashboardUseCases.getTeacherTeachingAssignments(req.user);
      res.status(200).json(payload);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },
  getTeacherAttendance: async (req, res) => {
    try {
      const payload = await dashboardUseCases.getTeacherAttendance(req.user, req.query);
      res.status(200).json(payload);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },
  getTeacherAttendanceSummary: async (req, res) => {
    try {
      const payload = await dashboardUseCases.getTeacherAttendanceSummary(req.user, req.query);
      res.status(200).json(payload);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },
  getTeacherAttendanceMetrics: async (req, res) => {
    try {
      const payload = await dashboardUseCases.getTeacherAttendanceMetrics(req.user, req.query);
      res.status(200).json(payload);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },
  getAdminActiveEventAttendance: async (req, res) => {
    try {
      const payload = await dashboardUseCases.getAdminActiveEventAttendance(req.query);
      res.status(200).json(payload);
    } catch (error) {
      const status = error.statusCode || 500;
      res.status(status).json({ error: error.message });
    }
  },
  getTeacherActiveEventAttendance: async (req, res) => {
    try {
      const payload = await dashboardUseCases.getTeacherActiveEventAttendance(req.user, req.query);
      res.status(200).json(payload);
    } catch (error) {
      const status = error.statusCode || 500;
      res.status(status).json({ error: error.message });
    }
  }
};

module.exports = dashboardController;
