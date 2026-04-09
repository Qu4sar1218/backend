'use strict';

const reportsUseCases = require('../../use-cases/reports/reports-use-cases');

function sendCsv(res, filename, csv) {
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.status(200).send(csv);
}

const reportsController = {
  getTerminalAnalytics: async (req, res) => {
    try {
      const payload = await reportsUseCases.getTerminalAnalytics({
        terminal: req.query.terminal,
        from: req.query.from,
        to: req.query.to,
        granularity: req.query.granularity,
        event_id: req.query.event_id || null
      });
      res.status(200).json(payload);
    } catch (error) {
      const status = error.statusCode || 500;
      res.status(status).json({ error: error.message });
    }
  },

  getSectionAttendance: async (req, res) => {
    try {
      const payload = await reportsUseCases.getSectionAttendanceReport({
        sectionId: req.query.section_id,
        date: req.query.date
      });
      res.status(200).json(payload);
    } catch (error) {
      const status = error.statusCode || 500;
      res.status(status).json({ error: error.message });
    }
  },

  getHallwayDailyComparison: async (req, res) => {
    try {
      const payload = await reportsUseCases.getHallwayDailyComparison({
        date: req.query.date
      });
      res.status(200).json(payload);
    } catch (error) {
      const status = error.statusCode || 500;
      res.status(status).json({ error: error.message });
    }
  },

  getSectionAttendanceBySubject: async (req, res) => {
    try {
      const payload = await reportsUseCases.getSectionAttendanceBySubject({
        sectionId: req.query.section_id,
        date: req.query.date
      });
      res.status(200).json(payload);
    } catch (error) {
      const status = error.statusCode || 500;
      res.status(status).json({ error: error.message });
    }
  },

  getSectionAttendanceTrend: async (req, res) => {
    try {
      const payload = await reportsUseCases.getSectionAttendanceTrend({
        sectionId: req.query.section_id,
        from: req.query.from,
        to: req.query.to
      });
      res.status(200).json(payload);
    } catch (error) {
      const status = error.statusCode || 500;
      res.status(status).json({ error: error.message });
    }
  },

  exportHallwayCsv: async (req, res) => {
    try {
      const payload = await reportsUseCases.exportHallwayCsv({
        from: req.query.from,
        to: req.query.to
      });
      sendCsv(res, payload.filename, payload.csv);
    } catch (error) {
      const status = error.statusCode || 500;
      res.status(status).json({ error: error.message });
    }
  },

  exportClassroomCsv: async (req, res) => {
    try {
      const payload = await reportsUseCases.exportClassroomCsv({
        from: req.query.from,
        to: req.query.to
      });
      sendCsv(res, payload.filename, payload.csv);
    } catch (error) {
      const status = error.statusCode || 500;
      res.status(status).json({ error: error.message });
    }
  },

  exportEventCsv: async (req, res) => {
    try {
      const payload = await reportsUseCases.exportEventCsv({
        from: req.query.from,
        to: req.query.to,
        eventId: req.query.event_id || null
      });
      sendCsv(res, payload.filename, payload.csv);
    } catch (error) {
      const status = error.statusCode || 500;
      res.status(status).json({ error: error.message });
    }
  }
};

module.exports = reportsController;
