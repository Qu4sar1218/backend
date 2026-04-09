'use strict';

/** @type {import('sequelize-cli').Seeder} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const { v4: uuidv4 } = require('uuid');
    const now = new Date();

    const courses = await queryInterface.sequelize.query(
      `SELECT id, code, name FROM courses ORDER BY code ASC`,
      { type: Sequelize.QueryTypes.SELECT }
    );

    if (!courses || courses.length === 0) {
      throw new Error(
        'No courses found. Run the courses seeder (20260319000005-seed-courses.js) first.'
      );
    }

    const yearLevels = ['Year 1', 'Year 2', 'Year 3', 'Year 4'];
    const sectionLabels = ['A', 'B', 'C'];

    const records = [];

    for (const course of courses) {
      const courseCode = String(course.code || '').trim() || 'COURSE';
      for (const yearLevel of yearLevels) {
        const yShort = yearLevel.replace('Year ', '');
        for (const label of sectionLabels) {
          const sectionCode = `${courseCode}-Y${yShort}-SEC-${label}`;
          records.push({
            id: uuidv4(),
            name: sectionCode,
            code: sectionCode,
            description: `${course.name} — ${yearLevel} — Section ${label}`,
            course_id: course.id,
            year_level: yearLevel,
            active: true,
            note: null,
            modified_by: null,
            created_at: now,
            updated_at: now
          });
        }
      }
    }

    await queryInterface.bulkInsert('sections', records);
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete('sections', null, {});
  }
};
