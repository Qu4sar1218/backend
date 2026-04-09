'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class SectionSubjectTeacher extends Model {
    static associate(models) {
      SectionSubjectTeacher.belongsTo(models.Section, {
        as: 'section',
        foreignKey: 'section_id'
      });
      SectionSubjectTeacher.belongsTo(models.Subject, {
        as: 'subject',
        foreignKey: 'subject_id'
      });
      SectionSubjectTeacher.belongsTo(models.User, {
        as: 'teacher',
        foreignKey: 'teacher_id'
      });
      SectionSubjectTeacher.hasMany(models.Attendance, {
        as: 'attendances',
        foreignKey: 'section_subject_teacher_id'
      });
      SectionSubjectTeacher.hasMany(models.AttendancePolicy, {
        as: 'attendance_policies',
        foreignKey: 'section_subject_teacher_id'
      });
      SectionSubjectTeacher.hasMany(models.StudentSubjectAssignment, {
        as: 'student_subject_assignments',
        foreignKey: 'section_subject_teacher_id'
      });
      SectionSubjectTeacher.hasMany(models.StudentSubjectAssignment, {
        as: 'student_subject_assignment_bases',
        foreignKey: 'base_section_subject_teacher_id'
      });
    }
  }

  SectionSubjectTeacher.init({
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    sectionId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'sections',
        key: 'id'
      },
      field: 'section_id'
    },
    subjectId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'subjects',
        key: 'id'
      },
      field: 'subject_id'
    },
    teacherId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      },
      field: 'teacher_id'
    },
    active: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    },
    note: {
      type: DataTypes.STRING,
      allowNull: true
    },
    daysOfWeek: {
      type: DataTypes.JSON,
      allowNull: true,
      field: 'days_of_week'
    },
    startTime: {
      type: DataTypes.TIME,
      allowNull: true,
      field: 'start_time'
    },
    endTime: {
      type: DataTypes.TIME,
      allowNull: true,
      field: 'end_time'
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
    modelName: 'SectionSubjectTeacher',
    tableName: 'section_subject_teachers',
    underscored: true
  });

  return SectionSubjectTeacher;
};
