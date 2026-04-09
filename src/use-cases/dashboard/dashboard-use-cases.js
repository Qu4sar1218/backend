'use strict';

const { Op, fn, col } = require('sequelize');
const {
  TimelogDevice,
  RawTimelog,
  Event,
  Attendance,
  StudentEnrollment,
  StudentSubjectAssignment,
  SectionSubjectTeacher,
  Section,
  Subject,
  Student,
  User,
  Role
} = require('../../sequelize/models');
const attendanceDataAccess = require('../../data-access/attendance/attendance-data-access');
const reportsDataAccess = require('../../data-access/reports/reports-data-access');
const { getFinalScheduleForStudent } = require('../../lib/student-final-schedule');
const {
  localDateString,
  localWeekStartMonday,
  addLocalDays,
  localDayRange,
  localWallClockFromDate,
  localWeekdayLabel,
  parseLocalDateStringRange,
  weekdayLabelFromYmd,
  isPastScheduledSessionEnd,
  enumerateLocalYmdInclusive
} = require('../../lib/school-timezone');
const { getDeviceCodeForTerminal, findDeviceByTerminal } = require('../../lib/timelog-terminal-devices');

/** Monday-based week labels in display order Mon–Sun (school timezone). */
const WEEKDAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function normalizeTime(value) {
  if (!value) return null;
  if (value instanceof Date) {
    return localWallClockFromDate(value);
  }
  const asString = String(value);
  return asString.length >= 5 ? asString.slice(0, 5) : asString;
}

function timeToMinutes(time) {
  if (!time || typeof time !== 'string' || !time.includes(':')) return Number.MAX_SAFE_INTEGER;
  const [h, m] = time.split(':');
  const hours = Number(h);
  const minutes = Number(m);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return Number.MAX_SAFE_INTEGER;
  return (hours * 60) + minutes;
}

/**
 * Per day: distinct students with ≥1 hallway raw timelog (multiple scans same day = 1).
 * Plus active enrollment row count (same basis as dashboard enrolled stat).
 */
async function getHallwayWeekStats() {
  const weekStart = localWeekStartMonday();
  const weekEndExclusive = addLocalDays(weekStart, 7);

  const [device, enrolledTotal] = await Promise.all([
    TimelogDevice.findOne({
      where: { code: getDeviceCodeForTerminal('hallway') },
      attributes: ['id']
    }),
    StudentEnrollment.count({
      where: { status: 'enrolled', active: true }
    })
  ]);

  const todayStr = localDateString(new Date());

  const days = [];
  for (let i = 0; i < 7; i += 1) {
    const d = addLocalDays(weekStart, i);
    days.push({
      date: localDateString(d),
      label: WEEKDAY_LABELS[i],
      hallway_students: 0
    });
  }

  if (!device) {
    return {
      week_start: localDateString(weekStart),
      week_end: localDateString(addLocalDays(weekStart, 6)),
      today: todayStr,
      enrolled_total: enrolledTotal,
      days
    };
  }

  const rows = await RawTimelog.findAll({
    attributes: [
      [fn('DATE_TRUNC', 'day', col('log_datetime')), 'day'],
      [fn('COUNT', fn('DISTINCT', col('student_id'))), 'cnt']
    ],
    where: {
      deviceId: device.id,
      studentId: { [Op.ne]: null },
      logDatetime: {
        [Op.gte]: weekStart,
        [Op.lt]: weekEndExclusive
      }
    },
    group: [fn('DATE_TRUNC', 'day', col('log_datetime'))],
    raw: true
  });

  const countByDay = new Map();
  for (const row of rows) {
    const key =
      row.day instanceof Date
        ? localDateString(row.day)
        : String(row.day).slice(0, 10);
    countByDay.set(key, Number(row.cnt) || 0);
  }

  for (const entry of days) {
    entry.hallway_students = countByDay.get(entry.date) ?? 0;
  }

  return {
    week_start: localDateString(weekStart),
    week_end: localDateString(addLocalDays(weekStart, 6)),
    today: todayStr,
    enrolled_total: enrolledTotal,
    days
  };
}

async function getTeacherWeeklySchedule(user) {
  if (!user?.id) {
    throw new Error('Authenticated user is required');
  }

  const assignments = await SectionSubjectTeacher.findAll({
    where: {
      teacherId: user.id,
      active: true
    },
    include: [
      { model: Section, as: 'section', attributes: ['id', 'name', 'code', 'active'] },
      { model: Subject, as: 'subject', attributes: ['id', 'name', 'code', 'active'] }
    ],
    order: [
      ['startTime', 'ASC'],
      [{ model: Section, as: 'section' }, 'name', 'ASC'],
      [{ model: Subject, as: 'subject' }, 'name', 'ASC']
    ]
  });

  const weeklySchedule = WEEKDAY_LABELS.map((label) => ({ day: label, items: [] }));
  const buckets = new Map(weeklySchedule.map((entry) => [entry.day, entry.items]));
  const unscheduled = [];

  for (const row of assignments) {
    const json = row.toJSON();
    const startTime = normalizeTime(json.startTime);
    const endTime = normalizeTime(json.endTime);
    const item = {
      assignmentId: json.id,
      sectionId: json.sectionId,
      sectionName: json.section?.name || null,
      sectionCode: json.section?.code || null,
      subjectId: json.subjectId,
      subjectName: json.subject?.name || null,
      subjectCode: json.subject?.code || null,
      startTime,
      endTime,
      note: json.note || null
    };

    const days = Array.isArray(json.daysOfWeek)
      ? [...new Set(json.daysOfWeek)].filter((day) => buckets.has(day))
      : [];

    if (days.length === 0) {
      unscheduled.push(item);
      continue;
    }

    for (const day of days) {
      buckets.get(day).push(item);
    }
  }

  for (const day of weeklySchedule) {
    day.items.sort((a, b) => {
      const byTime = timeToMinutes(a.startTime) - timeToMinutes(b.startTime);
      if (byTime !== 0) return byTime;
      const bySection = (a.sectionName || '').localeCompare(b.sectionName || '');
      if (bySection !== 0) return bySection;
      return (a.subjectName || '').localeCompare(b.subjectName || '');
    });
  }

  unscheduled.sort((a, b) => {
    const bySection = (a.sectionName || '').localeCompare(b.sectionName || '');
    if (bySection !== 0) return bySection;
    return (a.subjectName || '').localeCompare(b.subjectName || '');
  });

  return {
    teacher: {
      id: user.id,
      firstName: user.firstName || null,
      lastName: user.lastName || null
    },
    weeklySchedule,
    unscheduled
  };
}

