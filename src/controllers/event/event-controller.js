'use strict';
const eventUseCases = require('../../use-cases/event/event-use-cases');

const eventController = {
  getAllEvents: async (req, res) => {
    try {
      const events = await eventUseCases.getAllEvents(req.query);
      res.status(200).json(events);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  },

  getActiveNow: async (req, res) => {
    try {
      const events = await eventUseCases.getActiveNow();
      res.status(200).json(events);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  getEventById: async (req, res) => {
    try {
      const event = await eventUseCases.getEventById(req.params.id);
      res.status(200).json(event);
    } catch (error) {
      const status = error.message === 'Event not found' ? 404 : 400;
      res.status(status).json({ error: error.message });
    }
  },

  createEvent: async (req, res) => {
    try {
      const created = await eventUseCases.createEvent(req.body, req.user?.id);
      res.status(201).json(created);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  },

  updateEvent: async (req, res) => {
    try {
      const updated = await eventUseCases.updateEvent(req.params.id, req.body, req.user?.id);
      res.status(200).json(updated);
    } catch (error) {
      const status = error.message === 'Event not found' ? 404 : 400;
      res.status(status).json({ error: error.message });
    }
  }
};

module.exports = eventController;
