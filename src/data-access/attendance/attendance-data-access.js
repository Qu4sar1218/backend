const {
  Attendance,
  AttendancePolicy,
  SectionSubjectTeacher,
  StudentEnrollment,
  RawTimelog,
  Section,
  Subject,
  Student,
  User
} = require('../../sequelize/models');
const { Op } = require('sequelize');
const moment = require('moment-timezone');
const { getFinalScheduleForStudent } = require('../../lib/student-final-schedule');
const {
  getTimezone,
  localMinutesOfDay,
  localWeekdayLabel,
  localDateString,
  localWallClockFromDate
} = require('../../lib/school-timezone');
const rawTimelogDataAccess = require('../raw-timelog/raw-timelog-data-access');
const { resolveActiveTerminalDevice } = require('../../lib/timelog-terminal-devices');

const DEFAULT_POLICY = {
  onTimeGraceMinutes: 10,
  lateUntilMinutes: 30,
  absentAfterLateWindow: true,
  earlyArrivalAllowanceMinutes: 0,
  lateCheckoutGraceMinutes: 20
};

function forbiddenScan(message) {
  return Object.assign(new Error(message), { statusCode: 403 });
}

function normalizeTime(value) {
  if (!value) return null;
  if (value instanceof Date) {
    return localWallClockFromDate(value);
  }
  const asString = String(value);
  return asString.length >= 5 ? asString.slice(0, 5) : asString;
}

function minutesFromTimeString(value) {
  if (!value || typeof value !== 'string' || !value.includes(':')) return null;
  const [h, m] = value.split(':');
  const hours = Number(h);
  const minutes = Number(m);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return null;
  return (hours * 60) + minutes;
}

function evaluateStatus({ logDatetime, startTime, policy }) {
  const startMins = minutesFromTimeString(startTime);
  if (startMins === null) return 'PRESENT';

  const scanMins = localMinutesOfDay(logDatetime);
  const graceCutoff = startMins + policy.onTimeGraceMinutes;
  const lateCutoff = startMins + policy.lateUntilMinutes;

  // Early arrival (before official start) counts as present once eligibility allowed the scan.
  if (scanMins < startMins) return 'PRESENT';

  if (scanMins <= graceCutoff) return 'PRESENT';
  if (scanMins <= lateCutoff) return 'LATE';
  return policy.absentAfterLateWindow ? 'ABSENT' : 'LATE';
}

/**
 * Validates classroom scan time window. Throws forbiddenScan if not eligible.
 * @param {object} params
 * @param {import('sequelize').Model} params.assignment SectionSubjectTeacher row
 * @param {Date} params.logDatetime
 * @param {'TIME_IN'|'TIME_OUT'} params.logType
 * @param {object|null} params.existingAttendance
 * @param {typeof DEFAULT_POLICY} params.effectivePolicy
 */
function assertClassroomScanEligible({
  assignment,
  logDatetime,
  logType,
  existingAttendance,
  effectivePolicy
}) {
  const startMins = minutesFromTimeString(normalizeTime(assignment.startTime));
  const endMins = minutesFromTimeString(normalizeTime(assignment.endTime));
  const scanMins = localMinutesOfDay(logDatetime);
  const allowance = Number(effectivePolicy.earlyArrivalAllowanceMinutes) || 0;

  if (logType === 'TIME_IN') {
    if (startMins === null) {
      throw forbiddenScan('Class schedule start time is not configured for this class.');
    }
    const earliest = startMins - allowance;
    if (scanMins < earliest) {
      throw forbiddenScan('This scan is before the allowed window for this class.');
    }
    if (endMins !== null && scanMins > endMins) {
      throw forbiddenScan('This scan is after the class end time.');
    }
    return;
  }

  if (logType === 'TIME_OUT') {
    if (!existingAttendance || !existingAttendance.timeIn) {
      throw forbiddenScan('Check in before checking out.');
    }
    const lateGrace = Number(effectivePolicy.lateCheckoutGraceMinutes) || 0;
    if (endMins !== null && scanMins > endMins + lateGrace) {
      throw forbiddenScan('Check-out is after the class end time.');
    }
  }
}

/**
 * Returns section/teacher assignments that could apply for this scan (same filters as scan resolution).
 * @returns {Promise<import('sequelize').Model[]>}
 */
