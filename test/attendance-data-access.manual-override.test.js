const test = require('node:test');
const assert = require('node:assert/strict');

const attendanceDataAccess = require('../src/data-access/attendance/attendance-data-access');
const models = require('../src/sequelize/models');
const rawTimelogDataAccess = require('../src/data-access/raw-timelog/raw-timelog-data-access');

function setupStubs() {
  const originals = {
    SectionSubjectTeacherFindOne: models.SectionSubjectTeacher.findOne,
    StudentEnrollmentFindOne: models.StudentEnrollment.findOne,
    AttendanceFindOne: models.Attendance.findOne,
    AttendanceCreate: models.Attendance.create,
    RawTimelogDestroy: models.RawTimelog.destroy,
    replaceManualAttendanceTimelogs: rawTimelogDataAccess.replaceManualAttendanceTimelogs
  };

  const assignment = {
    id: 'assign-1',
    sectionId: 'section-1',
    subjectId: 'subject-1',
    teacherId: 'teacher-1',
    startTime: '08:00:00',
    endTime: '09:00:00'
  };

  models.SectionSubjectTeacher.findOne = async () => assignment;
  models.StudentEnrollment.findOne = async () => ({ id: 'enroll-1' });

  const updates = [];
  const replacedManualRawTimelogs = [];
  rawTimelogDataAccess.replaceManualAttendanceTimelogs = async (payload) => {
    replacedManualRawTimelogs.push(payload);
    return ['raw-manual-in', 'raw-manual-out'];
  };

  return {
    updates,
    replacedManualRawTimelogs,
    restore() {
      models.SectionSubjectTeacher.findOne = originals.SectionSubjectTeacherFindOne;
      models.StudentEnrollment.findOne = originals.StudentEnrollmentFindOne;
      models.Attendance.findOne = originals.AttendanceFindOne;
      models.Attendance.create = originals.AttendanceCreate;
      models.RawTimelog.destroy = originals.RawTimelogDestroy;
      rawTimelogDataAccess.replaceManualAttendanceTimelogs = originals.replaceManualAttendanceTimelogs;
    }
  };
}

test('manual override creates schedule-based PRESENT attendance and canonical manual raw timelogs', async () => {
  const { restore, replacedManualRawTimelogs } = setupStubs();
  models.Attendance.findOne = async () => null;
  const created = {
    id: 'att-1',
    update: async () => null
  };
  models.Attendance.create = async (payload) => Object.assign(created, payload);

  const attendance = await attendanceDataAccess.upsertManualPresentByAssignment({
    studentId: 'student-1',
    assignmentId: 'assign-1',
    attendanceDate: '2026-03-23',
    actorUserId: 'teacher-1',
    actorRoleName: 'Teacher',
    transaction: null
  });

  assert.equal(attendance.status, 'PRESENT');
  assert.equal(attendance.source, 'MANUAL');
  assert.equal(attendance.timeIn.toISOString(), '2026-03-23T00:00:00.000Z');
  assert.equal(attendance.timeOut.toISOString(), '2026-03-23T01:00:00.000Z');
  assert.equal(replacedManualRawTimelogs.length, 1);
  assert.equal(replacedManualRawTimelogs[0].attendanceId, 'att-1');
  assert.equal(replacedManualRawTimelogs[0].studentId, 'student-1');
  assert.ok(replacedManualRawTimelogs[0].deviceId);
  assert.equal(replacedManualRawTimelogs[0].timeIn.toISOString(), '2026-03-23T00:00:00.000Z');
  assert.equal(replacedManualRawTimelogs[0].timeOut.toISOString(), '2026-03-23T01:00:00.000Z');
  restore();
});

test('manual override updates existing attendance idempotently and replaces manual raw timelogs', async () => {
  const { restore, updates, replacedManualRawTimelogs } = setupStubs();
  const existing = {
    id: 'att-existing',
    update: async (payload) => {
      updates.push(payload);
      return null;
    }
  };
  models.Attendance.findOne = async () => existing;
  models.Attendance.create = async () => {
    throw new Error('create should not be called');
  };

  const attendance = await attendanceDataAccess.upsertManualPresentByAssignment({
    studentId: 'student-1',
    assignmentId: 'assign-1',
    attendanceDate: '2026-03-23',
    actorUserId: 'teacher-1',
    actorRoleName: 'Teacher',
    transaction: null
  });

  assert.equal(attendance.id, 'att-existing');
  assert.equal(updates.length, 2);
  assert.equal(updates[0].source, 'MANUAL');
  assert.equal(updates[0].status, 'PRESENT');
  assert.deepEqual(updates[1].derivedFromRawTimelogIds, ['raw-manual-in', 'raw-manual-out']);
  assert.equal(replacedManualRawTimelogs.length, 1);
  assert.equal(replacedManualRawTimelogs[0].attendanceId, 'att-existing');
  assert.equal(replacedManualRawTimelogs[0].studentId, 'student-1');
  assert.ok(replacedManualRawTimelogs[0].deviceId);
  restore();
});

test('manual override rejects teacher outside assignment ownership', async () => {
  const { restore } = setupStubs();
  models.Attendance.findOne = async () => null;
  models.Attendance.create = async () => {
    throw new Error('create should not be called');
  };

  await assert.rejects(
    () =>
      attendanceDataAccess.upsertManualPresentByAssignment({
        studentId: 'student-1',
        assignmentId: 'assign-1',
        attendanceDate: '2026-03-23',
        actorUserId: 'teacher-2',
        actorRoleName: 'Teacher',
        transaction: null
      }),
    /not allowed to override attendance/
  );
  restore();
});

test('manual absent override deletes attendance and matched raw timelogs', async () => {
  const { restore } = setupStubs();
  let deletedRaw = 0;
  models.RawTimelog.destroy = async () => {
    deletedRaw = 3;
    return deletedRaw;
  };
  models.Attendance.findOne = async () => ({
    id: 'att-1',
    destroy: async () => null
  });

  const result = await attendanceDataAccess.deleteManualAttendanceByAssignment({
    studentId: 'student-1',
    assignmentId: 'assign-1',
    attendanceDate: '2026-03-23',
    actorUserId: 'teacher-1',
    actorRoleName: 'Teacher',
    transaction: null
  });

  assert.equal(result.deletedAttendance, 1);
  assert.equal(result.deletedRawTimelogs, 3);
  restore();
});

test('manual absent override is idempotent when attendance is missing', async () => {
  const { restore } = setupStubs();
  let destroyCalls = 0;
  models.RawTimelog.destroy = async () => {
    destroyCalls += 1;
    return 0;
  };
  models.Attendance.findOne = async () => null;

  const result = await attendanceDataAccess.deleteManualAttendanceByAssignment({
    studentId: 'student-1',
    assignmentId: 'assign-1',
    attendanceDate: '2026-03-23',
    actorUserId: 'teacher-1',
    actorRoleName: 'Teacher',
    transaction: null
  });

  assert.equal(result.deletedAttendance, 0);
  assert.equal(result.deletedRawTimelogs, 0);
  assert.equal(destroyCalls, 0);
  restore();
});
