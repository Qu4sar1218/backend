'use strict';

const emailLogDataAccess = require('../../data-access/email-log/email-log-data-access');

const emailLogUseCases = {
  listEmailLogs: async (query) => {
    return emailLogDataAccess.findAllPaginated({
      page: query.page,
      limit: query.limit,
      studentId: query.student_id || null,
      status: query.status || null,
      attendanceDate: query.attendance_date || null,
      emailType: query.email_type || null,
      search: query.search || null
    });
  },

  getEmailLogById: async (id) => {
    const row = await emailLogDataAccess.findById(id);
    if (!row) {
      const err = new Error('Email log not found');
      err.statusCode = 404;
      throw err;
    }
    return row;
  }
};

module.exports = emailLogUseCases;
