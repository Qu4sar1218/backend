'use strict';
const { Student, StudentEnrollment, Event, RawTimelog, Payment, sequelize } = require('../../sequelize/models');
const rawTimelogDataAccess = require('../../data-access/raw-timelog/raw-timelog-data-access');
const attendanceDataAccess = require('../../data-access/attendance/attendance-data-access');
const { localDateString } = require('../../lib/school-timezone');
const { resolveActiveTerminalDevice } = require('../../lib/timelog-terminal-devices');
const { Op } = require('sequelize');

async function resolveDevice(terminalType) {
  return resolveActiveTerminalDevice(terminalType);
}

async function validateStudent(studentId) {
  const student = await Student.findByPk(studentId, {
    attributes: ['id', 'active', 'status']
  });

  if (!student) throw Object.assign(new Error('Student not found'), { statusCode: 404 });
  if (!student.active) throw Object.assign(new Error('Student is not active'), { statusCode: 403 });
  if (student.status !== 'enrolled') throw Object.assign(new Error('Student is not enrolled'), { statusCode: 403 });

  const activeEnrollment = await StudentEnrollment.findOne({
    where: {
      studentId,
      status: 'enrolled',
      active: true
    }
  });

  if (!activeEnrollment) throw Object.assign(new Error('No active enrollment record found for student'), { statusCode: 403 });
}

async function validateEvent(eventId) {
  if (!eventId) throw Object.assign(new Error('event_id is required for event terminal'), { statusCode: 400 });

  const today = new Date().toISOString().slice(0, 10);

  const event = await Event.findOne({
    where: {
      id: eventId,
      status: true,
      startDate: { [Op.lte]: today },
      endDate: { [Op.gte]: today }
    }
  });

  if (!event) throw Object.assign(new Error('No valid active event found for today'), { statusCode: 403 });

  return event;
}

async function validateVerifiedPaymentForEvent(studentId, eventId) {
  const verified = await Payment.findOne({
    where: {
      studentId,
      eventId,
      status: 'verified'
    },
    attributes: ['id']
  });
  if (!verified) {
    throw Object.assign(new Error('Payment not verified for this event'), { statusCode: 403 });
  }
}

async function resolveDeviceScopedLogType(studentId, deviceId, logDatetime) {
  const last = await RawTimelog.findOne({
    where: { studentId, deviceId },
    order: [['logDatetime', 'DESC']],
    attributes: ['logType', 'logDatetime']
  });
  if (!last) return 'TIME_IN';

  const scanDate = logDatetime instanceof Date ? logDatetime : new Date(logDatetime);
  const lastDt = last.logDatetime instanceof Date ? last.logDatetime : new Date(last.logDatetime);
  if (localDateString(lastDt) !== localDateString(scanDate)) return 'TIME_IN';

  return last.logType === 'TIME_IN' ? 'TIME_OUT' : 'TIME_IN';
}

function normalizeRequestedLogType(value) {
  const normalized = String(value || 'AUTO').trim().toUpperCase();
  if (normalized === 'AUTO' || normalized === 'TIME_IN' || normalized === 'TIME_OUT') {
    return normalized;
  }
  throw Object.assign(new Error('Invalid log_type. Allowed values: AUTO, TIME_IN, TIME_OUT.'), { statusCode: 400 });
}

async function resolveHallwayLogType({
  studentId,
  deviceId,
  logDatetime,
  requestedLogType
}) {
  const autoLogType = await resolveDeviceScopedLogType(studentId, deviceId, logDatetime);
  if (requestedLogType === 'AUTO') return autoLogType;

  if (requestedLogType === 'TIME_OUT' && autoLogType === 'TIME_IN') {
    throw Object.assign(new Error('No prior check-in found. Switch mode to IN first.'), { statusCode: 403 });
  }

  if (requestedLogType === 'TIME_IN' && autoLogType === 'TIME_OUT') {
    throw Object.assign(new Error('Student already checked in. Switch mode to OUT.'), { statusCode: 403 });
  }

  return requestedLogType;
}

