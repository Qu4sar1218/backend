const test = require('node:test');
const assert = require('node:assert/strict');

const attendanceDataAccess = require('../src/data-access/attendance/attendance-data-access');
const models = require('../src/sequelize/models');

function setupCommonStubs() {
  const originals = {
    EnrollmentFindOne: models.StudentEnrollment.findOne,
    AssignmentFindAll: models.SectionSubjectTeacher.findAll,
    PolicyFindOne: models.AttendancePolicy.findOne,
    AttendanceFindOne: models.Attendance.findOne,
    AttendanceCreate: models.Attendance.create
  };

  models.StudentEnrollment.findOne = async () => ({ sectionId: 'section-1' });
  models.SectionSubjectTeacher.findAll = async () => ([
    {
      id: 'assign-1',
      sectionId: 'section-1',
      subjectId: 'subject-1',
      teacherId: 'teacher-1',
      daysOfWeek: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
      startTime: '08:00:00'
    }
  ]);

  let policyCall = 0;
  models.AttendancePolicy.findOne = async () => {
    policyCall += 1;
    if (policyCall === 1) return null;
    return {
      onTimeGraceMinutes: 10,
      lateUntilMinutes: 30,
      absentAfterLateWindow: true
    };
  };

  return () => {
    models.StudentEnrollment.findOne = originals.EnrollmentFindOne;
    models.SectionSubjectTeacher.findAll = originals.AssignmentFindAll;
    models.AttendancePolicy.findOne = originals.PolicyFindOne;
    models.Attendance.findOne = originals.AttendanceFindOne;
    models.Attendance.create = originals.AttendanceCreate;
  };
}

/** 2026-03-23 08:05 local (Mon), within grace of 08:00 start — Asia/Manila. */
const LOG_0805_MANILA = new Date('2026-03-23T08:05:00+08:00');
/** 2026-03-23 08:15 local. */
const AT_0815_MANILA = new Date('2026-03-23T08:15:00+08:00');

test('upsertFromRawScan creates PRESENT attendance within grace window', async () => {
  const restore = setupCommonStubs();
  let createdPayload = null;
  models.Attendance.findOne = async () => null;
  models.Attendance.create = async (payload) => {
    createdPayload = payload;
    return { id: 'att-1', ...payload };
  };

  const result = await attendanceDataAccess.upsertFromRawScan({
    rawTimelog: {
      id: 'raw-1',
      logDatetime: LOG_0805_MANILA,
      logType: 'TIME_IN'
    },
    studentId: 'student-1',
    teacherId: 'teacher-1',
    schoolId: 'school-1',
    transaction: null
  });

  assert.equal(result.id, 'att-1');
  assert.equal(createdPayload.status, 'PRESENT');
  assert.equal(createdPayload.sectionSubjectTeacherId, 'assign-1');
  assert.deepEqual(createdPayload.derivedFromRawTimelogIds, ['raw-1']);
  restore();
});

test('upsertFromRawScan updates existing attendance idempotently', async () => {
  const restore = setupCommonStubs();
  let createCalls = 0;
  let updatedPayload = null;

  const existing = {
    id: 'att-1',
    status: 'LATE',
    firstScanAt: AT_0815_MANILA,
    lastScanAt: AT_0815_MANILA,
    timeIn: AT_0815_MANILA,
    timeOut: null,
    derivedFromRawTimelogIds: ['raw-1'],
    update: async (payload) => {
      updatedPayload = payload;
    }
  };

  models.Attendance.findOne = async () => existing;
  models.Attendance.create = async () => {
    createCalls += 1;
    return null;
  };

  await attendanceDataAccess.upsertFromRawScan({
    rawTimelog: {
      id: 'raw-2',
      logDatetime: LOG_0805_MANILA,
      logType: 'TIME_IN'
    },
    studentId: 'student-1',
    teacherId: 'teacher-1',
    schoolId: 'school-1',
    transaction: null
  });

  assert.equal(createCalls, 0);
  assert.equal(updatedPayload.status, 'PRESENT');
  assert.deepEqual(updatedPayload.derivedFromRawTimelogIds, ['raw-1', 'raw-2']);
  restore();
});
