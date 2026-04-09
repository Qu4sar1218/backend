const test = require('node:test');
const assert = require('node:assert/strict');

const { sendEventScanEmail } = require('../src/use-cases/email/email-use-cases');
const models = require('../src/sequelize/models');
const emailService = require('../src/services/email.service');

const STUDENT_ID = '11111111-1111-4111-8111-111111111111';
const RAW_TIMELOG_ID = '22222222-2222-4222-8222-222222222222';
const EVENT_ID = '33333333-3333-4333-8333-333333333333';

function setupStubs({ guardianEmail = 'guardian@example.com', sendMailError = null }) {
  const originals = {
    StudentFindByPk: models.Student.findByPk,
    EventFindByPk: models.Event.findByPk,
    EmailLogCreate: models.EmailLog.create,
    SendMail: emailService.sendMail
  };

  const calls = {
    emailLogs: []
  };

  models.Student.findByPk = async () => ({
    id: STUDENT_ID,
    firstName: 'Test',
    middleName: null,
    lastName: 'Student',
    guardianEmail
  });
  models.Event.findByPk = async () => ({
    id: EVENT_ID,
    name: 'Science Fair'
  });
  models.EmailLog.create = async (payload) => {
    calls.emailLogs.push(payload);
    return { id: 'log-1', ...payload };
  };
  emailService.sendMail = async () => {
    if (sendMailError) throw sendMailError;
    return { messageId: 'message-1', response: '250 OK' };
  };

  return {
    calls,
    restore: () => {
      models.Student.findByPk = originals.StudentFindByPk;
      models.Event.findByPk = originals.EventFindByPk;
      models.EmailLog.create = originals.EmailLogCreate;
      emailService.sendMail = originals.SendMail;
    }
  };
}

test('sendEventScanEmail logs FAILED when guardian email missing', async () => {
  const { calls, restore } = setupStubs({ guardianEmail: '' });
  const result = await sendEventScanEmail({
    studentId: STUDENT_ID,
    rawTimelogId: RAW_TIMELOG_ID,
    eventId: EVENT_ID,
    logDatetime: new Date(),
    logType: 'TIME_IN'
  });

  assert.equal(result.skipped, true);
  assert.equal(result.reason, 'no_guardian_email');
  assert.equal(calls.emailLogs.length, 1);
  assert.equal(calls.emailLogs[0].status, 'FAILED');
  assert.equal(calls.emailLogs[0].emailType, 'EVENT_SCAN_TIME_IN');
  restore();
});

test('sendEventScanEmail logs FAILED and throws when SMTP send fails', async () => {
  const { calls, restore } = setupStubs({
    guardianEmail: 'guardian@example.com',
    sendMailError: new Error('smtp failure')
  });

  await assert.rejects(
    () =>
      sendEventScanEmail({
        studentId: STUDENT_ID,
        rawTimelogId: RAW_TIMELOG_ID,
        eventId: EVENT_ID,
        logDatetime: new Date(),
        logType: 'TIME_OUT'
      }),
    /smtp failure/
  );
  assert.equal(calls.emailLogs.length, 1);
  assert.equal(calls.emailLogs[0].status, 'FAILED');
  assert.equal(calls.emailLogs[0].emailType, 'EVENT_SCAN_TIME_OUT');
  restore();
});
