'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class TeacherSubject extends Model {
    static associate(models) {
      TeacherSubject.belongsTo(models.User, {
        as: 'teacher',
        foreignKey: 'teacher_id'
      });
      TeacherSubject.belongsTo(models.Subject, {
        as: 'subject',
        foreignKey: 'subject_id'
      });
    }
  }

  TeacherSubject.init({
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
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
    modelName: 'TeacherSubject',
    tableName: 'teacher_subjects',
    underscored: true
  });

  return TeacherSubject;
};
