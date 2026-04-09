const timelogDeviceUseCases = require('../../use-cases/timelog-device/timelog-device-use-cases');

const timelogDeviceController = {
  getDevices: async (req, res) => {
    try {
      const devices = await timelogDeviceUseCases.getDevices();
      res.status(200).json(devices);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  getDeviceById: async (req, res) => {
    try {
      const device = await timelogDeviceUseCases.getDeviceById(req.params.id);
      res.status(200).json(device);
    } catch (error) {
      const status = error.message === 'Timelog device not found' ? 404 : 500;
      res.status(status).json({ error: error.message });
    }
  },

  getDeviceByCode: async (req, res) => {
    try {
      const device = await timelogDeviceUseCases.getByCode(req.params.code);
      res.status(200).json(device);
    } catch (error) {
      const status = error.message === 'Timelog device not found' ? 404 : 500;
      res.status(status).json({ error: error.message });
    }
  },

  updateDevice: async (req, res) => {
    try {
      const device = await timelogDeviceUseCases.updateDevice(req.params.id, req.body, req.user?.id);
      res.status(200).json(device);
    } catch (error) {
      if (error.message === 'Timelog device not found') {
        return res.status(404).json({ error: error.message });
      }
      if (error.message.startsWith('Invalid ') || error.message.endsWith('is required') || error.message.includes('cannot both be true') || error.message.includes('not found') || error.message.includes('already exists')) {
        return res.status(400).json({ error: error.message });
      }
      return res.status(500).json({ error: error.message });
    }
  }
};

module.exports = timelogDeviceController;
