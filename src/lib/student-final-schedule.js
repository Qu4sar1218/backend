'use strict';
const { Op } = require('sequelize');
const {
  SectionSubjectTeacher,
  StudentSubjectAssignment,
  Subject,
  User,
  Section
} = require('../sequelize/models');
const studentSubjectAssignmentDataAccess = require('../data-access/student-subject-assignment/student-subject-assignment-data-access');

const toTimeString = (value) => {
  if (!value) return null;
  return String(value).slice(0, 5);
};

const toPlain = (value) => {
  if (!value) return value;
  return typeof value.toJSON === 'function' ? value.toJSON() : value;
};

const toFinalRowFromSectionAssignment = (row) => ({
  source: 'SECTION',
  assignmentId: row.id,
  sectionId: row.sectionId,
  subjectId: row.subjectId,
  teacherId: row.teacherId,
  daysOfWeek: Array.isArray(row.daysOfWeek) ? row.daysOfWeek : [],
  startTime: toTimeString(row.startTime),
  endTime: toTimeString(row.endTime),
  section: row.section || null,
  subject: row.subject || null,
  teacher: row.teacher || null
});

const toFinalRowFromOverride = (override) => {
  const linked = override.assignment || null;
  return {
    source: 'OVERRIDE',
    overrideId: override.id,
    assignmentType: override.assignmentType,
    assignmentId: linked?.id || override.sectionSubjectTeacherId || null,
    sectionId: override.sectionId || linked?.sectionId || null,
    subjectId: override.subjectId || linked?.subjectId || null,
    teacherId: override.teacherId || linked?.teacherId || null,
    daysOfWeek: Array.isArray(override.daysOfWeek)
      ? override.daysOfWeek
      : (Array.isArray(linked?.daysOfWeek) ? linked.daysOfWeek : []),
    startTime: toTimeString(override.startTime || linked?.startTime || null),
    endTime: toTimeString(override.endTime || linked?.endTime || null),
    section: override.section || linked?.section || null,
    subject: override.subject || linked?.subject || null,
    teacher: override.teacher || linked?.teacher || null
  };
};

async function getFinalScheduleForStudent({ studentId, date = null, teacherId = null, transaction = null }) {
  const enrollmentRow = await studentSubjectAssignmentDataAccess.getActiveEnrollmentByStudentId(studentId, transaction);
  if (!enrollmentRow) {
    return { enrollment: null, rows: [] };
  }
  const enrollment = toPlain(enrollmentRow);

  if (!enrollment.sectionId) {
    return { enrollment, rows: [] };
  }

  const baseRows = await SectionSubjectTeacher.findAll({
    where: {
      sectionId: enrollment.sectionId,
      active: true
    },
    include: [
      { model: Section, as: 'section', attributes: ['id', 'name', 'code'] },
      { model: Subject, as: 'subject', attributes: ['id', 'name', 'code'] },
      { model: User, as: 'teacher', attributes: ['id', 'firstName', 'lastName'] }
    ],
    transaction
  });

  let overrides = [];
  if (enrollment.id) {
    const overrideWhere = {
      studentEnrollmentId: enrollment.id,
      active: true
    };
    if (date) {
      overrideWhere.effectiveFrom = { [Op.or]: [null, { [Op.lte]: date }] };
      overrideWhere.effectiveTo = { [Op.or]: [null, { [Op.gte]: date }] };
    }

    overrides = await StudentSubjectAssignment.findAll({
      where: overrideWhere,
      include: [
        {
          model: SectionSubjectTeacher,
          as: 'baseAssignment',
          include: [
            { model: Subject, as: 'subject', attributes: ['id', 'name', 'code'] },
            { model: User, as: 'teacher', attributes: ['id', 'firstName', 'lastName'] },
            { model: Section, as: 'section', attributes: ['id', 'name', 'code'] }
          ],
          required: false
        },
        {
          model: SectionSubjectTeacher,
          as: 'assignment',
          include: [
            { model: Subject, as: 'subject', attributes: ['id', 'name', 'code'] },
            { model: User, as: 'teacher', attributes: ['id', 'firstName', 'lastName'] },
            { model: Section, as: 'section', attributes: ['id', 'name', 'code'] }
          ],
          required: false
        },
        { model: Subject, as: 'subject', attributes: ['id', 'name', 'code'], required: false },
        { model: User, as: 'teacher', attributes: ['id', 'firstName', 'lastName'], required: false },
        { model: Section, as: 'section', attributes: ['id', 'name', 'code'], required: false }
      ],
      order: [['createdAt', 'ASC']],
      transaction
    });
  }

  const rowsMap = new Map(baseRows.map((row) => {
    const plain = toPlain(row);
    return [plain.id, toFinalRowFromSectionAssignment(plain)];
  }));

  const removes = overrides.filter((o) => o.assignmentType === 'REMOVE');
  const replaces = overrides.filter((o) => o.assignmentType === 'REPLACE');
  const adds = overrides.filter((o) => o.assignmentType === 'ADD');

  for (const override of removes) {
    if (override.baseSectionSubjectTeacherId) {
      rowsMap.delete(override.baseSectionSubjectTeacherId);
    }
  }

  for (const override of replaces) {
    if (override.baseSectionSubjectTeacherId) {
      rowsMap.delete(override.baseSectionSubjectTeacherId);
    }
    const finalRow = toFinalRowFromOverride(toPlain(override));
    const key = finalRow.assignmentId || `override:${override.id}`;
    rowsMap.set(key, finalRow);
  }

  for (const override of adds) {
    const finalRow = toFinalRowFromOverride(toPlain(override));
    const key = finalRow.assignmentId || `override:${override.id}`;
    rowsMap.set(key, finalRow);
  }

  let rows = [...rowsMap.values()];
  rows = rows.map((row) => ({
    ...row,
    sectionId: row.sectionId || enrollment.sectionId || null
  }));
  if (teacherId) {
    rows = rows.filter((row) => row.teacherId === teacherId);
  }

  return {
    enrollment,
    rows
  };
}

module.exports = {
  getFinalScheduleForStudent
};
