'use strict';
const {
  StudentEnrollment,
  Student,
  Course,
  Section,
  sequelize: db
} = require('../../sequelize/models');

const studentEnrollmentDataAccess = {
  getAllEnrollments: async ({ status, active, sectionId, courseId } = {}) => {
    const where = {};
    if (status !== undefined) where.status = status;
    if (active !== undefined) where.active = active === 'true' || active === true;
    if (sectionId !== undefined && sectionId !== null && sectionId !== '') where.sectionId = sectionId;
    if (courseId !== undefined && courseId !== null && courseId !== '') where.courseId = courseId;

    const rows = await StudentEnrollment.findAll({
      where,
      include: [
        {
          model: Student,
          as: 'student',
          attributes: ['id', 'firstName', 'middleName', 'lastName', 'studentIdNumber', 'email']
        },
        { model: Course, as: 'course', attributes: ['id', 'name', 'code'] },
        { model: Section, as: 'section', attributes: ['id', 'name', 'code', 'courseId', 'yearLevel'], required: false }
      ],
      order: [['enrolledDate', 'DESC']]
    });
    return rows.map((row) => row.toJSON());
  },

  getStudentEnrollments: async (studentId, { active } = {}) => {
    const where = { studentId };
    if (active !== undefined) where.active = active === 'true' || active === true;

    const rows = await StudentEnrollment.findAll({
      where,
      include: [
        { model: Course, as: 'course', attributes: ['id', 'name', 'code'] },
        { model: Section, as: 'section', attributes: ['id', 'name', 'code', 'courseId', 'yearLevel'], required: false }
      ],
      order: [['enrolledDate', 'DESC']]
    });
    return rows.map((row) => row.toJSON());
  },

  getEnrollmentById: async (id) => {
    const row = await StudentEnrollment.findByPk(id, {
      include: [
        { model: Course, as: 'course', attributes: ['id', 'name', 'code'] },
        { model: Section, as: 'section', attributes: ['id', 'name', 'code', 'courseId', 'yearLevel'], required: false }
      ]
    });
    if (!row) return null;
    return row.toJSON();
  },

  createEnrollment: async ({
    studentId,
    courseId,
    sectionId,
    schoolYear,
    yearLevel,
    studentType,
    enrolledDate,
    status,
    active,
    remarks,
    modifiedBy
  }) => {
    return db.transaction(async (transaction) => {
      if (active) {
        await StudentEnrollment.update(
          { active: false, modifiedBy: modifiedBy || null },
          { where: { studentId, active: true }, transaction }
        );
      }

      const created = await StudentEnrollment.create({
        studentId,
        courseId,
        sectionId: sectionId || null,
        schoolYear,
        yearLevel,
        studentType,
        enrolledDate: enrolledDate || new Date(),
        status: status || 'enrolled',
        active: active !== undefined ? active : true,
        remarks: remarks || null,
        modifiedBy: modifiedBy || null
      }, { transaction });

      // Temporary compatibility sync with legacy fields in students table.
      if (active !== false) {
        const student = await Student.findByPk(studentId, { transaction });
        if (student) {
          await student.update({
            yearLevel,
            enrolledDate: enrolledDate || student.enrolledDate || new Date(),
            status: status || 'enrolled',
            modifiedBy: modifiedBy || null
          }, { transaction });
        }
      }

      return studentEnrollmentDataAccess.getEnrollmentById(created.id);
    });
  },

  updateEnrollment: async (id, payload) => {
    return db.transaction(async (transaction) => {
      const enrollment = await StudentEnrollment.findByPk(id, { transaction });
      if (!enrollment) return null;

      if (payload.active === true) {
        await StudentEnrollment.update(
          { active: false, modifiedBy: payload.modifiedBy || null },
          { where: { studentId: enrollment.studentId, active: true }, transaction }
        );
      }

      await enrollment.update(payload, { transaction });

      if (payload.active === true) {
        const student = await Student.findByPk(enrollment.studentId, { transaction });
        if (student) {
          await student.update({
            yearLevel: enrollment.yearLevel,
            enrolledDate: enrollment.enrolledDate,
            status: enrollment.status,
            modifiedBy: payload.modifiedBy || null
          }, { transaction });
        }
      }

      return studentEnrollmentDataAccess.getEnrollmentById(id);
    });
  }
};

module.exports = studentEnrollmentDataAccess;
