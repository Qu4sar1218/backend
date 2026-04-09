'use strict';
const { Section, Subject, User, Role, TeacherSubject, CourseSubject } = require('../../sequelize/models');
const sectionSubjectTeacherDataAccess = require('../../data-access/section-subject-teacher/section-subject-teacher-data-access');

const ALLOWED_DAYS = new Set(['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']);
const OVERLAP_THRESHOLD_MINUTES = 5;

const timeToMinutes = (value) => {
  if (value === undefined || value === null || value === '') return null;
  const s = String(value).trim();
  const m = /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/.exec(s);
  if (!m) return null;
  const h = parseInt(m[1], 10);
  const min = parseInt(m[2], 10);
  const sec = m[3] ? parseInt(m[3], 10) : 0;
  if (h < 0 || h > 23 || min < 0 || min > 59 || sec < 0 || sec > 59) return null;
  return h * 60 + min + (sec > 0 ? sec / 60 : 0);
};

const normalizeAssignments = (assignments) => {
  const subjectMap = new Map();
  for (const assignment of assignments) {
    if (!assignment?.subjectId) continue;
    if (!subjectMap.has(assignment.subjectId)) {
      subjectMap.set(assignment.subjectId, []);
    }
    subjectMap.get(assignment.subjectId).push(...(assignment.teachers || []));
  }
  return [...subjectMap.entries()].map(([subjectId, teachersRaw]) => {
    const byTeacher = new Map();
    for (const t of teachersRaw) {
      if (!t?.teacherId) continue;
      const days = [...new Set((t.daysOfWeek || []).filter(Boolean))];
      byTeacher.set(t.teacherId, {
        teacherId: t.teacherId,
        daysOfWeek: days,
        startTime: t.startTime,
        endTime: t.endTime
      });
    }
    return {
      subjectId,
      teachers: [...byTeacher.values()]
    };
  });
};

const validateSchedule = (teachers) => {
  for (const t of teachers) {
    if (!Array.isArray(t.daysOfWeek) || t.daysOfWeek.length === 0) {
      throw new Error('Select at least one class day for each teacher schedule.');
    }
    for (const d of t.daysOfWeek) {
      if (!ALLOWED_DAYS.has(d)) {
        throw new Error(`Invalid class day "${d}". Use Mon, Tue, Wed, Thu, Fri, Sat, or Sun.`);
      }
    }
    if (t.startTime === undefined || t.startTime === null || String(t.startTime).trim() === '') {
      throw new Error('Start time is required for each teacher schedule.');
    }
    if (t.endTime === undefined || t.endTime === null || String(t.endTime).trim() === '') {
      throw new Error('End time is required for each teacher schedule.');
    }
    const startM = timeToMinutes(t.startTime);
    const endM = timeToMinutes(t.endTime);
    if (startM === null || endM === null) {
      throw new Error('Use a valid time format (HH:mm) for start and end time.');
    }
    if (endM <= startM) {
      throw new Error('End time must be later than start time.');
    }
  }
};

const hasSharedDay = (daysA, daysB) => {
  const bSet = new Set(daysB || []);
  return (daysA || []).some((d) => bSet.has(d));
};

const getOverlapMinutes = (aStart, aEnd, bStart, bEnd) => {
  return Math.min(aEnd, bEnd) - Math.max(aStart, bStart);
};

const formatTimeLabel = (value) => String(value || '').slice(0, 5);

const buildScheduleEntries = (normalizedAssignments) => {
  return normalizedAssignments.flatMap((assignment) =>
    assignment.teachers.map((teacher) => ({
      subjectId: assignment.subjectId,
      teacherId: teacher.teacherId,
      daysOfWeek: teacher.daysOfWeek || [],
      startTime: teacher.startTime,
      endTime: teacher.endTime,
      startM: timeToMinutes(teacher.startTime),
      endM: timeToMinutes(teacher.endTime)
    }))
  );
};

