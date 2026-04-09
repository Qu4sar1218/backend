'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class DeviceType extends Model {
    static associate(models) {
      this.hasMany(models.TimelogDevice, {
        foreignKey: 'device_type_id',
        as: 'timelog_devices'
      });
    }
  }

  DeviceType.init({
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    code: {
      type: DataTypes.STRING(20),
      unique: true,
      allowNull: false
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    description: DataTypes.TEXT,
    manufacturer: DataTypes.STRING(100),
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      field: 'is_active'
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
    modelName: 'DeviceType',
    tableName: 'device_types',
    underscored: true
  });

  return DeviceType;
};
