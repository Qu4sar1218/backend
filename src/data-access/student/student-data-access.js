const {
  Student,
  User,
  Role,
  School,
  StudentCredential,
  StudentEnrollment,
  Course,
  Section,
  sequelize: db
} = require('../../sequelize/models');
const { Op } = require('sequelize');
const bcrypt = require('bcryptjs');
const { buildDefaultStudentPassword } = require('../../utils/default-student-password');

const toStudentResponse = (student) => {
  const raw = student.toJSON();
  const currentEnrollment = raw.enrollments?.[0] || null;
  return {
    id: raw.id,
    student_id_number: raw.studentIdNumber,
    school_id: raw.user?.schoolId || null,
    department_id: null,
    first_name: raw.firstName,
    middle_name: raw.middleName,
    last_name: raw.lastName,
    birthday: raw.birthday,
    address: raw.address,
    contactNumber: raw.contactNumber,
    email: raw.email,
    yearLevel: raw.yearLevel,
    guardianContactNumber: raw.guardianContactNumber,
    guardianEmail: raw.guardianEmail,
    is_active: raw.active,
    status: raw.status,
    studentType: currentEnrollment?.studentType ?? null,
    enrolledDate: raw.enrolledDate,
    user_image_url: raw.user?.imageUrl || null,
    school: raw.user?.school
      ? {
          id: raw.user.school.id,
          name: raw.user.school.name
        }
      : null,
    department: null
  };
};

const toCurrentEnrollmentResponse = (enrollmentRow) => {
  if (!enrollmentRow) return null;
  const e =
    enrollmentRow.toJSON != null ? enrollmentRow.toJSON() : enrollmentRow;
  const course = e.course;
  const section = e.section;
  return {
    school_year: e.schoolYear,
    course: course
      ? {
          id: course.id,
          name: course.name,
          code: course.code
        }
      : null,
    section: section
      ? {
          id: section.id,
          name: section.name,
          code: section.code
        }
      : null
  };
};

const toCredentialResponse = (credential) => {
  const raw = credential.toJSON();
  return {
    id: raw.id,
    student_id: raw.studentId,
    credential_type: raw.credentialType,
    credential_data: raw.credentialData,
    credential_reference: raw.credentialReference,
    is_primary: raw.isPrimary,
    is_active: raw.isActive,
    enrolled_date: raw.enrolledDate
  };
};

