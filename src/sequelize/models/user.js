'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class User extends Model {
    static associate(models) {
      User.belongsTo(models.Role, { as: 'role', foreignKey: 'role_id' });
      User.belongsTo(models.School, {
        foreignKey: 'school_id',
        as: 'school'
      });
      User.hasOne(models.Student, {
        foreignKey: 'user_id',
        as: 'student'
      });
      User.belongsToMany(models.Subject, {
        as: 'subjects',
        through: models.TeacherSubject,
        foreignKey: 'teacher_id',
        otherKey: 'subject_id'
      });
      User.hasMany(models.TeacherSubject, {
        as: 'teacher_subjects',
        foreignKey: 'teacher_id'
      });
      User.hasMany(models.SectionSubjectTeacher, {
        as: 'section_subject_teachers',
        foreignKey: 'teacher_id'
      });
      User.hasMany(models.Attendance, {
        as: 'attendances',
        foreignKey: 'teacher_id'
      });
      User.hasMany(models.StudentSubjectAssignment, {
        as: 'student_subject_assignments',
        foreignKey: 'teacher_id'
      });
    }
  }
  User.init({
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    firstName: {
      type: DataTypes.STRING,
      field: 'first_name'
    },
    lastName: {
      type: DataTypes.STRING,
      field: 'last_name'
    },
    middleName: {
      type: DataTypes.STRING,
      field: 'middle_name'
    },
    roleId: {
      type: DataTypes.UUID,
      field: 'role_id'
    },
    username: DataTypes.STRING,
    password: DataTypes.STRING,
    email: DataTypes.STRING,
    phoneNumber: {
      type: DataTypes.STRING,
      field: 'phone_number'
    },
    address: DataTypes.STRING,
    birthday: DataTypes.DATE,
    imageUrl: {
      type: DataTypes.STRING,
      field: 'image_url'
    },
    token: DataTypes.TEXT,
    refreshToken: {
      type: DataTypes.TEXT,
      field: 'refresh_token'
    },
    tokenVersion: {
      type: DataTypes.INTEGER,
      field: 'token_version',
      defaultValue: 0
    },
    failedLoginAttempts: {
      type: DataTypes.INTEGER,
      field: 'failed_login_attempts',
      defaultValue: 0
    },
    lockedUntil: {
      type: DataTypes.DATE,
      field: 'locked_until'
    },
    lastLoginAt: {
      type: DataTypes.DATE,
      field: 'last_login_at'
    },
    active: DataTypes.BOOLEAN,
    createdById: {
      type: DataTypes.UUID,
      field: 'created_by_id'
    },
    modifiedById: {
      type: DataTypes.UUID,
      field: 'modified_by_id'
    },
    createdAt: {
      type: DataTypes.DATE,
      field: 'created_at'
    },
    updatedAt: {
      type: DataTypes.DATE,
      field: 'updated_at'
    },
    schoolId: {
      type: DataTypes.UUID,
      references: {
        model: 'schools',
        key: 'id'
      },
      field: 'school_id'
    },
    teacherDepartmentId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'departments',
        key: 'id'
      },
      field: 'teacher_department_id'
    }
  }, {
    sequelize,
    modelName: 'User',
    tableName: 'users',
    underscored: true
  });
  return User;
};