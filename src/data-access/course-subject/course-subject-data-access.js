'use strict';
const { CourseSubject, Subject, sequelize: db } = require('../../sequelize/models');

const courseSubjectDataAccess = {
  getCourseSubjects: async (courseId, { active } = {}) => {
    const where = { courseId };
    if (active !== undefined) where.active = active === 'true' || active === true;

    const rows = await CourseSubject.findAll({
      where,
      include: [{ model: Subject, as: 'subject' }],
      order: [[{ model: Subject, as: 'subject' }, 'name', 'ASC']]
    });

    return rows.map((row) => row.toJSON());
  },

  assignSubjectsToCourse: async ({ courseId, subjectIds, note, modifiedBy }) => {
    return db.transaction(async (transaction) => {
      await CourseSubject.update(
        { active: false, modifiedBy: modifiedBy || null },
        { where: { courseId }, transaction }
      );

      for (const subjectId of subjectIds) {
        const existing = await CourseSubject.findOne({ where: { courseId, subjectId }, transaction });
        if (existing) {
          await existing.update({
            active: true,
            note: note || existing.note,
            modifiedBy: modifiedBy || null
          }, { transaction });
        } else {
          await CourseSubject.create({
            courseId,
            subjectId,
            active: true,
            note: note || null,
            modifiedBy: modifiedBy || null
          }, { transaction });
        }
      }

      return courseSubjectDataAccess.getCourseSubjects(courseId, { active: true });
    });
  },

  removeCourseSubject: async ({ courseId, subjectId, modifiedBy }) => {
    const row = await CourseSubject.findOne({ where: { courseId, subjectId } });
    if (!row) return false;
    await row.update({ active: false, modifiedBy: modifiedBy || null });
    return true;
  }
};

module.exports = courseSubjectDataAccess;