async function getScanCandidates({
  studentId,
  teacherId,
  logDatetime,
  transaction,
  strictSchedule = false
}) {
  if (!teacherId) return [];

  const dayLabel = localWeekdayLabel(logDatetime);

  if (studentId) {
    const finalSchedule = await getFinalScheduleForStudent({
      studentId,
      date: localDateString(logDatetime),
      teacherId,
      transaction
    });
    const rows = Array.isArray(finalSchedule.rows) ? finalSchedule.rows : [];
    // Attendance rows require a persisted section_subject_teacher_id.
    const resolvedRows = rows.filter((row) => row.assignmentId);
    const dayScheduled = (a) => {
      const days = Array.isArray(a.daysOfWeek) ? a.daysOfWeek : [];
      return days.length > 0 && days.includes(dayLabel);
    };

    if (strictSchedule) {
      return resolvedRows.filter(dayScheduled);
    }
    const withDayMatch = resolvedRows.filter((assignment) => {
      const days = Array.isArray(assignment.daysOfWeek) ? assignment.daysOfWeek : [];
      return days.includes(dayLabel);
    });
    return withDayMatch.length > 0 ? withDayMatch : resolvedRows;
  }

  const assignmentWhere = {
    teacherId,
    active: true
  };

  const assignments = await SectionSubjectTeacher.findAll({
    where: assignmentWhere,
    include: [
      { model: Section, as: 'section', attributes: ['id', 'name', 'code'] },
      { model: Subject, as: 'subject', attributes: ['id', 'name', 'code'] }
    ],
    transaction
  });

  const dayScheduled = (a) => {
    const days = Array.isArray(a.daysOfWeek) ? a.daysOfWeek : [];
    return days.length > 0 && days.includes(dayLabel);
  };

  let candidates;
  if (strictSchedule) {
    candidates = assignments.filter(dayScheduled);
  } else {
    const withDayMatch = assignments.filter((assignment) => {
      const days = Array.isArray(assignment.daysOfWeek) ? assignment.daysOfWeek : [];
      return days.includes(dayLabel);
    });
    candidates = withDayMatch.length > 0 ? withDayMatch : assignments;
  }

  return candidates;
}

async function resolveAssignmentForScan({
  studentId,
  teacherId,
  logDatetime,
  transaction,
  strictSchedule = false
}) {
  const currentMinutes = localMinutesOfDay(logDatetime);
  const candidates = await getScanCandidates({
    studentId,
    teacherId,
    logDatetime,
    transaction,
    strictSchedule
  });

  if (candidates.length === 0) return null;

  candidates.sort((a, b) => {
    const aStart = minutesFromTimeString(normalizeTime(a.startTime));
    const bStart = minutesFromTimeString(normalizeTime(b.startTime));
    const aDist = aStart === null ? Number.MAX_SAFE_INTEGER : Math.abs(aStart - currentMinutes);
    const bDist = bStart === null ? Number.MAX_SAFE_INTEGER : Math.abs(bStart - currentMinutes);
    return aDist - bDist;
  });

  return candidates[0];
}

function resolveClassroomLogType(existingAttendance) {
  if (!existingAttendance) return 'TIME_IN';
  if (!existingAttendance.timeIn) return 'TIME_IN';
  if (!existingAttendance.timeOut) return 'TIME_OUT';
  return 'TIME_OUT';
}

function buildAttendanceLookupWhere({ studentId, attendanceDate, resolvedAssignment }) {
  const where = {
    studentId,
    attendanceDate
  };
  if (resolvedAssignment?.assignmentId) {
    where.sectionSubjectTeacherId = resolvedAssignment.assignmentId;
  } else if (resolvedAssignment?.overrideId) {
    where.studentSubjectAssignmentId = resolvedAssignment.overrideId;
  }
  return where;
}

async function resolvePolicy({ schoolId, assignmentId, transaction }) {
  if (assignmentId) {
    const assignmentPolicy = await AttendancePolicy.findOne({
      where: {
        sectionSubjectTeacherId: assignmentId,
        active: true
      },
      order: [['updatedAt', 'DESC']],
      transaction
    });
    if (assignmentPolicy) return assignmentPolicy;
  }

  const schoolPolicy = await AttendancePolicy.findOne({
    where: {
      schoolId,
      sectionSubjectTeacherId: null,
      active: true
    },
    order: [['updatedAt', 'DESC']],
    transaction
  });
  return schoolPolicy;
}