const studentDataAccess = {
  getStudents: async () => {
    const students = await Student.findAll({
      include: [
        {
          association: 'user',
          attributes: ['id', 'schoolId', 'imageUrl'],
          include: [
            { model: School, as: 'school', attributes: ['id', 'name'] }
          ]
        },
        {
          association: 'enrollments',
          as: 'enrollments',
          where: {
            active: true
          },
          attributes: ['id', 'studentType', 'enrolledDate'],
          required: false,
          separate: true,
          limit: 1,
          order: [['updatedAt', 'DESC'], ['enrolledDate', 'DESC']]
        }
      ],
      order: [['createdAt', 'DESC']]
    });

    return students.map(toStudentResponse);
  },

  getEligibleStudentsForFace: async ({ q, sectionId } = {}) => {
    const now = new Date();
    const trimmed = typeof q === 'string' ? q.trim() : '';
    const normalizedSectionId =
      typeof sectionId === 'string' && sectionId.trim() && sectionId !== 'all'
        ? sectionId.trim()
        : null;

    const baseWhere = { active: true };
    if (trimmed) {
      baseWhere[Op.or] = [
        { studentIdNumber: { [Op.like]: `%${trimmed}%` } },
        { firstName: { [Op.like]: `%${trimmed}%` } },
        { middleName: { [Op.like]: `%${trimmed}%` } },
        { lastName: { [Op.like]: `%${trimmed}%` } }
      ];
    }

    // Pre-filter by section: query StudentEnrollment directly (proven pattern).
    if (normalizedSectionId) {
      const sectionEnrollments = await StudentEnrollment.findAll({
        attributes: ['studentId'],
        where: { sectionId: normalizedSectionId, active: true, status: 'enrolled' },
        raw: true
      });
      const sectionStudentIds = [...new Set(sectionEnrollments.map((e) => e.studentId))];
      if (sectionStudentIds.length === 0) return [];
      baseWhere.id = { [Op.in]: sectionStudentIds };
    }

    // Step 1: Find eligible student IDs using joins (required enrollment, no active FACE credential).
    const eligibleRows = await Student.findAll({
      attributes: ['id'],
      where: {
        ...baseWhere,
        '$credentials.id$': null
      },
      include: [
        {
          association: 'enrollments',
          as: 'enrollments',
          attributes: [],
          required: true,
          where: {
            active: true,
            status: 'enrolled'
          }
        },
        {
          association: 'credentials',
          as: 'credentials',
          attributes: ['id'],
          required: false,
          where: {
            credentialType: 'FACE',
            isActive: true,
            [Op.or]: [
              { expiryDate: null },
              { expiryDate: { [Op.gte]: now } }
            ]
          }
        }
      ],
      order: [['createdAt', 'DESC']],
      distinct: true,
      subQuery: false
    });

    const eligibleIds = Array.from(new Set(eligibleRows.map((r) => r.id)));
    if (eligibleIds.length === 0) return [];

    // Step 2: Fetch full student response shape (incl. latest active enrollment + school).
    const students = await Student.findAll({
      where: { id: { [Op.in]: eligibleIds } },
      include: [
        {
          association: 'user',
          attributes: ['id', 'schoolId', 'imageUrl'],
          include: [
            { model: School, as: 'school', attributes: ['id', 'name'] }
          ]
        },
        {
          association: 'enrollments',
          as: 'enrollments',
          where: {
            active: true,
            status: 'enrolled'
          },
          attributes: ['id', 'studentType', 'enrolledDate'],
          required: false,
          separate: true,
          limit: 1,
          order: [['updatedAt', 'DESC'], ['enrolledDate', 'DESC']]
        }
      ],
      order: [['createdAt', 'DESC']]
    });

    return students.map(toStudentResponse);
  },

  getStudentById: async (id) => {
    const student = await Student.findByPk(id, {
      include: [
        {
          association: 'user',
          attributes: ['id', 'schoolId', 'imageUrl'],
          include: [
            { model: School, as: 'school', attributes: ['id', 'name'] }
          ]
        },
        {
          association: 'enrollments',
          as: 'enrollments',
          where: {
            active: true
          },
          attributes: ['id', 'studentType', 'enrolledDate'],
          required: false,
          separate: true,
          limit: 1,
          order: [['updatedAt', 'DESC'], ['enrolledDate', 'DESC']]
        }
      ]
    });

    if (!student) return null;
    return toStudentResponse(student);
  },

  getStudentsWithFaceCredentials: async () => {
    const students = await Student.findAll({
      include: [
        {
          association: 'credentials',
          as: 'credentials',
          where: {
            credentialType: 'FACE',
            isActive: true,
            [Op.or]: [{ expiryDate: null }, { expiryDate: { [Op.gte]: new Date() } }]
          },
          required: true
        },
        {
          association: 'user',
          attributes: ['id', 'schoolId', 'imageUrl'],
          include: [
            { model: School, as: 'school', attributes: ['id', 'name'] }
          ]
        },
        {
          association: 'enrollments',
          as: 'enrollments',
          where: {
            active: true,
            status: 'enrolled'
          },
          required: false,
          separate: true,
          limit: 1,
          order: [['enrolledDate', 'DESC']],
          include: [
            { model: Course, as: 'course', attributes: ['id', 'name', 'code'] },
            { model: Section, as: 'section', attributes: ['id', 'name', 'code'], required: false }
          ]
        }
      ],
      order: [['createdAt', 'DESC']]
    });

    return students.map((student) => {
      const basic = toStudentResponse(student);
      const enrollments = student.enrollments || [];
      const currentEnrollment = enrollments[0] ? toCurrentEnrollmentResponse(enrollments[0]) : null;
      return {
        ...basic,
        current_enrollment: currentEnrollment,
        credentials: (student.credentials || []).map((cred) => ({
          id: cred.id,
          credential_data: cred.credentialData,
          credential_reference: cred.credentialReference,
          enrolled_date: cred.enrolledDate,
          is_primary: cred.isPrimary
        }))
      };
    });
  },

  getStudentCredentials: async (studentId) => {
    const credentials = await StudentCredential.findAll({
      where: { studentId },
      order: [['createdAt', 'DESC']]
    });

    return credentials.map(toCredentialResponse);
  },

  enrollFaceCredential: async ({ studentId, descriptors, qualityScores, thumbnailPath, createdBy }) => {
    const credentialPayload = {
      descriptors,
      quality_scores: qualityScores ?? [],
      enrolled_at: new Date().toISOString()
    };

    if (thumbnailPath) {
      credentialPayload.thumbnail_url = thumbnailPath;
    }

    const created = await StudentCredential.create({
      studentId,
      credentialType: 'FACE',
      credentialData: JSON.stringify(credentialPayload),
      credentialReference: null,
      isPrimary: true,
      isActive: true,
      enrolledDate: new Date(),
      createdBy: createdBy || null
    });

    return toCredentialResponse(created);
  },

  replaceFaceCredential: async ({ studentId, descriptors, qualityScores, thumbnailPath, createdBy }) => {
    const transaction = await db.transaction();
    try {
      const credentialPayload = {
        descriptors,
        quality_scores: qualityScores ?? [],
        enrolled_at: new Date().toISOString()
      };

      if (thumbnailPath) {
        credentialPayload.thumbnail_url = thumbnailPath;
      }

      await StudentCredential.destroy({
        where: {
          studentId,
          credentialType: 'FACE'
        },
        transaction
      });

      const created = await StudentCredential.create({
        studentId,
        credentialType: 'FACE',
        credentialData: JSON.stringify(credentialPayload),
        credentialReference: null,
        isPrimary: true,
        isActive: true,
        enrolledDate: new Date(),
        createdBy: createdBy || null
      }, { transaction });

      await transaction.commit();
      return toCredentialResponse(created);
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },

  deleteCredential: async ({ studentId, credentialId }) => {
    const deletedCount = await StudentCredential.destroy({
      where: {
        id: credentialId,
        studentId
      }
    });
    return deletedCount > 0;
  },

  createStudent: async (data) => {
    const transaction = await db.transaction();
    try {
      const studentRole = await Role.findOne({ where: { name: 'Student' }, transaction });
      if (!studentRole) throw new Error('Student role not found');

      const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS) || 12;
      const defaultPassword = buildDefaultStudentPassword(data.studentIdNumber, data.lastName);
      const hashedPassword = await bcrypt.hash(defaultPassword, saltRounds);

      const username = data.username || data.studentIdNumber;

      const user = await User.create({
        firstName: data.firstName,
        lastName: data.lastName,
        middleName: data.middleName || null,
        email: data.email,
        username,
        password: hashedPassword,
        roleId: studentRole.id,
        schoolId: data.schoolId,
        active: true,
        createdById: data.createdById || null
      }, { transaction });

      const student = await Student.create({
        userId: user.id,
        firstName: data.firstName,
        lastName: data.lastName,
        middleName: data.middleName || null,
        birthday: data.birthday || null,
        address: data.address || null,
        contactNumber: data.contactNumber,
        email: data.email,
        studentIdNumber: data.studentIdNumber,
        yearLevel: data.yearLevel,
        guardianContactNumber: data.guardianContactNumber,
        guardianEmail: data.guardianEmail,
        active: true,
        status: 'pending',
        registeredDate: new Date(),
        enrolledDate: data.enrolledDate || new Date(),
        modifiedBy: data.createdById || null
      }, { transaction });

      await transaction.commit();

      return studentDataAccess.getStudentById(student.id);
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },

  updateStudent: async (id, data) => {
    const transaction = await db.transaction();
    try {
      const student = await Student.findByPk(id, { transaction });
      if (!student) {
        await transaction.rollback();
        return null;
      }

      await student.update({
        firstName: data.firstName !== undefined ? data.firstName : student.firstName,
        lastName: data.lastName !== undefined ? data.lastName : student.lastName,
        middleName: data.middleName !== undefined ? data.middleName : student.middleName,
        birthday: data.birthday !== undefined ? data.birthday : student.birthday,
        address: data.address !== undefined ? data.address : student.address,
        contactNumber: data.contactNumber !== undefined ? data.contactNumber : student.contactNumber,
        email: data.email !== undefined ? data.email : student.email,
        studentIdNumber: data.studentIdNumber !== undefined ? data.studentIdNumber : student.studentIdNumber,
        yearLevel: data.yearLevel !== undefined ? data.yearLevel : student.yearLevel,
        guardianContactNumber: data.guardianContactNumber !== undefined ? data.guardianContactNumber : student.guardianContactNumber,
        guardianEmail: data.guardianEmail !== undefined ? data.guardianEmail : student.guardianEmail,
        active: data.active !== undefined ? (data.active === true || data.active === 'true') : student.active,
        status: data.status !== undefined ? data.status : student.status,
        enrolledDate: data.enrolledDate !== undefined ? data.enrolledDate : student.enrolledDate,
        modifiedBy: data.modifiedBy || null
      }, { transaction });

      if (student.userId) {
        const user = await User.findByPk(student.userId, { transaction });
        if (user) {
          await user.update({
            firstName: data.firstName !== undefined ? data.firstName : user.firstName,
            lastName: data.lastName !== undefined ? data.lastName : user.lastName,
            middleName: data.middleName !== undefined ? data.middleName : user.middleName,
            email: data.email !== undefined ? data.email : user.email,
            modifiedById: data.modifiedBy || null
          }, { transaction });
        }
      }

      await transaction.commit();
      return studentDataAccess.getStudentById(id);
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }
};

module.exports = studentDataAccess;
