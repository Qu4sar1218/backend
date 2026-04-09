'use strict';
const {
  Student,
  Course,
  Section
} = require('../../sequelize/models');
const studentEnrollmentDataAccess = require('../../data-access/student-enrollment/student-enrollment-data-access');
const { YEAR_LEVELS } = require('../../constants/year-levels');
const ENROLLMENT_STATUSES = ['enrolled', 'dropped', 'graduated'];
const STUDENT_TYPES = ['regular', 'irregular'];

const normalizeStudentType = (value) => {
  if (typeof value !== 'string') return '';
  return value.trim().toLowerCase();
};

const studentEnrollmentUseCases = {
  getAllEnrollments: async (filters) => {
    return studentEnrollmentDataAccess.getAllEnrollments(filters);
  },

  getStudentEnrollments: async (studentId, filters) => {
    const student = await Student.findByPk(studentId);
    if (!student) throw new Error('Student not found');
    return studentEnrollmentDataAccess.getStudentEnrollments(studentId, filters);
  },

  createEnrollment: async (studentId, data, modifiedBy) => {
    const required = ['courseId', 'schoolYear', 'yearLevel', 'studentType'];
    for (const field of required) {
      if (!data[field]) throw new Error(`${field} is required`);
    }
    if (!YEAR_LEVELS.includes(data.yearLevel)) throw new Error('Invalid yearLevel');
    if (data.status && !ENROLLMENT_STATUSES.includes(data.status)) throw new Error('Invalid status');
    const studentType = normalizeStudentType(data.studentType);
    if (!STUDENT_TYPES.includes(studentType)) throw new Error('Invalid studentType');

    const [student, course] = await Promise.all([
      Student.findByPk(studentId),
      Course.findByPk(data.courseId)
    ]);
    if (!student) throw new Error('Student not found');
    if (!course) throw new Error('Course not found');

    if (data.sectionId) {
      const section = await Section.findByPk(data.sectionId);
      if (!section) throw new Error('Section not found');
      if (section.courseId !== data.courseId) {
        throw new Error('sectionId does not belong to courseId');
      }
    }

    return studentEnrollmentDataAccess.createEnrollment({
      studentId,
      courseId: data.courseId,
      sectionId: data.sectionId || null,
      schoolYear: data.schoolYear,
      yearLevel: data.yearLevel,
      studentType,
      enrolledDate: data.enrolledDate || new Date(),
      status: data.status || 'enrolled',
      active: data.active !== undefined ? (data.active === true || data.active === 'true') : true,
      remarks: data.remarks || null,
      modifiedBy: modifiedBy || null
    });
  },

  updateEnrollment: async (id, data, modifiedBy) => {
    if (data.yearLevel !== undefined && !YEAR_LEVELS.includes(data.yearLevel)) throw new Error('Invalid yearLevel');
    if (data.status !== undefined && !ENROLLMENT_STATUSES.includes(data.status)) throw new Error('Invalid status');
    if (data.studentType !== undefined) {
      const normalizedStudentType = normalizeStudentType(data.studentType);
      if (!STUDENT_TYPES.includes(normalizedStudentType)) throw new Error('Invalid studentType');
      data.studentType = normalizedStudentType;
    }

    if (data.sectionId && data.courseId) {
      const section = await Section.findByPk(data.sectionId);
      if (!section) throw new Error('Section not found');
      if (section.courseId !== data.courseId) throw new Error('sectionId does not belong to courseId');
    }

    const payload = {
      ...data,
      modifiedBy: modifiedBy || null
    };
    if (payload.active !== undefined) payload.active = payload.active === true || payload.active === 'true';

    const updated = await studentEnrollmentDataAccess.updateEnrollment(id, payload);
    if (!updated) throw new Error('Enrollment not found');
    return updated;
  }
};

module.exports = studentEnrollmentUseCases;
