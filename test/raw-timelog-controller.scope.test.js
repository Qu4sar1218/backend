const test = require('node:test');
const assert = require('node:assert/strict');

const rawTimelogController = require('../src/controllers/raw-timelog/raw-timelog-controller');
const rawTimelogUseCases = require('../src/use-cases/raw-timelog/raw-timelog-use-cases');

test('teacher classroom_scope forces teacher_id to authenticated user', async () => {
  const original = rawTimelogUseCases.getRawTimelogs;
  let capturedFilters = null;
  rawTimelogUseCases.getRawTimelogs = async (filters) => {
    capturedFilters = filters;
    return [];
  };

  const req = {
    query: {
      classroom_scope: 'teacher',
      teacher_id: 'another-teacher',
      section_id: 'section-1',
      subject_id: 'subject-1'
    },
    user: {
      id: 'teacher-1',
      role: { name: 'Teacher' }
    }
  };
  const res = {
    statusCode: 200,
    payload: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(data) {
      this.payload = data;
      return this;
    }
  };

  await rawTimelogController.getRawTimelogs(req, res);

  assert.equal(res.statusCode, 200);
  assert.equal(capturedFilters.teacher_id, 'teacher-1');
  assert.equal(capturedFilters.classroom_scope, undefined);
  assert.equal(capturedFilters.section_id, 'section-1');
  assert.equal(capturedFilters.subject_id, 'subject-1');

  rawTimelogUseCases.getRawTimelogs = original;
});

test('non-teacher classroom_scope does not inject teacher_id', async () => {
  const original = rawTimelogUseCases.getRawTimelogs;
  let capturedFilters = null;
  rawTimelogUseCases.getRawTimelogs = async (filters) => {
    capturedFilters = filters;
    return [];
  };

  const req = {
    query: {
      classroom_scope: 'teacher',
      section_id: 'section-1'
    },
    user: {
      id: 'admin-1',
      role: { name: 'Admin' }
    }
  };
  const res = {
    statusCode: 200,
    payload: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(data) {
      this.payload = data;
      return this;
    }
  };

  await rawTimelogController.getRawTimelogs(req, res);

  assert.equal(res.statusCode, 200);
  assert.equal(capturedFilters.teacher_id, undefined);
  assert.equal(capturedFilters.classroom_scope, undefined);
  assert.equal(capturedFilters.section_id, 'section-1');

  rawTimelogUseCases.getRawTimelogs = original;
});
