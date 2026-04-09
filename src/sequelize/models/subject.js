'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Subject extends Model {
    static associate(models) {
      Subject.belongsToMany(models.Course, {
        as: 'courses',
        through: models.CourseSubject,
        foreignKey: 'subject_id',
        otherKey: 'course_id'
      });
      Subject.hasMany(models.CourseSubject, {
        as: 'course_subjects',
        foreignKey: 'subject_id'
      });
      Subject.belongsToMany(models.User, {
        as: 'teachers',
        through: models.TeacherSubject,
        foreignKey: 'subject_id',
        otherKey: 'teacher_id'
      });
      Subject.hasMany(models.TeacherSubject, {
        as: 'teacher_subjects',
        foreignKey: 'subject_id'
      });
      Subject.hasMany(models.SectionSubjectTeacher, {
        as: 'section_subject_teachers',
        foreignKey: 'subject_id'
      });
      Subject.hasMany(models.Attendance, {
        as: 'attendances',
        foreignKey: 'subject_id'
      });
      Subject.hasMany(models.StudentSubjectAssignment, {
        as: 'student_subject_assignments',
        foreignKey: 'subject_id'
      });
    }
  }

  Subject.init({
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    name: DataTypes.STRING,
    code: {
      type: DataTypes.STRING,
      unique: true,
      allowNull: false
    },
    year: {
      type: DataTypes.ENUM('1st_year', '2nd_year', '3rd_year', '4th_year', 'grade_11', 'grade_12')
    },
    description: DataTypes.STRING,
    active: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    },
    modifiedBy: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'modified_by'
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      field: 'created_at'
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      field: 'updated_at'
    }
  }, {
    sequelize,
    modelName: 'Subject',
    tableName: 'subjects',
    underscored: true
  });

  return Subject;
};