const scannerUseCases = {
  getTerminalContext: async ({ terminalType, actorUserId, actorRoleName }) => {
    const device = await resolveDevice(terminalType);
    const d = device.toJSON ? device.toJSON() : device;
    const result = {
      device: {
        id: d.id,
        code: d.code,
        name: d.name,
        status: d.status
      }
    };
    const isTeacherScan = String(actorRoleName || '').toLowerCase() === 'teacher';
    if (terminalType !== 'classroom' || !isTeacherScan) return result;

    const assignment = await attendanceDataAccess.resolveAssignmentForScan({
      studentId: null,
      teacherId: actorUserId || null,
      logDatetime: new Date(),
      transaction: null,
      strictSchedule: false
    });
    if (!assignment) return result;

    return {
      ...result,
      class_context: {
        assignment_id: assignment.id,
        section_id: assignment.sectionId,
        subject_id: assignment.subjectId,
        teacher_id: assignment.teacherId
      }
    };
  },

  recordAttendance: async ({
    terminalType,
    studentId,
    studentNumber,
    logDatetime,
    logType: requestedLogTypeInput,
    verificationMethod,
    verificationScore,
    eventId,
    actorUserId,
    actorRoleName,
    schoolId
  }) => {
    if (!studentId) throw Object.assign(new Error('student_id is required'), { statusCode: 400 });
    if (!logDatetime) throw Object.assign(new Error('log_datetime is required'), { statusCode: 400 });
    if (!verificationMethod) throw Object.assign(new Error('verification_method is required'), { statusCode: 400 });

    const device = await resolveDevice(terminalType);

    await validateStudent(studentId);

    let validatedEvent = null;
    if (terminalType === 'event') {
      validatedEvent = await validateEvent(eventId);
      await validateVerifiedPaymentForEvent(studentId, eventId);
    }

    const isTeacherScan = String(actorRoleName || '').toLowerCase() === 'teacher';
    const logDatetimeAsDate = new Date(logDatetime);
    const requestedLogType = normalizeRequestedLogType(requestedLogTypeInput);
    let resolvedAssignment = null;
    let existingAttendance = null;
    let resolvedLogType = 'TIME_IN';

    if (isTeacherScan && terminalType === 'classroom') {
      await attendanceDataAccess.ensureDefaultPolicyForSchool({
        schoolId: schoolId || null,
        transaction: null
      });

      const scanCtx = await attendanceDataAccess.resolveClassroomScanContext({
        studentId,
        teacherId: actorUserId || null,
        logDatetime: logDatetimeAsDate,
        schoolId: schoolId || null,
        requestedLogType,
        transaction: null
      });

      resolvedAssignment = scanCtx.resolvedAssignment;
      existingAttendance = scanCtx.existingAttendance;
      resolvedLogType = scanCtx.logType;
      const effectivePolicy = scanCtx.effectivePolicy;

      if (!resolvedAssignment && requestedLogType === 'TIME_OUT') {
        throw Object.assign(new Error('No eligible class to check out in current allowed window.'), { statusCode: 403 });
      }

      if (!resolvedAssignment) {
        throw Object.assign(new Error('No matching class for this student at this time.'), { statusCode: 403 });
      }

      if (
        requestedLogType === 'TIME_IN' &&
        existingAttendance?.timeIn &&
        !existingAttendance?.timeOut
      ) {
        throw Object.assign(new Error('Student already checked in. Switch mode to OUT.'), { statusCode: 403 });
      }

      attendanceDataAccess.assertClassroomScanEligible({
        assignment: resolvedAssignment,
        logDatetime: logDatetimeAsDate,
        logType: resolvedLogType,
        existingAttendance,
        effectivePolicy
      });
    } else {
      resolvedLogType = await resolveHallwayLogType({
        studentId,
        deviceId: device.id,
        logDatetime: logDatetimeAsDate,
        requestedLogType
      });
    }

    const tx = await sequelize.transaction();
    try {
      if (isTeacherScan && terminalType === 'classroom') {
        await attendanceDataAccess.ensureDefaultPolicyForSchool({
          schoolId: schoolId || null,
          transaction: tx
        });
      }

      const timelog = await rawTimelogDataAccess.create({
        deviceId: device.id,
        sourceType: 'WEB_PORTAL',
        studentId,
        eventId: validatedEvent?.id || null,
        studentNumber: studentNumber || null,
        logDatetime,
        logType: resolvedLogType,
        verificationMethod,
        verificationScore: verificationScore || null,
        locationName: device.name || null
      }, { transaction: tx });

      let attendance = null;
      if (isTeacherScan && terminalType === 'classroom') {
        attendance = await attendanceDataAccess.upsertFromRawScan({
          rawTimelog: {
            id: timelog.id,
            logDatetime,
            logType: resolvedLogType
          },
          studentId,
          teacherId: actorUserId || null,
          schoolId: schoolId || null,
          assignment: resolvedAssignment,
          existingAttendance,
          transaction: tx
        });
      }

      if (attendance?.id) {
        await rawTimelogDataAccess.markAsMatched({
          rawTimelogId: timelog.id,
          attendanceId: attendance.id,
          matchedBy: actorUserId || null,
          transaction: tx
        });
      } else if (isTeacherScan && terminalType === 'classroom') {
        await rawTimelogDataAccess.markAsUnmatched({
          rawTimelogId: timelog.id,
          errorMessage: 'No assignment match found for this classroom scan',
          transaction: tx
        });
      }

      await tx.commit();

      if (terminalType === 'hallway' && resolvedLogType === 'TIME_OUT') {
        const { sendHallwayCheckoutEmail } = require('../email/email-use-cases');
        sendHallwayCheckoutEmail({
          studentId,
          rawTimelogId: timelog.id,
          logDatetime: logDatetimeAsDate
        }).catch((err) =>
          console.error('[Email] checkout notification failed:', err.message)
        );
      }

      if (terminalType === 'event' && (resolvedLogType === 'TIME_IN' || resolvedLogType === 'TIME_OUT')) {
        const { sendEventScanEmail } = require('../email/email-use-cases');
        sendEventScanEmail({
          studentId,
          rawTimelogId: timelog.id,
          eventId: validatedEvent?.id || eventId,
          logDatetime: logDatetimeAsDate,
          logType: resolvedLogType
        }).catch((err) =>
          console.error('[Email] event notification failed:', err.message)
        );
      }

      return {
        ...timelog,
        attendance: attendance
          ? {
              id: attendance.id,
              attendance_date: attendance.attendanceDate,
              status: attendance.status,
              section_id: attendance.sectionId,
              subject_id: attendance.subjectId,
              teacher_id: attendance.teacherId
            }
          : null
      };
    } catch (error) {
      await tx.rollback();
      throw error;
    }
  },

  manualClassroomPresentOverride: async ({
    studentId,
    assignmentId,
    attendanceDate,
    actorUserId,
    actorRoleName
  }) => {
    const tx = await sequelize.transaction();
    try {
      await validateStudent(studentId);
      const attendance = await attendanceDataAccess.upsertManualPresentByAssignment({
        studentId,
        assignmentId,
        attendanceDate,
        actorUserId,
        actorRoleName,
        transaction: tx
      });

      await tx.commit();
      return {
        attendance: {
          id: attendance.id,
          attendance_date: attendance.attendanceDate,
          status: attendance.status,
          source: attendance.source,
          time_in: attendance.timeIn,
          time_out: attendance.timeOut,
          first_scan_at: attendance.firstScanAt,
          last_scan_at: attendance.lastScanAt,
          section_id: attendance.sectionId,
          subject_id: attendance.subjectId,
          teacher_id: attendance.teacherId
        }
      };
    } catch (error) {
      await tx.rollback();
      throw error;
    }
  },

  manualClassroomAbsentOverride: async ({
    studentId,
    assignmentId,
    attendanceDate,
    actorUserId,
    actorRoleName
  }) => {
    const tx = await sequelize.transaction();
    try {
      await validateStudent(studentId);
      const result = await attendanceDataAccess.deleteManualAttendanceByAssignment({
        studentId,
        assignmentId,
        attendanceDate,
        actorUserId,
        actorRoleName,
        transaction: tx
      });
      await tx.commit();
      return result;
    } catch (error) {
      await tx.rollback();
      throw error;
    }
  }
};

module.exports = scannerUseCases;
