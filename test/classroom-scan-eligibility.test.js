const test = require('node:test');
const assert = require('node:assert/strict');

const attendanceDataAccess = require('../src/data-access/attendance/attendance-data-access');

const basePolicy = {
  onTimeGraceMinutes: 10,
  lateUntilMinutes: 30,
  absentAfterLateWindow: true,
  earlyArrivalAllowanceMinutes: 0,
  lateCheckoutGraceMinutes: 20
};

/** Instants interpreted with Asia/Manila as local wall clock for 2026-06-15. */
const atStart0900 = new Date('2026-06-15T09:00:00+08:00');
const before0820 = new Date('2026-06-15T08:20:00+08:00');
const allowance0850 = new Date('2026-06-15T08:50:00+08:00');
const at0930 = new Date('2026-06-15T09:30:00+08:00');

test('assertClassroomScanEligible allows TIME_IN at start', () => {
  const assignment = { startTime: '09:00:00', endTime: '10:00:00' };
  assert.doesNotThrow(() =>
    attendanceDataAccess.assertClassroomScanEligible({
      assignment,
      logDatetime: atStart0900,
      logType: 'TIME_IN',
      existingAttendance: null,
      effectivePolicy: basePolicy
    })
  );
});

test('assertClassroomScanEligible rejects TIME_IN before window', () => {
  const assignment = { startTime: '09:00:00', endTime: '10:00:00' };
  assert.throws(
    () =>
      attendanceDataAccess.assertClassroomScanEligible({
        assignment,
        logDatetime: before0820,
        logType: 'TIME_IN',
        existingAttendance: null,
        effectivePolicy: basePolicy
      }),
    /before the allowed window/
  );
});

test('assertClassroomScanEligible allows TIME_IN in early allowance', () => {
  const assignment = { startTime: '09:00:00', endTime: '10:00:00' };
  assert.doesNotThrow(() =>
    attendanceDataAccess.assertClassroomScanEligible({
      assignment,
      logDatetime: allowance0850,
      logType: 'TIME_IN',
      existingAttendance: null,
      effectivePolicy: { ...basePolicy, earlyArrivalAllowanceMinutes: 15 }
    })
  );
});

test('assertClassroomScanEligible rejects TIME_OUT without timeIn', () => {
  const assignment = { startTime: '09:00:00', endTime: '10:00:00' };
  assert.throws(
    () =>
      attendanceDataAccess.assertClassroomScanEligible({
        assignment,
        logDatetime: at0930,
        logType: 'TIME_OUT',
        existingAttendance: null,
        effectivePolicy: basePolicy
      }),
    /Check in before/
  );
});

const classEnds0930 = new Date('2026-06-15T09:30:00+08:00');
const checkout0945 = new Date('2026-06-15T09:45:00+08:00');
const checkout0951 = new Date('2026-06-15T09:51:00+08:00');

test('assertClassroomScanEligible allows TIME_OUT within late checkout grace after end', () => {
  const assignment = { startTime: '08:30:00', endTime: '09:30:00' };
  assert.doesNotThrow(() =>
    attendanceDataAccess.assertClassroomScanEligible({
      assignment,
      logDatetime: checkout0945,
      logType: 'TIME_OUT',
      existingAttendance: { timeIn: classEnds0930, timeOut: null },
      effectivePolicy: basePolicy
    })
  );
});

test('assertClassroomScanEligible rejects TIME_OUT after late checkout grace', () => {
  const assignment = { startTime: '08:30:00', endTime: '09:30:00' };
  assert.throws(
    () =>
      attendanceDataAccess.assertClassroomScanEligible({
        assignment,
        logDatetime: checkout0951,
        logType: 'TIME_OUT',
        existingAttendance: { timeIn: classEnds0930, timeOut: null },
        effectivePolicy: basePolicy
      }),
    /Check-out is after the class end time/
  );
});

test('buildEffectivePolicy defaults lateCheckoutGraceMinutes', () => {
  const eff = attendanceDataAccess.buildEffectivePolicy(null);
  assert.equal(eff.lateCheckoutGraceMinutes, 20);
});

test('resolveClassroomLogType yields TIME_OUT when checked in but not out', () => {
  assert.equal(
    attendanceDataAccess.resolveClassroomLogType({ timeIn: new Date(), timeOut: null }),
    'TIME_OUT'
  );
});
