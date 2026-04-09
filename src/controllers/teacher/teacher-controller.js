'use strict';
const teacherUseCases = require('../../use-cases/teacher/teacher-use-cases');
const teacherSubjectUseCases = require('../../use-cases/teacher-subject/teacher-subject-use-cases');

const teacherController = {
  getTeachers: async (req, res) => {
    try {
      const teachers = await teacherUseCases.getTeachers(req.query);
      res.status(200).json(teachers);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  getTeacherById: async (req, res) => {
    try {
      const teacher = await teacherUseCases.getTeacherById(req.params.id);
      res.status(200).json(teacher);
    } catch (error) {
      const status = error.message === 'Teacher not found' ? 404 : 500;
      res.status(status).json({ error: error.message });
    }
  },

  createTeacher: async (req, res) => {
    try {
      const teacher = await teacherUseCases.createTeacher(req.body, req.user.id, req.user.schoolId);
      res.status(201).json(teacher);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  },

  updateTeacher: async (req, res) => {
    try {
      const teacher = await teacherUseCases.updateTeacher(req.params.id, req.body, req.user.id);
      res.status(200).json(teacher);
    } catch (error) {
      const status = error.message === 'Teacher not found' ? 404 : 400;
      res.status(status).json({ error: error.message });
    }
  },

  getTeacherSubjects: async (req, res) => {
    try {
      const data = await teacherSubjectUseCases.getTeacherSubjects(req.params.id, req.query);
      res.status(200).json(data);
    } catch (error) {
      const status = error.message === 'Teacher not found' ? 404 : 400;
      res.status(status).json({ error: error.message });
    }
  },

  assignSubjectsToTeacher: async (req, res) => {
    try {
      const data = await teacherSubjectUseCases.assignSubjectsToTeacher(req.params.id, req.body, req.user?.id);
      res.status(200).json(data);
    } catch (error) {
      const status = error.message === 'Teacher not found' ? 404 : 400;
      res.status(status).json({ error: error.message });
    }
  },

  removeTeacherSubject: async (req, res) => {
    try {
      await teacherSubjectUseCases.removeTeacherSubject(req.params.id, req.params.subjectId, req.user?.id);
      res.status(204).send();
    } catch (error) {
      let status = 400;
      if (error.message === 'Teacher not found' || error.message === 'Teacher subject mapping not found') {
        status = 404;
      }
      res.status(status).json({ error: error.message });
    }
  }
};

module.exports = teacherController;
