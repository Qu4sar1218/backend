'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Course extends Model {
    static associate(models) {
      Course.belongsToMany(models.Subject, {
        as: 'subjects',
        through: models.CourseSubject,
        foreignKey: 'course_id',
        otherKey: 'subject_id'
      });
      Course.hasMany(models.CourseSubject, {
        as: 'course_subjects',
        foreignKey: 'course_id'
      });
      Course.hasMany(models.Section, {
        as: 'sections',
        foreignKey: 'course_id'
      });
      Course.hasMany(models.StudentEnrollment, {
        as: 'enrollments',
        foreignKey: 'course_id'
      });
    }
  }

  Course.init({
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
    yearLevel: {
      type: DataTypes.ENUM(
        'Year 1', 'Year 2', 'Year 3', 'Year 4', 'Year 5', 'Year 6',
        'Grade 11', 'Grade 12'
      ),
      allowNull: false,
      defaultValue: 'Year 1',
      field: 'year_level'
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
    modelName: 'Course',
    tableName: 'courses',
    underscored: true
  });

  return Course;
};

