'use strict';
const { Role, User, Subject, SectionSubjectTeacher } = require('../../sequelize/models');
const studentSubjectAssignmentDataAccess = require('../../data-access/student-subject-assignment/student-subject-assignment-data-access');
const { getFinalScheduleForStudent } = require('../../lib/student-final-schedule');

const ALLOWED_DAYS = new Set(['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']);
const ASSIGNMENT_TYPES = new Set(['ADD', 'REMOVE', 'REPLACE']);

const toMinutes = (timeValue) => {
  if (!timeValue) return null;
  const m = /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/.exec(String(timeValue).trim());
  if (!m) return null;
  const hours = parseInt(m[1], 10);
  const mins = parseInt(m[2], 10);
  if (hours < 0 || hours > 23 || mins < 0 || mins > 59) return null;
  return (hours * 60) + mins;
};

async function validateTeacher(teacherId) {
  if (!teacherId) return;
  const teacherRole = await Role.findOne({ where: { name: 'Teacher' } });
  if (!teacherRole) throw new Error('Teacher role not found');
  const teacher = await User.findOne({
    where: {
      id: teacherId,
      roleId: teacherRole.id,
      active: true
    }
  });
  if (!teacher) throw new Error('Teacher not found');
}

async function validatePayload(payload, existing = null) {
  const assignmentType = String(payload.assignmentType ?? existing?.assignmentType ?? '').toUpperCase();
  if (!ASSIGNMENT_TYPES.has(assignmentType)) {
    throw new Error('Invalid assignmentType');
  }
  payload.assignmentType = assignmentType;

  const baseAssignmentId = payload.baseSectionSubjectTeacherId ?? existing?.baseSectionSubjectTeacherId ?? null;
  const sectionAssignmentId = payload.sectionSubjectTeacherId ?? existing?.sectionSubjectTeacherId ?? null;
  const subjectId = payload.subjectId ?? existing?.subjectId ?? null;
  const teacherId = payload.teacherId ?? existing?.teacherId ?? null;
  const daysOfWeek = payload.daysOfWeek ?? existing?.daysOfWeek ?? null;
  const startTime = payload.startTime ?? existing?.startTime ?? null;
  const endTime = payload.endTime ?? existing?.endTime ?? null;

  if ((assignmentType === 'REMOVE' || assignmentType === 'REPLACE') && !baseAssignmentId) {
    throw new Error('baseSectionSubjectTeacherId is required for REMOVE/REPLACE');
  }
  if (baseAssignmentId) {
    const base = await SectionSubjectTeacher.findByPk(baseAssignmentId);
    if (!base) throw new Error('Base section assignment not found');
  }
  if (sectionAssignmentId) {
    const assignment = await SectionSubjectTeacher.findByPk(sectionAssignmentId);
    if (!assignment) throw new Error('Section assignment not found');
  }
  if (assignmentType !== 'REMOVE' && !subjectId && !sectionAssignmentId) {
    throw new Error('subjectId is required when sectionSubjectTeacherId is not provided');
  }
  if (subjectId) {
    const subject = await Subject.findByPk(subjectId);
    if (!subject) throw new Error('Subject not found');
  }
  if (teacherId) {
    await validateTeacher(teacherId);
  }
  if (daysOfWeek !== null) {
    if (!Array.isArray(daysOfWeek) || daysOfWeek.length === 0) {
      throw new Error('daysOfWeek must be a non-empty array');
    }
    for (const day of daysOfWeek) {
      if (!ALLOWED_DAYS.has(day)) throw new Error(`Invalid day in daysOfWeek: ${day}`);
    }
  }
  if (startTime || endTime) {
    if (!startTime || !endTime) throw new Error('startTime and endTime are both required when one is set');
    const startM = toMinutes(startTime);
    const endM = toMinutes(endTime);
    if (startM === null || endM === null) throw new Error('startTime/endTime must be valid HH:mm');
    if (endM <= startM) throw new Error('endTime must be after startTime');
  }
}

const studentSubjectAssignmentUseCases = {
  listStudentSubjectAssignmentsForAdmin: async (filters) => {
    return studentSubjectAssignmentDataAccess.findAllForAdmin(filters);
  },

  getStudentSubjectAssignments: async (studentId, filters) => {
    return studentSubjectAssignmentDataAccess.getByStudentId(studentId, filters);
  },

  createStudentSubjectAssignment: async (studentId, payload, modifiedBy) => {
    const enrollment = await studentSubjectAssignmentDataAccess.getActiveEnrollmentByStudentId(studentId);
    if (!enrollment) throw new Error('No active enrollment record found for student');

    await validatePayload(payload);
    return studentSubjectAssignmentDataAccess.create({
      studentEnrollmentId: enrollment.id,
      assignmentType: payload.assignmentType,
      baseSectionSubjectTeacherId: payload.baseSectionSubjectTeacherId || null,
      sectionSubjectTeacherId: payload.sectionSubjectTeacherId || null,
      subjectId: payload.subjectId || null,
      teacherId: payload.teacherId || null,
      sectionId: payload.sectionId || null,
      daysOfWeek: payload.daysOfWeek || null,
      startTime: payload.startTime || null,
      endTime: payload.endTime || null,
      effectiveFrom: payload.effectiveFrom || null,
      effectiveTo: payload.effectiveTo || null,
      active: payload.active !== undefined ? (payload.active === true || payload.active === 'true') : true,
      remarks: payload.remarks || null,
      modifiedBy: modifiedBy || null
    });
  },

  updateStudentSubjectAssignment: async (id, payload, modifiedBy) => {
    const existing = await studentSubjectAssignmentDataAccess.getById(id);
    if (!existing) throw new Error('Student subject assignment not found');
    await validatePayload(payload, existing);

    const updatePayload = {
      ...payload,
      modifiedBy: modifiedBy || null
    };
    if (updatePayload.active !== undefined) {
      updatePayload.active = updatePayload.active === true || updatePayload.active === 'true';
    }
    return studentSubjectAssignmentDataAccess.update(id, updatePayload);
  },

  deactivateStudentSubjectAssignment: async (id, modifiedBy) => {
    const existing = await studentSubjectAssignmentDataAccess.getById(id);
    if (!existing) throw new Error('Student subject assignment not found');
    return studentSubjectAssignmentDataAccess.update(id, {
      active: false,
      modifiedBy: modifiedBy || null
    });
  },

  getStudentFinalSchedule: async (studentId, { date, teacherId } = {}) => {
    return getFinalScheduleForStudent({
      studentId,
      date: date || null,
      teacherId: teacherId || null
    });
  }
};

module.exports = studentSubjectAssignmentUseCases;
