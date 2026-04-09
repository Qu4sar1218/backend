'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Attendance extends Model {
    static associate(models) {
      Attendance.belongsTo(models.Student, {
        as: 'student',
        foreignKey: 'student_id'
      });
      Attendance.belongsTo(models.SectionSubjectTeacher, {
        as: 'assignment',
        foreignKey: 'section_subject_teacher_id'
      });
      Attendance.belongsTo(models.StudentSubjectAssignment, {
        as: 'studentSubjectAssignment',
        foreignKey: 'student_subject_assignment_id'
      });
      Attendance.belongsTo(models.Section, {
        as: 'section',
        foreignKey: 'section_id'
      });
      Attendance.belongsTo(models.Subject, {
        as: 'subject',
        foreignKey: 'subject_id'
      });
      Attendance.belongsTo(models.User, {
        as: 'teacher',
        foreignKey: 'teacher_id'
      });
      Attendance.hasMany(models.RawTimelog, {
        as: 'raw_timelogs',
        foreignKey: 'matched_attendance_id'
      });
    }
  }

  Attendance.init({
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    studentId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'student_id'
    },
    attendanceDate: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      field: 'attendance_date'
    },
    sectionSubjectTeacherId: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'section_subject_teacher_id'
    },
    studentSubjectAssignmentId: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'student_subject_assignment_id'
    },
    sectionId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'section_id'
    },
    subjectId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'subject_id'
    },
    teacherId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'teacher_id'
    },
    status: {
      type: DataTypes.ENUM('PRESENT', 'LATE', 'ABSENT', 'EXCUSED'),
      allowNull: false,
      defaultValue: 'PRESENT'
    },
    firstScanAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'first_scan_at'
    },
    lastScanAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'last_scan_at'
    },
    timeIn: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'time_in'
    },
    timeOut: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'time_out'
    },
    source: {
      type: DataTypes.ENUM('AUTO', 'MANUAL'),
      allowNull: false,
      defaultValue: 'AUTO'
    },
    derivedFromRawTimelogIds: {
      type: DataTypes.JSON,
      allowNull: true,
      field: 'derived_from_raw_timelog_ids'
    },
    note: {
      type: DataTypes.STRING,
      allowNull: true
    },
    createdBy: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'created_by'
    },
    updatedBy: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'updated_by'
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
    modelName: 'Attendance',
    tableName: 'attendances',
    underscored: true
  });

  return Attendance;
};
