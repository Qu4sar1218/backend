'use strict';

const moment = require('moment-timezone');
const { Op } = require('sequelize');
const {
  Event,
  Section,
  Course,
  RawTimelog,
  StudentEnrollment,
  SectionSubjectTeacher,
  Subject,
  Attendance
} = require('../../sequelize/models');
const attendanceDataAccess = require('../../data-access/attendance/attendance-data-access');
const reportsDataAccess = require('../../data-access/reports/reports-data-access');
const { getTimezone, parseLocalDateStringRange, localDateString } = require('../../lib/school-timezone');
const { findDeviceByTerminal, isValidTerminalKey } = require('../../lib/timelog-terminal-devices');

function bucketKeyFromDbPeriod(period, granularity) {
  const tz = getTimezone();
  const m = moment.tz(period instanceof Date ? period : new Date(period), tz);
  if (granularity === 'daily') return m.format('YYYY-MM-DD');
  if (granularity === 'weekly') return m.clone().startOf('isoWeek').format('YYYY-MM-DD');
  return m.clone().startOf('month').format('YYYY-MM');
}

function generateBucketKeys(fromStr, toStr, granularity) {
  const tz = getTimezone();
  const keys = [];
  if (granularity === 'daily') {
    let m = moment.tz(fromStr, 'YYYY-MM-DD', tz);
    const end = moment.tz(toStr, 'YYYY-MM-DD', tz);
    while (m.isSameOrBefore(end, 'day')) {
      keys.push(m.format('YYYY-MM-DD'));
      m = m.clone().add(1, 'day');
    }
    return keys;
  }
  if (granularity === 'weekly') {
    let m = moment.tz(fromStr, 'YYYY-MM-DD', tz).startOf('isoWeek');
    const endWeekStart = moment.tz(toStr, 'YYYY-MM-DD', tz).startOf('isoWeek');
    while (m.isSameOrBefore(endWeekStart, 'day')) {
      keys.push(m.format('YYYY-MM-DD'));
      m = m.clone().add(1, 'week');
    }
    return keys;
  }
  let m = moment.tz(fromStr, 'YYYY-MM-DD', tz).startOf('month');
  const end = moment.tz(toStr, 'YYYY-MM-DD', tz);
  while (m.isSameOrBefore(end, 'month')) {
    keys.push(m.format('YYYY-MM'));
    m = m.clone().add(1, 'month');
  }
  return keys;
}

function formatLabel(periodKey, granularity) {
  const tz = getTimezone();
  if (granularity === 'daily') {
    return moment.tz(periodKey, 'YYYY-MM-DD', tz).format('MMM D');
  }
  if (granularity === 'weekly') {
    const start = moment.tz(periodKey, 'YYYY-MM-DD', tz);
    const end = start.clone().endOf('isoWeek');
    return `${start.format('MMM D')}–${end.format('MMM D')}`;
  }
  return moment.tz(periodKey + '-01', 'YYYY-MM-DD', tz).format('MMM YYYY');
}

function csvEscape(value) {
  return `"${String(value ?? '').replace(/"/g, '""')}"`;
}

function formatLocalTime(value) {
  if (!value) return '';
  const tz = getTimezone();
  return moment.tz(value instanceof Date ? value : new Date(value), tz).format('HH:mm:ss');
}

function buildCsv(header, rows) {
  return [header, ...rows].map((row) => row.map(csvEscape).join(',')).join('\n');
}

