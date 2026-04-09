'use strict';
const eventDataAccess = require('../../data-access/event/event-data-access');

const REQUIRED_FIELDS = ['name', 'eventDate', 'startDate', 'endDate', 'timeStart', 'timeEnd'];

const eventUseCases = {
  getAllEvents: async (filters) => {
    return eventDataAccess.getAll(filters);
  },

  getActiveNow: async () => {
    return eventDataAccess.getActiveNow();
  },

  getEventById: async (id) => {
    const event = await eventDataAccess.getById(id);
    if (!event) throw new Error('Event not found');
    return event;
  },

  createEvent: async (data, modifiedBy) => {
    for (const field of REQUIRED_FIELDS) {
      if (!data[field]) throw new Error(`${field} is required`);
    }
    return eventDataAccess.create({ ...data, modifiedBy });
  },

  updateEvent: async (id, data, modifiedBy) => {
    const updated = await eventDataAccess.update(id, { ...data, modifiedBy });
    if (!updated) throw new Error('Event not found');
    return updated;
  }
};

module.exports = eventUseCases;
