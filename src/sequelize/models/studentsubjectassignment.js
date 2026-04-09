'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class StudentSubjectAssignment extends Model {
    static associate(models) {
      StudentSubjectAssignment.belongsTo(models.StudentEnrollment, {
        as: 'enrollment',
        foreignKey: 'student_enrollment_id'
      });
      StudentSubjectAssignment.belongsTo(models.SectionSubjectTeacher, {
        as: 'baseAssignment',
        foreignKey: 'base_section_subject_teacher_id'
      });
      StudentSubjectAssignment.belongsTo(models.SectionSubjectTeacher, {
        as: 'assignment',
        foreignKey: 'section_subject_teacher_id'
      });
      StudentSubjectAssignment.belongsTo(models.Subject, {
        as: 'subject',
        foreignKey: 'subject_id'
      });
      StudentSubjectAssignment.belongsTo(models.User, {
        as: 'teacher',
        foreignKey: 'teacher_id'
      });
      StudentSubjectAssignment.belongsTo(models.Section, {
        as: 'section',
        foreignKey: 'section_id'
      });
      StudentSubjectAssignment.hasMany(models.Attendance, {
        as: 'attendances',
        foreignKey: 'student_subject_assignment_id'
      });
    }
  }

  StudentSubjectAssignment.init({
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    studentEnrollmentId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'student_enrollments',
        key: 'id'
      },
      field: 'student_enrollment_id'
    },
    assignmentType: {
      type: DataTypes.ENUM('ADD', 'REMOVE', 'REPLACE'),
      allowNull: false,
      field: 'assignment_type'
    },
    baseSectionSubjectTeacherId: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'base_section_subject_teacher_id'
    },
    sectionSubjectTeacherId: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'section_subject_teacher_id'
    },
    subjectId: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'subject_id'
    },
    teacherId: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'teacher_id'
    },
    sectionId: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'section_id'
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
    effectiveFrom: {
      type: DataTypes.DATEONLY,
      allowNull: true,
      field: 'effective_from'
    },
    effectiveTo: {
      type: DataTypes.DATEONLY,
      allowNull: true,
      field: 'effective_to'
    },
    active: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    },
    remarks: {
      type: DataTypes.STRING,
      allowNull: true
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
    modelName: 'StudentSubjectAssignment',
    tableName: 'student_subject_assignments',
    underscored: true
  });

  return StudentSubjectAssignment;
};
