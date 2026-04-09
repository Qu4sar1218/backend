'use strict';

const attendancePolicyUseCases = require('../../use-cases/attendance-policy/attendance-policy-use-cases');

const attendancePolicyController = {
  getSchoolDefault: async (req, res) => {
    try {
      const payload = await attendancePolicyUseCases.getSchoolDefault(req.user);
      res.status(200).json(payload);
    } catch (error) {
      res.status(error.statusCode || 500).json({ error: error.message });
    }
  },
  putSchoolDefault: async (req, res) => {
    try {
      const payload = await attendancePolicyUseCases.putSchoolDefault(req.user, req.body);
      res.status(200).json(payload);
    } catch (error) {
      res.status(error.statusCode || 500).json({ error: error.message });
    }
  },
  getMyAssignments: async (req, res) => {
    try {
      const payload = await attendancePolicyUseCases.getMyAssignments(req.user);
      res.status(200).json(payload);
    } catch (error) {
      res.status(error.statusCode || 500).json({ error: error.message });
    }
  },
  putAssignment: async (req, res) => {
    try {
      const payload = await attendancePolicyUseCases.putAssignmentPolicy(req.user, req.params.assignmentId, req.body);
      res.status(200).json(payload);
    } catch (error) {
      res.status(error.statusCode || 500).json({ error: error.message });
    }
  }
};

module.exports = attendancePolicyController;
