'use strict';
const departmentUseCases = require('../../use-cases/department/department-use-cases');

const departmentController = {
  getDepartments: async (req, res) => {
    try {
      const departments = await departmentUseCases.getDepartments(req.query);
      res.status(200).json(departments);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  getDepartmentById: async (req, res) => {
    try {
      const department = await departmentUseCases.getDepartmentById(req.params.id);
      res.status(200).json(department);
    } catch (error) {
      const status = error.message === 'Department not found' ? 404 : 500;
      res.status(status).json({ error: error.message });
    }
  },

  createDepartment: async (req, res) => {
    try {
      const department = await departmentUseCases.createDepartment(req.body, req.user.id);
      res.status(201).json(department);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  },

  updateDepartment: async (req, res) => {
    try {
      const department = await departmentUseCases.updateDepartment(req.params.id, req.body, req.user.id);
      res.status(200).json(department);
    } catch (error) {
      const status = error.message === 'Department not found' ? 404 : 400;
      res.status(status).json({ error: error.message });
    }
  }
};

module.exports = departmentController;