async function buildStudentWeeklySchedule(user, { date = null } = {}) {
  if (!user?.id) {
    throw new Error('Authenticated user is required');
  }

  const student = await Student.findOne({
    where: {
      userId: user.id,
      active: true
    },
    attributes: ['id', 'firstName', 'lastName', 'studentIdNumber']
  });

  if (!student) {
    return {
      student: {
        id: null,
        firstName: user.firstName || null,
        lastName: user.lastName || null,
        studentIdNumber: null
      },
      section: null,
      weeklySchedule: WEEKDAY_LABELS.map((label) => ({ day: label, items: [] })),
      unscheduled: []
    };
  }

  const enrollment = await StudentEnrollment.findOne({
    where: {
      studentId: student.id,
      active: true,
      status: 'enrolled'
    },
    include: [
      { model: Section, as: 'section', attributes: ['id', 'name', 'code'] }
    ],
    order: [['updatedAt', 'DESC']]
  });

  if (!enrollment) {
    return {
      student: {
        id: student.id,
        firstName: student.firstName || null,
        lastName: student.lastName || null,
        studentIdNumber: student.studentIdNumber || null
      },
      section: null,
      weeklySchedule: WEEKDAY_LABELS.map((label) => ({ day: label, items: [] })),
      unscheduled: []
    };
  }

  const finalSchedule = await getFinalScheduleForStudent({
    studentId: student.id,
    date,
    teacherId: null
  });
  const assignments = finalSchedule.rows || [];

  const weeklySchedule = WEEKDAY_LABELS.map((label) => ({ day: label, items: [] }));
  const buckets = new Map(weeklySchedule.map((entry) => [entry.day, entry.items]));
  const unscheduled = [];

  for (const json of assignments) {
    const startTime = normalizeTime(json.startTime);
    const endTime = normalizeTime(json.endTime);
    const teacherFullName = [
      json.teacher?.firstName,
      json.teacher?.middleName,
      json.teacher?.lastName
    ].filter(Boolean).join(' ');

    const item = {
      assignmentId: json.assignmentId || null,
      sectionId: json.sectionId,
      sectionName: json.section?.name || null,
      sectionCode: json.section?.code || null,
      subjectId: json.subjectId,
      subjectName: json.subject?.name || null,
      subjectCode: json.subject?.code || null,
      teacherId: json.teacher?.id || null,
      teacherName: teacherFullName || null,
      startTime,
      endTime,
      note: json.note || null,
      source: json.source || 'SECTION'
    };

    const days = Array.isArray(json.daysOfWeek)
      ? [...new Set(json.daysOfWeek)].filter((day) => buckets.has(day))
      : [];

    if (days.length === 0) {
      unscheduled.push(item);
      continue;
    }

    for (const day of days) {
      buckets.get(day).push(item);
    }
  }

  for (const day of weeklySchedule) {
    day.items.sort((a, b) => {
      const byTime = timeToMinutes(a.startTime) - timeToMinutes(b.startTime);
      if (byTime !== 0) return byTime;
      return (a.subjectName || '').localeCompare(b.subjectName || '');
    });
  }

  unscheduled.sort((a, b) => (a.subjectName || '').localeCompare(b.subjectName || ''));

  return {
    student: {
      id: student.id,
      firstName: student.firstName || null,
      lastName: student.lastName || null,
      studentIdNumber: student.studentIdNumber || null
    },
    section: enrollment.section
      ? {
          id: enrollment.section.id,
          name: enrollment.section.name || null,
          code: enrollment.section.code || null
        }
      : null,
    weeklySchedule,
    unscheduled
  };
}

async function getStudentWeeklySchedule(user) {
  return buildStudentWeeklySchedule(user);
}

async function getStudentTodaySchedule(user) {
  const now = new Date();
  const weeklyPayload = await buildStudentWeeklySchedule(user, {
    date: localDateString(now)
  });
  const todayLabel = localWeekdayLabel(now);
  const todayBucket = weeklyPayload.weeklySchedule.find((day) => day.day === todayLabel);

  return {
    ...weeklyPayload,
    today: {
      date: localDateString(now),
      day: todayLabel,
      items: todayBucket ? todayBucket.items : []
    }
  };
}

async function resolveActiveStudentContext(user) {
  if (!user?.id) {
    throw new Error('Authenticated user is required');
  }

  const student = await Student.findOne({
    where: {
      userId: user.id,
      active: true
    },
    attributes: ['id', 'firstName', 'lastName', 'studentIdNumber']
  });

  if (!student) {
    return { student: null, enrollment: null };
  }

  const enrollment = await StudentEnrollment.findOne({
    where: {
      studentId: student.id,
      active: true,
      status: 'enrolled'
    },
    include: [
      { model: Section, as: 'section', attributes: ['id', 'name', 'code'] }
    ],
    order: [['updatedAt', 'DESC']]
  });

  return { student, enrollment: enrollment || null };
}

function mapStudentMeta(student, user) {
  return {
    id: student?.id || null,
    firstName: student?.firstName || user?.firstName || null,
    lastName: student?.lastName || user?.lastName || null,
    studentIdNumber: student?.studentIdNumber || null
  };
}

function mapSectionMeta(enrollment) {
  if (!enrollment?.section) return null;
  return {
    id: enrollment.section.id,
    name: enrollment.section.name || null,
    code: enrollment.section.code || null
  };
}

