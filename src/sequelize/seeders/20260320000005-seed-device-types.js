'use strict';

/** @type {import('sequelize-cli').Seeder} */
module.exports = {
  async up(queryInterface) {
    const { v4: uuidv4 } = require('uuid');
    const now = new Date();

    await queryInterface.bulkInsert('device_types', [
      {
        id: uuidv4(),
        code: 'FACE',
        name: 'Face Recognition Terminal',
        description: 'Device using facial recognition for attendance logs.',
        manufacturer: 'ZKTeco',
        is_active: true,
        created_by: null,
        updated_by: null,
        created_at: now,
        updated_at: now
      },
      {
        id: uuidv4(),
        code: 'FINGER',
        name: 'Fingerprint Terminal',
        description: 'Biometric fingerprint reader for attendance logs.',
        manufacturer: 'Anviz',
        is_active: true,
        created_by: null,
        updated_by: null,
        created_at: now,
        updated_at: now
      },
      {
        id: uuidv4(),
        code: 'RFID',
        name: 'RFID Scanner',
        description: 'RFID card-based attendance scanner.',
        manufacturer: 'HID',
        is_active: true,
        created_by: null,
        updated_by: null,
        created_at: now,
        updated_at: now
      }
    ]);
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete('device_types', {
      code: ['FACE', 'FINGER', 'RFID']
    }, {});
  }
};
