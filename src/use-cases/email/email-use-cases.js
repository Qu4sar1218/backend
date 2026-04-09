'use strict';

const { validate: isUuid } = require('uuid');
const { Op } = require('sequelize');
const { EmailLog, Student, Attendance, Subject, RawTimelog, Event } = require('../../sequelize/models');
const emailService = require('../../services/email.service');
const { getFinalScheduleForStudent } = require('../../lib/student-final-schedule');
const { localDateString, localWeekdayLabel, parseLocalDateStringRange } = require('../../lib/school-timezone');
const { findDeviceByTerminal } = require('../../lib/timelog-terminal-devices');
const moment = require('moment-timezone');

function escapeHtml(s) {
  if (s == null || s === '') return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatScanDisplay(value) {
  if (!value) return 'None';
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return 'None';
  const tz = process.env.SCHOOL_TIMEZONE || 'Asia/Manila';
  return moment.tz(d, tz).format('h:mm A');
}

function scheduleWindowLabel(row) {
  const start = row.startTime || '';
  const end = row.endTime || '';
  if (!start && !end) return '—';
  return `${start || '?'} – ${end || '?'}`;
}

function sortScheduleRows(rows, weekday) {
  const filtered = rows.filter((r) => {
    const days = Array.isArray(r.daysOfWeek) ? r.daysOfWeek : [];
    return days.includes(weekday);
  });
  filtered.sort((a, b) => {
    const aStart = String(a.startTime || '00:00');
    const bStart = String(b.startTime || '00:00');
    return aStart.localeCompare(bStart);
  });
  return filtered;
}

function pickEarlierDate(a, b) {
  if (!a) return b;
  if (!b) return a;
  return new Date(a) <= new Date(b) ? a : b;
}

function pickLaterDate(a, b) {
  if (!a) return b;
  if (!b) return a;
  return new Date(a) >= new Date(b) ? a : b;
}

async function buildAttendanceIndex(studentId, attendanceDate) {
  const rows = await Attendance.findAll({
    where: {
      studentId,
      attendanceDate
    },
    include: [{ model: Subject, as: 'subject', attributes: ['id', 'name', 'code'] }]
  });

  const bySubject = new Map();
  for (const att of rows) {
    const sid = att.subjectId;
    if (!sid) continue;
    const existing = bySubject.get(sid);
    if (!existing) {
      bySubject.set(sid, att.get({ plain: true }));
      continue;
    }
    const aIn = att.timeIn || att.firstScanAt;
    const eIn = existing.timeIn || existing.firstScanAt;
    const aOut = att.timeOut || att.lastScanAt;
    const eOut = existing.timeOut || existing.lastScanAt;
    bySubject.set(sid, {
      ...existing,
      timeIn: pickEarlierDate(eIn, aIn),
      timeOut: pickLaterDate(eOut, aOut),
      status: att.status || existing.status,
      subject: att.subject || existing.subject
    });
  }
  return bySubject;
}

async function resolveHallwayInOutTimes({ studentId, attendanceDate }) {
  const hallwayDevice = await findDeviceByTerminal('hallway');
  if (!hallwayDevice?.id) {
    return { hallwayTimeIn: null, hallwayTimeOut: null };
  }

  const { start, end } = parseLocalDateStringRange(attendanceDate, attendanceDate);
  const rows = await RawTimelog.findAll({
    where: {
      studentId,
      deviceId: hallwayDevice.id,
      logDatetime: { [Op.gte]: start, [Op.lte]: end },
      logType: { [Op.in]: ['TIME_IN', 'TIME_OUT'] }
    },
    attributes: ['logType', 'logDatetime'],
    order: [['logDatetime', 'ASC']]
  });

  let hallwayTimeIn = null;
  let hallwayTimeOut = null;
  for (const row of rows) {
    const t = row.logDatetime || null;
    if (!t) continue;
    if (row.logType === 'TIME_IN' && !hallwayTimeIn) hallwayTimeIn = t;
    if (row.logType === 'TIME_OUT') hallwayTimeOut = t;
  }

  return { hallwayTimeIn, hallwayTimeOut };
}

function buildEmailHtml({ studentName, attendanceDate, tableRows, hallwayTimeIn, hallwayTimeOut }) {
  const hallwayInDisplay = formatScanDisplay(hallwayTimeIn);
  const hallwayOutDisplay = formatScanDisplay(hallwayTimeOut);
  const rowsHtml = tableRows
    .map(
      (r) => `
    <tr>
      <td style="padding:8px;border:1px solid #ddd;">${escapeHtml(r.subject)}</td>
      <td style="padding:8px;border:1px solid #ddd;">${escapeHtml(r.schedule)}</td>
      <td style="padding:8px;border:1px solid #ddd;">${escapeHtml(r.checkIn)}</td>
      <td style="padding:8px;border:1px solid #ddd;">${escapeHtml(r.checkOut)}</td>
      <td style="padding:8px;border:1px solid #ddd;">${escapeHtml(r.status)}</td>
    </tr>`
    )
    .join('');

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8" /></head>
<body style="font-family: Arial, sans-serif; color:#333;">
  <h2 style="margin-bottom:8px;">Hallway checkout — daily attendance</h2>
  <p style="margin:0 0 16px;"><strong>${escapeHtml(studentName)}</strong><br/>
  Date: <strong>${escapeHtml(attendanceDate)}</strong></p>
  <div style="margin:0 0 16px;padding:12px;border:1px solid #ddd;border-radius:8px;background:#fafafa;max-width:720px;">
    <p style="margin:0 0 8px;"><strong>Hallway Terminal</strong></p>
    <p style="margin:0;">Check-in: <strong>${escapeHtml(hallwayInDisplay)}</strong></p>
    <p style="margin:4px 0 0;">Check-out: <strong>${escapeHtml(hallwayOutDisplay)}</strong></p>
  </div>
  <table style="border-collapse:collapse;width:100%;max-width:720px;">
    <thead>
      <tr style="background:#f5f5f5;">
        <th align="left" style="padding:8px;border:1px solid #ddd;">Subject</th>
        <th align="left" style="padding:8px;border:1px solid #ddd;">Schedule</th>
        <th align="left" style="padding:8px;border:1px solid #ddd;">Check-in</th>
        <th align="left" style="padding:8px;border:1px solid #ddd;">Check-out</th>
        <th align="left" style="padding:8px;border:1px solid #ddd;">Status</th>
      </tr>
    </thead>
    <tbody>${rowsHtml || '<tr><td colspan="5" style="padding:8px;">No scheduled classes for this day.</td></tr>'}</tbody>
  </table>
  <p style="margin-top:16px;font-size:12px;color:#666;">This message was sent automatically by InterACTS when the student checked out at the hallway terminal.</p>
</body>
</html>`;
}

function buildPlainText({ studentName, attendanceDate, tableRows, hallwayTimeIn, hallwayTimeOut }) {
  const lines = [
    `Hallway checkout — daily attendance`,
    `${studentName}`,
    `Date: ${attendanceDate}`,
    '',
    `Hallway Terminal`,
    `Check-in: ${formatScanDisplay(hallwayTimeIn)}`,
    `Check-out: ${formatScanDisplay(hallwayTimeOut)}`,
    '',
    'Subject | Schedule | Check-in | Check-out | Status',
    ...tableRows.map(
      (r) =>
        `${r.subject} | ${r.schedule} | ${r.checkIn} | ${r.checkOut} | ${r.status}`
    )
  ];
  return lines.join('\n');
}

function eventEmailTypeForLogType(logType) {
  if (logType === 'TIME_IN') return 'EVENT_SCAN_TIME_IN';
  if (logType === 'TIME_OUT') return 'EVENT_SCAN_TIME_OUT';
  return null;
}

function buildEventEmailHtml({ studentName, eventName, logType, attendanceDate, scanTime }) {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8" /></head>
<body style="font-family: Arial, sans-serif; color:#333;">
  <h2 style="margin-bottom:8px;">Event scan notification</h2>
  <p style="margin:0 0 12px;"><strong>${escapeHtml(studentName)}</strong></p>
  <div style="margin:0 0 16px;padding:12px;border:1px solid #ddd;border-radius:8px;background:#fafafa;max-width:560px;">
    <p style="margin:0 0 6px;"><strong>Event:</strong> ${escapeHtml(eventName)}</p>
    <p style="margin:0 0 6px;"><strong>Scan type:</strong> ${escapeHtml(logType)}</p>
    <p style="margin:0 0 6px;"><strong>Scan time:</strong> ${escapeHtml(scanTime)}</p>
    <p style="margin:0;"><strong>Date:</strong> ${escapeHtml(attendanceDate)}</p>
  </div>
  <p style="margin-top:16px;font-size:12px;color:#666;">This message was sent automatically by InterACTS from the event face terminal.</p>
</body>
</html>`;
}

function buildEventPlainText({ studentName, eventName, logType, attendanceDate, scanTime }) {
  return [
    'Event scan notification',
    `Student: ${studentName}`,
    `Event: ${eventName}`,
    `Scan type: ${logType}`,
    `Scan time: ${scanTime}`,
    `Date: ${attendanceDate}`
  ].join('\n');
}

/**
 * @param {{ studentId: string; rawTimelogId: string; logDatetime: Date }} params
 */
async function sendHallwayCheckoutEmail({ studentId, rawTimelogId, logDatetime }) {
  if (!isUuid(studentId) || !isUuid(rawTimelogId)) {
    return { skipped: true, reason: 'invalid_ids' };
  }

  const attendanceDate = localDateString(logDatetime);
  const weekday = localWeekdayLabel(logDatetime);

  const alreadySent = await EmailLog.findOne({
    where: {
      studentId,
      attendanceDate,
      emailType: 'HALLWAY_CHECKOUT',
      status: 'SENT'
    }
  });
  if (alreadySent) {
    return { skipped: true, reason: 'already_sent_today' };
  }

  let hallwayTimeIn = null;
  let hallwayTimeOut = null;
  try {
    const hallwayTimes = await resolveHallwayInOutTimes({ studentId, attendanceDate });
    hallwayTimeIn = hallwayTimes.hallwayTimeIn;
    hallwayTimeOut = hallwayTimes.hallwayTimeOut;
  } catch (e) {
    console.error('[Email] hallway in/out load failed:', e.message);
  }

  const student = await Student.findByPk(studentId, {
    attributes: [
      'id',
      'firstName',
      'middleName',
      'lastName',
      'guardianEmail'
    ]
  });

  if (!student) {
    await EmailLog.create({
      studentId,
      rawTimelogId,
      recipientEmail: 'unknown@invalid.local',
      emailType: 'HALLWAY_CHECKOUT',
      subject: `Attendance summary — ${attendanceDate}`,
      status: 'FAILED',
      errorMessage: 'Student not found',
      emailContent: null,
      hallwayTimeIn,
      hallwayTimeOut,
      attendanceDate,
      sentAt: null
    });
    return { skipped: true, reason: 'student_not_found' };
  }

  const guardianEmail = (student.guardianEmail || '').trim();
  if (!guardianEmail) {
    await EmailLog.create({
      studentId,
      rawTimelogId,
      recipientEmail: 'unknown@invalid.local',
      emailType: 'HALLWAY_CHECKOUT',
      subject: `Attendance summary — ${attendanceDate}`,
      status: 'FAILED',
      errorMessage: 'Guardian email is not set for this student',
      emailContent: null,
      hallwayTimeIn,
      hallwayTimeOut,
      attendanceDate,
      sentAt: null
    });
    return { skipped: true, reason: 'no_guardian_email' };
  }

  const studentName = [student.firstName, student.middleName, student.lastName]
    .filter(Boolean)
    .join(' ');

  let tableRows = [];
  try {
    const { rows: scheduleRows } = await getFinalScheduleForStudent({
      studentId,
      date: attendanceDate,
      transaction: null
    });
    const dayRows = sortScheduleRows(scheduleRows, weekday);
    const attBySubject = await buildAttendanceIndex(studentId, attendanceDate);

    tableRows = dayRows.map((row) => {
      const subjectId = row.subjectId;
      const subjectName =
        row.subject?.name || row.subject?.code || 'Subject';
      const raw = subjectId ? attBySubject.get(subjectId) : null;
      const timeIn = raw && (raw.timeIn || raw.firstScanAt);
      const timeOut = raw && (raw.timeOut || raw.lastScanAt);
      return {
        subject: subjectName,
        schedule: scheduleWindowLabel(row),
        checkIn: formatScanDisplay(timeIn),
        checkOut: formatScanDisplay(timeOut),
        status: raw && raw.status ? String(raw.status) : '—'
      };
    });
  } catch (e) {
    console.error('[Email] schedule/attendance load failed:', e.message);
  }

  const emailSubject = `Attendance summary — ${studentName} — ${attendanceDate}`;
  const html = buildEmailHtml({ studentName, attendanceDate, tableRows, hallwayTimeIn, hallwayTimeOut });
  const text = buildPlainText({ studentName, attendanceDate, tableRows, hallwayTimeIn, hallwayTimeOut });

  try {
    const info = await emailService.sendMail({
      to: guardianEmail,
      subject: emailSubject,
      html,
      text
    });

    const responseStr =
      info && info.response
        ? String(info.response).slice(0, 2000)
        : info
          ? JSON.stringify(info).slice(0, 2000)
          : null;

    await EmailLog.create({
      studentId,
      rawTimelogId,
      recipientEmail: guardianEmail,
      emailType: 'HALLWAY_CHECKOUT',
      subject: emailSubject,
      status: 'SENT',
      errorMessage: null,
      emailContent: html,
      hallwayTimeIn,
      hallwayTimeOut,
      smtpResponse: responseStr,
      messageId: info.messageId || null,
      attendanceDate,
      sentAt: new Date()
    });

    return { sent: true, messageId: info.messageId };
  } catch (err) {
    const msg = err && err.message ? err.message : String(err);
    await EmailLog.create({
      studentId,
      rawTimelogId,
      recipientEmail: guardianEmail,
      emailType: 'HALLWAY_CHECKOUT',
      subject: emailSubject,
      status: 'FAILED',
      errorMessage: msg.slice(0, 5000),
      emailContent: html,
      hallwayTimeIn,
      hallwayTimeOut,
      smtpResponse: null,
      messageId: null,
      attendanceDate,
      sentAt: null
    });
    throw err;
  }
}

/**
 * @param {{ studentId: string; rawTimelogId: string; eventId: string; logDatetime: Date; logType: string }} params
 */
async function sendEventScanEmail({ studentId, rawTimelogId, eventId, logDatetime, logType }) {
  if (!isUuid(studentId) || !isUuid(rawTimelogId) || !isUuid(eventId)) {
    return { skipped: true, reason: 'invalid_ids' };
  }

  const emailType = eventEmailTypeForLogType(logType);
  if (!emailType) return { skipped: true, reason: 'unsupported_log_type' };

  const attendanceDate = localDateString(logDatetime);
  const scanTime = formatScanDisplay(logDatetime);

  const [student, event] = await Promise.all([
    Student.findByPk(studentId, {
      attributes: ['id', 'firstName', 'middleName', 'lastName', 'guardianEmail']
    }),
    Event.findByPk(eventId, {
      attributes: ['id', 'name']
    })
  ]);

  if (!student) {
    await EmailLog.create({
      studentId,
      rawTimelogId,
      recipientEmail: 'unknown@invalid.local',
      emailType,
      subject: `Event scan notification — ${attendanceDate} — ${logType}`,
      status: 'FAILED',
      errorMessage: 'Student not found',
      emailContent: null,
      hallwayTimeIn: null,
      hallwayTimeOut: null,
      attendanceDate,
      sentAt: null
    });
    return { skipped: true, reason: 'student_not_found' };
  }

  const guardianEmail = (student.guardianEmail || '').trim();
  const studentName = [student.firstName, student.middleName, student.lastName]
    .filter(Boolean)
    .join(' ');
  const eventName = event?.name || 'Unknown Event';
  const subject = `Event scan notification — ${studentName} — ${eventName} — ${logType}`;

  if (!guardianEmail) {
    await EmailLog.create({
      studentId,
      rawTimelogId,
      recipientEmail: 'unknown@invalid.local',
      emailType,
      subject,
      status: 'FAILED',
      errorMessage: 'Guardian email is not set for this student',
      emailContent: null,
      hallwayTimeIn: null,
      hallwayTimeOut: null,
      attendanceDate,
      sentAt: null
    });
    return { skipped: true, reason: 'no_guardian_email' };
  }

  const html = buildEventEmailHtml({
    studentName,
    eventName,
    logType,
    attendanceDate,
    scanTime
  });
  const text = buildEventPlainText({
    studentName,
    eventName,
    logType,
    attendanceDate,
    scanTime
  });

  try {
    const info = await emailService.sendMail({
      to: guardianEmail,
      subject,
      html,
      text
    });

    const responseStr =
      info && info.response
        ? String(info.response).slice(0, 2000)
        : info
          ? JSON.stringify(info).slice(0, 2000)
          : null;

    await EmailLog.create({
      studentId,
      rawTimelogId,
      recipientEmail: guardianEmail,
      emailType,
      subject,
      status: 'SENT',
      errorMessage: null,
      emailContent: html,
      hallwayTimeIn: null,
      hallwayTimeOut: null,
      smtpResponse: responseStr,
      messageId: info.messageId || null,
      attendanceDate,
      sentAt: new Date()
    });

    return { sent: true, messageId: info.messageId };
  } catch (err) {
    const msg = err && err.message ? err.message : String(err);
    await EmailLog.create({
      studentId,
      rawTimelogId,
      recipientEmail: guardianEmail,
      emailType,
      subject,
      status: 'FAILED',
      errorMessage: msg.slice(0, 5000),
      emailContent: html,
      hallwayTimeIn: null,
      hallwayTimeOut: null,
      smtpResponse: null,
      messageId: null,
      attendanceDate,
      sentAt: null
    });
    throw err;
  }
}

module.exports = {
  sendHallwayCheckoutEmail,
  sendEventScanEmail
};
