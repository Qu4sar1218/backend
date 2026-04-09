'use strict';
const { Course } = require('../../sequelize/models');
const sectionDataAccess = require('../../data-access/section/section-data-access');
const { YEAR_LEVELS } = require('../../constants/year-levels');

const sectionUseCases = {
  getSections: async (filters) => {
    if (filters?.yearLevel && !YEAR_LEVELS.includes(filters.yearLevel)) {
      throw new Error('Invalid yearLevel');
    }
    return sectionDataAccess.getSections(filters);
  },

  getSectionById: async (id) => {
    const section = await sectionDataAccess.getSectionById(id);
    if (!section) throw new Error('Section not found');
    return section;
  },

  createSection: async (data, modifiedBy) => {
    const required = ['name', 'code', 'courseId', 'yearLevel'];
    for (const field of required) {
      if (!data[field]) throw new Error(`${field} is required`);
    }
    if (!YEAR_LEVELS.includes(data.yearLevel)) throw new Error('Invalid yearLevel');

    const course = await Course.findByPk(data.courseId);
    if (!course) throw new Error('Course not found');

    return sectionDataAccess.createSection({
      name: data.name,
      code: data.code,
      description: data.description || null,
      courseId: data.courseId,
      yearLevel: data.yearLevel,
      active: data.active !== undefined ? (data.active === true || data.active === 'true') : true,
      note: data.note || null,
      modifiedBy: modifiedBy || null
    });
  },

  updateSection: async (id, data, modifiedBy) => {
    if (data.yearLevel !== undefined && !YEAR_LEVELS.includes(data.yearLevel)) {
      throw new Error('Invalid yearLevel');
    }
    if (data.courseId) {
      const course = await Course.findByPk(data.courseId);
      if (!course) throw new Error('Course not found');
    }

    const payload = {
      ...data,
      modifiedBy: modifiedBy || null
    };
    if (payload.active !== undefined) payload.active = payload.active === true || payload.active === 'true';

    const updated = await sectionDataAccess.updateSection(id, payload);
    if (!updated) throw new Error('Section not found');
    return updated;
  }
};

module.exports = sectionUseCases;
