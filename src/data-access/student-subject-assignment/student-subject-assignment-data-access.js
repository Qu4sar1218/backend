'use strict';
const {
  StudentEnrollment,
  StudentSubjectAssignment,
  SectionSubjectTeacher,
  Subject,
  User,
  Section,
  Student,
  Course
} = require('../../sequelize/models');
const { Op } = require('sequelize');

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

const normalizeNestedSst = (sst) => {
  if (!sst) return sst;
  const j = typeof sst.toJSON === 'function' ? sst.toJSON() : { ...sst };
  return {
    ...j,
    startTime: fmtTime(j.startTime),
    endTime: fmtTime(j.endTime)
  };
};

const assignmentIncludes = [
  {
    model: SectionSubjectTeacher,
    as: 'baseAssignment',
    attributes: ['id', 'sectionId', 'subjectId', 'teacherId', 'daysOfWeek', 'startTime', 'endTime'],
    required: false
  },
  {
    model: SectionSubjectTeacher,
    as: 'assignment',
    attributes: ['id', 'sectionId', 'subjectId', 'teacherId', 'daysOfWeek', 'startTime', 'endTime'],
    required: false
  },
  { model: Subject, as: 'subject', attributes: ['id', 'name', 'code'], required: false },
  { model: User, as: 'teacher', attributes: ['id', 'firstName', 'lastName'], required: false },
  { model: Section, as: 'section', attributes: ['id', 'name', 'code'], required: false }
];

const studentSubjectAssignmentDataAccess = {
  getActiveEnrollmentByStudentId: async (studentId, transaction = null) => {
    return StudentEnrollment.findOne({
      where: {
        studentId,
        active: true,
        status: 'enrolled'
      },
      include: [{ model: Section, as: 'section', attributes: ['id', 'name', 'code'], required: false }],
      order: [['updatedAt', 'DESC']],
      transaction
    });
  },

  getById: async (id) => {
    const row = await StudentSubjectAssignment.findByPk(id, {
      include: assignmentIncludes
    });
    return row ? row.toJSON() : null;
  },

  getByStudentId: async (studentId, { active, date } = {}) => {
    const enrollment = await studentSubjectAssignmentDataAccess.getActiveEnrollmentByStudentId(studentId);
    if (!enrollment) return { enrollment: null, rows: [] };

    const where = {
      studentEnrollmentId: enrollment.id
    };
    if (active !== undefined) where.active = active === true || active === 'true';
    if (date) {
      where.effectiveFrom = { [Op.or]: [null, { [Op.lte]: date }] };
      where.effectiveTo = { [Op.or]: [null, { [Op.gte]: date }] };
    }

    const rows = await StudentSubjectAssignment.findAll({
      where,
      include: assignmentIncludes,
      order: [['createdAt', 'ASC']]
    });

    return {
      enrollment: enrollment.toJSON(),
      rows: rows.map((r) => r.toJSON())
    };
  },

  create: async (payload) => {
    const created = await StudentSubjectAssignment.create(payload);
    return studentSubjectAssignmentDataAccess.getById(created.id);
  },

  update: async (id, payload) => {
    const row = await StudentSubjectAssignment.findByPk(id);
    if (!row) return null;
    await row.update(payload);
    return studentSubjectAssignmentDataAccess.getById(id);
  },

  findAllForAdmin: async ({ active, courseId, teacherId, subjectId } = {}) => {
    const where = {};
    if (active === undefined || active === null || active === '') {
      where.active = true;
    } else {
      where.active = active === 'true' || active === true;
    }
    if (teacherId !== undefined && teacherId !== null && teacherId !== '') where.teacherId = teacherId;
    if (subjectId !== undefined && subjectId !== null && subjectId !== '') where.subjectId = subjectId;

    const enrollmentInclude = {
      model: StudentEnrollment,
      as: 'enrollment',
      required: true,
      attributes: ['id', 'courseId', 'sectionId', 'schoolYear', 'yearLevel', 'studentType', 'status'],
      include: [
        { model: Student, as: 'student', attributes: ['id', 'firstName', 'middleName', 'lastName'], required: true },
        { model: Course, as: 'course', attributes: ['id', 'name', 'code'], required: false },
        { model: Section, as: 'section', attributes: ['id', 'name', 'code', 'yearLevel'], required: false }
      ]
    };
    if (courseId !== undefined && courseId !== null && courseId !== '') {
      enrollmentInclude.where = { courseId };
    }

    const rows = await StudentSubjectAssignment.findAll({
      where,
      include: [
        enrollmentInclude,
        {
          model: SectionSubjectTeacher,
          as: 'baseAssignment',
          attributes: ['id', 'sectionId', 'subjectId', 'teacherId', 'daysOfWeek', 'startTime', 'endTime'],
          required: false
        },
        {
          model: SectionSubjectTeacher,
          as: 'assignment',
          attributes: ['id', 'sectionId', 'subjectId', 'teacherId', 'daysOfWeek', 'startTime', 'endTime'],
          required: false
        },
        { model: Subject, as: 'subject', attributes: ['id', 'name', 'code'], required: false },
        { model: User, as: 'teacher', attributes: ['id', 'firstName', 'middleName', 'lastName'], required: false },
        { model: Section, as: 'section', attributes: ['id', 'name', 'code'], required: false }
      ],
      order: [['createdAt', 'DESC']]
    });

    return rows.map((row) => {
      const json = row.toJSON();
      json.startTime = fmtTime(json.startTime);
      json.endTime = fmtTime(json.endTime);
      if (json.baseAssignment) json.baseAssignment = normalizeNestedSst(json.baseAssignment);
      if (json.assignment) json.assignment = normalizeNestedSst(json.assignment);
      return json;
    });
  }
};

module.exports = studentSubjectAssignmentDataAccess;
