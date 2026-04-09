'use strict';

const { v4: uuidv4 } = require('uuid');

/** @type {import('sequelize-cli').Seeder} */
module.exports = {
  async up(queryInterface) {
    const now = new Date();

    const [schoolRows] = await queryInterface.sequelize.query(`
      SELECT id
      FROM schools
      ORDER BY created_at ASC
      LIMIT 1
    `);

    if (!schoolRows || schoolRows.length === 0) {
      throw new Error('No school found. Seed schools before seeding timelog devices.');
    }

    const [deviceTypeRows] = await queryInterface.sequelize.query(`
      SELECT id
      FROM device_types
      WHERE code = 'FACE'
      LIMIT 1
    `);

    if (!deviceTypeRows || deviceTypeRows.length === 0) {
      throw new Error("Device type 'FACE' not found. Run device_types seeder first.");
    }

    const [departmentRows] = await queryInterface.sequelize.query(`
      SELECT id
      FROM departments
      ORDER BY created_at ASC
      LIMIT 1
    `);

    const schoolId = schoolRows[0].id;
    const deviceTypeId = deviceTypeRows[0].id;
    const departmentId = departmentRows && departmentRows.length > 0 ? departmentRows[0].id : null;

    await queryInterface.bulkInsert('timelog_devices', [
      {
        id: uuidv4(),
        school_id: schoolId,
        device_type_id: deviceTypeId,
        code: 'HALLWAY-FACE-01',
        name: 'Hallway Face Terminal',
        serial_number: 'SN-HALLWAY-FACE-01',
        mac_address: '00:1A:2B:3C:4D:5E',
        ip_address: '192.168.1.101',
        location_name: 'Main Hallway',
        department_id: departmentId,
        address: 'Main Building Hallway',
        latitude: 14.59951234,
        longitude: 120.98421956,
        timezone: 'Asia/Manila',
        is_entry_only: false,
        is_exit_only: false,
        status: 'Active',
        last_sync_date: now,
        last_online_date: now,
        settings: JSON.stringify({
          mode: 'FACE',
          heartbeat_interval_seconds: 60,
          allow_offline_logs: true
        }),
        remarks: 'Sample seeded timelog device',
        installed_date: now,
        created_by: null,
        updated_by: null,
        created_at: now,
        updated_at: now
      },
      {
        id: uuidv4(),
        school_id: schoolId,
        device_type_id: deviceTypeId,
        code: 'CLASSROOM-FACE-01',
        name: 'Classroom Face Terminal',
        serial_number: 'SN-CLASSROOM-FACE-01',
        mac_address: '00:1A:2B:3C:4D:5F',
        ip_address: '192.168.1.102',
        location_name: 'Classroom 101',
        department_id: departmentId,
        address: 'Academic Building Room 101',
        latitude: 14.59961234,
        longitude: 120.98431956,
        timezone: 'Asia/Manila',
        is_entry_only: false,
        is_exit_only: false,
        status: 'Active',
        last_sync_date: now,
        last_online_date: now,
        settings: JSON.stringify({
          mode: 'FACE',
          heartbeat_interval_seconds: 60,
          allow_offline_logs: true
        }),
        remarks: 'Sample seeded classroom timelog device',
        installed_date: now,
        created_by: null,
        updated_by: null,
        created_at: now,
        updated_at: now
      },
      {
        id: uuidv4(),
        school_id: schoolId,
        device_type_id: deviceTypeId,
        code: 'EVENT-FACE-01',
        name: 'Event Face Terminal',
        serial_number: 'SN-EVENT-FACE-01',
        mac_address: '00:1A:2B:3C:4D:60',
        ip_address: '192.168.1.103',
        location_name: 'Event Hall',
        department_id: departmentId,
        address: 'Campus Event Hall Lobby',
        latitude: 14.59971234,
        longitude: 120.98441956,
        timezone: 'Asia/Manila',
        is_entry_only: false,
        is_exit_only: false,
        status: 'Active',
        last_sync_date: now,
        last_online_date: now,
        settings: JSON.stringify({
          mode: 'FACE',
          heartbeat_interval_seconds: 60,
          allow_offline_logs: true
        }),
        remarks: 'Sample seeded event timelog device',
        installed_date: now,
        created_by: null,
        updated_by: null,
        created_at: now,
        updated_at: now
      }
    ]);
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete('timelog_devices', {
      code: ['HALLWAY-FACE-01', 'CLASSROOM-FACE-01', 'EVENT-FACE-01']
    }, {});
  }
};
