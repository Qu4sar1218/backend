'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class RawTimelog extends Model {
    static associate(models) {
      this.belongsTo(models.TimelogDevice, {
        foreignKey: 'device_id',
        as: 'device'
      });
      this.belongsTo(models.Student, {
        foreignKey: 'student_id',
        as: 'student'
      });
      this.belongsTo(models.Attendance, {
        foreignKey: 'matched_attendance_id',
        as: 'matched_attendance'
      });
      this.belongsTo(models.Event, {
        foreignKey: 'event_id',
        as: 'event'
      });
      this.hasMany(models.EmailLog, {
        as: 'emailLogs',
        foreignKey: 'raw_timelog_id'
      });
    }
  }

  RawTimelog.init({
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    deviceId: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'device_id'
    },
    sourceType: {
      type: DataTypes.ENUM('DEVICE', 'MANUAL', 'MOBILE_APP', 'WEB_PORTAL', 'IMPORT', 'API'),
      allowNull: false,
      field: 'source_type'
    },
    studentId: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'student_id'
    },
    eventId: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'event_id'
    },
    studentNumber: {
      type: DataTypes.STRING(20),
      allowNull: true,
      field: 'student_number'
    },
    credentialReference: {
      type: DataTypes.STRING(100),
      allowNull: true,
      field: 'credential_reference'
    },
    logDatetime: {
      type: DataTypes.DATE,
      allowNull: false,
      field: 'log_datetime'
    },
    logType: {
      type: DataTypes.ENUM('TIME_IN', 'TIME_OUT', 'BREAK_OUT', 'BREAK_IN', 'AUTO'),
      defaultValue: 'AUTO',
      field: 'log_type'
    },
    locationName: {
      type: DataTypes.STRING(100),
      allowNull: true,
      field: 'location_name'
    },
    latitude: DataTypes.DECIMAL(10, 8),
    longitude: DataTypes.DECIMAL(11, 8),
    verificationMethod: {
      type: DataTypes.ENUM('FINGERPRINT', 'FACE', 'RFID', 'QR_CODE', 'PIN', 'CARD', 'MANUAL'),
      allowNull: false,
      field: 'verification_method'
    },
    verificationScore: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: true,
      field: 'verification_score'
    },
    rawData: {
      type: DataTypes.JSON,
      allowNull: true,
      field: 'raw_data'
    },
    deviceLogId: {
      type: DataTypes.STRING(100),
      allowNull: true,
      field: 'device_log_id'
    },
    processingStatus: {
      type: DataTypes.ENUM('PENDING', 'PROCESSED', 'MATCHED', 'UNMATCHED', 'DUPLICATE', 'ERROR', 'IGNORED'),
      defaultValue: 'PENDING',
      field: 'processing_status'
    },
    errorMessage: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'error_message'
    },
    matchedAttendanceId: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'matched_attendance_id'
    },
    matchedBy: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'matched_by'
    },
    matchedDate: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'matched_date'
    },
    importedBy: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'imported_by'
    },
    importedDate: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'imported_date'
    },
    updatedBy: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'updated_by'
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: 'created_at'
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: 'updated_at'
    }
  }, {
    sequelize,
    modelName: 'RawTimelog',
    tableName: 'raw_timelogs',
    underscored: true
  });

  return RawTimelog;
};