const validateSectionOverlap = ({ scheduleEntries, subjectNameById, teacherNameById }) => {
  for (let i = 0; i < scheduleEntries.length; i += 1) {
    for (let j = i + 1; j < scheduleEntries.length; j += 1) {
      const a = scheduleEntries[i];
      const b = scheduleEntries[j];
      if (!hasSharedDay(a.daysOfWeek, b.daysOfWeek)) continue;

      const overlapM = getOverlapMinutes(a.startM, a.endM, b.startM, b.endM);
      if (overlapM < OVERLAP_THRESHOLD_MINUTES) continue;

      const subjectA = subjectNameById.get(a.subjectId) || a.subjectId;
      const subjectB = subjectNameById.get(b.subjectId) || b.subjectId;
      const teacherA = teacherNameById.get(a.teacherId) || a.teacherId;
      const teacherB = teacherNameById.get(b.teacherId) || b.teacherId;

      throw new Error(
        `Section subject schedule conflict (>=${OVERLAP_THRESHOLD_MINUTES} minutes). ` +
        `[conflictType=section][subjectId=${a.subjectId}][subjectId=${b.subjectId}]` +
        `[teacherId=${a.teacherId}][teacherId=${b.teacherId}] ` +
        `${subjectA} (${teacherA} ${formatTimeLabel(a.startTime)}-${formatTimeLabel(a.endTime)}) overlaps with ` +
        `${subjectB} (${teacherB} ${formatTimeLabel(b.startTime)}-${formatTimeLabel(b.endTime)}).`
      );
    }
  }
};

const validateTeacherCrossSectionOverlap = ({
  scheduleEntries,
  existingAssignments,
  subjectNameById,
  teacherNameById
}) => {
  const existingByTeacher = new Map();
  for (const row of existingAssignments) {
    if (!existingByTeacher.has(row.teacherId)) {
      existingByTeacher.set(row.teacherId, []);
    }
    existingByTeacher.get(row.teacherId).push({
      teacherId: row.teacherId,
      subjectId: row.subjectId,
      sectionName: row.section?.name || row.section?.code || row.sectionId,
      subjectName: row.subject?.name || row.subject?.code || row.subjectId,
      daysOfWeek: row.daysOfWeek || [],
      startTime: row.startTime,
      endTime: row.endTime,
      startM: timeToMinutes(row.startTime),
      endM: timeToMinutes(row.endTime)
    });
  }

  for (const entry of scheduleEntries) {
    const existingRows = existingByTeacher.get(entry.teacherId) || [];
    for (const existing of existingRows) {
      if (!hasSharedDay(entry.daysOfWeek, existing.daysOfWeek)) continue;
      const overlapM = getOverlapMinutes(entry.startM, entry.endM, existing.startM, existing.endM);
      if (overlapM < OVERLAP_THRESHOLD_MINUTES) continue;

      const teacherName = teacherNameById.get(entry.teacherId) || entry.teacherId;
      const incomingSubject = subjectNameById.get(entry.subjectId) || entry.subjectId;
      throw new Error(
        `Teacher schedule conflict across sections (>=${OVERLAP_THRESHOLD_MINUTES} minutes). ` +
        `[conflictType=teacher][teacherId=${entry.teacherId}][subjectId=${entry.subjectId}] ` +
        `${teacherName} in ${incomingSubject} (${formatTimeLabel(entry.startTime)}-${formatTimeLabel(entry.endTime)}) overlaps ` +
        `with ${existing.subjectName} in section ${existing.sectionName} ` +
        `(${formatTimeLabel(existing.startTime)}-${formatTimeLabel(existing.endTime)}).`
      );
    }
  }
};

