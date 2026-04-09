'use strict';
const { Event } = require('../../sequelize/models');
const { Op } = require('sequelize');

const toEventResponse = (event) => {
  const raw = event.toJSON ? event.toJSON() : { ...event };
  return raw;
};

const eventDataAccess = {
  getAll: async ({ start_date, end_date, status } = {}) => {
    const where = {};

    if (status !== undefined) where.status = status === 'true' || status === true;

    if (start_date || end_date) {
      where.startDate = {};
      if (start_date) where.startDate[Op.gte] = start_date;
      if (end_date) where.startDate[Op.lte] = end_date;
    }

    const rows = await Event.findAll({
      where,
      order: [['startDate', 'ASC'], ['timeStart', 'ASC']]
    });
    return rows.map(toEventResponse);
  },

  getActiveNow: async () => {
    const today = new Date().toISOString().slice(0, 10);
    const rows = await Event.findAll({
      where: {
        status: true,
        startDate: { [Op.lte]: today },
        endDate: { [Op.gte]: today }
      },
      order: [['startDate', 'ASC'], ['timeStart', 'ASC']]
    });
    return rows.map(toEventResponse);
  },

  getById: async (id) => {
    const row = await Event.findByPk(id);
    if (!row) return null;
    return toEventResponse(row);
  },

  create: async (data) => {
    const created = await Event.create({
      name: data.name,
      description: data.description || null,
      eventDate: data.eventDate,
      startDate: data.startDate,
      endDate: data.endDate,
      timeStart: data.timeStart,
      timeEnd: data.timeEnd,
      status: data.status !== undefined ? data.status : true,
      modifiedBy: data.modifiedBy || null
    });
    return toEventResponse(created);
  },

  update: async (id, data) => {
    const row = await Event.findByPk(id);
    if (!row) return null;
    await row.update({
      name: data.name !== undefined ? data.name : row.name,
      description: data.description !== undefined ? data.description : row.description,
      eventDate: data.eventDate !== undefined ? data.eventDate : row.eventDate,
      startDate: data.startDate !== undefined ? data.startDate : row.startDate,
      endDate: data.endDate !== undefined ? data.endDate : row.endDate,
      timeStart: data.timeStart !== undefined ? data.timeStart : row.timeStart,
      timeEnd: data.timeEnd !== undefined ? data.timeEnd : row.timeEnd,
      status: data.status !== undefined ? (data.status === true || data.status === 'true') : row.status,
      modifiedBy: data.modifiedBy || null
    });
    return toEventResponse(row);
  }
};

module.exports = eventDataAccess;
