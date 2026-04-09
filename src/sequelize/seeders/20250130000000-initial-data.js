'use strict';
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Generate UUIDs for seeded data
    const schoolId = uuidv4();
    const adminRoleId = uuidv4();
    const teacherRoleId = uuidv4();
    const studentRoleId = uuidv4();

    // Create a default school
    await queryInterface.bulkInsert(
      'schools',
      [
        {
          id: schoolId,
          name: 'Default School',
          address: '123 School Road, City',
          contact_no1: '+1234567890',
          email: 'info@defaultschool.com',
          registration_no: 'SCH12345',
          tax_details: 'TAX12345',
          school_code: 'SCH001',
          created_at: new Date(),
          updated_at: new Date()
        }
      ]
    );

    // Create roles: admin, teacher, and student
    await queryInterface.bulkInsert(
      'roles',
      [
        {
          id: adminRoleId,
          name: 'Admin',
          description: 'Administrator with full access',
          created_at: new Date(),
          updated_at: new Date()
        },
        {
          id: teacherRoleId,
          name: 'Teacher',
          description: 'Teacher with classroom and student management access',
          created_at: new Date(),
          updated_at: new Date()
        },
        {
          id: studentRoleId,
          name: 'Student',
          description: 'Student with limited self-service access',
          created_at: new Date(),
          updated_at: new Date()
        }
      ]
    );

    const salt = await bcrypt.genSalt(10);
    const adminPassword = await bcrypt.hash('admin123', salt);
    const teacherPassword = await bcrypt.hash('teacher123', salt);
    const studentPassword = await bcrypt.hash('student123', salt);
    const now = new Date();

    const teacherDefs = [
      { username: 'teacher', email: 'teacher@defaultschool.com', first_name: 'Teacher', last_name: 'User' },
      { username: 'teacher2', email: 'teacher2@defaultschool.com', first_name: 'Mary', last_name: 'Smith' },
      { username: 'teacher3', email: 'teacher3@defaultschool.com', first_name: 'James', last_name: 'Chen' },
      { username: 'teacher4', email: 'teacher4@defaultschool.com', first_name: 'Priya', last_name: 'Patel' },
      { username: 'teacher5', email: 'teacher5@defaultschool.com', first_name: 'David', last_name: 'Nguyen' }
    ];

    const studentDefs = [
      { username: 'student', email: 'student@defaultschool.com', first_name: 'Student', last_name: 'User' },
      { username: 'student2', email: 'student2@defaultschool.com', first_name: 'Ava', last_name: 'Lee' },
      { username: 'student3', email: 'student3@defaultschool.com', first_name: 'Noah', last_name: 'Garcia' },
      { username: 'student4', email: 'student4@defaultschool.com', first_name: 'Mia', last_name: 'Brown' },
      { username: 'student5', email: 'student5@defaultschool.com', first_name: 'Liam', last_name: 'Wilson' },
      { username: 'student6', email: 'student6@defaultschool.com', first_name: 'Zoe', last_name: 'Martinez' },
      { username: 'student7', email: 'student7@defaultschool.com', first_name: 'Ethan', last_name: 'Taylor' },
      { username: 'student8', email: 'student8@defaultschool.com', first_name: 'Lily', last_name: 'Anderson' },
      { username: 'student9', email: 'student9@defaultschool.com', first_name: 'Owen', last_name: 'Thomas' },
      { username: 'student10', email: 'student10@defaultschool.com', first_name: 'Chloe', last_name: 'Moore' }
    ];

    const users = [
      {
        id: uuidv4(),
        username: 'admin',
        password: adminPassword,
        email: 'admin@defaultschool.com',
        first_name: 'Admin',
        last_name: 'User',
        active: true,
        school_id: schoolId,
        role_id: adminRoleId,
        teacher_department_id: null,
        created_at: now,
        updated_at: now
      },
      ...teacherDefs.map((t) => ({
        id: uuidv4(),
        username: t.username,
        password: teacherPassword,
        email: t.email,
        first_name: t.first_name,
        last_name: t.last_name,
        active: true,
        school_id: schoolId,
        role_id: teacherRoleId,
        teacher_department_id: null,
        created_at: now,
        updated_at: now
      })),
      ...studentDefs.map((s) => ({
        id: uuidv4(),
        username: s.username,
        password: studentPassword,
        email: s.email,
        first_name: s.first_name,
        last_name: s.last_name,
        active: true,
        school_id: schoolId,
        role_id: studentRoleId,
        teacher_department_id: null,
        created_at: now,
        updated_at: now
      }))
    ];

    await queryInterface.bulkInsert('users', users);
  },

  async down(queryInterface, Sequelize) {
    // Remove data in reverse order to avoid foreign key constraints
    await queryInterface.bulkDelete('users', null, {});
    await queryInterface.bulkDelete('roles', null, {});
    await queryInterface.bulkDelete('schools', null, {});
  }
};
