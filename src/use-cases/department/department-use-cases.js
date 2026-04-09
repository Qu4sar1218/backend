'use strict';
const departmentDataAccess = require('../../data-access/department/department-data-access');

const departmentUseCases = {
  getDepartments: async (filters) => {
    return departmentDataAccess.getDepartments(filters);
  },

  getDepartmentById: async (id) => {
    const department = await departmentDataAccess.getDepartmentById(id);
    if (!department) throw new Error('Department not found');
    return department;
  },

  createDepartment: async (data, createdById) => {
    const required = ['name', 'code'];
    for (const field of required) {
      if (!data[field]) throw new Error(`${field} is required`);
    }
    return departmentDataAccess.createDepartment({
      name: data.name,
      code: data.code,
      description: data.description || null,
      active: data.active !== undefined ? data.active : true,
      modifiedBy: createdById || null
    });
  },

  updateDepartment: async (id, data, modifiedById) => {
    if (data.active !== undefined) {
      data.active = data.active === true || data.active === 'true';
    }
    const updated = await departmentDataAccess.updateDepartment(id, {
      ...data,
      modifiedBy: modifiedById || null
    });
    if (!updated) throw new Error('Department not found');
    return updated;
  }
};

module.exports = departmentUseCases;