/** @param {import('sequelize').Model|null} policy */
function buildEffectivePolicy(policy) {
  if (!policy) return { ...DEFAULT_POLICY };
  return {
    onTimeGraceMinutes: policy.onTimeGraceMinutes,
    lateUntilMinutes: policy.lateUntilMinutes,
    absentAfterLateWindow: policy.absentAfterLateWindow,
    earlyArrivalAllowanceMinutes: policy.earlyArrivalAllowanceMinutes ?? 0,
    lateCheckoutGraceMinutes:
      policy.lateCheckoutGraceMinutes != null
        ? policy.lateCheckoutGraceMinutes
        : DEFAULT_POLICY.lateCheckoutGraceMinutes
  };
}

/**
 * Phase 1: if earliest incomplete attendance (by class start) is within late checkout grace, TIME_OUT for that class.
 * Else phase 2: closest-start assignment + normal IN/OUT.
 */
async function resolveClassroomScanContext({
  studentId,
  teacherId,
  logDatetime,
  schoolId,
  requestedLogType = 'AUTO',
  transaction
}) {
  const logDatetimeAsDate = logDatetime instanceof Date ? logDatetime : new Date(logDatetime);
  const attendanceDate = localDateString(logDatetimeAsDate);
  const scanMins = localMinutesOfDay(logDatetimeAsDate);

  const candidates = await getScanCandidates({
    studentId,
    teacherId,
    logDatetime: logDatetimeAsDate,
    transaction,
    strictSchedule: true
  });

  if (candidates.length === 0) {
    return {
      resolvedAssignment: null,
      logType: 'TIME_IN',
      existingAttendance: null,
      effectivePolicy: { ...DEFAULT_POLICY }
    };
  }

  const sortedByStart = [...candidates].sort((a, b) => {
    const aStart = minutesFromTimeString(normalizeTime(a.startTime));
    const bStart = minutesFromTimeString(normalizeTime(b.startTime));
    const aVal = aStart === null ? Number.MAX_SAFE_INTEGER : aStart;
    const bVal = bStart === null ? Number.MAX_SAFE_INTEGER : bStart;
    return aVal - bVal;
  });

  const findOpenAttendanceCandidate = async () => {
    for (const assignment of sortedByStart) {
      const row = await Attendance.findOne({
        where: buildAttendanceLookupWhere({
          studentId,
          attendanceDate,
          resolvedAssignment: assignment
        }),
        transaction
      });

      if (row?.timeIn && !row?.timeOut) {
        const policyRow = await resolvePolicy({
          schoolId,
          assignmentId: assignment.assignmentId || null,
          transaction
        });
        const effectivePolicy = buildEffectivePolicy(policyRow);
        const endMins = minutesFromTimeString(normalizeTime(assignment.endTime));
        const grace = Number(effectivePolicy.lateCheckoutGraceMinutes) || 0;
        if (endMins === null || scanMins <= endMins + grace) {
          return {
            resolvedAssignment: assignment,
            logType: 'TIME_OUT',
            existingAttendance: row,
            effectivePolicy
          };
        }
        break;
      }
    }
    return null;
  };

  const openAttendanceCandidate = await findOpenAttendanceCandidate();

  if (requestedLogType === 'TIME_OUT') {
    if (openAttendanceCandidate) return openAttendanceCandidate;
    return {
      resolvedAssignment: null,
      logType: 'TIME_OUT',
      existingAttendance: null,
      effectivePolicy: { ...DEFAULT_POLICY }
    };
  }

  if (requestedLogType === 'AUTO' && openAttendanceCandidate) {
    return openAttendanceCandidate;
  }

  const resolvedAssignment = await resolveAssignmentForScan({
    studentId,
    teacherId,
    logDatetime: logDatetimeAsDate,
    transaction,
    strictSchedule: true
  });

  if (!resolvedAssignment) {
    return {
      resolvedAssignment: null,
      logType: 'TIME_IN',
      existingAttendance: null,
      effectivePolicy: { ...DEFAULT_POLICY }
    };
  }

  if (requestedLogType === 'TIME_IN') {
    for (const assignment of sortedByStart) {
      if (assignment.assignmentId === resolvedAssignment.assignmentId) break;
      const row = await Attendance.findOne({
        where: buildAttendanceLookupWhere({
          studentId,
          attendanceDate,
          resolvedAssignment: assignment
        }),
        transaction
      });

      if (row?.timeIn && !row?.timeOut) {
        const policyRow = await resolvePolicy({
          schoolId,
          assignmentId: assignment.assignmentId || null,
          transaction
        });
        const effectivePolicy = buildEffectivePolicy(policyRow);
        const endMins = minutesFromTimeString(normalizeTime(assignment.endTime));
        const grace = Number(effectivePolicy.lateCheckoutGraceMinutes) || 0;
        if (endMins === null || scanMins <= endMins + grace) {
          throw forbiddenScan('Previous subject is not checked out yet. Switch mode to OUT first.');
        }
        break;
      }
    }
  }

  const existingAttendance = await Attendance.findOne({
    where: buildAttendanceLookupWhere({
      studentId,
      attendanceDate,
      resolvedAssignment
    }),
    transaction
  });

  const policyRow = await resolvePolicy({
    schoolId,
    assignmentId: resolvedAssignment.assignmentId || null,
    transaction
  });
  const effectivePolicy = buildEffectivePolicy(policyRow);
  const logType = requestedLogType === 'TIME_IN'
    ? 'TIME_IN'
    : resolveClassroomLogType(existingAttendance);

  return {
    resolvedAssignment,
    logType,
    existingAttendance,
    effectivePolicy
  };
}

