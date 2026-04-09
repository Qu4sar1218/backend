'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class CourseSubject extends Model {
    static associate(models) {
      CourseSubject.belongsTo(models.Course, {
        as: 'course',
        foreignKey: 'course_id'
      });
      CourseSubject.belongsTo(models.Subject, {
        as: 'subject',
        foreignKey: 'subject_id'
      });
    }
  }

  CourseSubject.init({
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
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
    subjectId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'subjects',
        key: 'id'
      },
      field: 'subject_id'
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
    modelName: 'CourseSubject',
    tableName: 'course_subjects',
    underscored: true
  });

  return CourseSubject;
};
