'use strict';

const emailLogUseCases = require('../../use-cases/email-log/email-log-use-cases');

function toJson(model) {
  if (!model) return null;
  return typeof model.toJSON === 'function' ? model.toJSON() : model;
}

const emailLogController = {
  listEmailLogs: async (req, res) => {
    try {
      const result = await emailLogUseCases.listEmailLogs(req.query);
      res.status(200).json({
        rows: result.rows.map((r) => toJson(r)),
        count: result.count,
        page: result.page,
        limit: result.limit,
        totalPages: result.totalPages
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  getEmailLogById: async (req, res) => {
    try {
      const row = await emailLogUseCases.getEmailLogById(req.params.id);
      res.status(200).json(toJson(row));
    } catch (error) {
      const status = error.statusCode || 500;
      res.status(status).json({ error: error.message });
    }
  }
};

module.exports = emailLogController;
