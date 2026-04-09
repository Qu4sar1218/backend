'use strict';
const sectionUseCases = require('../../use-cases/section/section-use-cases');
const sectionSubjectTeacherUseCases = require('../../use-cases/section-subject-teacher/section-subject-teacher-use-cases');

const sectionController = {
  getSections: async (req, res) => {
    try {
      const sections = await sectionUseCases.getSections(req.query);
      res.status(200).json(sections);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  getSectionById: async (req, res) => {
    try {
      const section = await sectionUseCases.getSectionById(req.params.id);
      res.status(200).json(section);
    } catch (error) {
      const status = error.message === 'Section not found' ? 404 : 500;
      res.status(status).json({ error: error.message });
    }
  },

  createSection: async (req, res) => {
    try {
      const section = await sectionUseCases.createSection(req.body, req.user?.id);
      res.status(201).json(section);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  },

  updateSection: async (req, res) => {
    try {
      const section = await sectionUseCases.updateSection(req.params.id, req.body, req.user?.id);
      res.status(200).json(section);
    } catch (error) {
      const status = error.message === 'Section not found' ? 404 : 400;
      res.status(status).json({ error: error.message });
    }
  },

  getSectionSubjectTeachers: async (req, res) => {
    try {
      const data = await sectionSubjectTeacherUseCases.getSectionSubjectTeachers(req.params.id, req.query);
      res.status(200).json(data);
    } catch (error) {
      const status = error.message === 'Section not found' ? 404 : 400;
      res.status(status).json({ error: error.message });
    }
  },

  assignSectionSubjectTeachers: async (req, res) => {
    try {
      const data = await sectionSubjectTeacherUseCases.assignSectionSubjectTeachers(req.params.id, req.body, req.user?.id);
      res.status(200).json(data);
    } catch (error) {
      let status = 400;
      if (error.message === 'Section not found' || error.message === 'Teacher not found') {
        status = 404;
      }
      res.status(status).json({ message: error.message, error: error.message });
    }
  },

  removeSectionSubjectTeacher: async (req, res) => {
    try {
      await sectionSubjectTeacherUseCases.removeSectionSubjectTeacher(
        req.params.id,
        req.params.subjectId,
        req.params.teacherId,
        req.user?.id
      );
      res.status(204).send();
    } catch (error) {
      let status = 400;
      if (error.message === 'Section not found' || error.message === 'Section subject-teacher mapping not found') {
        status = 404;
      }
      res.status(status).json({ message: error.message, error: error.message });
    }
  }
};

module.exports = sectionController;