async function getStudentAttendance(user, filters = {}) {
  const { student, enrollment } = await resolveActiveStudentContext(user);
  if (!student) {
    return {
      student: mapStudentMeta(student, user),
      section: mapSectionMeta(enrollment),
      attendance: []
    };
  }

  const where = {
    studentId: student.id
  };

  if (filters.from || filters.to) {
    where.attendanceDate = {};
    if (filters.from) where.attendanceDate[Op.gte] = String(filters.from).slice(0, 10);
    if (filters.to) where.attendanceDate[Op.lte] = String(filters.to).slice(0, 10);
  }
  if (filters.subject_id) where.subjectId = filters.subject_id;
  if (filters.status) where.status = filters.status;

  const rows = await Attendance.findAll({
    where,
    include: [
      { model: Subject, as: 'subject', attributes: ['id', 'name', 'code'] },
      { model: Section, as: 'section', attributes: ['id', 'name', 'code'] },
      { model: User, as: 'teacher', attributes: ['id', 'firstName', 'lastName'] }
    ],
    order: [['attendanceDate', 'DESC'], ['createdAt', 'DESC']]
  });

  return {
    student: mapStudentMeta(student, user),
    section: mapSectionMeta(enrollment),
    attendance: rows.map((row) => {
      const json = row.toJSON();
      return {
        id: json.id,
        attendanceDate: json.attendanceDate,
        status: json.status,
        section: json.section
          ? { id: json.section.id, name: json.section.name, code: json.section.code }
          : null,
        subject: json.subject
          ? { id: json.subject.id, name: json.subject.name, code: json.subject.code }
          : null,
        teacher: json.teacher
          ? {
              id: json.teacher.id,
              firstName: json.teacher.firstName || null,
              lastName: json.teacher.lastName || null
            }
          : null,
        firstScanAt: json.firstScanAt,
        lastScanAt: json.lastScanAt,
        timeIn: json.timeIn,
        timeOut: json.timeOut
      };
    })
  };
}

async function getStudentAttendanceSummary(user, filters = {}) {
  const { student, enrollment } = await resolveActiveStudentContext(user);
  if (!student) {
    return {
      student: mapStudentMeta(student, user),
      section: mapSectionMeta(enrollment),
      total: 0,
      present: 0,
      late: 0,
      absent: 0,
      excused: 0
    };
  }

  const where = {
    studentId: student.id
  };
  if (filters.from || filters.to) {
    where.attendanceDate = {};
    if (filters.from) where.attendanceDate[Op.gte] = String(filters.from).slice(0, 10);
    if (filters.to) where.attendanceDate[Op.lte] = String(filters.to).slice(0, 10);
  }
  if (filters.subject_id) where.subjectId = filters.subject_id;
  if (filters.status) where.status = filters.status;

  const [total, present, late, absent, excused] = await Promise.all([
    Attendance.count({ where }),
    Attendance.count({ where: { ...where, status: 'PRESENT' } }),
    Attendance.count({ where: { ...where, status: 'LATE' } }),
    Attendance.count({ where: { ...where, status: 'ABSENT' } }),
    Attendance.count({ where: { ...where, status: 'EXCUSED' } })
  ]);

  return {
    student: mapStudentMeta(student, user),
    section: mapSectionMeta(enrollment),
    total,
    present,
    late,
    absent,
    excused
  };
}

async function getStudentTerminalTimelogSummary(user, filters = {}) {
  if (!user?.id) {
    throw new Error('Authenticated user is required');
  }

  const date = coerceDateString(filters.date) || localDateString(new Date());
  const { start: rangeStart, end: rangeEnd } = parseLocalDateStringRange(date, date);
  const { student, enrollment } = await resolveActiveStudentContext(user);

  const [hallwayDevice, classroomDevice, eventDevice, activeEvent] = await Promise.all([
    findDeviceByTerminal('hallway'),
    findDeviceByTerminal('classroom'),
    findDeviceByTerminal('event'),
    Event.findOne({
      where: {
        status: true,
        startDate: { [Op.lte]: date },
        endDate: { [Op.gte]: date }
      },
      order: [['startDate', 'ASC'], ['createdAt', 'ASC']],
      attributes: ['id', 'name']
    })
  ]);

  const emptyPayload = {
    date,
    hallway: {
      device: hallwayDevice ? { id: hallwayDevice.id, code: hallwayDevice.code, name: hallwayDevice.name } : null,
      series: [],
      note: hallwayDevice ? 'No hallway scans found for selected date.' : 'Hallway terminal device is not configured.'
    },
    classroom: {
      device: classroomDevice ? { id: classroomDevice.id, code: classroomDevice.code, name: classroomDevice.name } : null,
      series: [],
      note: classroomDevice ? 'No classroom scans found for selected date.' : 'Classroom terminal device is not configured.'
    },
    event: {
      device: eventDevice ? { id: eventDevice.id, code: eventDevice.code, name: eventDevice.name } : null,
      event: activeEvent ? { id: activeEvent.id, name: activeEvent.name } : null,
      series: [],
      note: eventDevice
        ? (activeEvent ? 'No event scans found for selected date.' : 'No active event on selected date.')
        : 'Event terminal device is not configured.'
    }
  };

  // Keep response stable for newly provisioned accounts without a linked active student profile.
  if (!student) {
    return {
      date,
      student: mapStudentMeta(null, user),
      section: mapSectionMeta(null),
      ...emptyPayload,
      hallway: { ...emptyPayload.hallway, note: 'No active student profile found.' },
      classroom: { ...emptyPayload.classroom, note: 'No active student profile found.' },
      event: { ...emptyPayload.event, note: 'No active student profile found.' }
    };
  }

  const studentId = student.id;

  const [hallwaySeries, classroomSeries, eventSeries] = await Promise.all([
    hallwayDevice
      ? reportsDataAccess.getTerminalInOutSummary({
          deviceId: hallwayDevice.id,
          rangeStart,
          rangeEnd,
          groupBy: 'date',
          studentId
        })
      : [],
    classroomDevice
      ? reportsDataAccess.getTerminalInOutSummary({
          deviceId: classroomDevice.id,
          rangeStart,
          rangeEnd,
          groupBy: 'subject',
          studentId
        })
      : [],
    eventDevice && activeEvent
      ? reportsDataAccess.getTerminalInOutSummary({
          deviceId: eventDevice.id,
          eventId: activeEvent.id,
          rangeStart,
          rangeEnd,
          groupBy: 'date',
          studentId
        })
      : []
  ]);

  return {
    date,
    student: mapStudentMeta(student, user),
    section: mapSectionMeta(enrollment),
    hallway: {
      device: hallwayDevice ? { id: hallwayDevice.id, code: hallwayDevice.code, name: hallwayDevice.name } : null,
      series: hallwaySeries,
      note: hallwayDevice
        ? (hallwaySeries.length ? null : 'No hallway scans found for you on selected date.')
        : 'Hallway terminal device is not configured.'
    },
    classroom: {
      device: classroomDevice ? { id: classroomDevice.id, code: classroomDevice.code, name: classroomDevice.name } : null,
      series: classroomSeries,
      note: classroomDevice
        ? (classroomSeries.length ? null : 'No classroom scans found for you on selected date.')
        : 'Classroom terminal device is not configured.'
    },
    event: {
      device: eventDevice ? { id: eventDevice.id, code: eventDevice.code, name: eventDevice.name } : null,
      event: activeEvent ? { id: activeEvent.id, name: activeEvent.name } : null,
      series: eventSeries,
      note: eventDevice
        ? (activeEvent
          ? (eventSeries.length ? null : 'No event scans found for you on selected date.')
          : 'No active event on selected date.')
        : 'Event terminal device is not configured.'
    }
  };
}

