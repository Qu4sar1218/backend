'use strict';
const teacherSubjectUseCases = require('../use-cases/teacher-subject/teacher-subject-use-cases');
const sectionSubjectTeacherUseCases = require('../use-cases/section-subject-teacher/section-subject-teacher-use-cases');

const teacherAssignmentAdminController = {
  getAllTeacherSubjects: async (req, res) => {
    try {
      const rows = await teacherSubjectUseCases.getAllTeacherSubjects(req.query);
      res.status(200).json(rows);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  },

  getAllSectionSubjectAssignments: async (req, res) => {
    try {
      const rows = await sectionSubjectTeacherUseCases.getAllSectionSubjectTeachers(req.query);
      res.status(200).json(rows);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }
};

module.exports = teacherAssignmentAdminController;
