'use strict';
const { Department } = require('../../sequelize/models');

const departmentDataAccess = {
  getDepartments: async ({ active } = {}) => {
    const where = {};
    if (active !== undefined) where.active = active === 'true' || active === true;
    const departments = await Department.findAll({ where, order: [['name', 'ASC']] });
    return departments.map(d => d.toJSON());
  },

  getDepartmentById: async (id) => {
    const department = await Department.findByPk(id);
    if (!department) return null;
    return department.toJSON();
  },

  createDepartment: async (data) => {
    const department = await Department.create(data);
    return department.toJSON();
  },

  updateDepartment: async (id, data) => {
    const department = await Department.findByPk(id);
    if (!department) return null;
    await department.update(data);
    return department.toJSON();
  }
};

module.exports = departmentDataAccess;
