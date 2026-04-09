'use strict';
const studentEnrollmentUseCases = require('../../use-cases/student-enrollment/student-enrollment-use-cases');

const studentEnrollmentController = {
  getAllEnrollments: async (req, res) => {
    try {
      const rows = await studentEnrollmentUseCases.getAllEnrollments(req.query);
      res.status(200).json(rows);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  },

  getStudentEnrollments: async (req, res) => {
    try {
      const rows = await studentEnrollmentUseCases.getStudentEnrollments(req.params.studentId, req.query);
      res.status(200).json(rows);
    } catch (error) {
      const status = error.message === 'Student not found' ? 404 : 400;
      res.status(status).json({ error: error.message });
    }
  },

  createStudentEnrollment: async (req, res) => {
    try {
      const created = await studentEnrollmentUseCases.createEnrollment(req.params.studentId, req.body, req.user?.id);
      res.status(201).json(created);
    } catch (error) {
      const status = error.message === 'Student not found' ? 404 : 400;
      res.status(status).json({ error: error.message });
    }
  },

  updateStudentEnrollment: async (req, res) => {
    try {
      const updated = await studentEnrollmentUseCases.updateEnrollment(req.params.id, req.body, req.user?.id);
      res.status(200).json(updated);
    } catch (error) {
      const status = error.message === 'Enrollment not found' ? 404 : 400;
      res.status(status).json({ error: error.message });
    }
  }
};

module.exports = studentEnrollmentController;
