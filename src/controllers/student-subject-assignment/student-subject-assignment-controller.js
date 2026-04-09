'use strict';
const studentSubjectAssignmentUseCases = require('../../use-cases/student-subject-assignment/student-subject-assignment-use-cases');

const studentSubjectAssignmentController = {
  listStudentSubjectAssignmentsForAdmin: async (req, res) => {
    try {
      const data = await studentSubjectAssignmentUseCases.listStudentSubjectAssignmentsForAdmin(req.query);
      res.status(200).json(data);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  },

  getStudentSubjectAssignments: async (req, res) => {
    try {
      const data = await studentSubjectAssignmentUseCases.getStudentSubjectAssignments(req.params.studentId, req.query);
      res.status(200).json(data);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  },

  createStudentSubjectAssignment: async (req, res) => {
    try {
      const created = await studentSubjectAssignmentUseCases.createStudentSubjectAssignment(
        req.params.studentId,
        req.body,
        req.user?.id
      );
      res.status(201).json(created);
    } catch (error) {
      const status = error.message === 'No active enrollment record found for student' ? 404 : 400;
      res.status(status).json({ error: error.message });
    }
  },

  updateStudentSubjectAssignment: async (req, res) => {
    try {
      const updated = await studentSubjectAssignmentUseCases.updateStudentSubjectAssignment(
        req.params.id,
        req.body,
        req.user?.id
      );
      res.status(200).json(updated);
    } catch (error) {
      const status = error.message === 'Student subject assignment not found' ? 404 : 400;
      res.status(status).json({ error: error.message });
    }
  },

  deleteStudentSubjectAssignment: async (req, res) => {
    try {
      await studentSubjectAssignmentUseCases.deactivateStudentSubjectAssignment(req.params.id, req.user?.id);
      res.status(204).send();
    } catch (error) {
      const status = error.message === 'Student subject assignment not found' ? 404 : 400;
      res.status(status).json({ error: error.message });
    }
  },

  getStudentFinalSchedule: async (req, res) => {
    try {
      const data = await studentSubjectAssignmentUseCases.getStudentFinalSchedule(req.params.studentId, req.query);
      res.status(200).json(data);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }
};

module.exports = studentSubjectAssignmentController;
