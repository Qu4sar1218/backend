'use strict';

const { EmailLog, Student } = require('../../sequelize/models');
const { Op } = require('sequelize');

const listIncludes = [
  {
    model: Student,
    as: 'student',
    attributes: ['id', 'firstName', 'middleName', 'lastName', 'studentIdNumber', 'guardianEmail']
  }
];

const emailLogDataAccess = {
  findAllPaginated: async ({
    page = 1,
    limit = 20,
    studentId = null,
    status = null,
    attendanceDate = null,
    emailType = null,
    search = null
  } = {}) => {
    const safeLimit = Math.min(Math.max(Number(limit) || 20, 1), 100);
    const safePage = Math.max(Number(page) || 1, 1);
    const offset = (safePage - 1) * safeLimit;

    const where = {};
    if (studentId) where.studentId = studentId;
    if (status) where.status = status;
    if (attendanceDate) where.attendanceDate = attendanceDate;
    if (emailType) where.emailType = emailType;

    if (search && String(search).trim()) {
      const q = `%${String(search).trim()}%`;
      where[Op.or] = [
        { recipientEmail: { [Op.iLike]: q } },
        { subject: { [Op.iLike]: q } },
        { errorMessage: { [Op.iLike]: q } }
      ];
    }

    const { rows, count } = await EmailLog.findAndCountAll({
      where,
      include: listIncludes,
      limit: safeLimit,
      offset,
      order: [['createdAt', 'DESC']],
      distinct: true,
      subQuery: false
    });

    return {
      rows,
      count,
      page: safePage,
      limit: safeLimit,
      totalPages: Math.ceil(count / safeLimit) || 1
    };
  },

  findById: async (id) => {
    return EmailLog.findByPk(id, {
      include: listIncludes
    });
  }
};

module.exports = emailLogDataAccess;