async function resolveTargetTeacherIdForAssignedSections(requestingUser, query = {}) {
  const raw = query.teacherId;
  const hasParam = raw !== undefined && raw !== null && String(raw).trim() !== '';
  const roleName = requestingUser?.role?.name;

  if (hasParam) {
    if (roleName !== 'Admin') {
      const err = new Error('Only administrators may specify teacherId');
      err.statusCode = 403;
      throw err;
    }
    const teacherRole = await Role.findOne({ where: { name: 'Teacher' } });
    if (!teacherRole) throw new Error('Teacher role not found');
    const teacher = await User.findOne({
      where: {
        id: String(raw).trim(),
        roleId: teacherRole.id,
        active: true
      }
    });
    if (!teacher) {
      const err = new Error('Teacher not found');
      err.statusCode = 404;
      throw err;
    }
    return teacher.id;
  }

  if (roleName === 'Admin') {
    return null;
  }

  return requestingUser.id;
}

async function getTeacherAssignedSections(requestingUser, query) {
  if (!requestingUser?.id) {
    throw new Error('Authenticated user is required');
  }

  let targetTeacherId;
  if (query === undefined) {
    targetTeacherId = requestingUser.id;
  } else {
    targetTeacherId = await resolveTargetTeacherIdForAssignedSections(requestingUser, query);
  }
  if (targetTeacherId === null) {
    return { sections: [], assignmentRosters: [] };
  }

  const assignments = await SectionSubjectTeacher.findAll({
    where: {
      teacherId: targetTeacherId,
      active: true
    },
    include: [
      { model: Section, as: 'section', attributes: ['id', 'name', 'code'] },
      { model: Subject, as: 'subject', attributes: ['id', 'name', 'code'] }
    ],
    attributes: ['id', 'sectionId', 'subjectId', 'teacherId', 'startTime', 'endTime', 'daysOfWeek'],
    order: [[{ model: Section, as: 'section' }, 'name', 'ASC']]
  });

  const sectionById = new Map();
  const assignmentById = new Map();
  const assignmentRosterById = new Map();
  for (const row of assignments) {
    const json = row.toJSON();
    if (!json.section?.id) continue;
    sectionById.set(json.section.id, {
      sectionId: json.section.id,
      sectionName: json.section.name || null,
      sectionCode: json.section.code || null,
      students: []
    });
    assignmentById.set(json.id, {
      assignmentId: json.id,
      sectionId: json.sectionId,
      sectionName: json.section?.name || null,
      sectionCode: json.section?.code || null,
      subjectId: json.subjectId,
      subjectName: json.subject?.name || null,
      subjectCode: json.subject?.code || null,
      startTime: normalizeTime(json.startTime),
      endTime: normalizeTime(json.endTime),
      daysOfWeek: Array.isArray(json.daysOfWeek) ? json.daysOfWeek : []
    });
    assignmentRosterById.set(json.id, []);
  }

  const sectionIds = [...sectionById.keys()];
  if (sectionIds.length === 0) {
    return { sections: [], assignmentRosters: [] };
  }

  const enrollments = await StudentEnrollment.findAll({
    where: {
      sectionId: { [Op.in]: sectionIds },
      active: true,
      status: 'enrolled'
    },
    include: [
      {
        model: Student,
        as: 'student',
        attributes: ['id', 'firstName', 'middleName', 'lastName', 'studentIdNumber'],
        include: [
          {
            model: User,
            as: 'user',
            attributes: ['imageUrl']
          }
        ]
      }
    ],
    attributes: ['sectionId', 'status'],
    order: [
      [{ model: Student, as: 'student' }, 'lastName', 'ASC'],
      [{ model: Student, as: 'student' }, 'firstName', 'ASC']
    ]
  });

  for (const row of enrollments) {
    const json = row.toJSON();
    const section = sectionById.get(json.sectionId);
    if (!section || !json.student?.id) continue;
    const fullName = [json.student.firstName, json.student.middleName, json.student.lastName]
      .filter(Boolean)
      .join(' ');
    const studentRow = {
      studentId: json.student.id,
      fullName,
      studentIdNumber: json.student.studentIdNumber || null,
      status: json.status || null,
      imageUrl: json.student.user?.imageUrl || null
    };
    section.students.push(studentRow);

    // Per-assignment roster: all enrolled students in this section (regular + irregular).
    for (const assignment of assignmentById.values()) {
      if (assignment.sectionId !== json.sectionId) continue;
      const roster = assignmentRosterById.get(assignment.assignmentId) || [];
      if (!roster.some((x) => x.studentId === studentRow.studentId)) {
        roster.push(studentRow);
      }
      assignmentRosterById.set(assignment.assignmentId, roster);
    }
  }

  const studentById = new Map();
  for (const section of sectionById.values()) {
    for (const studentRow of section.students) {
      studentById.set(studentRow.studentId, studentRow);
    }
  }

  // Add irregular override-linked students by assignment context and merge into section rosters.
  const today = localDateString(new Date());
  const assignmentIds = [...assignmentById.keys()];
  const overrideRows = await StudentSubjectAssignment.findAll({
    where: {
      active: true,
      [Op.or]: [
        { teacherId: targetTeacherId },
        { sectionSubjectTeacherId: { [Op.in]: assignmentIds } }
      ],
      effectiveFrom: { [Op.or]: [null, { [Op.lte]: today }] },
      effectiveTo: { [Op.or]: [null, { [Op.gte]: today }] }
    },
    include: [
      {
        model: SectionSubjectTeacher,
        as: 'assignment',
        attributes: ['id', 'sectionId', 'teacherId'],
        required: false
      },
      {
        model: StudentEnrollment,
        as: 'enrollment',
        attributes: ['id', 'studentId', 'sectionId', 'status', 'active'],
        include: [
          {
            model: Student,
            as: 'student',
            attributes: ['id', 'firstName', 'middleName', 'lastName', 'studentIdNumber'],
            include: [{ model: User, as: 'user', attributes: ['imageUrl'] }]
          }
        ]
      }
    ]
  });

  for (const override of overrideRows) {
    const o = override.toJSON();
    if (!o.enrollment?.active || o.enrollment?.status !== 'enrolled' || !o.enrollment?.student) continue;
    if (o.teacherId && o.teacherId !== targetTeacherId && o.assignment?.teacherId !== targetTeacherId) continue;

    const fullName = [o.enrollment.student.firstName, o.enrollment.student.middleName, o.enrollment.student.lastName]
      .filter(Boolean)
      .join(' ');
    const studentRow = {
      studentId: o.enrollment.student.id,
      fullName,
      studentIdNumber: o.enrollment.student.studentIdNumber || null,
      status: o.enrollment.status || null,
      imageUrl: o.enrollment.student.user?.imageUrl || null
    };
    studentById.set(studentRow.studentId, studentRow);

    if (o.sectionSubjectTeacherId && assignmentRosterById.has(o.sectionSubjectTeacherId)) {
      const list = assignmentRosterById.get(o.sectionSubjectTeacherId);
      if (!list.some((x) => x.studentId === studentRow.studentId)) {
        list.push(studentRow);
      }
    } else {
      for (const assignment of assignmentById.values()) {
        if (assignment.subjectId === o.subjectId) {
          const list = assignmentRosterById.get(assignment.assignmentId);
          if (!list.some((x) => x.studentId === studentRow.studentId)) {
            list.push(studentRow);
          }
        }
      }
    }

    const targetSectionId =
      o.sectionId
      || o.assignment?.sectionId
      || o.enrollment?.sectionId
      || null;
    if (!targetSectionId) continue;
    const sectionRoster = sectionById.get(targetSectionId);
    if (!sectionRoster) continue;
    if (!sectionRoster.students.some((x) => x.studentId === studentRow.studentId)) {
      sectionRoster.students.push(studentRow);
    }
  }

  const sections = [...sectionById.values()]
    .map((section) => ({
      ...section,
      students: section.students.sort((a, b) => (a.fullName || '').localeCompare(b.fullName || ''))
    }))
    .sort((a, b) => {
      const byName = (a.sectionName || '').localeCompare(b.sectionName || '');
      if (byName !== 0) return byName;
      return (a.sectionCode || '').localeCompare(b.sectionCode || '');
    });

  const assignmentRosters = [...assignmentById.values()].map((assignment) => ({
    ...assignment,
    students: (assignmentRosterById.get(assignment.assignmentId) || [])
      .slice()
      .sort((a, b) => (a.fullName || '').localeCompare(b.fullName || ''))
  }));

  return {
    sections,
    assignmentRosters
  };
}

