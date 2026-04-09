'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class StudentEnrollment extends Model {
    static associate(models) {
      StudentEnrollment.belongsTo(models.Student, {
        as: 'student',
        foreignKey: 'student_id'
      });
      StudentEnrollment.belongsTo(models.Course, {
        as: 'course',
        foreignKey: 'course_id'
      });
      StudentEnrollment.belongsTo(models.Section, {
        as: 'section',
        foreignKey: 'section_id'
      });
      StudentEnrollment.hasMany(models.StudentSubjectAssignment, {
        as: 'subject_assignments',
        foreignKey: 'student_enrollment_id'
      });
    }
  }

  StudentEnrollment.init({
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    studentId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'students',
        key: 'id'
      },
      field: 'student_id'
    },
    courseId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'courses',
        key: 'id'
      },
      field: 'course_id'
    },
    sectionId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'sections',
        key: 'id'
      },
      field: 'section_id'
    },
    schoolYear: {
      type: DataTypes.STRING,
      allowNull: false,
      field: 'school_year'
    },
    yearLevel: {
      type: DataTypes.ENUM(
        'Year 1', 'Year 2', 'Year 3', 'Year 4', 'Year 5', 'Year 6',
        'Grade 11', 'Grade 12'
      ),
      allowNull: false,
      field: 'year_level'
    },
    studentType: {
      type: DataTypes.ENUM('regular', 'irregular'),
      allowNull: false,
      field: 'student_type',
      validate: {
        isIn: [['regular', 'irregular']]
      }
    },
    enrolledDate: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: 'enrolled_date'
    },
    status: {
      type: DataTypes.ENUM('enrolled', 'dropped', 'graduated'),
      allowNull: false,
      defaultValue: 'enrolled'
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
    modelName: 'StudentEnrollment',
    tableName: 'student_enrollments',
    underscored: true
  });

  return StudentEnrollment;
};
