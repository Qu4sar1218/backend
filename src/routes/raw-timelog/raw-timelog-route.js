const express = require('express');
const rawTimelogController = require('../../controllers/raw-timelog/raw-timelog-controller');
const { authenticateToken } = require('../../middleware/auth');

const router = express.Router();

router.use(authenticateToken);

router.post('/', rawTimelogController.createRawTimelog);
router.get('/', rawTimelogController.getRawTimelogs);

module.exports = router;
