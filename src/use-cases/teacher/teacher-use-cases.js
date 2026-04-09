'use strict';
const teacherDataAccess = require('../../data-access/teacher/teacher-data-access');

const teacherUseCases = {
  getTeachers: async (filters) => {
    return teacherDataAccess.getTeachers(filters);
  },

  getTeacherById: async (id) => {
    const teacher = await teacherDataAccess.getTeacherById(id);
    if (!teacher) throw new Error('Teacher not found');
    return teacher;
  },

  createTeacher: async (data, createdById, creatorSchoolId) => {
    const required = ['firstName', 'lastName', 'username', 'email', 'password'];
    for (const field of required) {
      if (!data[field]) throw new Error(`${field} is required`);
    }
    if (!creatorSchoolId) throw new Error('School context is required');
    const { schoolId: _ignoredSchoolId, ...safeData } = data;
    return teacherDataAccess.createTeacher({ ...safeData, createdById, schoolId: creatorSchoolId });
  },

  updateTeacher: async (id, data, modifiedById) => {
    const updated = await teacherDataAccess.updateTeacher(id, { ...data, modifiedById });
    if (!updated) throw new Error('Teacher not found');
    return updated;
  }
};

module.exports = teacherUseCases;
