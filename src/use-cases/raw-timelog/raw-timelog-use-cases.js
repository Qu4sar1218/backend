const rawTimelogDataAccess = require('../../data-access/raw-timelog/raw-timelog-data-access');

const rawTimelogUseCases = {
  createRawTimelog: async (payload) => {
    if (!payload.logDatetime) {
      throw new Error('log_datetime is required');
    }
    if (!payload.logType) {
      throw new Error('log_type is required');
    }
    if (!payload.verificationMethod) {
      throw new Error('verification_method is required');
    }

    return rawTimelogDataAccess.create(payload);
  },

  getRawTimelogs: async (filters) => rawTimelogDataAccess.getAll(filters)
};

module.exports = rawTimelogUseCases;
