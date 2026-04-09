'use strict';

const attendancePolicyDataAccess = require('../../data-access/attendance-policy/attendance-policy-data-access');
const attendanceDataAccess = require('../../data-access/attendance/attendance-data-access');
const { SectionSubjectTeacher, User } = require('../../sequelize/models');

function assertAdmin(user) {
  if (!user?.id || String(user.role?.name || '').toLowerCase() !== 'admin') {
    throw Object.assign(new Error('Admin access required'), { statusCode: 403 });
  }
  if (!user.schoolId) {
    throw Object.assign(new Error('School context is required'), { statusCode: 400 });
  }
}

function assertTeacher(user) {
  if (!user?.id || String(user.role?.name || '').toLowerCase() !== 'teacher') {
    throw Object.assign(new Error('Teacher access required'), { statusCode: 403 });
  }
}

function normalizePolicyBody(body) {
  return {
    onTimeGraceMinutes: Number(body.on_time_grace_minutes ?? body.onTimeGraceMinutes),
    lateUntilMinutes: Number(body.late_until_minutes ?? body.lateUntilMinutes),
    absentAfterLateWindow: Boolean(body.absent_after_late_window ?? body.absentAfterLateWindow),
    earlyArrivalAllowanceMinutes: Number(body.early_arrival_allowance_minutes ?? body.earlyArrivalAllowanceMinutes ?? 0),
    lateCheckoutGraceMinutes: Number(
      body.late_checkout_grace_minutes ?? body.lateCheckoutGraceMinutes ?? 20
    )
  };
}

async function getSchoolDefault(user) {
  const role = String(user?.role?.name || '').toLowerCase();
  if (role !== 'admin' && role !== 'teacher') {
    throw Object.assign(new Error('Forbidden'), { statusCode: 403 });
  }
  if (!user.schoolId) {
    throw Object.assign(new Error('School context is required'), { statusCode: 400 });
  }
  await attendanceDataAccess.ensureDefaultPolicyForSchool({
    schoolId: user.schoolId,
    transaction: null
  });
  const row = await attendancePolicyDataAccess.getSchoolDefault(user.schoolId);
  return { policy: attendancePolicyDataAccess.policyToJson(row) };
}

async function putSchoolDefault(user, body) {
  assertAdmin(user);
  const fields = normalizePolicyBody(body);
  if (
    Number.isNaN(fields.onTimeGraceMinutes) ||
    Number.isNaN(fields.lateUntilMinutes) ||
    Number.isNaN(fields.lateCheckoutGraceMinutes)
  ) {
    throw Object.assign(new Error('Invalid policy numbers'), { statusCode: 400 });
  }
  const row = await attendancePolicyDataAccess.upsertSchoolDefault(user.schoolId, fields);
  return { policy: attendancePolicyDataAccess.policyToJson(row) };
}

async function getMyAssignments(user) {
  assertTeacher(user);
  if (!user.schoolId) {
    throw Object.assign(new Error('School context is required'), { statusCode: 400 });
  }
  return attendancePolicyDataAccess.listTeacherAssignmentsWithEffectivePolicies({
    teacherId: user.id,
    schoolId: user.schoolId
  });
}

async function putAssignmentPolicy(user, assignmentId, body) {
  const fields = normalizePolicyBody(body);
  if (
    Number.isNaN(fields.onTimeGraceMinutes) ||
    Number.isNaN(fields.lateUntilMinutes) ||
    Number.isNaN(fields.lateCheckoutGraceMinutes)
  ) {
    throw Object.assign(new Error('Invalid policy numbers'), { statusCode: 400 });
  }

  const role = String(user.role?.name || '').toLowerCase();
  const assignment = await SectionSubjectTeacher.findByPk(assignmentId);
  if (!assignment) {
    throw Object.assign(new Error('Assignment not found'), { statusCode: 404 });
  }

  if (role === 'teacher') {
    if (assignment.teacherId !== user.id) {
      throw Object.assign(new Error('You can only edit policies for your own classes'), { statusCode: 403 });
    }
    if (!user.schoolId) {
      throw Object.assign(new Error('School context is required'), { statusCode: 400 });
    }
    const row = await attendancePolicyDataAccess.upsertAssignmentPolicy({
      schoolId: user.schoolId,
      assignmentId,
      fields
    });
    return { policy: attendancePolicyDataAccess.policyToJson(row) };
  }

  if (role === 'admin') {
    assertAdmin(user);
    const teacherUser = await User.findByPk(assignment.teacherId, { attributes: ['id', 'schoolId'] });
    if (!teacherUser || teacherUser.schoolId !== user.schoolId) {
      throw Object.assign(new Error('Assignment is not in your school'), { statusCode: 403 });
    }
    const row = await attendancePolicyDataAccess.upsertAssignmentPolicy({
      schoolId: user.schoolId,
      assignmentId,
      fields
    });
    return { policy: attendancePolicyDataAccess.policyToJson(row) };
  }

  throw Object.assign(new Error('Forbidden'), { statusCode: 403 });
}

module.exports = {
  getSchoolDefault,
  putSchoolDefault,
  getMyAssignments,
  putAssignmentPolicy
};
