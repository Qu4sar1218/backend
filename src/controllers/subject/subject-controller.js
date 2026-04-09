'use strict';
const subjectUseCases = require('../../use-cases/subject/subject-use-cases');

const subjectController = {
  getSubjects: async (req, res) => {
    try {
      const subjects = await subjectUseCases.getSubjects(req.query);
      res.status(200).json(subjects);
    } catch (error) {
      const status = ['Invalid courseId', 'Invalid year'].includes(error.message) ? 400 : 500;
      res.status(status).json({ error: error.message });
    }
  },

  getSubjectById: async (req, res) => {
    try {
      const subject = await subjectUseCases.getSubjectById(req.params.id);
      res.status(200).json(subject);
    } catch (error) {
      const status = error.message === 'Subject not found' ? 404 : 500;
      res.status(status).json({ error: error.message });
    }
  },

  createSubject: async (req, res) => {
    try {
      const subject = await subjectUseCases.createSubject(req.body, req.user.id);
      res.status(201).json(subject);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  },

  updateSubject: async (req, res) => {
    try {
      const subject = await subjectUseCases.updateSubject(req.params.id, req.body, req.user.id);
      res.status(200).json(subject);
    } catch (error) {
      const status = error.message === 'Subject not found' ? 404 : 400;
      res.status(status).json({ error: error.message });
    }
  }
};

module.exports = subjectController;
