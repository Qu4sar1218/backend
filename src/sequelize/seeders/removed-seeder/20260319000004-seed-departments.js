'use strict';

/** @type {import('sequelize-cli').Seeder} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const { v4: uuidv4 } = require('uuid');
    const now = new Date();

    await queryInterface.bulkInsert('departments', [
      {
        id: uuidv4(),
        name: 'Science Department',
        code: 'SCI',
        description: 'Science-focused department',
        active: true,
        modified_by: null,
        created_at: now,
        updated_at: now
      },
      {
        id: uuidv4(),
        name: 'Mathematics Department',
        code: 'MATH',
        description: 'Math and statistics department',
        active: true,
        modified_by: null,
        created_at: now,
        updated_at: now
      },
      {
        id: uuidv4(),
        name: 'English Department',
        code: 'ENG',
        description: 'English and literature department',
        active: true,
        modified_by: null,
        created_at: now,
        updated_at: now
      }
    ]);
  },
  async down(queryInterface) {
    await queryInterface.bulkDelete('departments', null, {});
  }
};

