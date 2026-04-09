'use strict';

/** @type {import('sequelize-cli').Seeder} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const { v4: uuidv4 } = require('uuid');
    const now = new Date();

    await queryInterface.bulkInsert('courses', [
      {
        id: uuidv4(),
        name: 'BS Computer Science',
        code: 'BSCS',
        description: 'Bachelor of Science in Computer Science',
        active: true,
        modified_by: null,
        created_at: now,
        updated_at: now
      },
      {
        id: uuidv4(),
        name: 'BS Information Technology',
        code: 'BSIT',
        description: 'Bachelor of Science in Information Technology',
        active: true,
        modified_by: null,
        created_at: now,
        updated_at: now
      },
      {
        id: uuidv4(),
        name: 'BS Education',
        code: 'BSED',
        description: 'Bachelor of Secondary Education',
        active: true,
        modified_by: null,
        created_at: now,
        updated_at: now
      }
    ]);
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete('courses', null, {});
  }
};

