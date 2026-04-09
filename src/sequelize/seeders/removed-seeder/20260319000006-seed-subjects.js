'use strict';

/** @type {import('sequelize-cli').Seeder} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const { v4: uuidv4 } = require('uuid');
    const now = new Date();

    await queryInterface.bulkInsert('subjects', [
      {
        id: uuidv4(),
        name: 'Mathematics 101',
        code: 'MATH101',
        year: '1st_year',
        description: 'Introduction to Mathematics',
        active: true,
        modified_by: null,
        created_at: now,
        updated_at: now
      },
      {
        id: uuidv4(),
        name: 'Physics 101',
        code: 'PHY101',
        year: '1st_year',
        description: 'Introduction to Physics',
        active: true,
        modified_by: null,
        created_at: now,
        updated_at: now
      },
      {
        id: uuidv4(),
        name: 'English Composition',
        code: 'ENG101',
        year: '1st_year',
        description: 'Basics of Composition and Writing',
        active: true,
        modified_by: null,
        created_at: now,
        updated_at: now
      },
      {
        id: uuidv4(),
        name: 'Purposive Communication',
        code: 'GEPCOM',
        year: '1st_year',
        description: 'Communication in multicultural and academic contexts',
        active: true,
        modified_by: null,
        created_at: now,
        updated_at: now
      },
      {
        id: uuidv4(),
        name: 'Understanding the Self',
        code: 'GEUTS',
        year: '1st_year',
        description: 'Interdisciplinary perspectives on personhood and identity',
        active: true,
        modified_by: null,
        created_at: now,
        updated_at: now
      },
      {
        id: uuidv4(),
        name: 'Readings in Philippine History',
        code: 'GERPH',
        year: '1st_year',
        description: 'Philippine historical sources and national development',
        active: true,
        modified_by: null,
        created_at: now,
        updated_at: now
      },
      {
        id: uuidv4(),
        name: 'Art Appreciation',
        code: 'GEART',
        year: '2nd_year',
        description: 'Principles and forms of visual, literary, and performing arts',
        active: true,
        modified_by: null,
        created_at: now,
        updated_at: now
      },
      {
        id: uuidv4(),
        name: 'Science, Technology and Society',
        code: 'GESTS',
        year: '2nd_year',
        description: 'Intersections of science, technology, and social change',
        active: true,
        modified_by: null,
        created_at: now,
        updated_at: now
      },
      {
        id: uuidv4(),
        name: 'Data Structures and Algorithms',
        code: 'CSDSA',
        year: '2nd_year',
        description: 'Core data structures and algorithm design techniques',
        active: true,
        modified_by: null,
        created_at: now,
        updated_at: now
      },
      {
        id: uuidv4(),
        name: 'Object-Oriented Programming',
        code: 'CSOOP',
        year: '2nd_year',
        description: 'Object-oriented design and programming fundamentals',
        active: true,
        modified_by: null,
        created_at: now,
        updated_at: now
      },
      {
        id: uuidv4(),
        name: 'Database Management Systems',
        code: 'CSDBMS',
        year: '3rd_year',
        description: 'Relational modeling, SQL, and transaction management',
        active: true,
        modified_by: null,
        created_at: now,
        updated_at: now
      },
      {
        id: uuidv4(),
        name: 'Operating Systems',
        code: 'CSOS',
        year: '3rd_year',
        description: 'Process management, memory, concurrency, and file systems',
        active: true,
        modified_by: null,
        created_at: now,
        updated_at: now
      },
      {
        id: uuidv4(),
        name: 'Capstone Project 1',
        code: 'CSPROJ1',
        year: '4th_year',
        description: 'Proposal, planning, and design for capstone implementation',
        active: true,
        modified_by: null,
        created_at: now,
        updated_at: now
      },
      {
        id: uuidv4(),
        name: 'Capstone Project 2',
        code: 'CSPROJ2',
        year: '4th_year',
        description: 'Development, testing, and defense of capstone project',
        active: true,
        modified_by: null,
        created_at: now,
        updated_at: now
      }
    ]);
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete('subjects', null, {});
  }
};