function mergeDerivedIds(existing, incomingId) {
  const list = Array.isArray(existing) ? existing : [];
  if (!incomingId) return list;
  if (list.includes(incomingId)) return list;
  return [...list, incomingId];
}

function toLocalDateTime({ attendanceDate, wallClock }) {
  if (!attendanceDate || !wallClock) return null;
  const rawTimeValue = String(wallClock).slice(0, 8);
  const timeValue = rawTimeValue.length === 5 ? `${rawTimeValue}:00` : rawTimeValue;
  return moment.tz(`${attendanceDate} ${timeValue}`, 'YYYY-MM-DD HH:mm:ss', getTimezone()).toDate();
}

const attendanceDataAccess = {
  resolveAssignmentForScan,
  resolvePolicy,

  findByStudentDateAndAssignment: async ({ studentId, attendanceDate, assignmentId, transaction }) => {
    if (!studentId || !attendanceDate || !assignmentId) return null;
    return Attendance.findOne({
      where: {
        studentId,
        attendanceDate,
        sectionSubjectTeacherId: assignmentId
      },
      transaction
    });
  },

  upsertFromRawScan: async ({ rawTimelog, studentId, teacherId, schoolId, assignment, existingAttendance, transaction }) => {
    const logDatetime = rawTimelog.logDatetime instanceof Date ? rawTimelog.logDatetime : new Date(rawTimelog.logDatetime);
    let resolvedAssignment = assignment || null;
    if (!resolvedAssignment) {
      resolvedAssignment = await resolveAssignmentForScan({ studentId, teacherId, logDatetime, transaction });
    }
    if (!resolvedAssignment) return null;

    const policy = await resolvePolicy({
      schoolId,
      assignmentId: resolvedAssignment.assignmentId || null,
      transaction
    });
    const effectivePolicy = buildEffectivePolicy(policy);

    const status = evaluateStatus({
      logDatetime,
      startTime: normalizeTime(resolvedAssignment.startTime),
      policy: effectivePolicy
    });
    const attendanceDate = localDateString(logDatetime);

    let attendance = existingAttendance || await Attendance.findOne({
      where: buildAttendanceLookupWhere({
        studentId,
        attendanceDate,
        resolvedAssignment
      }),
      transaction
    });

    const basePayload = {
      studentId,
      attendanceDate,
      sectionSubjectTeacherId: resolvedAssignment.assignmentId || null,
      studentSubjectAssignmentId: resolvedAssignment.overrideId || null,
      sectionId: resolvedAssignment.sectionId,
      subjectId: resolvedAssignment.subjectId,
      teacherId: resolvedAssignment.teacherId,
      status,
      source: 'AUTO',
      firstScanAt: logDatetime,
      lastScanAt: logDatetime,
      timeIn: rawTimelog.logType === 'TIME_IN' ? logDatetime : null,
      timeOut: rawTimelog.logType === 'TIME_OUT' ? logDatetime : null,
      derivedFromRawTimelogIds: rawTimelog.id ? [rawTimelog.id] : [],
      updatedBy: teacherId || null
    };

    if (!attendance) {
      attendance = await Attendance.create(
        {
          ...basePayload,
          createdBy: teacherId || null
        },
        { transaction }
      );
      return attendance;
    }

    const nextStatus = attendance.status === 'PRESENT' ? attendance.status : status;
    const nextFirstScanAt = attendance.firstScanAt && attendance.firstScanAt < logDatetime
      ? attendance.firstScanAt
      : logDatetime;
    const nextLastScanAt = attendance.lastScanAt && attendance.lastScanAt > logDatetime
      ? attendance.lastScanAt
      : logDatetime;

    const nextTimeIn = rawTimelog.logType === 'TIME_IN'
      ? (attendance.timeIn && attendance.timeIn < logDatetime ? attendance.timeIn : logDatetime)
      : attendance.timeIn;
    const nextTimeOut = rawTimelog.logType === 'TIME_OUT'
      ? (attendance.timeOut && attendance.timeOut > logDatetime ? attendance.timeOut : logDatetime)
      : attendance.timeOut;

    await attendance.update(
      {
        status: nextStatus,
        firstScanAt: nextFirstScanAt,
        lastScanAt: nextLastScanAt,
        timeIn: nextTimeIn,
        timeOut: nextTimeOut,
        derivedFromRawTimelogIds: mergeDerivedIds(attendance.derivedFromRawTimelogIds, rawTimelog.id),
        updatedBy: teacherId || null
      },
      { transaction }
    );

    return attendance;
  },

  upsertManualPresentByAssignment: async ({
    studentId,
    assignmentId,
    attendanceDate,
    actorUserId,
    actorRoleName,
    note,
    transaction
  }) => {
    if (!studentId) throw Object.assign(new Error('student_id is required'), { statusCode: 400 });
    if (!assignmentId) throw Object.assign(new Error('assignment_id is required'), { statusCode: 400 });
    if (!attendanceDate) throw Object.assign(new Error('attendance_date is required'), { statusCode: 400 });
    if (!actorUserId) throw Object.assign(new Error('actor user is required'), { statusCode: 401 });

    const assignment = await SectionSubjectTeacher.findOne({
      where: { id: assignmentId, active: true },
      attributes: ['id', 'sectionId', 'subjectId', 'teacherId', 'startTime', 'endTime'],
      transaction
    });
    if (!assignment) throw Object.assign(new Error('Teaching assignment not found or inactive.'), { statusCode: 404 });

    const actorRole = String(actorRoleName || '').toLowerCase();
    const isTeacher = actorRole === 'teacher';
    const isAdmin = actorRole === 'admin';
    if (!isTeacher && !isAdmin) {
      throw Object.assign(new Error('Only teachers and admins can manually override attendance.'), { statusCode: 403 });
    }
    if (isTeacher && assignment.teacherId !== actorUserId) {
      throw Object.assign(new Error('You are not allowed to override attendance for this class.'), { statusCode: 403 });
    }

    const finalSchedule = await getFinalScheduleForStudent({
      studentId,
      date: String(attendanceDate).slice(0, 10),
      teacherId: assignment.teacherId,
      transaction
    });
    const isAllowedAssignment = (finalSchedule.rows || []).some(
      (row) => row.assignmentId === assignment.id
    );
    let isAllowed = isAllowedAssignment;
    if (!isAllowed && (finalSchedule.rows || []).length === 0) {
      const enrollment = await StudentEnrollment.findOne({
        where: {
          studentId,
          sectionId: assignment.sectionId,
          active: true,
          status: 'enrolled'
        },
        attributes: ['id'],
        transaction
      });
      isAllowed = !!enrollment;
    }
    if (!isAllowed) {
      throw Object.assign(new Error('Student is not assigned to this class in the resolved schedule.'), { statusCode: 403 });
    }

    const normalizedDate = String(attendanceDate).slice(0, 10);
    const startClock = normalizeTime(assignment.startTime);
    const endClock = normalizeTime(assignment.endTime);
    if (!startClock || !endClock) {
      throw Object.assign(new Error('Class schedule start/end time is not configured for this assignment.'), { statusCode: 409 });
    }

    const scheduledTimeIn = toLocalDateTime({ attendanceDate: normalizedDate, wallClock: startClock });
    const scheduledTimeOut = toLocalDateTime({ attendanceDate: normalizedDate, wallClock: endClock });
    if (!scheduledTimeIn || !scheduledTimeOut) {
      throw Object.assign(new Error('Unable to compute schedule-based attendance timestamps.'), { statusCode: 400 });
    }

    let attendance = await Attendance.findOne({
      where: {
        studentId,
        attendanceDate: normalizedDate,
        sectionSubjectTeacherId: assignment.id
      },
      transaction
    });

    const payload = {
      studentId,
      attendanceDate: normalizedDate,
      sectionSubjectTeacherId: assignment.id,
      sectionId: assignment.sectionId,
      subjectId: assignment.subjectId,
      teacherId: assignment.teacherId,
      status: 'PRESENT',
      source: 'MANUAL',
      firstScanAt: scheduledTimeIn,
      lastScanAt: scheduledTimeOut,
      timeIn: scheduledTimeIn,
      timeOut: scheduledTimeOut,
      updatedBy: actorUserId,
      note: note || null
    };
    const classroomDevice = await resolveActiveTerminalDevice('classroom');

    if (!attendance) {
      attendance = await Attendance.create(
        {
          ...payload,
          createdBy: actorUserId
        },
        { transaction }
      );
      const manualRawIds = await rawTimelogDataAccess.replaceManualAttendanceTimelogs({
        attendanceId: attendance.id,
        studentId,
        deviceId: classroomDevice.id,
        timeIn: payload.timeIn,
        timeOut: payload.timeOut,
        actorUserId,
        locationName: 'Classroom Manual Override',
        transaction
      });
      await attendance.update(
        { derivedFromRawTimelogIds: manualRawIds, updatedBy: actorUserId },
        { transaction }
      );
      return attendance;
    }

    await attendance.update(payload, { transaction });
    const manualRawIds = await rawTimelogDataAccess.replaceManualAttendanceTimelogs({
      attendanceId: attendance.id,
      studentId,
      deviceId: classroomDevice.id,
      timeIn: payload.timeIn,
      timeOut: payload.timeOut,
      actorUserId,
      locationName: 'Classroom Manual Override',
      transaction
    });
    await attendance.update(
      { derivedFromRawTimelogIds: manualRawIds, updatedBy: actorUserId },
      { transaction }
    );
    return attendance;
  },

  deleteManualAttendanceByAssignment: async ({
    studentId,
    assignmentId,
    attendanceDate,
    actorUserId,
    actorRoleName,
    transaction
  }) => {
    if (!studentId) throw Object.assign(new Error('student_id is required'), { statusCode: 400 });
    if (!assignmentId) throw Object.assign(new Error('assignment_id is required'), { statusCode: 400 });
    if (!attendanceDate) throw Object.assign(new Error('attendance_date is required'), { statusCode: 400 });
    if (!actorUserId) throw Object.assign(new Error('actor user is required'), { statusCode: 401 });

    const assignment = await SectionSubjectTeacher.findOne({
      where: { id: assignmentId, active: true },
      attributes: ['id', 'sectionId', 'subjectId', 'teacherId'],
      transaction
    });
    if (!assignment) throw Object.assign(new Error('Teaching assignment not found or inactive.'), { statusCode: 404 });

    const actorRole = String(actorRoleName || '').toLowerCase();
    const isTeacher = actorRole === 'teacher';
    const isAdmin = actorRole === 'admin';
    if (!isTeacher && !isAdmin) {
      throw Object.assign(new Error('Only teachers and admins can manually override attendance.'), { statusCode: 403 });
    }
    if (isTeacher && assignment.teacherId !== actorUserId) {
      throw Object.assign(new Error('You are not allowed to override attendance for this class.'), { statusCode: 403 });
    }

    const finalSchedule = await getFinalScheduleForStudent({
      studentId,
      date: String(attendanceDate).slice(0, 10),
      teacherId: assignment.teacherId,
      transaction
    });
    const isAllowedAssignment = (finalSchedule.rows || []).some(
      (row) => row.assignmentId === assignment.id
    );
    let isAllowed = isAllowedAssignment;
    if (!isAllowed && (finalSchedule.rows || []).length === 0) {
      const enrollment = await StudentEnrollment.findOne({
        where: {
          studentId,
          sectionId: assignment.sectionId,
          active: true,
          status: 'enrolled'
        },
        attributes: ['id'],
        transaction
      });
      isAllowed = !!enrollment;
    }
    if (!isAllowed) {
      throw Object.assign(new Error('Student is not assigned to this class in the resolved schedule.'), { statusCode: 403 });
    }

    const normalizedDate = String(attendanceDate).slice(0, 10);
    const attendance = await Attendance.findOne({
      where: {
        studentId,
        attendanceDate: normalizedDate,
        sectionSubjectTeacherId: assignment.id
      },
      transaction
    });

    if (!attendance) {
      return {
        action: 'MARK_ABSENT',
        deletedAttendance: 0,
        deletedRawTimelogs: 0,
        studentId,
        assignmentId,
        attendanceDate: normalizedDate
      };
    }

    const deletedRawTimelogs = await RawTimelog.destroy({
      where: {
        matchedAttendanceId: attendance.id,
        studentId
      },
      transaction
    });

    await attendance.destroy({ transaction });

    return {
      action: 'MARK_ABSENT',
      deletedAttendance: 1,
      deletedRawTimelogs,
      studentId,
      assignmentId,
      attendanceDate: normalizedDate
    };
  },

  getTeacherAttendance: async ({ teacherId, from, to, sectionId, subjectId, status }) => {
    const where = { teacherId };
    if (from || to) {
      where.attendanceDate = {};
      if (from) where.attendanceDate[Op.gte] = from;
      if (to) where.attendanceDate[Op.lte] = to;
    }
    if (sectionId) where.sectionId = sectionId;
    if (subjectId) where.subjectId = subjectId;
    if (status) where.status = status;

    return Attendance.findAll({
      where,
      include: [
        {
          model: Student,
          as: 'student',
          attributes: ['id', 'firstName', 'middleName', 'lastName', 'studentIdNumber']
        },
        { model: Section, as: 'section', attributes: ['id', 'name', 'code'] },
        { model: Subject, as: 'subject', attributes: ['id', 'name', 'code'] }
      ],
      order: [
        ['attendanceDate', 'DESC'],
        [{ model: Student, as: 'student' }, 'lastName', 'ASC'],
        [{ model: Student, as: 'student' }, 'firstName', 'ASC']
      ]
    });
  },

  getTeacherAttendanceSummary: async ({ teacherId, from, to, sectionId, subjectId }) => {
    const where = { teacherId };
    if (from || to) {
      where.attendanceDate = {};
      if (from) where.attendanceDate[Op.gte] = from;
      if (to) where.attendanceDate[Op.lte] = to;
    }
    if (sectionId) where.sectionId = sectionId;
    if (subjectId) where.subjectId = subjectId;

    const rows = await Attendance.findAll({
      where,
      attributes: ['status']
    });

    const summary = {
      total: rows.length,
      present: 0,
      late: 0,
      absent: 0,
      excused: 0
    };

    for (const row of rows) {
      const status = row.status;
      if (status === 'PRESENT') summary.present += 1;
      if (status === 'LATE') summary.late += 1;
      if (status === 'ABSENT') summary.absent += 1;
      if (status === 'EXCUSED') summary.excused += 1;
    }

    return summary;
  },

  /**
   * Student IDs with at least one attendance row for a teacher on a calendar day (optional section/subject filters).
   */
  getTeacherAttendanceStudentIdsForDay: async ({ teacherId, attendanceDate, sectionId, subjectId }) => {
    if (!teacherId || !attendanceDate) return new Set();
    const where = {
      teacherId,
      attendanceDate: String(attendanceDate).slice(0, 10)
    };
    if (sectionId) where.sectionId = sectionId;
    if (subjectId) where.subjectId = subjectId;
    const rows = await Attendance.findAll({
      where,
      attributes: ['studentId']
    });
    return new Set(rows.map((r) => r.studentId).filter(Boolean));
  },

  /**
   * Minimal attendance rows for slot-based teacher metrics (bulk, one query).
   */
  getTeacherAttendanceRowsInRangeForTeacher: async ({ teacherId, from, to }) => {
    if (!teacherId || !from || !to) return [];
    return Attendance.findAll({
      where: {
        teacherId,
        attendanceDate: { [Op.gte]: from, [Op.lte]: to }
      },
      attributes: ['studentId', 'attendanceDate', 'status', 'sectionSubjectTeacherId']
    });
  },

  /**
   * Distinct student counts per assignment + status for a teacher in a date range.
   * Used for teacher dashboard metrics charts.
   */
  getTeacherAttendanceMetricsByAssignment: async ({ teacherId, from, to }) => {
    if (!teacherId) return [];
    const where = { teacherId };
    if (from || to) {
      where.attendanceDate = {};
      if (from) where.attendanceDate[Op.gte] = from;
      if (to) where.attendanceDate[Op.lte] = to;
    }

    const rows = await Attendance.findAll({
      where,
      attributes: [
        ['section_subject_teacher_id', 'assignmentId'],
        'status',
        [Attendance.sequelize.fn('COUNT', Attendance.sequelize.fn('DISTINCT', Attendance.sequelize.col('student_id'))), 'distinctStudents']
      ],
      group: ['section_subject_teacher_id', 'status']
    });

    return rows.map((row) => {
      const json = row.toJSON();
      return {
        assignmentId: json.assignmentId,
        status: json.status,
        distinctStudents: Number(json.distinctStudents) || 0
      };
    });
  },

  /**
   * Admin reports: all official attendance rows for a section on one calendar date (per subject).
   */
  getAttendanceRowsForSectionDate: async ({ sectionId, attendanceDate }) => {
    if (!sectionId || !attendanceDate) return [];
    return Attendance.findAll({
      where: {
        sectionId,
        attendanceDate
      },
      include: [
        {
          model: Student,
          as: 'student',
          attributes: ['id', 'firstName', 'middleName', 'lastName', 'studentIdNumber'],
          include: [{ model: User, as: 'user', attributes: ['imageUrl'] }]
        },
        { model: Subject, as: 'subject', attributes: ['id', 'name', 'code'] },
        { model: User, as: 'teacher', attributes: ['id', 'firstName', 'lastName'] },
        {
          model: SectionSubjectTeacher,
          as: 'assignment',
          attributes: ['id', 'startTime', 'endTime']
        }
      ],
      order: [
        [{ model: Student, as: 'student' }, 'lastName', 'ASC'],
        [{ model: Student, as: 'student' }, 'firstName', 'ASC'],
        [{ model: Subject, as: 'subject' }, 'name', 'ASC']
      ]
    });
  },

  ensureDefaultPolicyForSchool: async ({ schoolId, transaction }) => {
    if (!schoolId) return null;
    const existing = await AttendancePolicy.findOne({
      where: {
        schoolId,
        sectionSubjectTeacherId: null,
        active: true
      },
      transaction
    });
    if (existing) return existing;

    return AttendancePolicy.create(
      {
        schoolId,
        sectionSubjectTeacherId: null,
        onTimeGraceMinutes: DEFAULT_POLICY.onTimeGraceMinutes,
        lateUntilMinutes: DEFAULT_POLICY.lateUntilMinutes,
        absentAfterLateWindow: DEFAULT_POLICY.absentAfterLateWindow,
        earlyArrivalAllowanceMinutes: DEFAULT_POLICY.earlyArrivalAllowanceMinutes,
        lateCheckoutGraceMinutes: DEFAULT_POLICY.lateCheckoutGraceMinutes,
        active: true
      },
      { transaction }
    );
  },

  assertClassroomScanEligible,

  buildEffectivePolicy,

  resolveClassroomScanContext,
  resolveClassroomLogType,
  getScanCandidates
};

module.exports = attendanceDataAccess;
module.exports.evaluateStatus = evaluateStatus;
module.exports.assertClassroomScanEligible = assertClassroomScanEligible;
module.exports.forbiddenScan = forbiddenScan;
