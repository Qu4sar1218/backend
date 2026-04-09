'use strict';
const { Op } = require('sequelize');
const { SectionSubjectTeacher, Section, Subject, User, Course, sequelize: db } = require('../../sequelize/models');

const normalizeTimeForDb = (value) => {
  if (value === undefined || value === null || value === '') return null;
  const s = String(value).trim();
  if (/^\d{1,2}:\d{2}$/.test(s)) return `${s}:00`;
  return s;
};

const fmtTime = (v) => {
  if (!v) return v;
  if (v instanceof Date) {
    const h = v.getHours();
    const m = v.getMinutes();
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  }
  if (typeof v === 'string' && v.length >= 5) return v.slice(0, 5);
  return v;
};

const sectionSubjectTeacherDataAccess = {
  getAllSectionSubjectTeachers: async ({ active, teacherId, courseId, subjectId } = {}) => {
    const where = {};
    if (active !== undefined) where.active = active === 'true' || active === true;
    if (teacherId !== undefined && teacherId !== null && teacherId !== '') where.teacherId = teacherId;
    if (subjectId !== undefined && subjectId !== null && subjectId !== '') where.subjectId = subjectId;

    const sectionInclude = {
      model: Section,
      as: 'section',
      attributes: ['id', 'name', 'code', 'yearLevel', 'courseId'],
      required: true,
      include: [
        { model: Course, as: 'course', attributes: ['id', 'name', 'code'], required: false }
      ]
    };
    if (courseId !== undefined && courseId !== null && courseId !== '') {
      sectionInclude.where = { courseId };
    }

    const rows = await SectionSubjectTeacher.findAll({
      where,
      include: [
        sectionInclude,
        { model: Subject, as: 'subject', attributes: ['id', 'name', 'code', 'year'] },
        {
          model: User,
          as: 'teacher',
          attributes: ['id', 'firstName', 'middleName', 'lastName', 'email', 'active']
        }
      ],
      order: [
        [{ model: User, as: 'teacher' }, 'lastName', 'ASC'],
        [{ model: User, as: 'teacher' }, 'firstName', 'ASC'],
        [{ model: Section, as: 'section' }, 'name', 'ASC'],
        [{ model: Subject, as: 'subject' }, 'name', 'ASC']
      ]
    });

    return rows.map((row) => {
      const json = row.toJSON();
      json.startTime = fmtTime(json.startTime);
      json.endTime = fmtTime(json.endTime);
      return json;
    });
  },

  getActiveAssignmentsByTeacherIdsExcludingSection: async ({ teacherIds, sectionId }) => {
    if (!Array.isArray(teacherIds) || teacherIds.length === 0) return [];

    const rows = await SectionSubjectTeacher.findAll({
      where: {
        active: true,
        teacherId: teacherIds,
        sectionId: { [Op.ne]: sectionId }
      },
      include: [
        { model: Section, as: 'section', attributes: ['id', 'name', 'code'] },
        { model: Subject, as: 'subject', attributes: ['id', 'name', 'code'] }
      ],
      attributes: ['id', 'sectionId', 'subjectId', 'teacherId', 'daysOfWeek', 'startTime', 'endTime']
    });

    return rows.map((row) => {
      const json = row.toJSON();
      const fmtTime = (v) => {
        if (!v) return v;
        if (v instanceof Date) {
          const h = v.getHours();
          const m = v.getMinutes();
          return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
        }
        if (typeof v === 'string' && v.length >= 5) return v.slice(0, 5);
        return v;
      };
      return {
        ...json,
        startTime: fmtTime(json.startTime),
        endTime: fmtTime(json.endTime)
      };
    });
  },

  getSectionSubjectTeachers: async (sectionId, { active } = {}) => {
    const where = { sectionId };
    if (active !== undefined) where.active = active === 'true' || active === true;

    const rows = await SectionSubjectTeacher.findAll({
      where,
      include: [
        { model: Subject, as: 'subject', attributes: ['id', 'name', 'code', 'year'] },
        { model: User, as: 'teacher', attributes: ['id', 'firstName', 'lastName', 'middleName', 'email', 'active'] }
      ],
      order: [
        [{ model: Subject, as: 'subject' }, 'name', 'ASC'],
        [{ model: User, as: 'teacher' }, 'lastName', 'ASC'],
        [{ model: User, as: 'teacher' }, 'firstName', 'ASC']
      ]
    });

    return rows.map((row) => {
      const json = row.toJSON();
      json.startTime = fmtTime(json.startTime);
      json.endTime = fmtTime(json.endTime);
      return json;
    });
  },

  assignSectionSubjectTeachers: async ({ sectionId, assignments, note, modifiedBy }) => {
    return db.transaction(async (transaction) => {
      await SectionSubjectTeacher.update(
        { active: false, modifiedBy: modifiedBy || null },
        { where: { sectionId }, transaction }
      );

      for (const assignment of assignments) {
        const teachers = assignment.teachers || [];
        for (const t of teachers) {
          const { teacherId, daysOfWeek, startTime, endTime } = t;
          const existing = await SectionSubjectTeacher.findOne({
            where: { sectionId, subjectId: assignment.subjectId, teacherId },
            transaction
          });

          const schedulePayload = {
            daysOfWeek: Array.isArray(daysOfWeek) ? daysOfWeek : [],
            startTime: normalizeTimeForDb(startTime),
            endTime: normalizeTimeForDb(endTime)
          };

          if (existing) {
            await existing.update({
              active: true,
              note: note || existing.note,
              modifiedBy: modifiedBy || null,
              ...schedulePayload
            }, { transaction });
          } else {
            await SectionSubjectTeacher.create({
              sectionId,
              subjectId: assignment.subjectId,
              teacherId,
              active: true,
              note: note || null,
              modifiedBy: modifiedBy || null,
              ...schedulePayload
            }, { transaction });
          }
        }
      }

      return sectionSubjectTeacherDataAccess.getSectionSubjectTeachers(sectionId, { active: true });
    });
  },

  removeSectionSubjectTeacher: async ({ sectionId, subjectId, teacherId, modifiedBy }) => {
    const row = await SectionSubjectTeacher.findOne({
      where: { sectionId, subjectId, teacherId }
    });
    if (!row) return false;

    await row.update({ active: false, modifiedBy: modifiedBy || null });
    return true;
  }
};

module.exports = sectionSubjectTeacherDataAccess;
