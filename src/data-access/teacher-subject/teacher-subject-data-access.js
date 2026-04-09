'use strict';
const { TeacherSubject, Subject, User, sequelize: db } = require('../../sequelize/models');

const teacherSubjectDataAccess = {
  getAllTeacherSubjects: async ({ active, teacherId } = {}) => {
    const where = {};
    if (active !== undefined) where.active = active === 'true' || active === true;
    if (teacherId !== undefined && teacherId !== null && teacherId !== '') where.teacherId = teacherId;

    const rows = await TeacherSubject.findAll({
      where,
      include: [
        { model: Subject, as: 'subject' },
        {
          model: User,
          as: 'teacher',
          attributes: ['id', 'firstName', 'middleName', 'lastName', 'email', 'active']
        }
      ],
      order: [
        [{ model: User, as: 'teacher' }, 'lastName', 'ASC'],
        [{ model: User, as: 'teacher' }, 'firstName', 'ASC'],
        [{ model: Subject, as: 'subject' }, 'name', 'ASC']
      ]
    });

    return rows.map((row) => row.toJSON());
  },

  getTeacherSubjects: async (teacherId, { active } = {}) => {
    const where = { teacherId };
    if (active !== undefined) where.active = active === 'true' || active === true;

    const rows = await TeacherSubject.findAll({
      where,
      include: [{ model: Subject, as: 'subject' }],
      order: [[{ model: Subject, as: 'subject' }, 'name', 'ASC']]
    });

    return rows.map((row) => row.toJSON());
  },

  assignSubjectsToTeacher: async ({ teacherId, subjectIds, note, modifiedBy }) => {
    return db.transaction(async (transaction) => {
      await TeacherSubject.update(
        { active: false, modifiedBy: modifiedBy || null },
        { where: { teacherId }, transaction }
      );

      for (const subjectId of subjectIds) {
        const existing = await TeacherSubject.findOne({ where: { teacherId, subjectId }, transaction });
        if (existing) {
          await existing.update({
            active: true,
            note: note || existing.note,
            modifiedBy: modifiedBy || null
          }, { transaction });
        } else {
          await TeacherSubject.create({
            teacherId,
            subjectId,
            active: true,
            note: note || null,
            modifiedBy: modifiedBy || null
          }, { transaction });
        }
      }

      return teacherSubjectDataAccess.getTeacherSubjects(teacherId, { active: true });
    });
  },

  removeTeacherSubject: async ({ teacherId, subjectId, modifiedBy }) => {
    const row = await TeacherSubject.findOne({ where: { teacherId, subjectId } });
    if (!row) return false;
    await row.update({ active: false, modifiedBy: modifiedBy || null });
    return true;
  }
};

module.exports = teacherSubjectDataAccess;
