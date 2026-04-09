const test = require('node:test');
const assert = require('node:assert/strict');

const dashboardUseCases = require('../src/use-cases/dashboard/dashboard-use-cases');
const models = require('../src/sequelize/models');

test('getTeacherTeachingAssignments returns mapped assignments', async () => {
  const originalFindAll = models.SectionSubjectTeacher.findAll;

  models.SectionSubjectTeacher.findAll = async () => [
    {
      toJSON() {
        return {
          id: 'asg-1',
          sectionId: 'sec-1',
          subjectId: 'sub-1',
          section: { name: 'Grade 7-A', code: 'G7A' },
          subject: { name: 'Math', code: 'MATH' }
        };
      }
    }
  ];

  try {
    const result = await dashboardUseCases.getTeacherTeachingAssignments({ id: 'teacher-1' });
    assert.equal(result.assignments.length, 1);
    assert.deepEqual(result.assignments[0], {
      assignmentId: 'asg-1',
      sectionId: 'sec-1',
      sectionName: 'Grade 7-A',
      sectionCode: 'G7A',
      subjectId: 'sub-1',
      subjectName: 'Math',
      subjectCode: 'MATH',
      startTime: null,
      endTime: null
    });
  } finally {
    models.SectionSubjectTeacher.findAll = originalFindAll;
  }
});

test('getTeacherTeachingAssignments requires authenticated user', async () => {
  await assert.rejects(
    () => dashboardUseCases.getTeacherTeachingAssignments(null),
    /Authenticated user is required/
  );
});
