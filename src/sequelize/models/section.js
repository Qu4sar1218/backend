'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Section extends Model {
    static associate(models) {
      Section.belongsTo(models.Course, {
        as: 'course',
        foreignKey: 'course_id'
      });
      Section.hasMany(models.StudentEnrollment, {
        as: 'enrollments',
        foreignKey: 'section_id'
      });
      Section.hasMany(models.SectionSubjectTeacher, {
        as: 'section_subject_teachers',
        foreignKey: 'section_id'
      });
      Section.hasMany(models.Attendance, {
        as: 'attendances',
        foreignKey: 'section_id'
      });
      Section.hasMany(models.StudentSubjectAssignment, {
        as: 'student_subject_assignments',
        foreignKey: 'section_id'
      });
    }
  }

  Section.init({
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false
    },
    code: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
    },
    description: {
      type: DataTypes.STRING,
      allowNull: true
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
    yearLevel: {
      type: DataTypes.ENUM(
        'Year 1', 'Year 2', 'Year 3', 'Year 4', 'Year 5', 'Year 6',
        'Grade 11', 'Grade 12'
      ),
      allowNull: false,
      field: 'year_level'
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
    modelName: 'Section',
    tableName: 'sections',
    underscored: true
  });

  return Section;
};