async function getTerminalAnalytics({ terminal, from, to, granularity, event_id }) {
  if (!isValidTerminalKey(terminal)) {
    throw Object.assign(new Error('Invalid terminal. Use hallway, classroom, or event.'), {
      statusCode: 400
    });
  }

  const g = granularity === 'weekly' ? 'weekly' : granularity === 'monthly' ? 'monthly' : 'daily';

  if (!from || !to) {
    throw Object.assign(new Error('from and to (YYYY-MM-DD) are required'), { statusCode: 400 });
  }

  const { start: rangeStart, end: rangeEnd } = parseLocalDateStringRange(from, to);
  if (rangeStart > rangeEnd) {
    throw Object.assign(new Error('from must be <= to'), { statusCode: 400 });
  }

  const device = await findDeviceByTerminal(terminal);
  if (!device) {
    return {
      terminal,
      granularity: g,
      from,
      to,
      device: null,
      event: null,
      series: [],
      note: 'No device configured for this terminal.'
    };
  }

  let eventId = null;
  let eventInfo = null;
  if (terminal === 'event') {
    if (event_id) {
      const ev = await Event.findByPk(event_id, { attributes: ['id', 'name'] });
      if (ev) {
        eventId = ev.id;
        eventInfo = { id: ev.id, name: ev.name };
      }
    } else {
      const ev = await Event.findOne({
        where: {
          status: true,
          startDate: { [Op.lte]: to },
          endDate: { [Op.gte]: from }
        },
        order: [['startDate', 'ASC']],
        attributes: ['id', 'name']
      });
      if (ev) {
        eventId = ev.id;
        eventInfo = { id: ev.id, name: ev.name };
      }
    }
    if (!eventId) {
      return {
        terminal,
        granularity: g,
        from,
        to,
        device: { id: device.id, code: device.code, name: device.name },
        event: null,
        series: [],
        note: 'No events overlap this date range (or specify event_id).'
      };
    }
  }

  const truncUnit = g === 'daily' ? 'day' : g === 'weekly' ? 'week' : 'month';
  const rawRows = await reportsDataAccess.distinctStudentsByTimeBucket({
    deviceId: device.id,
    eventId,
    rangeStart,
    rangeEnd,
    truncUnit
  });

  const countByKey = new Map();
  for (const row of rawRows) {
    const key = bucketKeyFromDbPeriod(row.period, g);
    countByKey.set(key, {
      distinct_time_in_students: Number(row.distinct_time_in_students) || 0,
      distinct_time_out_students: Number(row.distinct_time_out_students) || 0,
      time_in_scans: Number(row.time_in_scans) || 0,
      time_out_scans: Number(row.time_out_scans) || 0,
      total_scans: Number(row.total_scans) || 0
    });
  }

  const expectedKeys = generateBucketKeys(from, to, g);
  const series = expectedKeys.map((key) => {
    const bucket = countByKey.get(key) || {
      distinct_time_in_students: 0,
      distinct_time_out_students: 0,
      time_in_scans: 0,
      time_out_scans: 0,
      total_scans: 0
    };

    return {
      period_key: key,
      label: formatLabel(key, g),
      // Backward-compatible alias used by the current chart.
      distinct_students: bucket.distinct_time_in_students,
      distinct_time_in_students: bucket.distinct_time_in_students,
      distinct_time_out_students: bucket.distinct_time_out_students,
      time_in_scans: bucket.time_in_scans,
      time_out_scans: bucket.time_out_scans,
      total_scans: bucket.total_scans
    };
  });

  return {
    terminal,
    granularity: g,
    from,
    to,
    device: { id: device.id, code: device.code, name: device.name },
    event: eventInfo,
    series,
    note: null
  };
}

function resolveExportRange({ from, to }) {
  if (!from || !to) {
    throw Object.assign(new Error('from and to (YYYY-MM-DD) are required'), { statusCode: 400 });
  }
  const { start: rangeStart, end: rangeEnd } = parseLocalDateStringRange(from, to);
  if (rangeStart > rangeEnd) {
    throw Object.assign(new Error('from must be <= to'), { statusCode: 400 });
  }
  return { rangeStart, rangeEnd };
}

async function exportHallwayCsv({ from, to }) {
  const { rangeStart, rangeEnd } = resolveExportRange({ from, to });
  const device = await findDeviceByTerminal('hallway');
  const header = [
    'Student full name',
    'Course',
    'Year level',
    'Date',
    'Time check-in',
    'Time check-out'
  ];
  if (!device) {
    return {
      filename: `hallway_timelogs_${from}_${to}.csv`,
      csv: buildCsv(header, [])
    };
  }

  const logs = await reportsDataAccess.getTerminalGroupedLogsForCsv({
    deviceId: device.id,
    rangeStart,
    rangeEnd
  });

  const rows = logs.map((row) => {
    return [
      row.student_full_name || '',
      row.course_name || '',
      row.year_level || '',
      row.date || '',
      formatLocalTime(row.check_in_at),
      formatLocalTime(row.check_out_at)
    ];
  });

  return {
    filename: `hallway_timelogs_${from}_${to}.csv`,
    csv: buildCsv(header, rows)
  };
}

async function exportClassroomCsv({ from, to }) {
  const { rangeStart, rangeEnd } = resolveExportRange({ from, to });
  const device = await findDeviceByTerminal('classroom');
  const header = [
    'Section',
    'Course',
    'Student full name',
    'Date',
    'Time check-in',
    'Time check-out'
  ];
  if (!device) {
    return {
      filename: `classroom_timelogs_${from}_${to}.csv`,
      csv: buildCsv(header, [])
    };
  }

  const logs = await reportsDataAccess.getTerminalGroupedLogsForCsv({
    deviceId: device.id,
    rangeStart,
    rangeEnd
  });

  const rows = logs.map((row) => {
    return [
      row.section_name || '',
      row.course_name || '',
      row.student_full_name || '',
      row.date || '',
      formatLocalTime(row.check_in_at),
      formatLocalTime(row.check_out_at)
    ];
  });

  return {
    filename: `classroom_timelogs_${from}_${to}.csv`,
    csv: buildCsv(header, rows)
  };
}

