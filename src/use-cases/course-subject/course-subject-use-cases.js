'use strict';
const { Course, Subject } = require('../../sequelize/models');
const courseSubjectDataAccess = require('../../data-access/course-subject/course-subject-data-access');

const courseSubjectUseCases = {
  getCourseSubjects: async (courseId, filters) => {
    const course = await Course.findByPk(courseId);
    if (!course) throw new Error('Course not found');
    return courseSubjectDataAccess.getCourseSubjects(courseId, filters);
  },

  assignSubjectsToCourse: async (courseId, data, modifiedBy) => {
    const course = await Course.findByPk(courseId);
    if (!course) throw new Error('Course not found');

    if (!Array.isArray(data.subjectIds) || data.subjectIds.length === 0) {
      throw new Error('subjectIds is required');
    }

    const existingSubjects = await Subject.findAll({ where: { id: data.subjectIds } });
    if (existingSubjects.length !== data.subjectIds.length) {
      throw new Error('One or more subjects not found');
    }

    return courseSubjectDataAccess.assignSubjectsToCourse({
      courseId,
      subjectIds: [...new Set(data.subjectIds)],
      note: data.note || null,
      modifiedBy
    });
  },

  removeCourseSubject: async (courseId, subjectId, modifiedBy) => {
    const removed = await courseSubjectDataAccess.removeCourseSubject({
      courseId,
      subjectId,
      modifiedBy
    });
    if (!removed) throw new Error('Course subject mapping not found');
    return removed;
  }
};

module.exports = courseSubjectUseCases;