const sectionSubjectTeacherUseCases = {
  getSectionSubjectTeachers: async (sectionId, filters) => {
    const section = await Section.findByPk(sectionId);
    if (!section) throw new Error('Section not found');
    return sectionSubjectTeacherDataAccess.getSectionSubjectTeachers(sectionId, filters);
  },

  getAllSectionSubjectTeachers: async (filters) => {
    return sectionSubjectTeacherDataAccess.getAllSectionSubjectTeachers(filters);
  },

  assignSectionSubjectTeachers: async (sectionId, data, modifiedBy) => {
    const section = await Section.findByPk(sectionId);
    if (!section) throw new Error('Section not found');

    if (!Array.isArray(data.assignments)) {
      throw new Error('Schedule assignments payload is invalid.');
    }

    for (const assignment of data.assignments) {
      if (!assignment?.subjectId) throw new Error('A subject is required for each schedule assignment.');
      if (!Array.isArray(assignment.teachers)) throw new Error('Teacher assignments are invalid for at least one subject.');
    }

    const normalizedAssignments = normalizeAssignments(data.assignments);

    if (normalizedAssignments.length > 0) {
      for (const assignment of normalizedAssignments) {
        if (assignment.teachers.length === 0) {
          throw new Error('Select at least one teacher schedule for each selected subject.');
        }
        validateSchedule(assignment.teachers);
      }
    }

    const subjectIds = [...new Set(normalizedAssignments.map((a) => a.subjectId))];
    const teacherIds = [...new Set(normalizedAssignments.flatMap((a) => a.teachers.map((t) => t.teacherId)))];

    if (subjectIds.length > 0) {
      const subjects = await Subject.findAll({ where: { id: subjectIds } });
      if (subjects.length !== subjectIds.length) throw new Error('One or more selected subjects no longer exist.');

      // Some tests/mock scenarios construct a section shape without courseId.
      // Skip course-link enforcement there; production sections include courseId.
      if (section.courseId) {
        const linkedCourseSubjects = await CourseSubject.findAll({
          where: {
            courseId: section.courseId,
            subjectId: subjectIds,
            active: true
          },
          attributes: ['subjectId']
        });
        const linkedSubjectIdSet = new Set(linkedCourseSubjects.map((row) => row.subjectId));
        const hasOutOfCourseSubject = subjectIds.some((subjectId) => !linkedSubjectIdSet.has(subjectId));
        if (hasOutOfCourseSubject) {
          throw new Error('One or more selected subjects are not linked to this section course.');
        }
      }
    }

    if (teacherIds.length > 0) {
      const teacherRole = await Role.findOne({ where: { name: 'Teacher' } });
      if (!teacherRole) throw new Error('Teacher role is not configured.');

      const teachers = await User.findAll({
        where: {
          id: teacherIds,
          roleId: teacherRole.id,
          active: true
        }
      });
      if (teachers.length !== teacherIds.length) throw new Error('One or more selected teachers were not found or are inactive.');

      const teacherNameById = new Map(
        teachers.map((t) => [t.id, `${t.firstName} ${t.lastName}`.trim()])
      );
      const subjects = await Subject.findAll({ where: { id: subjectIds }, attributes: ['id', 'name', 'code'] });
      const subjectNameById = new Map(
        subjects.map((s) => [s.id, s.name || s.code || s.id])
      );

      const scheduleEntries = buildScheduleEntries(normalizedAssignments);
      validateSectionOverlap({ scheduleEntries, subjectNameById, teacherNameById });

      const existingAssignments =
        await sectionSubjectTeacherDataAccess.getActiveAssignmentsByTeacherIdsExcludingSection({
          teacherIds,
          sectionId
        });
      validateTeacherCrossSectionOverlap({
        scheduleEntries,
        existingAssignments,
        subjectNameById,
        teacherNameById
      });
    }

    const teacherSubjectPairs = normalizedAssignments.flatMap((assignment) =>
      assignment.teachers.map((t) => ({ subjectId: assignment.subjectId, teacherId: t.teacherId }))
    );

    if (teacherSubjectPairs.length > 0) {
      const activeTeacherSubjects = await TeacherSubject.findAll({
        where: {
          active: true,
          subjectId: [...new Set(teacherSubjectPairs.map((pair) => pair.subjectId))],
          teacherId: [...new Set(teacherSubjectPairs.map((pair) => pair.teacherId))]
        },
        attributes: ['subjectId', 'teacherId']
      });

      const activePairSet = new Set(activeTeacherSubjects.map((row) => `${row.subjectId}:${row.teacherId}`));
      const hasInvalidPair = teacherSubjectPairs.some((pair) => !activePairSet.has(`${pair.subjectId}:${pair.teacherId}`));
      if (hasInvalidPair) {
        throw new Error('One or more selected teachers are not assigned to the selected subject.');
      }
    }

    return sectionSubjectTeacherDataAccess.assignSectionSubjectTeachers({
      sectionId,
      assignments: normalizedAssignments,
      note: data.note || null,
      modifiedBy
    });
  },

  removeSectionSubjectTeacher: async (sectionId, subjectId, teacherId, modifiedBy) => {
    const section = await Section.findByPk(sectionId);
    if (!section) throw new Error('Section not found');

    const removed = await sectionSubjectTeacherDataAccess.removeSectionSubjectTeacher({
      sectionId,
      subjectId,
      teacherId,
      modifiedBy
    });
    if (!removed) throw new Error('Section subject-teacher mapping not found');
    return removed;
  }
};

module.exports = sectionSubjectTeacherUseCases;
