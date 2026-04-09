const test = require('node:test');
const assert = require('node:assert/strict');

const scannerUseCases = require('../src/use-cases/scanner/scanner-use-cases');
const rawTimelogDataAccess = require('../src/data-access/raw-timelog/raw-timelog-data-access');
const attendanceDataAccess = require('../src/data-access/attendance/attendance-data-access');
const models = require('../src/sequelize/models');

function setupHallwayStubs({ lastRawTimelog }) {
  const originals = {
    TimelogDeviceFindOne: models.TimelogDevice.findOne,
    StudentFindByPk: models.Student.findByPk,
    StudentEnrollmentFindOne: models.StudentEnrollment.findOne,
    RawTimelogFindOne: models.RawTimelog.findOne,
    Tx: models.sequelize.transaction,
    CreateTimelog: rawTimelogDataAccess.create,
    EnsurePolicy: attendanceDataAccess.ensureDefaultPolicyForSchool
  };

  let createPayload = null;

  models.TimelogDevice.findOne = async () => ({
    id: 'device-hallway',
    code: 'HALLWAY-FACE-01',
    name: 'Hallway',
    status: 'Active'
  });
  models.Student.findByPk = async () => ({ id: 'student-1', active: true, status: 'enrolled' });
  models.StudentEnrollment.findOne = async () => ({ id: 'enroll-1' });
  models.RawTimelog.findOne = async () => lastRawTimelog;
  models.sequelize.transaction = async () => ({
    commit: async () => {},
    rollback: async () => {}
  });
  rawTimelogDataAccess.create = async (payload) => {
    createPayload = payload;
    return { id: 'raw-1', log_type: payload.logType };
  };
  attendanceDataAccess.ensureDefaultPolicyForSchool = async () => ({ id: 'policy-1' });

  return {
    restore: () => {
      models.TimelogDevice.findOne = originals.TimelogDeviceFindOne;
      models.Student.findByPk = originals.StudentFindByPk;
      models.StudentEnrollment.findOne = originals.StudentEnrollmentFindOne;
      models.RawTimelog.findOne = originals.RawTimelogFindOne;
      models.sequelize.transaction = originals.Tx;
      rawTimelogDataAccess.create = originals.CreateTimelog;
      attendanceDataAccess.ensureDefaultPolicyForSchool = originals.EnsurePolicy;
    },
    getCreatePayload: () => createPayload
  };
}

test('hallway: no prior raw timelog yields TIME_IN', async () => {
  const { restore, getCreatePayload } = setupHallwayStubs({ lastRawTimelog: null });
  await scannerUseCases.recordAttendance({
    terminalType: 'hallway',
    studentId: 'student-1',
    studentNumber: '2023-0001',
    logDatetime: '2026-01-02T12:00:00.000Z',
    verificationMethod: 'FACE',
    verificationScore: 0.95,
    actorRoleName: 'Admin'
  });
  assert.equal(getCreatePayload().logType, 'TIME_IN');
  restore();
});

test('hallway: last TIME_IN on previous school-local day yields TIME_IN (daily reset)', async () => {
  const { restore, getCreatePayload } = setupHallwayStubs({
    lastRawTimelog: {
      logType: 'TIME_IN',
      logDatetime: new Date('2026-01-01T20:00:00+08:00')
    }
  });
  await scannerUseCases.recordAttendance({
    terminalType: 'hallway',
    studentId: 'student-1',
    studentNumber: '2023-0001',
    logDatetime: '2026-01-02T10:00:00+08:00',
    verificationMethod: 'FACE',
    verificationScore: 0.95,
    actorRoleName: 'Admin'
  });
  assert.equal(getCreatePayload().logType, 'TIME_IN');
  restore();
});

test('hallway: last TIME_IN same school-local day yields TIME_OUT', async () => {
  const { restore, getCreatePayload } = setupHallwayStubs({
    lastRawTimelog: {
      logType: 'TIME_IN',
      logDatetime: new Date('2026-01-02T10:00:00+08:00')
    }
  });
  await scannerUseCases.recordAttendance({
    terminalType: 'hallway',
    studentId: 'student-1',
    studentNumber: '2023-0001',
    logDatetime: '2026-01-02T20:00:00+08:00',
    verificationMethod: 'FACE',
    verificationScore: 0.95,
    actorRoleName: 'Admin'
  });
  assert.equal(getCreatePayload().logType, 'TIME_OUT');
  restore();
});

test('hallway: last TIME_OUT same school-local day yields TIME_IN', async () => {
  const { restore, getCreatePayload } = setupHallwayStubs({
    lastRawTimelog: {
      logType: 'TIME_OUT',
      logDatetime: new Date('2026-01-02T20:00:00+08:00')
    }
  });
  await scannerUseCases.recordAttendance({
    terminalType: 'hallway',
    studentId: 'student-1',
    studentNumber: '2023-0001',
    logDatetime: '2026-01-02T22:00:00+08:00',
    verificationMethod: 'FACE',
    verificationScore: 0.95,
    actorRoleName: 'Admin'
  });
  assert.equal(getCreatePayload().logType, 'TIME_IN');
  restore();
});

test('hallway manual OUT: rejects when no prior check-in exists', async () => {
  const { restore } = setupHallwayStubs({ lastRawTimelog: null });
  await assert.rejects(
    () =>
      scannerUseCases.recordAttendance({
        terminalType: 'hallway',
        studentId: 'student-1',
        studentNumber: '2023-0001',
        logDatetime: '2026-01-02T12:00:00.000Z',
        logType: 'TIME_OUT',
        verificationMethod: 'FACE',
        verificationScore: 0.95,
        actorRoleName: 'Admin'
      }),
    /No prior check-in found/
  );
  restore();
});

test('hallway manual IN: rejects when student is already checked in', async () => {
  const { restore } = setupHallwayStubs({
    lastRawTimelog: {
      logType: 'TIME_IN',
      logDatetime: new Date('2026-01-02T10:00:00+08:00')
    }
  });
  await assert.rejects(
    () =>
      scannerUseCases.recordAttendance({
        terminalType: 'hallway',
        studentId: 'student-1',
        studentNumber: '2023-0001',
        logDatetime: '2026-01-02T12:00:00+08:00',
        logType: 'TIME_IN',
        verificationMethod: 'FACE',
        verificationScore: 0.95,
        actorRoleName: 'Admin'
      }),
    /already checked in/
  );
  restore();
});

test('hallway manual OUT: allows when student is currently checked in', async () => {
  const { restore, getCreatePayload } = setupHallwayStubs({
    lastRawTimelog: {
      logType: 'TIME_IN',
      logDatetime: new Date('2026-01-02T10:00:00+08:00')
    }
  });
  await scannerUseCases.recordAttendance({
    terminalType: 'hallway',
    studentId: 'student-1',
    studentNumber: '2023-0001',
    logDatetime: '2026-01-02T12:00:00+08:00',
    logType: 'TIME_OUT',
    verificationMethod: 'FACE',
    verificationScore: 0.95,
    actorRoleName: 'Admin'
  });
  assert.equal(getCreatePayload().logType, 'TIME_OUT');
  restore();
});
