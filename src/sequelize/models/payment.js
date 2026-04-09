'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Payment extends Model {
    static associate(models) {
      Payment.belongsTo(models.Student, {
        as: 'student',
        foreignKey: 'student_id'
      });
      Payment.belongsTo(models.Event, {
        as: 'event',
        foreignKey: 'event_id'
      });
    }
  }

  Payment.init({
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    studentId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'student_id',
      references: {
        model: 'students',
        key: 'id'
      }
    },
    eventId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'event_id',
      references: {
        model: 'events',
        key: 'id'
      }
    },
    amount: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false
    },
    purpose: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    imageUrl: {
      type: DataTypes.STRING(500),
      allowNull: false,
      field: 'image_url'
    },
    status: {
      type: DataTypes.ENUM('pending', 'rejected', 'verified'),
      allowNull: false,
      defaultValue: 'pending'
    },
    remarks: {
      type: DataTypes.TEXT,
      allowNull: true
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
    modelName: 'Payment',
    tableName: 'payments',
    underscored: true
  });

  return Payment;
};
