'use strict';
const courseDataAccess = require('../../data-access/course/course-data-access');
const { YEAR_LEVELS } = require('../../constants/year-levels');

const courseUseCases = {
  getCourses: async (filters) => {
    if (filters?.yearLevel && !YEAR_LEVELS.includes(filters.yearLevel)) {
      throw new Error('Invalid yearLevel');
    }
    return courseDataAccess.getCourses(filters);
  },

  getCourseById: async (id) => {
    const course = await courseDataAccess.getCourseById(id);
    if (!course) throw new Error('Course not found');
    return course;
  },

  createCourse: async (data, createdById) => {
    const required = ['name', 'code'];
    for (const field of required) {
      if (!data[field]) throw new Error(`${field} is required`);
    }
    if (!data.yearLevel) throw new Error('yearLevel is required');
    if (!YEAR_LEVELS.includes(data.yearLevel)) throw new Error('Invalid yearLevel');

    return courseDataAccess.createCourse({
      name: data.name,
      code: data.code,
      yearLevel: data.yearLevel,
      description: data.description || null,
      active: data.active !== undefined ? data.active : true,
      modifiedBy: createdById || null
    });
  },

  updateCourse: async (id, data, modifiedById) => {
    if (data.yearLevel !== undefined && !YEAR_LEVELS.includes(data.yearLevel)) {
      throw new Error('Invalid yearLevel');
    }
    if (data.active !== undefined) {
      data.active = data.active === true || data.active === 'true';
    }
    const updated = await courseDataAccess.updateCourse(id, {
      ...data,
      modifiedBy: modifiedById || null
    });
    if (!updated) throw new Error('Course not found');
    return updated;
  }
};

module.exports = courseUseCases;
