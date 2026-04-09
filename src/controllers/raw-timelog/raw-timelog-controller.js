const rawTimelogUseCases = require('../../use-cases/raw-timelog/raw-timelog-use-cases');

const rawTimelogController = {
  createRawTimelog: async (req, res) => {
    try {
      const created = await rawTimelogUseCases.createRawTimelog({
        deviceId: req.body.device_id || null,
        sourceType: req.body.source_type || 'WEB_PORTAL',
        studentId: req.body.student_id || null,
        eventId: req.body.event_id || null,
        studentNumber: req.body.student_number || null,
        logDatetime: req.body.log_datetime,
        logType: req.body.log_type,
        verificationMethod: req.body.verification_method,
        verificationScore: req.body.verification_score || null,
        locationName: req.body.location_name || null,
        latitude: req.body.latitude || null,
        longitude: req.body.longitude || null
      });

      res.status(201).json(created);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  },

  getRawTimelogs: async (req, res) => {
    try {
      const isTeacher = String(req.user?.role?.name || '').toLowerCase() === 'teacher';
      const filters = { ...req.query };
      const requestedClassScoped = filters.classroom_scope === 'teacher' || filters.classroom_scope === '1';
      if (isTeacher && requestedClassScoped) {
        filters.teacher_id = req.user?.id || null;
      }
      delete filters.classroom_scope;

      const rows = await rawTimelogUseCases.getRawTimelogs(filters);
      res.status(200).json(rows);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
};

module.exports = rawTimelogController;
