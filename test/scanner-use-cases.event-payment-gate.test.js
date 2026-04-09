const test = require('node:test');
const assert = require('node:assert/strict');

const scannerUseCases = require('../src/use-cases/scanner/scanner-use-cases');
const emailUseCases = require('../src/use-cases/email/email-use-cases');
const rawTimelogDataAccess = require('../src/data-access/raw-timelog/raw-timelog-data-access');
const models = require('../src/sequelize/models');

function setupHappyPathStubs({ hasVerifiedPayment, sendEventEmailImpl, lastRawTimelog = null }) {
  const originals = {
    TimelogDeviceFindOne: models.TimelogDevice.findOne,
    StudentFindByPk: models.Student.findByPk,
    StudentEnrollmentFindOne: models.StudentEnrollment.findOne,
    EventFindOne: models.Event.findOne,
    PaymentFindOne: models.Payment.findOne,
    RawTimelogFindOne: models.RawTimelog.findOne,
    CreateTimelog: rawTimelogDataAccess.create,
    SequelizeTransaction: models.sequelize.transaction,
    SendEventScanEmail: emailUseCases.sendEventScanEmail
  };

  const calls = {
    sendEventScanEmail: 0
  };

  models.TimelogDevice.findOne = async () => ({
    id: 'device-1',
    code: 'EVENT-FACE-01',
    name: 'Event Terminal',
    status: 'Active'
  });
  models.Student.findByPk = async () => ({ id: 'student-1', active: true, status: 'enrolled' });
  models.StudentEnrollment.findOne = async () => ({ id: 'enroll-1' });
  models.Event.findOne = async () => ({ id: 'event-1' });
  models.Payment.findOne = async () => (hasVerifiedPayment ? { id: 'payment-1' } : null);
  models.RawTimelog.findOne = async () => lastRawTimelog;
  rawTimelogDataAccess.create = async () => ({ id: 'timelog-1', log_type: 'TIME_IN' });
  models.sequelize.transaction = async () => ({
    commit: async () => {},
    rollback: async () => {}
  });
  emailUseCases.sendEventScanEmail = async (...args) => {
    calls.sendEventScanEmail += 1;
    if (typeof sendEventEmailImpl === 'function') {
      return sendEventEmailImpl(...args);
    }
    return { sent: true };
  };

  return {
    calls,
    restore: () => {
      models.TimelogDevice.findOne = originals.TimelogDeviceFindOne;
      models.Student.findByPk = originals.StudentFindByPk;
      models.StudentEnrollment.findOne = originals.StudentEnrollmentFindOne;
      models.Event.findOne = originals.EventFindOne;
      models.Payment.findOne = originals.PaymentFindOne;
      models.RawTimelog.findOne = originals.RawTimelogFindOne;
      rawTimelogDataAccess.create = originals.CreateTimelog;
      models.sequelize.transaction = originals.SequelizeTransaction;
      emailUseCases.sendEventScanEmail = originals.SendEventScanEmail;
    }
  };
}

test('event terminal rejects attendance without verified payment', async () => {
  const { calls, restore } = setupHappyPathStubs({ hasVerifiedPayment: false });
  await assert.rejects(
    () =>
      scannerUseCases.recordAttendance({
        terminalType: 'event',
        studentId: 'student-1',
        studentNumber: '2023-0001',
        logDatetime: new Date().toISOString(),
        verificationMethod: 'FACE',
        verificationScore: 0.99,
        eventId: 'event-1'
      }),
    (err) => err.message === 'Payment not verified for this event'
  );
  assert.equal(calls.sendEventScanEmail, 0);
  restore();
});

test('event terminal records attendance when verified payment exists', async () => {
  const { calls, restore } = setupHappyPathStubs({ hasVerifiedPayment: true });
  const result = await scannerUseCases.recordAttendance({
    terminalType: 'event',
    studentId: 'student-1',
    studentNumber: '2023-0001',
    logDatetime: new Date().toISOString(),
    verificationMethod: 'FACE',
    verificationScore: 0.99,
    eventId: 'event-1'
  });
  assert.equal(result.id, 'timelog-1');
  assert.equal(calls.sendEventScanEmail, 1);
  restore();
});

test('event terminal sends email for TIME_OUT scans too', async () => {
  const { calls, restore } = setupHappyPathStubs({
    hasVerifiedPayment: true,
    lastRawTimelog: {
      logType: 'TIME_IN',
      logDatetime: new Date()
    }
  });
  await scannerUseCases.recordAttendance({
    terminalType: 'event',
    studentId: 'student-1',
    studentNumber: '2023-0001',
    logDatetime: new Date().toISOString(),
    verificationMethod: 'FACE',
    verificationScore: 0.99,
    eventId: 'event-1'
  });
  assert.equal(calls.sendEventScanEmail, 1);
  restore();
});

test('event terminal does not fail scan when event email sending fails', async () => {
  const { calls, restore } = setupHappyPathStubs({
    hasVerifiedPayment: true,
    sendEventEmailImpl: async () => {
      throw new Error('smtp is down');
    }
  });
  const result = await scannerUseCases.recordAttendance({
    terminalType: 'event',
    studentId: 'student-1',
    studentNumber: '2023-0001',
    logDatetime: new Date().toISOString(),
    verificationMethod: 'FACE',
    verificationScore: 0.99,
    eventId: 'event-1'
  });
  assert.equal(result.id, 'timelog-1');
  assert.equal(calls.sendEventScanEmail, 1);
  restore();
});
