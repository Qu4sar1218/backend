const test = require('node:test');
const assert = require('node:assert/strict');

const sectionSubjectTeacherUseCases = require('../src/use-cases/section-subject-teacher/section-subject-teacher-use-cases');
const sectionSubjectTeacherDataAccess = require('../src/data-access/section-subject-teacher/section-subject-teacher-data-access');
const models = require('../src/sequelize/models');

function setupBaseStubs() {
  const originals = {
    sectionFindByPk: models.Section.findByPk,
    subjectFindAll: models.Subject.findAll,
    roleFindOne: models.Role.findOne,
    userFindAll: models.User.findAll,
    teacherSubjectFindAll: models.TeacherSubject.findAll,
    assignSectionSubjectTeachers: sectionSubjectTeacherDataAccess.assignSectionSubjectTeachers,
    getActiveAssignmentsByTeacherIdsExcludingSection:
      sectionSubjectTeacherDataAccess.getActiveAssignmentsByTeacherIdsExcludingSection
  };

  models.Section.findByPk = async () => ({ id: 'section-1' });
  models.Subject.findAll = async ({ where }) =>
    (where.id || []).map((id) => ({ id, name: `Subject ${id}`, code: id }));
  models.Role.findOne = async () => ({ id: 'role-teacher' });
  models.User.findAll = async ({ where }) =>
    (where.id || []).map((id) => ({ id, firstName: 'Teacher', lastName: id }));
  models.TeacherSubject.findAll = async ({ where }) => {
    const pairs = [];
    for (const subjectId of (where.subjectId || [])) {
      for (const teacherId of (where.teacherId || [])) {
        pairs.push({ subjectId, teacherId });
      }
    }
    return pairs;
  };
  sectionSubjectTeacherDataAccess.getActiveAssignmentsByTeacherIdsExcludingSection = async () => [];
  sectionSubjectTeacherDataAccess.assignSectionSubjectTeachers = async ({ assignments }) => assignments;

  return () => {
    models.Section.findByPk = originals.sectionFindByPk;
    models.Subject.findAll = originals.subjectFindAll;
    models.Role.findOne = originals.roleFindOne;
    models.User.findAll = originals.userFindAll;
    models.TeacherSubject.findAll = originals.teacherSubjectFindAll;
    sectionSubjectTeacherDataAccess.assignSectionSubjectTeachers = originals.assignSectionSubjectTeachers;
    sectionSubjectTeacherDataAccess.getActiveAssignmentsByTeacherIdsExcludingSection =
      originals.getActiveAssignmentsByTeacherIdsExcludingSection;
  };
}

function assignmentPayload(startTime, endTime, dayA = 'Mon', dayB = 'Mon') {
  return {
    assignments: [
      {
        subjectId: 'subject-1',
        teachers: [{ teacherId: 'teacher-1', daysOfWeek: [dayA], startTime: '09:00', endTime: '10:00' }]
      },
      {
        subjectId: 'subject-2',
        teachers: [{ teacherId: 'teacher-2', daysOfWeek: [dayB], startTime, endTime }]
      }
    ]
  };
}

test('allows touching schedules in same day', async () => {
  const restore = setupBaseStubs();
  await assert.doesNotReject(async () => {
    await sectionSubjectTeacherUseCases.assignSectionSubjectTeachers(
      'section-1',
      assignmentPayload('10:00', '11:00'),
      'admin-1'
    );
  });
  restore();
});

test('allows overlap below 5 minutes', async () => {
  const restore = setupBaseStubs();
  await assert.doesNotReject(async () => {
    await sectionSubjectTeacherUseCases.assignSectionSubjectTeachers(
      'section-1',
      assignmentPayload('09:56', '11:00'),
      'admin-1'
    );
  });
  restore();
});

test('blocks overlap at exactly 5 minutes inside section', async () => {
  const restore = setupBaseStubs();
  await assert.rejects(
    sectionSubjectTeacherUseCases.assignSectionSubjectTeachers(
      'section-1',
      assignmentPayload('09:55', '11:00'),
      'admin-1'
    ),
    /Section subject schedule conflict/
  );
  restore();
});

test('blocks overlap greater than 5 minutes inside section', async () => {
  const restore = setupBaseStubs();
  await assert.rejects(
    sectionSubjectTeacherUseCases.assignSectionSubjectTeachers(
      'section-1',
      assignmentPayload('09:30', '11:00'),
      'admin-1'
    ),
    /Section subject schedule conflict/
  );
  restore();
});

test('allows same times on different weekdays', async () => {
  const restore = setupBaseStubs();
  await assert.doesNotReject(async () => {
    await sectionSubjectTeacherUseCases.assignSectionSubjectTeachers(
      'section-1',
      assignmentPayload('09:30', '11:00', 'Mon', 'Tue'),
      'admin-1'
    );
  });
  restore();
});

test('blocks teacher overlap across sections at 5 minutes', async () => {
  const restore = setupBaseStubs();
  sectionSubjectTeacherDataAccess.getActiveAssignmentsByTeacherIdsExcludingSection = async () => ([
    {
      teacherId: 'teacher-1',
      subjectId: 'subject-3',
      sectionId: 'section-2',
      daysOfWeek: ['Mon'],
      startTime: '09:55',
      endTime: '11:00',
      section: { name: 'Section B' },
      subject: { name: 'History' }
    }
  ]);

  await assert.rejects(
    sectionSubjectTeacherUseCases.assignSectionSubjectTeachers(
      'section-1',
      {
        assignments: [
          {
            subjectId: 'subject-1',
            teachers: [{ teacherId: 'teacher-1', daysOfWeek: ['Mon'], startTime: '09:00', endTime: '10:00' }]
          }
        ]
      },
      'admin-1'
    ),
    /Teacher schedule conflict across sections/
  );
  restore();
});
