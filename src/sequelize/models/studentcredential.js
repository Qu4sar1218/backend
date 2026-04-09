'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class StudentCredential extends Model {
    static associate(models) {
      this.belongsTo(models.Student, {
        foreignKey: 'student_id',
        as: 'student'
      });
    }
  }

  StudentCredential.init({
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
    credentialType: {
      type: DataTypes.ENUM('FINGERPRINT', 'FACE', 'RFID', 'QR_CODE', 'PIN', 'CARD'),
      allowNull: false,
      field: 'credential_type'
    },
    credentialData: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'credential_data'
    },
    credentialReference: {
      type: DataTypes.STRING(100),
      allowNull: true,
      field: 'credential_reference'
    },
    isPrimary: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: 'is_primary'
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      field: 'is_active'
    },
    enrolledDate: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      field: 'enrolled_date'
    },
    expiryDate: {
      type: DataTypes.DATEONLY,
      allowNull: true,
      field: 'expiry_date'
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
    modelName: 'StudentCredential',
    tableName: 'student_credentials',
    underscored: true
  });

  return StudentCredential;
};
