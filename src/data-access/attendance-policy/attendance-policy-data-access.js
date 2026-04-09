'use strict';

const { AttendancePolicy, SectionSubjectTeacher, Section, Subject } = require('../../sequelize/models');
const attendanceDataAccess = require('../attendance/attendance-data-access');

function effectivePolicyToApi(eff) {
  return {
    on_time_grace_minutes: eff.onTimeGraceMinutes,
    late_until_minutes: eff.lateUntilMinutes,
    absent_after_late_window: eff.absentAfterLateWindow,
    early_arrival_allowance_minutes: eff.earlyArrivalAllowanceMinutes ?? 0,
    late_checkout_grace_minutes: eff.lateCheckoutGraceMinutes ?? 20
  };
}

async function getSchoolDefault(schoolId) {
  if (!schoolId) return null;
  return AttendancePolicy.findOne({
    where: {
      schoolId,
      sectionSubjectTeacherId: null,
      active: true
    },
    order: [['updatedAt', 'DESC']]
  });
}

async function upsertSchoolDefault(schoolId, fields) {
  const existing = await getSchoolDefault(schoolId);
  const payload = {
    schoolId,
    sectionSubjectTeacherId: null,
    onTimeGraceMinutes: fields.onTimeGraceMinutes,
    lateUntilMinutes: fields.lateUntilMinutes,
    absentAfterLateWindow: fields.absentAfterLateWindow,
    earlyArrivalAllowanceMinutes: fields.earlyArrivalAllowanceMinutes ?? 0,
    lateCheckoutGraceMinutes: fields.lateCheckoutGraceMinutes ?? 20,
    active: true
  };
  if (existing) {
    await existing.update(payload);
    return existing.reload();
  }
  return AttendancePolicy.create(payload);
}

async function getAssignmentPolicy(assignmentId) {
  return AttendancePolicy.findOne({
    where: {
      sectionSubjectTeacherId: assignmentId,
      active: true
    },
    order: [['updatedAt', 'DESC']]
  });
}

async function upsertAssignmentPolicy({ schoolId, assignmentId, fields }) {
  const assignment = await SectionSubjectTeacher.findByPk(assignmentId);
  if (!assignment) return null;

  const existing = await getAssignmentPolicy(assignmentId);
  const payload = {
    schoolId,
    sectionSubjectTeacherId: assignmentId,
    onTimeGraceMinutes: fields.onTimeGraceMinutes,
    lateUntilMinutes: fields.lateUntilMinutes,
    absentAfterLateWindow: fields.absentAfterLateWindow,
    earlyArrivalAllowanceMinutes: fields.earlyArrivalAllowanceMinutes ?? 0,
    lateCheckoutGraceMinutes: fields.lateCheckoutGraceMinutes ?? 20,
    active: true
  };
  if (existing) {
    await existing.update(payload);
    return existing.reload();
  }
  return AttendancePolicy.create(payload);
}

async function listTeacherAssignmentsWithEffectivePolicies({ teacherId, schoolId }) {
  const rows = await SectionSubjectTeacher.findAll({
    where: { teacherId, active: true },
    include: [
      { model: Section, as: 'section', attributes: ['id', 'name', 'code'] },
      { model: Subject, as: 'subject', attributes: ['id', 'name', 'code'] }
    ],
    order: [
      [{ model: Section, as: 'section' }, 'name', 'ASC'],
      [{ model: Subject, as: 'subject' }, 'name', 'ASC']
    ]
  });

  const schoolDefault = schoolId ? await getSchoolDefault(schoolId) : null;
  const base = schoolDefault
    ? attendanceDataAccess.buildEffectivePolicy(schoolDefault)
    : { ...attendanceDataAccess.buildEffectivePolicy(null) };

  const out = [];
  for (const row of rows) {
    const assignmentPolicy = await getAssignmentPolicy(row.id);
    const effective = assignmentPolicy
      ? attendanceDataAccess.buildEffectivePolicy(assignmentPolicy)
      : base;
    const json = row.toJSON();
    out.push({
      assignmentId: json.id,
      sectionId: json.sectionId,
      sectionName: json.section?.name ?? null,
      sectionCode: json.section?.code ?? null,
      subjectId: json.subjectId,
      subjectName: json.subject?.name ?? null,
      subjectCode: json.subject?.code ?? null,
      hasAssignmentOverride: !!assignmentPolicy,
      effectivePolicy: effectivePolicyToApi(effective),
      assignmentPolicy: assignmentPolicy
        ? {
            id: assignmentPolicy.id,
            on_time_grace_minutes: assignmentPolicy.onTimeGraceMinutes,
            late_until_minutes: assignmentPolicy.lateUntilMinutes,
            absent_after_late_window: assignmentPolicy.absentAfterLateWindow,
            early_arrival_allowance_minutes: assignmentPolicy.earlyArrivalAllowanceMinutes ?? 0,
            late_checkout_grace_minutes: assignmentPolicy.lateCheckoutGraceMinutes ?? 20
          }
        : null,
      schoolDefaultPolicy: schoolDefault
        ? {
            on_time_grace_minutes: schoolDefault.onTimeGraceMinutes,
            late_until_minutes: schoolDefault.lateUntilMinutes,
            absent_after_late_window: schoolDefault.absentAfterLateWindow,
            early_arrival_allowance_minutes: schoolDefault.earlyArrivalAllowanceMinutes ?? 0,
            late_checkout_grace_minutes: schoolDefault.lateCheckoutGraceMinutes ?? 20
          }
        : null
    });
  }

  return {
    assignments: out,
    schoolDefault: effectivePolicyToApi(schoolDefault ? attendanceDataAccess.buildEffectivePolicy(schoolDefault) : base)
  };
}

function policyToJson(policy) {
  if (!policy) return null;
  const p = policy.toJSON ? policy.toJSON() : policy;
  return {
    id: p.id,
    school_id: p.schoolId,
    section_subject_teacher_id: p.sectionSubjectTeacherId,
    on_time_grace_minutes: p.onTimeGraceMinutes,
    late_until_minutes: p.lateUntilMinutes,
    absent_after_late_window: p.absentAfterLateWindow,
    early_arrival_allowance_minutes: p.earlyArrivalAllowanceMinutes ?? 0,
    late_checkout_grace_minutes: p.lateCheckoutGraceMinutes ?? 20
  };
}

module.exports = {
  getSchoolDefault,
  upsertSchoolDefault,
  getAssignmentPolicy,
  upsertAssignmentPolicy,
  listTeacherAssignmentsWithEffectivePolicies,
  policyToJson
};