async function getTeacherTeachingAssignments(user) {
  if (!user?.id) {
    throw new Error('Authenticated user is required');
  }

  const rows = await SectionSubjectTeacher.findAll({
    where: {
      teacherId: user.id,
      active: true
    },
    include: [
      { model: Section, as: 'section', attributes: ['id', 'name', 'code'] },
      { model: Subject, as: 'subject', attributes: ['id', 'name', 'code'] }
    ],
    order: [
      [{ model: Section, as: 'section' }, 'name', 'ASC'],
      [{ model: Subject, as: 'subject' }, 'name', 'ASC']
    ]
  });

  return {
    assignments: rows.map((row) => {
      const json = row.toJSON();
      return {
        assignmentId: json.id,
        sectionId: json.sectionId,
        sectionName: json.section?.name ?? null,
        sectionCode: json.section?.code ?? null,
        subjectId: json.subjectId,
        subjectName: json.subject?.name ?? null,
        subjectCode: json.subject?.code ?? null,
        startTime: json.startTime ?? null,
        endTime: json.endTime ?? null
      };
    })
  };
}

async function getTeacherAttendance(user, filters = {}) {
  if (!user?.id) {
    throw new Error('Authenticated user is required');
  }

  const rows = await attendanceDataAccess.getTeacherAttendance({
    teacherId: user.id,
    from: filters.from || null,
    to: filters.to || null,
    sectionId: filters.section_id || null,
    subjectId: filters.subject_id || null,
    status: filters.status || null
  });

  return {
    attendance: rows.map((row) => {
      const json = row.toJSON();
      return {
        id: json.id,
        attendanceDate: json.attendanceDate,
        status: json.status,
        student: json.student
          ? {
              id: json.student.id,
              fullName: [json.student.firstName, json.student.middleName, json.student.lastName].filter(Boolean).join(' '),
              studentIdNumber: json.student.studentIdNumber || null
            }
          : null,
        section: json.section
          ? { id: json.section.id, name: json.section.name, code: json.section.code }
          : null,
        subject: json.subject
          ? { id: json.subject.id, name: json.subject.name, code: json.subject.code }
          : null,
        firstScanAt: json.firstScanAt,
        lastScanAt: json.lastScanAt,
        timeIn: json.timeIn,
        timeOut: json.timeOut
      };
    })
  };
}

