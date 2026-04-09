'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { parseLocalDateStringRange } = require('../src/lib/school-timezone');

test('parseLocalDateStringRange: inclusive range has start before end', () => {
  const { start, end } = parseLocalDateStringRange('2025-06-01', '2025-06-15');
  assert.ok(start < end);
});
