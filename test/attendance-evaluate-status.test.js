const test = require('node:test');
const assert = require('node:assert/strict');

const { evaluateStatus } = require('../src/data-access/attendance/attendance-data-access');

const policy = {
  onTimeGraceMinutes: 10,
  lateUntilMinutes: 30,
  absentAfterLateWindow: true
};

/** Wall-clock times in Asia/Manila (SCHOOL_TIMEZONE default). */
const T = {
  early755: new Date('2026-06-15T07:55:00+08:00'),
  grace810: new Date('2026-06-15T08:10:00+08:00'),
  late815: new Date('2026-06-15T08:15:00+08:00'),
  absent900: new Date('2026-06-15T09:00:00+08:00')
};

test('early arrival before start is PRESENT', () => {
  const status = evaluateStatus({ logDatetime: T.early755, startTime: '08:00', policy });
  assert.equal(status, 'PRESENT');
});

test('at grace cutoff after start is PRESENT', () => {
  const status = evaluateStatus({ logDatetime: T.grace810, startTime: '08:00', policy });
  assert.equal(status, 'PRESENT');
});

test('after grace before late cutoff is LATE', () => {
  const status = evaluateStatus({ logDatetime: T.late815, startTime: '08:00', policy });
  assert.equal(status, 'LATE');
});

test('after late cutoff is ABSENT when policy says so', () => {
  const status = evaluateStatus({ logDatetime: T.absent900, startTime: '08:00', policy });
  assert.equal(status, 'ABSENT');
});
