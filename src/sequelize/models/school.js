'use strict';
const { Model } = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class School extends Model {
    static associate(models) {
      this.hasMany(models.User, {
        foreignKey: 'school_id',
        as: 'users'
      });
      this.hasMany(models.TimelogDevice, {
        foreignKey: 'school_id',
        as: 'timelog_devices'
      });
      this.hasMany(models.AttendancePolicy, {
        foreignKey: 'school_id',
        as: 'attendance_policies'
      });
    }
  }
  School.init({
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    name: DataTypes.STRING,
    address: DataTypes.STRING,
    contactNo1: {
      type: DataTypes.STRING,
      field: 'contact_no1'
    },
    contactNo2: {
      type: DataTypes.STRING,
      field: 'contact_no2'
    },
    email: DataTypes.STRING,
    registrationNo: {
      type: DataTypes.STRING,
      field: 'registration_no'
    },
    taxDetails: {
      type: DataTypes.STRING,
      field: 'tax_details'
    },
    imageUrl: {
      type: DataTypes.STRING,
      field: 'image_url'
    },
    createdAt: {
      type: DataTypes.DATE,
      field: 'created_at'
    },
    updatedAt: {
      type: DataTypes.DATE,
      field: 'updated_at'
    },
    modifiedBy: {
      type: DataTypes.UUID,
      field: 'modified_by'
    },
    schoolCode: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      field: 'school_code'
    },
    status: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    },
  }, {
    sequelize,
    modelName: 'School',
    tableName: 'schools',
    underscored: true
  });
  return School;
};
