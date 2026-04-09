'use strict';
const { User, Role, School, Department, TeacherSubject } = require('../../sequelize/models');
const bcrypt = require('bcryptjs');

const SENSITIVE_FIELDS = ['password', 'token', 'refreshToken', 'tokenVersion', 'failedLoginAttempts', 'lockedUntil'];

const stripSensitive = (user) => {
  const raw = user.toJSON ? user.toJSON() : { ...user };
  SENSITIVE_FIELDS.forEach(f => delete raw[f]);
  return raw;
};

const teacherIncludes = ({ subjectId } = {}) => {
  const includes = [
    { model: Role, as: 'role', attributes: ['id', 'name'] },
    { model: School, as: 'school', attributes: ['id', 'name', 'schoolCode'] }
  ];

  if (subjectId) {
    includes.push({
      model: TeacherSubject,
      as: 'teacher_subjects',
      attributes: [],
      where: {
        subjectId,
        active: true
      },
      required: true
    });
  }

  return includes;
};

const attachDepartment = async (teacherJson) => {
  if (!teacherJson.teacherDepartmentId) return { ...teacherJson, department: null };
  const dept = await Department.findByPk(teacherJson.teacherDepartmentId, {
    attributes: ['id', 'name', 'code']
  });
  return { ...teacherJson, department: dept ? dept.toJSON() : null };
};

const teacherDataAccess = {
  getTeacherRoleId: async () => {
    const role = await Role.findOne({ where: { name: 'Teacher' } });
    if (!role) throw new Error('Teacher role not found');
    return role.id;
  },

  getTeachers: async ({ active, subjectId } = {}) => {
    const roleId = await teacherDataAccess.getTeacherRoleId();
    const where = { roleId };
    if (active !== undefined) where.active = active === 'true' || active === true;

    const teachers = await User.findAll({
      where,
      include: teacherIncludes({ subjectId }),
      order: [['lastName', 'ASC'], ['firstName', 'ASC']]
    });
    const stripped = teachers.map(stripSensitive);
    return Promise.all(stripped.map(attachDepartment));
  },

  getTeacherById: async (id) => {
    const roleId = await teacherDataAccess.getTeacherRoleId();
    const teacher = await User.findOne({
      where: { id, roleId },
      include: teacherIncludes()
    });
    if (!teacher) return null;
    return attachDepartment(stripSensitive(teacher));
  },

  createTeacher: async (data) => {
    const roleId = await teacherDataAccess.getTeacherRoleId();
    const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS) || 12;
    const hashedPassword = await bcrypt.hash(data.password, saltRounds);

    const teacher = await User.create({
      firstName: data.firstName,
      lastName: data.lastName,
      middleName: data.middleName || null,
      username: data.username,
      password: hashedPassword,
      email: data.email,
      phoneNumber: data.phoneNumber || null,
      address: data.address || null,
      birthday: data.birthday || null,
      roleId,
      schoolId: data.schoolId,
      teacherDepartmentId: data.teacherDepartmentId || null,
      active: true,
      createdById: data.createdById || null
    });

    return teacherDataAccess.getTeacherById(teacher.id);
  },

  updateTeacher: async (id, data) => {
    const roleId = await teacherDataAccess.getTeacherRoleId();
    const teacher = await User.findOne({ where: { id, roleId } });
    if (!teacher) return null;

    const { username, password, roleId: _r, ...updatableData } = data;

    await teacher.update({
      firstName: updatableData.firstName,
      lastName: updatableData.lastName,
      middleName: updatableData.middleName !== undefined ? updatableData.middleName : teacher.middleName,
      email: updatableData.email,
      phoneNumber: updatableData.phoneNumber !== undefined ? updatableData.phoneNumber : teacher.phoneNumber,
      address: updatableData.address !== undefined ? updatableData.address : teacher.address,
      birthday: updatableData.birthday !== undefined ? updatableData.birthday : teacher.birthday,
      schoolId: updatableData.schoolId !== undefined ? updatableData.schoolId : teacher.schoolId,
      teacherDepartmentId: updatableData.teacherDepartmentId !== undefined ? updatableData.teacherDepartmentId : teacher.teacherDepartmentId,
      active: updatableData.active !== undefined ? (updatableData.active === true || updatableData.active === 'true') : teacher.active,
      modifiedById: updatableData.modifiedById || null
    });

    return teacherDataAccess.getTeacherById(id);
  }
};

module.exports = teacherDataAccess;
