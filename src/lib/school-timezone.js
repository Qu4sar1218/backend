'use strict';

const moment = require('moment-timezone');

const DEFAULT_TZ = 'Asia/Manila';

function getTimezone() {
  return process.env.SCHOOL_TIMEZONE || DEFAULT_TZ;
}

function asMoment(date) {
  return moment.tz(date instanceof Date ? date : new Date(date), getTimezone());
}

/** Minutes since local midnight in the school timezone (for comparing to schedule HH:MM). */
function localMinutesOfDay(date) {
  const m = asMoment(date);
  return m.hours() * 60 + m.minutes();
}

/** Sun..Sat labels matching JS getDay() order (for days_of_week JSON). */
function localWeekdayLabel(date) {
  const labels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  return labels[asMoment(date).day()];
}

/** Weekday label (Sun..Sat) for a calendar date string YYYY-MM-DD in the school timezone. */
function weekdayLabelFromYmd(ymdStr) {
  const labels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const m = moment.tz(String(ymdStr).slice(0, 10), 'YYYY-MM-DD', getTimezone());
  return labels[m.day()];
}

/**
 * Past dates: true. Future dates: false. Today: true only after session end (endTime HH:mm) in school TZ.
 */
function isPastScheduledSessionEnd(ymdStr, endTimeHHmm, now = new Date()) {
  const tz = getTimezone();
  const todayStr = localDateString(now);
  const ymd = String(ymdStr).slice(0, 10);
  if (ymd > todayStr) return false;
  if (ymd < todayStr) return true;
  if (!endTimeHHmm) return true;
  const [h, mPart] = String(endTimeHHmm).slice(0, 5).split(':');
  const hNum = Number(h);
  const mNum = Number(mPart);
  const end = moment
    .tz(ymd, 'YYYY-MM-DD', tz)
    .hour(Number.isNaN(hNum) ? 0 : hNum)
    .minute(Number.isNaN(mNum) ? 0 : mNum)
    .second(0)
    .millisecond(0);
  return now.getTime() > end.toDate().getTime();
}

/** Inclusive list of YYYY-MM-DD strings from fromStr to toStr in school timezone. */
function enumerateLocalYmdInclusive(fromStr, toStr) {
  const tz = getTimezone();
  const out = [];
  let m = moment.tz(String(fromStr).slice(0, 10), 'YYYY-MM-DD', tz);
  const end = moment.tz(String(toStr).slice(0, 10), 'YYYY-MM-DD', tz);
  while (m.isSameOrBefore(end, 'day')) {
    out.push(m.format('YYYY-MM-DD'));
    m = m.clone().add(1, 'day');
  }
  return out;
}

/** YYYY-MM-DD calendar date in the school timezone. */
function localDateString(date) {
  return asMoment(date).format('YYYY-MM-DD');
}

/** Start/end of the school-local calendar day as JS Date instants (UTC storage). */
function localDayRange(now = new Date()) {
  const tz = getTimezone();
  const start = moment.tz(now, tz).startOf('day');
  const end = start.clone().endOf('day');
  return { start: start.toDate(), end: end.toDate() };
}

/** Monday 00:00 (school local) of the week containing `now`, as a Date instant. */
function localWeekStartMonday(now = new Date()) {
  const tz = getTimezone();
  const m = moment.tz(now, tz).startOf('day');
  const day = m.day();
  const offsetToMonday = day === 0 ? -6 : 1 - day;
  return m.clone().add(offsetToMonday, 'days').toDate();
}

function addLocalDays(date, days) {
  return asMoment(date).clone().add(days, 'days').toDate();
}

/** HH:mm for a Date in the school zone (when DB returns TIME as Date). */
function localWallClockFromDate(value) {
  if (!value) return null;
  const m = moment.tz(value instanceof Date ? value : new Date(value), getTimezone());
  return `${String(m.hours()).padStart(2, '0')}:${String(m.minutes()).padStart(2, '0')}`;
}

/** Inclusive local calendar range from YYYY-MM-DD strings (school timezone). */
function parseLocalDateStringRange(fromStr, toStr) {
  const tz = getTimezone();
  const start = moment.tz(String(fromStr).slice(0, 10), 'YYYY-MM-DD', tz).startOf('day').toDate();
  const end = moment.tz(String(toStr).slice(0, 10), 'YYYY-MM-DD', tz).endOf('day').toDate();
  return { start, end };
}

module.exports = {
  getTimezone,
  localMinutesOfDay,
  localWeekdayLabel,
  weekdayLabelFromYmd,
  isPastScheduledSessionEnd,
  enumerateLocalYmdInclusive,
  localDateString,
  localDayRange,
  localWeekStartMonday,
  addLocalDays,
  localWallClockFromDate,
  parseLocalDateStringRange
};
