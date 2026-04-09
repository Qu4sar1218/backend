'use strict';

const {
  RawTimelog,
  Student,
  StudentEnrollment,
  Course,
  Section,
  TimelogDevice,
  Event,
  Attendance,
  Subject
} = require('../../sequelize/models');
const { Op, fn, col, literal } = require('sequelize');
const { localDateString } = require('../../lib/school-timezone');

/**
 * Distinct students with ≥1 TIME_IN in each period bucket (Postgres DATE_TRUNC).
 * @param {object} params
 * @param {string} params.deviceId
 * @param {string|null} params.eventId - required for event terminal
 * @param {Date} params.rangeStart
 * @param {Date} params.rangeEnd
 * @param {'day'|'week'|'month'} params.truncUnit
 */
async function distinctStudentsByTimeBucket({ deviceId, eventId, rangeStart, rangeEnd, truncUnit }) {
  const where = {
    deviceId,
    studentId: { [Op.ne]: null },
    logDatetime: {
      [Op.gte]: rangeStart,
      [Op.lte]: rangeEnd
    }
  };
  if (eventId) {
    where.eventId = eventId;
  }

  const trunc = truncUnit === 'day' ? 'day' : truncUnit === 'week' ? 'week' : 'month';

  const rows = await RawTimelog.findAll({
    attributes: [
      [fn('DATE_TRUNC', trunc, col('log_datetime')), 'period'],
      [
        fn(
          'COUNT',
          fn('DISTINCT', literal(`CASE WHEN "log_type" = 'TIME_IN' THEN "student_id" END`))
        ),
        'distinct_time_in_students'
      ],
      [
        fn(
          'COUNT',
          fn('DISTINCT', literal(`CASE WHEN "log_type" = 'TIME_OUT' THEN "student_id" END`))
        ),
        'distinct_time_out_students'
      ],
      [fn('COUNT', literal(`CASE WHEN "log_type" = 'TIME_IN' THEN 1 END`)), 'time_in_scans'],
      [fn('COUNT', literal(`CASE WHEN "log_type" = 'TIME_OUT' THEN 1 END`)), 'time_out_scans'],
      [fn('COUNT', col('id')), 'total_scans']
    ],
    where,
    group: [fn('DATE_TRUNC', trunc, col('log_datetime'))],
    raw: true
  });

  return rows.map((row) => ({
    period: row.period,
    distinct_time_in_students: Number(row.distinct_time_in_students) || 0,
    distinct_time_out_students: Number(row.distinct_time_out_students) || 0,
    time_in_scans: Number(row.time_in_scans) || 0,
    time_out_scans: Number(row.time_out_scans) || 0,
    total_scans: Number(row.total_scans) || 0
  }));
}

function pickLatestEnrollment(enrollments) {
  if (!Array.isArray(enrollments) || enrollments.length === 0) return null;
  return [...enrollments].sort((a, b) => {
    const aAt = new Date(a.updatedAt || a.createdAt || 0).getTime();
    const bAt = new Date(b.updatedAt || b.createdAt || 0).getTime();
    return bAt - aAt;
  })[0];
}