async function getTeacherAttendanceSummary(user, filters = {}) {
  if (!user?.id) {
    throw new Error('Authenticated user is required');
  }

  const summary = await attendanceDataAccess.getTeacherAttendanceSummary({
    teacherId: user.id,
    from: filters.from || null,
    to: filters.to || null,
    sectionId: filters.section_id || null,
    subjectId: filters.subject_id || null
  });

  const from = coerceDateString(filters.from);
  const to = coerceDateString(filters.to);
  const assignmentId = filters.assignment_id || filters.assignmentId || null;

  if (!from || !to || from !== to || !assignmentId) {
    return summary;
  }

  const assigned = await getTeacherAssignedSections(user);
  const rosters = Array.isArray(assigned.assignmentRosters) ? assigned.assignmentRosters : [];
  const rosterEntry = rosters.find((a) => a.assignmentId === assignmentId);
  if (!rosterEntry) {
    return summary;
  }

  const daysOfWeek = Array.isArray(rosterEntry.daysOfWeek) ? rosterEntry.daysOfWeek : [];
  const dayLabels = normalizeDayLabelSet(daysOfWeek);
  const ymdLabel = weekdayLabelFromYmd(from);
  if (!dayLabels.has(ymdLabel)) {
    return summary;
  }

  if (!isPastScheduledSessionEnd(from, rosterEntry.endTime, new Date())) {
    return summary;
  }

  const rosterIds = (rosterEntry.students || []).map((s) => s.studentId).filter(Boolean);
  const studentIdsWithRow = await attendanceDataAccess.getTeacherAttendanceStudentIdsForDay({
    teacherId: user.id,
    attendanceDate: from,
    sectionId: rosterEntry.sectionId,
    subjectId: rosterEntry.subjectId
  });

  let implicitAbsent = 0;
  for (const sid of rosterIds) {
    if (!studentIdsWithRow.has(sid)) {
      implicitAbsent += 1;
    }
  }

  return {
    ...summary,
    absent: summary.absent + implicitAbsent
  };
}

function coerceDateString(value) {
  if (!value) return null;
  const s = String(value).slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : null;
}

function normalizeDayLabelSet(daysOfWeek) {
  if (!Array.isArray(daysOfWeek) || !daysOfWeek.length) return new Set();
  return new Set(daysOfWeek.map((d) => String(d).trim().slice(0, 3)));
}

async function resolveCurrentActiveEvent() {
  const todayStr = localDateString(new Date());
  const activeEvent = await Event.findOne({
    where: {
      status: true,
      startDate: { [Op.lte]: todayStr },
      endDate: { [Op.gte]: todayStr }
    },
    order: [['startDate', 'ASC'], ['createdAt', 'ASC']],
    attributes: ['id', 'name', 'eventDate', 'startDate', 'endDate', 'timeStart', 'timeEnd']
  });
  if (!activeEvent) return null;
  const e = activeEvent.toJSON();
  return {
    id: e.id,
    name: e.name,
    eventDate: e.eventDate,
    startDate: e.startDate,
    endDate: e.endDate,
    timeStart: e.timeStart,
    timeEnd: e.timeEnd
  };
}

function resolveEventAttendanceRange(filters = {}) {
  const from = coerceDateString(filters.from || filters.date_from);
  const to = coerceDateString(filters.to || filters.date_to);
  if (from && to) {
    const { start, end } = localDayRange(new Date(`${from}T12:00:00`));
    const { end: toEnd } = localDayRange(new Date(`${to}T12:00:00`));
    return { start, end: toEnd, from, to };
  }
  const today = localDateString(new Date());
  const { start, end } = localDayRange(new Date());
  return { start, end, from: today, to: today };
}

async function resolveTeacherSectionIds(user) {
  const assigned = await getTeacherAssignedSections(user);
  const sections = Array.isArray(assigned?.sections) ? assigned.sections : [];
  return [...new Set(sections.map((s) => s.sectionId).filter(Boolean))];
}

