'use strict';
const { Course } = require('../../sequelize/models');

const stripSensitive = (course) => {
  const raw = course.toJSON ? course.toJSON() : course;
  return raw;
};

const courseDataAccess = {
  getCourses: async ({ active, yearLevel } = {}) => {
    const where = {};
    if (active !== undefined) where.active = active === 'true' || active === true;
    if (yearLevel) where.yearLevel = yearLevel;
    const courses = await Course.findAll({ where, order: [['name', 'ASC']] });
    return courses.map(stripSensitive);
  },

  getCourseById: async (id) => {
    const course = await Course.findByPk(id);
    if (!course) return null;
    return stripSensitive(course);
  },

  createCourse: async (data) => {
    const course = await Course.create(data);
    return stripSensitive(course);
  },

  updateCourse: async (id, data) => {
    const course = await Course.findByPk(id);
    if (!course) return null;
    await course.update(data);
    return stripSensitive(course);
  }
};

module.exports = courseDataAccess;
