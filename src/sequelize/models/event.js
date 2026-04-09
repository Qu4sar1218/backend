'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Event extends Model {
    static associate(models) {
      Event.hasMany(models.Payment, {
        as: 'payments',
        foreignKey: 'event_id'
      });
    }
  }

  Event.init({
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },

    name: {
      type: DataTypes.STRING,
      allowNull: false,
      field: 'name'
    },
    description: {
      type: DataTypes.STRING,
      allowNull: true,
      field: 'description'
    },

    eventDate: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      field: 'event_date'
    },
    startDate: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      field: 'start_date'
    },
    endDate: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      field: 'end_date'
    },

    timeStart: {
      type: DataTypes.TIME,
      allowNull: false,
      field: 'time_start'
    },
    timeEnd: {
      type: DataTypes.TIME,
      allowNull: false,
      field: 'time_end'
    },

    status: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
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
    modelName: 'Event',
    tableName: 'events',
    underscored: true
  });

  return Event;
};

