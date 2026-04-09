'use strict';
const courseUseCases = require('../../use-cases/course/course-use-cases');
const courseSubjectUseCases = require('../../use-cases/course-subject/course-subject-use-cases');

const courseController = {
  getCourses: async (req, res) => {
    try {
      const courses = await courseUseCases.getCourses(req.query);
      res.status(200).json(courses);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  getCourseById: async (req, res) => {
    try {
      const course = await courseUseCases.getCourseById(req.params.id);
      res.status(200).json(course);
    } catch (error) {
      const status = error.message === 'Course not found' ? 404 : 500;
      res.status(status).json({ error: error.message });
    }
  },

  createCourse: async (req, res) => {
    try {
      const course = await courseUseCases.createCourse(req.body, req.user.id);
      res.status(201).json(course);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  },

  updateCourse: async (req, res) => {
    try {
      const course = await courseUseCases.updateCourse(req.params.id, req.body, req.user.id);
      res.status(200).json(course);
    } catch (error) {
      const status = error.message === 'Course not found' ? 404 : 400;
      res.status(status).json({ error: error.message });
    }
  },

  getCourseSubjects: async (req, res) => {
    try {
      const data = await courseSubjectUseCases.getCourseSubjects(req.params.id, req.query);
      res.status(200).json(data);
    } catch (error) {
      const status = error.message === 'Course not found' ? 404 : 400;
      res.status(status).json({ error: error.message });
    }
  },

  assignSubjectsToCourse: async (req, res) => {
    try {
      const data = await courseSubjectUseCases.assignSubjectsToCourse(req.params.id, req.body, req.user?.id);
      res.status(200).json(data);
    } catch (error) {
      const status = error.message === 'Course not found' ? 404 : 400;
      res.status(status).json({ error: error.message });
    }
  },

  removeCourseSubject: async (req, res) => {
    try {
      await courseSubjectUseCases.removeCourseSubject(req.params.id, req.params.subjectId, req.user?.id);
      res.status(204).send();
    } catch (error) {
      const status = error.message === 'Course subject mapping not found' ? 404 : 400;
      res.status(status).json({ error: error.message });
    }
  }
};

module.exports = courseController;
