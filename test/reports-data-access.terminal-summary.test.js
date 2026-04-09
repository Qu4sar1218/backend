const test = require('node:test');
const assert = require('node:assert/strict');
const { Op } = require('sequelize');

const reportsDataAccess = require('../src/data-access/reports/reports-data-access');
const models = require('../src/sequelize/models');

test('getTerminalInOutSummary sets exact studentId in where when studentId is provided', async () => {
  const originalFindAll = models.RawTimelog.findAll;
  let capturedWhere;
  models.RawTimelog.findAll = async (opts) => {
    capturedWhere = opts.where;
    return [];
  };

  try {
    const sid = '11111111-1111-4111-8111-111111111111';
    await reportsDataAccess.getTerminalInOutSummary({
      deviceId: 'dev-1',
      rangeStart: new Date('2026-01-15T00:00:00.000Z'),
      rangeEnd: new Date('2026-01-15T23:59:59.999Z'),
      groupBy: 'date',
      studentId: sid
    });
    assert.equal(capturedWhere.studentId, sid);
  } finally {
    models.RawTimelog.findAll = originalFindAll;
  }
});

test('getTerminalInOutSummary uses studentId ne null when studentId is omitted', async () => {
  const originalFindAll = models.RawTimelog.findAll;
  let capturedWhere;
  models.RawTimelog.findAll = async (opts) => {
    capturedWhere = opts.where;
    return [];
  };

  try {
    await reportsDataAccess.getTerminalInOutSummary({
      deviceId: 'dev-1',
      rangeStart: new Date('2026-01-15T00:00:00.000Z'),
      rangeEnd: new Date('2026-01-15T23:59:59.999Z'),
      groupBy: 'date'
    });
    assert.deepEqual(capturedWhere.studentId, { [Op.ne]: null });
  } finally {
    models.RawTimelog.findAll = originalFindAll;
  }
});
