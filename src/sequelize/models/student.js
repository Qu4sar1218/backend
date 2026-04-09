'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Student extends Model {
    static associate(models) {
      Student.belongsTo(models.User, {
        as: 'user',
        foreignKey: 'user_id'
      });
      Student.hasMany(models.StudentCredential, {
        as: 'credentials',
        foreignKey: 'student_id'
      });
      Student.hasMany(models.RawTimelog, {
        as: 'raw_timelogs',
        foreignKey: 'student_id'
      });
      Student.hasMany(models.StudentEnrollment, {
        as: 'enrollments',
        foreignKey: 'student_id'
      });
      Student.hasMany(models.Payment, {
        as: 'payments',
        foreignKey: 'student_id'
      });
      Student.hasMany(models.Attendance, {
        as: 'attendances',
        foreignKey: 'student_id'
      });
      Student.hasMany(models.EmailLog, {
        as: 'emailLogs',
        foreignKey: 'student_id'
      });
    }
  }

  Student.init({
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },

    userId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id'
      },
      field: 'user_id'
    },

    firstName: {
      type: DataTypes.STRING,
      allowNull: false,
      field: 'first_name'
    },
    middleName: {
      type: DataTypes.STRING,
      allowNull: true,
      field: 'middle_name'
    },
    lastName: {
      type: DataTypes.STRING,
      allowNull: false,
      field: 'last_name'
    },

    birthday: {
      type: DataTypes.DATE,
      allowNull: true
    },
    address: {
      type: DataTypes.STRING,
      allowNull: true
    },
    contactNumber: {
      type: DataTypes.STRING,
      allowNull: false,
      field: 'contact_number'
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false
    },

    studentIdNumber: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      field: 'student_id_number'
    },

    yearLevel: {
      type: DataTypes.ENUM(
        'Year 1', 'Year 2', 'Year 3', 'Year 4', 'Year 5', 'Year 6',
        'Grade 11', 'Grade 12'
      ),
      allowNull: false,
      field: 'year_level'
    },

    guardianContactNumber: {
      type: DataTypes.STRING,
      allowNull: false,
      field: 'guardian_contact_number'
    },
    guardianEmail: {
      type: DataTypes.STRING,
      allowNull: false,
      field: 'guardian_email'
    },

    active: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    },

    registeredDate: {
      type: DataTypes.DATE,
      allowNull: false,
      field: 'registered_date',
      defaultValue: DataTypes.NOW
    },
    enrolledDate: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'enrolled_date'
    },

    status: {
      type: DataTypes.ENUM('pending', 'enrolled', 'dropped', 'graduated'),
      allowNull: false,
      defaultValue: 'pending'
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
    modelName: 'Student',
    tableName: 'students',
    underscored: true
  });

  return Student;
};

