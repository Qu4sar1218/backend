'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class EmailLog extends Model {
    static associate(models) {
      EmailLog.belongsTo(models.Student, {
        as: 'student',
        foreignKey: 'student_id'
      });
      EmailLog.belongsTo(models.RawTimelog, {
        as: 'rawTimelog',
        foreignKey: 'raw_timelog_id'
      });
    }
  }

  EmailLog.init({
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
    rawTimelogId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'raw_timelog_id'
    },
    recipientEmail: {
      type: DataTypes.STRING(255),
      allowNull: false,
      field: 'recipient_email'
    },
    emailType: {
      type: DataTypes.ENUM('HALLWAY_CHECKOUT', 'EVENT_SCAN_TIME_IN', 'EVENT_SCAN_TIME_OUT'),
      allowNull: false,
      defaultValue: 'HALLWAY_CHECKOUT',
      field: 'email_type'
    },
    subject: {
      type: DataTypes.STRING(500),
      allowNull: false
    },
    status: {
      type: DataTypes.ENUM('PENDING', 'SENT', 'FAILED'),
      allowNull: false,
      defaultValue: 'PENDING'
    },
    errorMessage: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'error_message'
    },
    emailContent: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'email_content'
    },
    smtpResponse: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'smtp_response'
    },
    messageId: {
      type: DataTypes.STRING(500),
      allowNull: true,
      field: 'message_id'
    },
    attendanceDate: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      field: 'attendance_date'
    },
    hallwayTimeIn: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'hallway_time_in'
    },
    hallwayTimeOut: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'hallway_time_out'
    },
    sentAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'sent_at'
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
    modelName: 'EmailLog',
    tableName: 'email_logs',
    underscored: true
  });

  return EmailLog;
};