async function exportEventCsv({ from, to, eventId }) {
  const { rangeStart, rangeEnd } = resolveExportRange({ from, to });
  const device = await findDeviceByTerminal('event');
  const header = [
    'Event name',
    'Student full name',
    'Date',
    'Time check-in',
    'Time check-out'
  ];
  if (!device) {
    return {
      filename: `event_timelogs_${from}_${to}.csv`,
      csv: buildCsv(header, [])
    };
  }

  const logs = await reportsDataAccess.getTerminalGroupedLogsForCsv({
    deviceId: device.id,
    rangeStart,
    rangeEnd,
    eventId: eventId || null
  });

  const rows = logs.map((row) => {
    return [
      row.event_name || '',
      row.student_full_name || '',
      row.date || '',
      formatLocalTime(row.check_in_at),
      formatLocalTime(row.check_out_at)
    ];
  });

  const suffix = eventId ? `_event_${eventId}` : '';
  return {
    filename: `event_timelogs_${from}_${to}${suffix}.csv`,
    csv: buildCsv(header, rows)
  };
}

async function getSectionAttendanceReport({ sectionId, date }) {
  if (!sectionId || !date) {
    throw Object.assign(new Error('section_id and date (YYYY-MM-DD) are required'), { statusCode: 400 });
  }

  const section = await Section.findByPk(sectionId, {
    include: [{ model: Course, as: 'course', attributes: ['id', 'name', 'code'], required: false }]
  });

  if (!section) {
    throw Object.assign(new Error('Section not found'), { statusCode: 404 });
  }

  const rows = await attendanceDataAccess.getAttendanceRowsForSectionDate({
    sectionId,
    attendanceDate: date
  });

  const jsonSection = section.toJSON();

  return {
    section: {
      id: jsonSection.id,
      name: jsonSection.name,
      code: jsonSection.code,
      course: jsonSection.course
        ? { id: jsonSection.course.id, name: jsonSection.course.name, code: jsonSection.course.code }
        : null
    },
    date,
    rows: rows.map((row) => {
      const j = row.toJSON();
      return {
        id: j.id,
        attendance_date: j.attendanceDate,
        status: j.status,
        first_scan_at: j.firstScanAt,
        last_scan_at: j.lastScanAt,
        time_in: j.timeIn,
        time_out: j.timeOut,
        student: j.student
          ? {
              id: j.student.id,
              full_name: [j.student.firstName, j.student.middleName, j.student.lastName]
                .filter(Boolean)
                .join(' '),
              student_id_number: j.student.studentIdNumber || null,
              image_url: j.student.user?.imageUrl ?? null
            }
          : null,
        subject: j.subject ? { id: j.subject.id, name: j.subject.name, code: j.subject.code } : null,
        teacher: j.teacher
          ? {
              id: j.teacher.id,
              full_name: [j.teacher.firstName, j.teacher.lastName].filter(Boolean).join(' ')
            }
          : null,
        assignment: j.assignment
          ? {
              id: j.assignment.id,
              start_time: j.assignment.startTime,
              end_time: j.assignment.endTime
            }
          : null
      };
    })
  };
}

async function getHallwayDailyComparison({ date }) {
  if (!date) {
    throw Object.assign(new Error('date (YYYY-MM-DD) is required'), { statusCode: 400 });
  }

  const { start, end } = parseLocalDateStringRange(date, date);
  const device = await findDeviceByTerminal('hallway');

  const enrolledTotal = await StudentEnrollment.count({
    where: { status: 'enrolled', active: true }
  });

  let distinctCheckIns = 0;
  let distinctCheckOuts = 0;
  if (device) {
    const baseWhere = {
      deviceId: device.id,
      studentId: { [Op.ne]: null },
      logDatetime: { [Op.gte]: start, [Op.lte]: end }
    };
    distinctCheckIns = await RawTimelog.count({
      where: { ...baseWhere, logType: 'TIME_IN' },
      distinct: true,
      col: 'student_id'
    });
    distinctCheckOuts = await RawTimelog.count({
      where: { ...baseWhere, logType: 'TIME_OUT' },
      distinct: true,
      col: 'student_id'
    });
  }

  const notScanned = Math.max(0, enrolledTotal - distinctCheckIns);

  return {
    date,
    enrolled_total: enrolledTotal,
    distinct_check_ins: distinctCheckIns,
    distinct_check_outs: distinctCheckOuts,
    not_scanned_in_hallway: notScanned
  };
}

