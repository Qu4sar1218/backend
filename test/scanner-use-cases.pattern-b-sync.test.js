const test = require('node:test');
const assert = require('node:assert/strict');

const scannerUseCases = require('../src/use-cases/scanner/scanner-use-cases');
const rawTimelogDataAccess = require('../src/data-access/raw-timelog/raw-timelog-data-access');
const attendanceDataAccess = require('../src/data-access/attendance/attendance-data-access');
const { localDateString } = require('../src/lib/school-timezone');
const models = require('../src/sequelize/models');

function setupScannerStubs({ matchedAttendance = true }) {
  const originals = {
    TimelogDeviceFindOne: models.TimelogDevice.findOne,
    StudentFindByPk: models.Student.findByPk,
    StudentEnrollmentFindOne: models.StudentEnrollment.findOne,
    RawTimelogFindOne: models.RawTimelog.findOne,
    Tx: models.sequelize.transaction,
    CreateTimelog: rawTimelogDataAccess.create,
    MarkMatched: rawTimelogDataAccess.markAsMatched,
    MarkUnmatched: rawTimelogDataAccess.markAsUnmatched,
    EnsurePolicy: attendanceDataAccess.ensureDefaultPolicyForSchool,
    UpsertAttendance: attendanceDataAccess.upsertFromRawScan,
    ResolveAssignment: attendanceDataAccess.resolveAssignmentForScan,
    ResolveClassroomScanContext: attendanceDataAccess.resolveClassroomScanContext,
    FindByStudentDateAndAssignment: attendanceDataAccess.findByStudentDateAndAssignment,
    ResolvePolicy: attendanceDataAccess.resolvePolicy,
    AssertEligible: attendanceDataAccess.assertClassroomScanEligible
  };

  let matchedCalls = 0;
  let unmatchedCalls = 0;

  models.TimelogDevice.findOne = async () => ({ id: 'device-1', code: 'CLASSROOM-FACE-01', name: 'Room', status: 'Active' });
  models.Student.findByPk = async () => ({ id: 'student-1', active: true, status: 'enrolled' });
  models.StudentEnrollment.findOne = async () => ({ id: 'enroll-1' });
  models.RawTimelog.findOne = async () => null;
  models.sequelize.transaction = async () => ({
    commit: async () => {},
    rollback: async () => {}
  });
  let createPayload = null;
  rawTimelogDataAccess.create = async (payload) => {
    createPayload = payload;
    return { id: 'raw-1', log_type: payload.logType };
  };
  rawTimelogDataAccess.markAsMatched = async () => {
    matchedCalls += 1;
  };
  rawTimelogDataAccess.markAsUnmatched = async () => {
    unmatchedCalls += 1;
  };
  attendanceDataAccess.ensureDefaultPolicyForSchool = async () => ({ id: 'policy-1' });
  attendanceDataAccess.resolvePolicy = async () => ({
    onTimeGraceMinutes: 10,
    lateUntilMinutes: 30,
    absentAfterLateWindow: true,
    earlyArrivalAllowanceMinutes: 120
  });
  attendanceDataAccess.assertClassroomScanEligible = () => {};
  const stubAssignment = {
    id: 'assign-1',
    sectionId: 'section-1',
    subjectId: 'subject-1',
    teacherId: 'teacher-1',
    startTime: '08:00:00',
    endTime: '18:00:00',
    daysOfWeek: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
  };
  attendanceDataAccess.resolveClassroomScanContext = async ({ studentId, logDatetime, schoolId }) => {
    const attendanceDate = localDateString(new Date(logDatetime));
    const existingAttendance = await attendanceDataAccess.findByStudentDateAndAssignment({
      studentId,
      attendanceDate,
      assignmentId: stubAssignment.id,
      transaction: null
    });
    let logType = 'TIME_IN';
    if (existingAttendance?.timeIn && !existingAttendance?.timeOut) logType = 'TIME_OUT';
    const policyRow = await attendanceDataAccess.resolvePolicy({
      schoolId,
      assignmentId: stubAssignment.id,
      transaction: null
    });
    const effectivePolicy = attendanceDataAccess.buildEffectivePolicy(policyRow);
    return {
      resolvedAssignment: stubAssignment,
      logType,
      existingAttendance,
      effectivePolicy
    };
  };
  attendanceDataAccess.findByStudentDateAndAssignment = async () => null;
  attendanceDataAccess.upsertFromRawScan = async () => (matchedAttendance ? {
    id: 'att-1',
    attendanceDate: '2026-03-23',
    status: 'PRESENT',
    sectionId: 'section-1',
    subjectId: 'subject-1',
    teacherId: 'teacher-1'
  } : null);

  return {
    restore: () => {
      models.TimelogDevice.findOne = originals.TimelogDeviceFindOne;
      models.Student.findByPk = originals.StudentFindByPk;
      models.StudentEnrollment.findOne = originals.StudentEnrollmentFindOne;
      models.RawTimelog.findOne = originals.RawTimelogFindOne;
      models.sequelize.transaction = originals.Tx;
      rawTimelogDataAccess.create = originals.CreateTimelog;
      rawTimelogDataAccess.markAsMatched = originals.MarkMatched;
      rawTimelogDataAccess.markAsUnmatched = originals.MarkUnmatched;
      attendanceDataAccess.ensureDefaultPolicyForSchool = originals.EnsurePolicy;
      attendanceDataAccess.upsertFromRawScan = originals.UpsertAttendance;
      attendanceDataAccess.resolveAssignmentForScan = originals.ResolveAssignment;
      attendanceDataAccess.resolveClassroomScanContext = originals.ResolveClassroomScanContext;
      attendanceDataAccess.findByStudentDateAndAssignment = originals.FindByStudentDateAndAssignment;
      attendanceDataAccess.resolvePolicy = originals.ResolvePolicy;
      attendanceDataAccess.assertClassroomScanEligible = originals.AssertEligible;
    },
    counts: () => ({ matchedCalls, unmatchedCalls }),
    getCreatePayload: () => createPayload
  };
}

