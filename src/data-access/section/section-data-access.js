'use strict';
const { Section, Course } = require('../../sequelize/models');

const sectionDataAccess = {
  getSections: async ({ active, courseId, yearLevel } = {}) => {
    const where = {};
    if (active !== undefined) where.active = active === 'true' || active === true;
    if (courseId) where.courseId = courseId;
    if (yearLevel) where.yearLevel = yearLevel;

    const sections = await Section.findAll({
      where,
      include: [{ model: Course, as: 'course', attributes: ['id', 'name', 'code', 'yearLevel'] }],
      order: [['name', 'ASC']]
    });
    return sections.map((s) => s.toJSON());
  },

  getSectionById: async (id) => {
    const section = await Section.findByPk(id, {
      include: [{ model: Course, as: 'course', attributes: ['id', 'name', 'code', 'yearLevel'] }]
    });
    if (!section) return null;
    return section.toJSON();
  },

  createSection: async (data) => {
    const created = await Section.create(data);
    return sectionDataAccess.getSectionById(created.id);
  },

  updateSection: async (id, data) => {
    const section = await Section.findByPk(id);
    if (!section) return null;
    await section.update(data);
    return sectionDataAccess.getSectionById(id);
  }
};

module.exports = sectionDataAccess;
