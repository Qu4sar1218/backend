const { RawTimelog, Student, User, Attendance } = require('../../sequelize/models');
const { Op } = require('sequelize');

const toValidDate = (value) => {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const toRawTimelogResponse = (timelog) => {
  const raw = timelog.toJSON();
  return {
    id: raw.id,
    device_id: raw.deviceId,
    source_type: raw.sourceType,
    student_id: raw.studentId,
    event_id: raw.eventId,
    student_number: raw.studentNumber,
    log_datetime: raw.logDatetime,
    log_type: raw.logType,
    verification_method: raw.verificationMethod,
    verification_score: raw.verificationScore,
    location_name: raw.locationName,
    latitude: raw.latitude,
    longitude: raw.longitude,
    processing_status: raw.processingStatus,
    student: raw.student
      ? {
          id: raw.student.id,
          first_name: raw.student.firstName,
          last_name: raw.student.lastName,
          image_url: raw.student.user?.imageUrl ?? null
        }
      : null
  };
};

const rawTimelogDataAccess = {
  create: async (payload, options = {}) => {
    const created = await RawTimelog.create(payload, options);
    return toRawTimelogResponse(created);
  },

  markAsMatched: async ({ rawTimelogId, attendanceId, matchedBy, transaction }) => {
    await RawTimelog.update(
      {
        matchedAttendanceId: attendanceId,
        processingStatus: 'MATCHED',
        matchedBy: matchedBy || null,
        matchedDate: new Date(),
        errorMessage: null
      },
      {
        where: { id: rawTimelogId },
        transaction
      }
    );
  },

  markAsUnmatched: async ({ rawTimelogId, errorMessage, transaction }) => {
    await RawTimelog.update(
      {
        processingStatus: 'UNMATCHED',
        errorMessage: errorMessage || null
      },
      {
        where: { id: rawTimelogId },
        transaction
      }
    );
  },

  replaceManualAttendanceTimelogs: async ({
    attendanceId,
    studentId,
    deviceId,
    timeIn,
    timeOut,
    actorUserId,
    locationName,
    transaction
  }) => {
    if (!attendanceId) {
      throw new Error('attendanceId is required');
    }
    if (!studentId) {
      throw new Error('studentId is required');
    }
    if (!deviceId) {
      throw new Error('deviceId is required');
    }
    if (!timeIn || !timeOut) {
      throw new Error('timeIn and timeOut are required');
    }

    await RawTimelog.destroy({
      where: {
        matchedAttendanceId: attendanceId,
        studentId,
        sourceType: 'MANUAL',
        logType: { [Op.in]: ['TIME_IN', 'TIME_OUT'] }
      },
      transaction
    });

    const now = new Date();
    const basePayload = {
      deviceId,
      studentId,
      sourceType: 'MANUAL',
      verificationMethod: 'MANUAL',
      locationName: locationName || null,
      matchedAttendanceId: attendanceId,
      processingStatus: 'MATCHED',
      matchedBy: actorUserId || null,
      matchedDate: now,
      errorMessage: null
    };

    const createdRows = await RawTimelog.bulkCreate(
      [
        { ...basePayload, logDatetime: timeIn, logType: 'TIME_IN' },
        { ...basePayload, logDatetime: timeOut, logType: 'TIME_OUT' }
      ],
      { transaction }
    );

    return createdRows.map((row) => row.id);
  },

  getAll: async (filters) => {
    const where = {};
    const attendanceWhere = {};
    const include = [
      {
        model: Student,
        as: 'student',
        attributes: ['id', 'firstName', 'lastName'],
        include: [{ model: User, as: 'user', attributes: ['imageUrl'] }]
      }
    ];

    if (filters.device_id) where.deviceId = filters.device_id;
    if (filters.student_id) where.studentId = filters.student_id;
    if (filters.event_id) where.eventId = filters.event_id;
    if (filters.processing_status) where.processingStatus = filters.processing_status;
    if (filters.teacher_id) attendanceWhere.teacherId = filters.teacher_id;
    if (filters.section_id) attendanceWhere.sectionId = filters.section_id;
    if (filters.subject_id) attendanceWhere.subjectId = filters.subject_id;
    const startDate = toValidDate(filters.start_date);
    const endDate = toValidDate(filters.end_date);
    if (startDate || endDate) {
      where.logDatetime = {};
      if (startDate) where.logDatetime[Op.gte] = startDate;
      if (endDate) where.logDatetime[Op.lte] = endDate;
    }

    const limit = Number(filters.limit);
    const safeLimit = Number.isFinite(limit) && limit > 0 ? limit : 100;

    if (Object.keys(attendanceWhere).length > 0) {
      include.push({
        model: Attendance,
        as: 'matched_attendance',
        attributes: ['id', 'teacherId', 'sectionId', 'subjectId'],
        where: attendanceWhere,
        required: true
      });
    }

    const timelogs = await RawTimelog.findAll({
      where,
      include,
      order: [['logDatetime', 'DESC']],
      limit: safeLimit
    });

    return timelogs.map(toRawTimelogResponse);
  }
};

module.exports = rawTimelogDataAccess;