async function getSectionAttendanceBySubject({ sectionId, date }) {
  if (!sectionId || !date) {
    throw Object.assign(new Error('section_id and date (YYYY-MM-DD) are required'), { statusCode: 400 });
  }

  const section = await Section.findByPk(sectionId);
  if (!section) {
    throw Object.assign(new Error('Section not found'), { statusCode: 404 });
  }

  const enrolledInSection = await StudentEnrollment.count({
    where: { sectionId, status: 'enrolled', active: true }
  });

  const assignments = await SectionSubjectTeacher.findAll({
    where: { sectionId, active: true },
    include: [{ model: Subject, as: 'subject', attributes: ['id', 'name', 'code'] }],
    order: [[{ model: Subject, as: 'subject' }, 'name', 'ASC']]
  });

  const attendanceRows = await Attendance.findAll({
    where: { sectionId, attendanceDate: date },
    attributes: ['subjectId', 'status']
  });

  const bySubject = new Map();
  for (const row of assignments) {
    const sj = row.subject;
    bySubject.set(row.subjectId, {
      subject_id: row.subjectId,
      subject_name: sj?.name || null,
      subject_code: sj?.code || null,
      enrolled_count: enrolledInSection,
      present: 0,
      late: 0,
      absent: 0,
      excused: 0,
      records: 0
    });
  }

  for (const row of attendanceRows) {
    const json = row.toJSON ? row.toJSON() : row;
    const sid = json.subjectId || json.subject_id;
    const bucket = bySubject.get(sid);
    if (!bucket) continue;
    bucket.records += 1;
    const st = String(json.status || '').toUpperCase();
    if (st === 'PRESENT') bucket.present += 1;
    else if (st === 'LATE') bucket.late += 1;
    else if (st === 'ABSENT') bucket.absent += 1;
    else if (st === 'EXCUSED') bucket.excused += 1;
  }

  const subjects = [...bySubject.values()].map((s) => ({
    ...s,
    present_or_late: s.present + s.late
  }));

  return {
    section_id: sectionId,
    section_name: section.name,
    section_code: section.code,
    date,
    enrolled_in_section: enrolledInSection,
    subjects
  };
}

async function getSectionAttendanceTrend({ sectionId, from, to }) {
  if (!sectionId || !from || !to) {
    throw Object.assign(new Error('section_id, from, and to (YYYY-MM-DD) are required'), {
      statusCode: 400
    });
  }

  const section = await Section.findByPk(sectionId);
  if (!section) {
    throw Object.assign(new Error('Section not found'), { statusCode: 404 });
  }

  const rows = await Attendance.findAll({
    where: {
      sectionId,
      attendanceDate: { [Op.gte]: from, [Op.lte]: to }
    },
    attributes: ['attendanceDate', 'status']
  });

  const byDate = new Map();
  for (const row of rows) {
    const json = row.toJSON ? row.toJSON() : row;
    const rawDate = json.attendanceDate;
    const d =
      rawDate instanceof Date ? localDateString(rawDate) : String(rawDate).slice(0, 10);
    if (!byDate.has(d)) {
      byDate.set(d, { present: 0, late: 0, absent: 0, excused: 0, records: 0 });
    }
    const b = byDate.get(d);
    b.records += 1;
    const st = String(json.status || '').toUpperCase();
    if (st === 'PRESENT') b.present += 1;
    else if (st === 'LATE') b.late += 1;
    else if (st === 'ABSENT') b.absent += 1;
    else if (st === 'EXCUSED') b.excused += 1;
  }

  const keys = generateBucketKeys(from, to, 'daily');
  const series = keys.map((periodKey) => {
    const b = byDate.get(periodKey) || {
      present: 0,
      late: 0,
      absent: 0,
      excused: 0,
      records: 0
    };
    return {
      date: periodKey,
      label: formatLabel(periodKey, 'daily'),
      present: b.present,
      late: b.late,
      absent: b.absent,
      excused: b.excused,
      records: b.records,
      present_or_late: b.present + b.late
    };
  });

  return {
    section_id: sectionId,
    from,
    to,
    series
  };
}

module.exports = {
  getTerminalAnalytics,
  exportHallwayCsv,
  exportClassroomCsv,
  exportEventCsv,
  getSectionAttendanceReport,
  getHallwayDailyComparison,
  getSectionAttendanceBySubject,
  getSectionAttendanceTrend
};
