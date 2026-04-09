'use strict';
const { Subject } = require('../../sequelize/models');
const teacherDataAccess = require('../../data-access/teacher/teacher-data-access');
const teacherSubjectDataAccess = require('../../data-access/teacher-subject/teacher-subject-data-access');

const teacherSubjectUseCases = {
  getAllTeacherSubjects: async (filters) => {
    return teacherSubjectDataAccess.getAllTeacherSubjects(filters);
  },

  getTeacherSubjects: async (teacherId, filters) => {
    const teacher = await teacherDataAccess.getTeacherById(teacherId);
    if (!teacher) throw new Error('Teacher not found');
    return teacherSubjectDataAccess.getTeacherSubjects(teacherId, filters);
  },

  assignSubjectsToTeacher: async (teacherId, data, modifiedBy) => {
    const teacher = await teacherDataAccess.getTeacherById(teacherId);
    if (!teacher) throw new Error('Teacher not found');

    if (!Array.isArray(data.subjectIds)) {
      throw new Error('subjectIds must be an array');
    }

    const uniqueSubjectIds = [...new Set(data.subjectIds)];
    if (uniqueSubjectIds.length > 0) {
      const existingSubjects = await Subject.findAll({ where: { id: uniqueSubjectIds } });
      if (existingSubjects.length !== uniqueSubjectIds.length) {
        throw new Error('One or more subjects not found');
      }
    }

    return teacherSubjectDataAccess.assignSubjectsToTeacher({
      teacherId,
      subjectIds: uniqueSubjectIds,
      note: data.note || null,
      modifiedBy
    });
  },

  removeTeacherSubject: async (teacherId, subjectId, modifiedBy) => {
    const teacher = await teacherDataAccess.getTeacherById(teacherId);
    if (!teacher) throw new Error('Teacher not found');

    const removed = await teacherSubjectDataAccess.removeTeacherSubject({
      teacherId,
      subjectId,
      modifiedBy
    });
    if (!removed) throw new Error('Teacher subject mapping not found');
    return removed;
  }
};

module.exports = teacherSubjectUseCases;
