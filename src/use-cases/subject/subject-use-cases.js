'use strict';
const subjectDataAccess = require('../../data-access/subject/subject-data-access');
const { SUBJECT_YEARS } = require('../../constants/subject-years');

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function normalizeSubjectFilters(filters = {}) {
  const normalized = {};

  if (filters.active !== undefined) {
    normalized.active = filters.active;
  }

  if (filters.courseId !== undefined && filters.courseId !== null && String(filters.courseId).trim() !== '') {
    const courseId = String(filters.courseId).trim();
    if (!UUID_REGEX.test(courseId)) {
      throw new Error('Invalid courseId');
    }
    normalized.courseId = courseId;
  }

  if (filters.year !== undefined && filters.year !== null && String(filters.year).trim() !== '') {
    const year = String(filters.year).trim();
    if (!SUBJECT_YEARS.includes(year)) {
      throw new Error('Invalid year');
    }
    normalized.year = year;
  }

  return normalized;
}

const subjectUseCases = {
  getSubjects: async (filters) => {
    const normalizedFilters = normalizeSubjectFilters(filters);
    return subjectDataAccess.getSubjects(normalizedFilters);
  },

  getSubjectById: async (id) => {
    const subject = await subjectDataAccess.getSubjectById(id);
    if (!subject) throw new Error('Subject not found');
    return subject;
  },

  createSubject: async (data, createdById) => {
    const required = ['name', 'code'];
    for (const field of required) {
      if (!data[field]) throw new Error(`${field} is required`);
    }
    if (data.year !== undefined && data.year !== null && !SUBJECT_YEARS.includes(data.year)) {
      throw new Error('Invalid year');
    }
    return subjectDataAccess.createSubject({
      name: data.name,
      code: data.code,
      year: data.year ?? null,
      description: data.description || null,
      active: data.active !== undefined ? data.active : true,
      modifiedBy: createdById || null
    });
  },

  updateSubject: async (id, data, modifiedById) => {
    if (data.year !== undefined && data.year !== null && !SUBJECT_YEARS.includes(data.year)) {
      throw new Error('Invalid year');
    }
    if (data.active !== undefined) {
      data.active = data.active === true || data.active === 'true';
    }
    const updated = await subjectDataAccess.updateSubject(id, {
      ...data,
      modifiedBy: modifiedById || null
    });
    if (!updated) throw new Error('Subject not found');
    return updated;
  }
};

module.exports = subjectUseCases;