async function getTerminalGroupedLogsForCsv({ deviceId, rangeStart, rangeEnd, eventId = null }) {
  const where = {
    deviceId,
    studentId: { [Op.ne]: null },
    logType: { [Op.in]: ['TIME_IN', 'TIME_OUT'] },
    logDatetime: {
      [Op.gte]: rangeStart,
      [Op.lte]: rangeEnd
    }
  };
  if (eventId) where.eventId = eventId;

  const logs = await RawTimelog.findAll({
    where,
    attributes: ['id', 'logDatetime', 'logType', 'eventId', 'studentId'],
    include: [
      {
        model: Student,
        as: 'student',
        required: false,
        attributes: ['id', 'firstName', 'middleName', 'lastName', 'yearLevel'],
        include: [
          {
            model: StudentEnrollment,
            as: 'enrollments',
            required: false,
            where: { active: true, status: 'enrolled' },
            attributes: ['id', 'yearLevel', 'createdAt', 'updatedAt'],
            include: [
              { model: Course, as: 'course', required: false, attributes: ['id', 'name', 'code'] },
              { model: Section, as: 'section', required: false, attributes: ['id', 'name', 'code'] }
            ]
          }
        ]
      },
      {
        model: TimelogDevice,
        as: 'device',
        required: false,
        attributes: ['id', 'code', 'name']
      },
      {
        model: Event,
        as: 'event',
        required: false,
        attributes: ['id', 'name']
      }
    ],
    order: [['logDatetime', 'ASC']]
  });

  const grouped = new Map();
  for (const log of logs) {
    const j = log.toJSON ? log.toJSON() : log;
    const student = j.student;
    const day = localDateString(j.logDatetime);
    const groupEventId = j.event?.id || '';
    const key = `${j.studentId || ''}|${day}|${groupEventId}`;
    const enrollment = pickLatestEnrollment(student?.enrollments);
    if (!grouped.has(key)) {
      grouped.set(key, {
        student_full_name: [student?.firstName, student?.middleName, student?.lastName]
          .filter(Boolean)
          .join(' '),
        course_name: enrollment?.course?.name || '',
        year_level: enrollment?.yearLevel || student?.yearLevel || '',
        section_name: enrollment?.section?.name || '',
        event_name: j.event?.name || '',
        date: day,
        check_in_at: null,
        check_out_at: null
      });
    }
    const row = grouped.get(key);
    if (j.logType === 'TIME_IN') {
      if (!row.check_in_at || new Date(j.logDatetime).getTime() < new Date(row.check_in_at).getTime()) {
        row.check_in_at = j.logDatetime;
      }
    } else if (j.logType === 'TIME_OUT') {
      if (!row.check_out_at || new Date(j.logDatetime).getTime() > new Date(row.check_out_at).getTime()) {
        row.check_out_at = j.logDatetime;
      }
    }
  }

  return [...grouped.values()].sort((a, b) => {
    if (a.date !== b.date) return a.date.localeCompare(b.date);
    return (a.student_full_name || '').localeCompare(b.student_full_name || '', undefined, {
      sensitivity: 'base'
    });
  });
}

/**
 * In/out scan summary for a terminal on a date range.
 * Supports grouping by local date or by matched attendance subject.
 */
async function getTerminalInOutSummary({
  deviceId,
  rangeStart,
  rangeEnd,
  eventId = null,
  groupBy = 'date',
  studentId = null
}) {
  const where = {
    deviceId,
    logType: { [Op.in]: ['TIME_IN', 'TIME_OUT'] },
    logDatetime: {
      [Op.gte]: rangeStart,
      [Op.lte]: rangeEnd
    }
  };
  if (studentId) {
    where.studentId = studentId;
  } else {
    where.studentId = { [Op.ne]: null };
  }
  if (eventId) where.eventId = eventId;

  const include = [];
  if (groupBy === 'subject') {
    include.push({
      model: Attendance,
      as: 'matched_attendance',
      required: false,
      attributes: ['id', 'subjectId'],
      include: [
        {
          model: Subject,
          as: 'subject',
          required: false,
          attributes: ['id', 'name', 'code']
        }
      ]
    });
  }

  const logs = await RawTimelog.findAll({
    where,
    attributes: ['id', 'logDatetime', 'logType'],
    include,
    order: [['logDatetime', 'ASC']]
  });

  const grouped = new Map();
  for (const row of logs) {
    const json = row.toJSON ? row.toJSON() : row;
    let key;
    let base;
    if (groupBy === 'subject') {
      const subject = json.matched_attendance?.subject || null;
      const subjectId = subject?.id || null;
      key = subjectId || 'unmatched';
      base = {
        subject_id: subjectId,
        subject_name: subject?.name || 'Unmatched',
        subject_code: subject?.code || null,
        label: subject?.code || subject?.name || 'Unmatched',
        time_in_scans: 0,
        time_out_scans: 0,
        total_scans: 0
      };
    } else {
      const day = localDateString(json.logDatetime);
      key = day;
      base = {
        date: day,
        label: day,
        time_in_scans: 0,
        time_out_scans: 0,
        total_scans: 0
      };
    }

    if (!grouped.has(key)) grouped.set(key, base);
    const bucket = grouped.get(key);
    bucket.total_scans += 1;
    if (json.logType === 'TIME_IN') bucket.time_in_scans += 1;
    if (json.logType === 'TIME_OUT') bucket.time_out_scans += 1;
  }

  const rows = [...grouped.values()];
  if (groupBy === 'subject') {
    rows.sort((a, b) => (a.label || '').localeCompare(b.label || '', undefined, { sensitivity: 'base' }));
  } else {
    rows.sort((a, b) => (a.date || '').localeCompare(b.date || ''));
  }
  return rows;
}

module.exports = {
  distinctStudentsByTimeBucket,
  getTerminalGroupedLogsForCsv,
  getTerminalInOutSummary
};