/** 10:00 Asia/Manila — classroom stubs bypass real eligibility; keeps intent explicit. */
const SAMPLE_CLASSROOM_LOG = '2026-06-15T02:00:00.000Z';

test('classroom teacher scan creates raw timelog and matched attendance in one request', async () => {
  const { restore, counts } = setupScannerStubs({ matchedAttendance: true });
  const result = await scannerUseCases.recordAttendance({
    terminalType: 'classroom',
    studentId: 'student-1',
    studentNumber: '2023-0001',
    logDatetime: SAMPLE_CLASSROOM_LOG,
    verificationMethod: 'FACE',
    verificationScore: 0.95,
    actorUserId: 'teacher-1',
    actorRoleName: 'Teacher',
    schoolId: 'school-1'
  });

  assert.equal(result.id, 'raw-1');
  assert.equal(result.attendance.id, 'att-1');
  assert.equal(counts().matchedCalls, 1);
  assert.equal(counts().unmatchedCalls, 0);
  restore();
});

test('classroom teacher scan sets TIME_IN when attendance has no timeIn', async () => {
  const { restore, getCreatePayload } = setupScannerStubs({ matchedAttendance: true });
  attendanceDataAccess.findByStudentDateAndAssignment = async () => ({
    id: 'att-1',
    timeIn: null,
    timeOut: null
  });

  await scannerUseCases.recordAttendance({
    terminalType: 'classroom',
    studentId: 'student-1',
    studentNumber: '2023-0001',
    logDatetime: SAMPLE_CLASSROOM_LOG,
    verificationMethod: 'FACE',
    verificationScore: 0.95,
    actorUserId: 'teacher-1',
    actorRoleName: 'Teacher',
    schoolId: 'school-1'
  });

  assert.equal(getCreatePayload().logType, 'TIME_IN');
  restore();
});

