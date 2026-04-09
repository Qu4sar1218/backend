'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class AttendancePolicy extends Model {
    static associate(models) {
      AttendancePolicy.belongsTo(models.School, {
        as: 'school',
        foreignKey: 'school_id'
      });
      AttendancePolicy.belongsTo(models.SectionSubjectTeacher, {
        as: 'assignment',
        foreignKey: 'section_subject_teacher_id'
      });
    }
  }

  AttendancePolicy.init({
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    schoolId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'school_id'
    },
    sectionSubjectTeacherId: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'section_subject_teacher_id'
    },
    onTimeGraceMinutes: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 10,
      field: 'on_time_grace_minutes'
    },
    lateUntilMinutes: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 30,
      field: 'late_until_minutes'
    },
    absentAfterLateWindow: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      field: 'absent_after_late_window'
    },
    earlyArrivalAllowanceMinutes: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      field: 'early_arrival_allowance_minutes'
    },
    lateCheckoutGraceMinutes: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 20,
      field: 'late_checkout_grace_minutes'
    },
    active: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
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
    modelName: 'AttendancePolicy',
    tableName: 'attendance_policies',
    underscored: true
  });

  return AttendancePolicy;
};