async function buildActiveEventAttendancePayload({ sectionScopeIds = null, filters = {} } = {}) {
  const [eventDevice, activeEvent] = await Promise.all([
    TimelogDevice.findOne({ where: { code: getDeviceCodeForTerminal('event') }, attributes: ['id', 'code', 'name'] }),
    resolveCurrentActiveEvent()
  ]);

  const base = {
    active_event: activeEvent,
    device: eventDevice
      ? { id: eventDevice.id, code: eventDevice.code, name: eventDevice.name }
      : null,
    range: null,
    totals: {
      sections: 0,
      students: 0,
      logs: 0,
      time_in: 0,
      time_out: 0
    },
    sections: []
  };

  if (!eventDevice) {
    return { ...base, note: 'Event face terminal device is not configured.' };
  }
  if (!activeEvent) {
    return { ...base, note: 'No active event today.' };
  }

  const range = resolveEventAttendanceRange(filters);
  const rows = await RawTimelog.findAll({
    where: {
      deviceId: eventDevice.id,
      eventId: activeEvent.id,
      logType: { [Op.in]: ['TIME_IN', 'TIME_OUT'] },
      studentId: { [Op.ne]: null },
      logDatetime: { [Op.gte]: range.start, [Op.lte]: range.end }
    },
    include: [
      {
        model: Student,
        as: 'student',
        attributes: ['id', 'firstName', 'middleName', 'lastName', 'studentIdNumber'],
        include: [{ model: User, as: 'user', attributes: ['imageUrl'] }]
      }
    ],
    order: [['logDatetime', 'DESC']]
  });

  if (!rows.length) {
    return { ...base, range: { from: range.from, to: range.to }, note: 'No event scan logs found for selected range.' };
  }

  const studentIds = [...new Set(rows.map((r) => r.studentId).filter(Boolean))];
  const enrollmentWhere = {
    studentId: { [Op.in]: studentIds },
    active: true,
    status: 'enrolled'
  };
  if (Array.isArray(sectionScopeIds)) {
    if (!sectionScopeIds.length) {
      return { ...base, range: { from: range.from, to: range.to }, note: 'No assigned section scope.' };
    }
    enrollmentWhere.sectionId = { [Op.in]: sectionScopeIds };
  }

  const enrollments = await StudentEnrollment.findAll({
    where: enrollmentWhere,
    include: [{ model: Section, as: 'section', attributes: ['id', 'name', 'code'] }],
    attributes: ['studentId', 'sectionId']
  });

  const sectionByStudentId = new Map();
  for (const enr of enrollments) {
    const e = enr.toJSON();
    if (!e.studentId || !e.section?.id) continue;
    sectionByStudentId.set(e.studentId, {
      sectionId: e.section.id,
      sectionName: e.section.name || null,
      sectionCode: e.section.code || null
    });
  }

  const sectionMap = new Map();
  for (const row of rows) {
    const r = row.toJSON();
    const studentId = r.studentId;
    if (!studentId) continue;
    const sectionMeta = sectionByStudentId.get(studentId);
    if (!sectionMeta) continue;

    if (!sectionMap.has(sectionMeta.sectionId)) {
      sectionMap.set(sectionMeta.sectionId, {
        section_id: sectionMeta.sectionId,
        section_name: sectionMeta.sectionName,
        section_code: sectionMeta.sectionCode,
        totals: { students: 0, logs: 0, time_in: 0, time_out: 0 },
        students: new Map()
      });
    }
    const sectionBucket = sectionMap.get(sectionMeta.sectionId);
    if (!sectionBucket.students.has(studentId)) {
      const fullName = [r.student?.firstName, r.student?.middleName, r.student?.lastName]
        .filter(Boolean)
        .join(' ');
      sectionBucket.students.set(studentId, {
        student_id: studentId,
        student_number: r.student?.studentIdNumber || null,
        full_name: fullName || 'Unknown Student',
        image_url: r.student?.user?.imageUrl || null,
        time_in_count: 0,
        time_out_count: 0,
        last_log_type: null,
        last_log_at: null
      });
    }
    const studentBucket = sectionBucket.students.get(studentId);
    sectionBucket.totals.logs += 1;
    if (r.logType === 'TIME_IN') {
      sectionBucket.totals.time_in += 1;
      studentBucket.time_in_count += 1;
    } else if (r.logType === 'TIME_OUT') {
      sectionBucket.totals.time_out += 1;
      studentBucket.time_out_count += 1;
    }
    if (!studentBucket.last_log_at || new Date(r.logDatetime).getTime() > new Date(studentBucket.last_log_at).getTime()) {
      studentBucket.last_log_at = r.logDatetime;
      studentBucket.last_log_type = r.logType;
    }
  }

  const sections = [...sectionMap.values()]
    .map((bucket) => {
      const students = [...bucket.students.values()].sort((a, b) =>
        (a.full_name || '').localeCompare(b.full_name || '')
      );
      return {
        section_id: bucket.section_id,
        section_name: bucket.section_name,
        section_code: bucket.section_code,
        totals: { ...bucket.totals, students: students.length },
        students
      };
    })
    .sort((a, b) => (a.section_name || '').localeCompare(b.section_name || ''));

  const totals = sections.reduce(
    (acc, section) => {
      acc.sections += 1;
      acc.students += section.totals.students;
      acc.logs += section.totals.logs;
      acc.time_in += section.totals.time_in;
      acc.time_out += section.totals.time_out;
      return acc;
    },
    { sections: 0, students: 0, logs: 0, time_in: 0, time_out: 0 }
  );

  return {
    ...base,
    range: { from: range.from, to: range.to },
    totals,
    sections,
    note: sections.length ? null : 'No section-scoped student logs found for selected range.'
  };
}

async function getTeacherAttendanceMetrics(user, filters = {}) {
  if (!user?.id) {
    throw new Error('Authenticated user is required');
  }

  const from = coerceDateString(filters.from);
  const to = coerceDateString(filters.to);
  if (!from || !to) {
    throw Object.assign(new Error('from and to are required in YYYY-MM-DD format.'), { statusCode: 400 });
  }

  const assigned = await getTeacherAssignedSections(user);
  const assignmentRosters = Array.isArray(assigned.assignmentRosters) ? assigned.assignmentRosters : [];
  const enrolledByAssignmentId = new Map();
  const rosterStudentIdsByAssignmentId = new Map();
  const metaByAssignmentId = new Map();
  for (const a of assignmentRosters) {
    const count = Array.isArray(a.students) ? a.students.length : 0;
    enrolledByAssignmentId.set(a.assignmentId, count);
    rosterStudentIdsByAssignmentId.set(
      a.assignmentId,
      (Array.isArray(a.students) ? a.students : []).map((s) => s.studentId).filter(Boolean)
    );
    metaByAssignmentId.set(a.assignmentId, {
      assignmentId: a.assignmentId,
      sectionId: a.sectionId,
      sectionName: a.sectionName ?? null,
      subjectId: a.subjectId,
      subjectName: a.subjectName ?? null,
      startTime: a.startTime ?? null,
      endTime: a.endTime ?? null,
      daysOfWeek: Array.isArray(a.daysOfWeek) ? a.daysOfWeek : []
    });
  }

  const metrics = await attendanceDataAccess.getTeacherAttendanceMetricsByAssignment({
    teacherId: user.id,
    from,
    to
  });

  const attendanceRowsBulk = await attendanceDataAccess.getTeacherAttendanceRowsInRangeForTeacher({
    teacherId: user.id,
    from,
    to
  });
  const attendanceByAssignmentDateStudent = new Map();
  for (const row of attendanceRowsBulk) {
    const j = row.toJSON ? row.toJSON() : row;
    const rawDate = j.attendanceDate;
    const dateStr =
      rawDate instanceof Date ? localDateString(rawDate) : String(rawDate || '').slice(0, 10);
    const aid = j.sectionSubjectTeacherId;
    const sid = j.studentId;
    if (!aid || !sid || !dateStr) continue;
    const key = `${aid}|${dateStr}|${sid}`;
    if (!attendanceByAssignmentDateStudent.has(key)) {
      attendanceByAssignmentDateStudent.set(key, j.status);
    }
  }

  const now = new Date();
  const todayStr = localDateString(now);
  const rangeDays = enumerateLocalYmdInclusive(from, to);

  const countsByAssignmentId = new Map();
  for (const row of metrics) {
    const cur = countsByAssignmentId.get(row.assignmentId) ?? {
      presentDistinct: 0,
      lateDistinct: 0,
      absentDistinct: 0,
      excusedDistinct: 0
    };
    if (row.status === 'PRESENT') cur.presentDistinct += row.distinctStudents;
    if (row.status === 'LATE') cur.lateDistinct += row.distinctStudents;
    if (row.status === 'ABSENT') cur.absentDistinct += row.distinctStudents;
    if (row.status === 'EXCUSED') cur.excusedDistinct += row.distinctStudents;
    countsByAssignmentId.set(row.assignmentId, cur);
  }

  const slotCountsByAssignmentId = new Map();
  for (const [assignmentId, meta] of metaByAssignmentId.entries()) {
    const dayLabels = normalizeDayLabelSet(meta.daysOfWeek || []);
    const rosterIds = rosterStudentIdsByAssignmentId.get(assignmentId) ?? [];
    if (!dayLabels.size || !rosterIds.length) {
      slotCountsByAssignmentId.set(assignmentId, {
        presentSlots: 0,
        lateSlots: 0,
        absentSlots: 0,
        excusedSlots: 0,
        expectedSlots: 0
      });
      continue;
    }

    let presentSlots = 0;
    let lateSlots = 0;
    let absentSlots = 0;
    let excusedSlots = 0;
    let expectedSlots = 0;

    for (const ymd of rangeDays) {
      if (ymd > todayStr) continue;
      if (!dayLabels.has(weekdayLabelFromYmd(ymd))) continue;
      if (!isPastScheduledSessionEnd(ymd, meta.endTime, now)) continue;

      for (const studentId of rosterIds) {
        expectedSlots += 1;
        const key = `${assignmentId}|${ymd}|${studentId}`;
        const status = attendanceByAssignmentDateStudent.get(key);
        if (!status) {
          absentSlots += 1;
        } else if (status === 'PRESENT') {
          presentSlots += 1;
        } else if (status === 'LATE') {
          lateSlots += 1;
        } else if (status === 'ABSENT') {
          absentSlots += 1;
        } else if (status === 'EXCUSED') {
          excusedSlots += 1;
        }
      }
    }

    slotCountsByAssignmentId.set(assignmentId, {
      presentSlots,
      lateSlots,
      absentSlots,
      excusedSlots,
      expectedSlots
    });
  }

  const assignments = [];
  for (const [assignmentId, meta] of metaByAssignmentId.entries()) {
    const enrolledTotal = enrolledByAssignmentId.get(assignmentId) ?? 0;
    const counts = countsByAssignmentId.get(assignmentId) ?? {
      presentDistinct: 0,
      lateDistinct: 0,
      absentDistinct: 0,
      excusedDistinct: 0
    };
    const slots = slotCountsByAssignmentId.get(assignmentId) ?? {
      presentSlots: 0,
      lateSlots: 0,
      absentSlots: 0,
      excusedSlots: 0,
      expectedSlots: 0
    };
    const { daysOfWeek: _dw, ...metaRest } = meta;
    assignments.push({
      ...metaRest,
      enrolledTotal,
      ...counts,
      ...slots
    });
  }

  assignments.sort((a, b) => {
    const bySection = (a.sectionName || '').localeCompare(b.sectionName || '');
    if (bySection !== 0) return bySection;
    return (a.subjectName || '').localeCompare(b.subjectName || '');
  });

  return {
    period: { from, to },
    assignments
  };
}

