'use strict';

/** @type {import('sequelize-cli').Seeder} */
module.exports = {
  async up(queryInterface) {
    const { v4: uuidv4 } = require('uuid');
    const now = new Date();

    const [rows] = await queryInterface.sequelize.query(`
      SELECT u.id, u.first_name, u.last_name, u.email
      FROM users u
      INNER JOIN roles r ON u.role_id = r.id
      INNER JOIN schools s ON u.school_id = s.id
      WHERE r.name = 'Student'
        AND s.school_code = 'SCH001'
      ORDER BY LENGTH(u.username), u.username
    `);

    if (!rows || rows.length === 0) {
      throw new Error(
        'No student-role users found for Default School (SCH001). Run the `initial-data` seeder first.'
      );
    }

    const yearLevels = ['Year 1', 'Year 2', 'Year 3', 'Year 4', 'Year 5', 'Year 6'];

    const records = rows.map((row, index) => {
      const n = String(index + 1).padStart(6, '0');
      return {
        id: uuidv4(),
        user_id: row.id,
        first_name: row.first_name,
        middle_name: null,
        last_name: row.last_name,
        birthday: null,
        address: 'Student Address',
        contact_number: `+1000000${String(index + 1).padStart(4, '0')}`,
        email: row.email,
        student_id_number: `STU-${n}`,
        year_level: yearLevels[index % yearLevels.length],
        guardian_contact_number: `+1000001${String(index + 1).padStart(4, '0')}`,
        guardian_email: `guardian${index + 1}@defaultschool.com`,
        active: true,
        registered_date: now,
        status: 'pending',
        modified_by: null,
        created_at: now,
        updated_at: now
      };
    });

    await queryInterface.bulkInsert('students', records);
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete('students', null, {});
  }
};
