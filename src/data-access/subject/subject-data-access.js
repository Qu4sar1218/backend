'use strict';
const { Subject, Course } = require('../../sequelize/models');

const subjectDataAccess = {
  getSubjects: async ({ active, courseId, year } = {}) => {
    const where = {};
    const include = [];

    if (active !== undefined) where.active = active === 'true' || active === true;

    if (year !== undefined) {
      where.year = year;
    }

    if (courseId) {
      include.push({
        model: Course,
        as: 'courses',
        attributes: [],
        through: { attributes: [] },
        where: { id: courseId },
        required: true
      });
    }

    const subjects = await Subject.findAll({
      where,
      include,
      distinct: true,
      order: [['name', 'ASC'], ['id', 'ASC']]
    });

    return subjects.map(s => s.toJSON());
  },

  getSubjectById: async (id) => {
    const subject = await Subject.findByPk(id);
    if (!subject) return null;
    return subject.toJSON();
  },

  createSubject: async (data) => {
    const subject = await Subject.create(data);
    return subject.toJSON();
  },

  updateSubject: async (id, data) => {
    const subject = await Subject.findByPk(id);
    if (!subject) return null;
    await subject.update(data);
    return subject.toJSON();
  }
};

module.exports = subjectDataAccess;
