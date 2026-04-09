const test = require('node:test');
const assert = require('node:assert/strict');

const { buildDefaultStudentPassword } = require('../src/utils/default-student-password');

test('buildDefaultStudentPassword: student ID + Dela Cruz', () => {
  assert.equal(buildDefaultStudentPassword('00152', 'Dela Cruz'), '00152delacruz');
});

test('buildDefaultStudentPassword: collapses extra internal spaces', () => {
  assert.equal(buildDefaultStudentPassword('00152', 'Dela  Cruz'), '00152delacruz');
});

test('buildDefaultStudentPassword: preserves leading zeros in ID', () => {
  assert.equal(buildDefaultStudentPassword('00152', 'Smith'), '00152smith');
});
