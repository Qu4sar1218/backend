'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class TimelogDevice extends Model {
    static associate(models) {
      this.belongsTo(models.School, {
        foreignKey: 'school_id',
        as: 'school'
      });
      this.belongsTo(models.DeviceType, {
        foreignKey: 'device_type_id',
        as: 'device_type'
      });
      this.belongsTo(models.Department, {
        foreignKey: 'department_id',
        as: 'department'
      });
      this.hasMany(models.RawTimelog, {
        foreignKey: 'device_id',
        as: 'raw_timelogs'
      });
    }
  }

  TimelogDevice.init({
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
    deviceTypeId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'device_type_id'
    },
    code: {
      type: DataTypes.STRING(50),
      unique: true,
      allowNull: false
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    serialNumber: {
      type: DataTypes.STRING(100),
      unique: true,
      allowNull: true,
      field: 'serial_number'
    },
    macAddress: {
      type: DataTypes.STRING(17),
      field: 'mac_address'
    },
    ipAddress: {
      type: DataTypes.STRING(45),
      field: 'ip_address'
    },
    locationName: {
      type: DataTypes.STRING(100),
      field: 'location_name'
    },
    departmentId: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'department_id'
    },
    address: DataTypes.TEXT,
    latitude: DataTypes.DECIMAL(10, 8),
    longitude: DataTypes.DECIMAL(11, 8),
    timezone: {
      type: DataTypes.STRING(50),
      defaultValue: 'Asia/Manila'
    },
    isEntryOnly: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: 'is_entry_only'
    },
    isExitOnly: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: 'is_exit_only'
    },
    status: {
      type: DataTypes.ENUM('Active', 'Inactive', 'Maintenance', 'Offline'),
      defaultValue: 'Active'
    },
    lastSyncDate: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'last_sync_date'
    },
    lastOnlineDate: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'last_online_date'
    },
    settings: DataTypes.JSON,
    remarks: DataTypes.TEXT,
    installedDate: {
      type: DataTypes.DATEONLY,
      allowNull: true,
      field: 'installed_date'
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
    modelName: 'TimelogDevice',
    tableName: 'timelog_devices',
    underscored: true
  });

  return TimelogDevice;
};
