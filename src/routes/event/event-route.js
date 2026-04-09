'use strict';
const express = require('express');
const eventController = require('../../controllers/event/event-controller');
const { authenticateToken, authorizeRole } = require('../../middleware/auth');

const router = express.Router();

router.use(authenticateToken);

router.get('/', eventController.getAllEvents);
router.get('/active-now', eventController.getActiveNow);
router.get('/:id', eventController.getEventById);
router.post('/', authorizeRole(['Admin']), eventController.createEvent);
router.put('/:id', authorizeRole(['Admin']), eventController.updateEvent);

module.exports = router;