test('classroom teacher scan sets TIME_OUT when attendance already has timeIn', async () => {
  const { restore, getCreatePayload } = setupScannerStubs({ matchedAttendance: true });
  attendanceDataAccess.findByStudentDateAndAssignment = async () => ({
    id: 'att-1',
    timeIn: new Date('2026-03-23T08:05:00+08:00'),
    timeOut: null
  });

  await scannerUseCases.recordAttendance({
    terminalType: 'classroom',
    studentId: 'student-1',
    studentNumber: '2023-0001',
    logDatetime: SAMPLE_CLASSROOM_LOG,
    verificationMethod: 'FACE',
    verificationScore: 0.95,
    actorUserId: 'teacher-1',
    actorRoleName: 'Teacher',
    schoolId: 'school-1'
  });

  assert.equal(getCreatePayload().logType, 'TIME_OUT');
  restore();
});

test('classroom teacher scan rejects when no assignment exists (no log)', async () => {
  const { restore, counts } = setupScannerStubs({ matchedAttendance: false });
  attendanceDataAccess.resolveClassroomScanContext = async () => ({
    resolvedAssignment: null,
    logType: 'TIME_IN',
    existingAttendance: null,
    effectivePolicy: attendanceDataAccess.buildEffectivePolicy(null)
  });

  await assert.rejects(
    () =>
      scannerUseCases.recordAttendance({
        terminalType: 'classroom',
        studentId: 'student-1',
        studentNumber: '2023-0001',
        logDatetime: SAMPLE_CLASSROOM_LOG,
        verificationMethod: 'FACE',
        verificationScore: 0.95,
        actorUserId: 'teacher-1',
        actorRoleName: 'Teacher',
        schoolId: 'school-1'
      }),
    /No matching class/
  );

  assert.equal(counts().matchedCalls, 0);
  assert.equal(counts().unmatchedCalls, 0);
  restore();
});

test('classroom manual IN: blocks when previous subject is not checked out', async () => {
  const { restore } = setupScannerStubs({ matchedAttendance: true });
  attendanceDataAccess.resolveClassroomScanContext = async () => {
    throw Object.assign(
      new Error('Previous subject is not checked out yet. Switch mode to OUT first.'),
      { statusCode: 403 }
    );
  };

  await assert.rejects(
    () =>
      scannerUseCases.recordAttendance({
        terminalType: 'classroom',
        studentId: 'student-1',
        studentNumber: '2023-0001',
        logDatetime: SAMPLE_CLASSROOM_LOG,
        logType: 'TIME_IN',
        verificationMethod: 'FACE',
        verificationScore: 0.95,
        actorUserId: 'teacher-1',
        actorRoleName: 'Teacher',
        schoolId: 'school-1'
      }),
    /Previous subject is not checked out yet/
  );
  restore();
});

test('classroom manual OUT: rejects when no eligible open class exists', async () => {
  const { restore } = setupScannerStubs({ matchedAttendance: true });
  attendanceDataAccess.resolveClassroomScanContext = async () => ({
    resolvedAssignment: null,
    logType: 'TIME_OUT',
    existingAttendance: null,
    effectivePolicy: attendanceDataAccess.buildEffectivePolicy(null)
  });

  await assert.rejects(
    () =>
      scannerUseCases.recordAttendance({
        terminalType: 'classroom',
        studentId: 'student-1',
        studentNumber: '2023-0001',
        logDatetime: SAMPLE_CLASSROOM_LOG,
        logType: 'TIME_OUT',
        verificationMethod: 'FACE',
        verificationScore: 0.95,
        actorUserId: 'teacher-1',
        actorRoleName: 'Teacher',
        schoolId: 'school-1'
      }),
    /No eligible class to check out/
  );
  restore();
});