async function getAdminActiveEventAttendance(filters = {}) {
  return buildActiveEventAttendancePayload({ filters });
}

async function getTeacherActiveEventAttendance(user, filters = {}) {
  if (!user?.id) {
    throw new Error('Authenticated user is required');
  }
  const sectionScopeIds = await resolveTeacherSectionIds(user);
  return buildActiveEventAttendancePayload({
    sectionScopeIds,
    filters
  });
}

async function getAdminStats() {
  const today = new Date();
  const todayStr = localDateString(today);
  const { start: todayStartUtc, end: todayEndUtc } = localDayRange(today);

  const [hallwayDevice, eventDevice, activeEvent] = await Promise.all([
    TimelogDevice.findOne({ where: { code: getDeviceCodeForTerminal('hallway') }, attributes: ['id'] }),
    TimelogDevice.findOne({ where: { code: getDeviceCodeForTerminal('event') }, attributes: ['id'] }),
    Event.findOne({
      where: {
        status: true,
        startDate: { [Op.lte]: todayStr },
        endDate: { [Op.gte]: todayStr }
      },
      order: [['startDate', 'ASC'], ['createdAt', 'ASC']],
      attributes: ['id', 'name']
    })
  ]);

  const hallwayBaseWhere = {
    studentId: { [Op.ne]: null },
    logDatetime: { [Op.gte]: todayStartUtc, [Op.lte]: todayEndUtc }
  };

  const [checksInHallway, checksOutHallway, totalAttendedEvent] = await Promise.all([
    hallwayDevice
      ? RawTimelog.count({
          where: { ...hallwayBaseWhere, deviceId: hallwayDevice.id, logType: 'TIME_IN' },
          distinct: true,
          col: 'student_id'
        })
      : 0,
    hallwayDevice
      ? RawTimelog.count({
          where: { ...hallwayBaseWhere, deviceId: hallwayDevice.id, logType: 'TIME_OUT' },
          distinct: true,
          col: 'student_id'
        })
      : 0,
    (eventDevice && activeEvent)
      ? RawTimelog.count({
          where: {
            studentId: { [Op.ne]: null },
            deviceId: eventDevice.id,
            eventId: activeEvent.id,
            logType: 'TIME_IN',
            logDatetime: { [Op.gte]: todayStartUtc, [Op.lte]: todayEndUtc }
          },
          distinct: true,
          col: 'student_id'
        })
      : 0
  ]);

  return {
    date: todayStr,
    checks_in_hallway: checksInHallway,
    checks_out_hallway: checksOutHallway,
    total_attended_event: totalAttendedEvent,
    active_event_id: activeEvent?.id || null,
    active_event_name: activeEvent?.name || null,
    event_note: activeEvent ? null : 'No active event today'
  };
}

module.exports = {
  getHallwayWeekStats,
  getAdminStats,
  getTeacherWeeklySchedule,
  getStudentWeeklySchedule,
  getStudentTodaySchedule,
  getTeacherAssignedSections,
  getTeacherTeachingAssignments,
  getTeacherAttendance,
  getTeacherAttendanceSummary,
  getTeacherAttendanceMetrics,
  getAdminActiveEventAttendance,
  getTeacherActiveEventAttendance,
  getStudentAttendance,
  getStudentAttendanceSummary,
  getStudentTerminalTimelogSummary
};
