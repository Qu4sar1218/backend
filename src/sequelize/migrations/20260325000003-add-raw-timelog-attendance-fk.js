'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    await queryInterface.addConstraint('raw_timelogs', {
      fields: ['matched_attendance_id'],
      type: 'foreign key',
      name: 'raw_timelogs_matched_attendance_id_fkey',
      references: {
        table: 'attendances',
        field: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    });

    await queryInterface.addIndex('raw_timelogs', ['matched_attendance_id'], {
      name: 'raw_timelogs_matched_attendance_id_idx'
    });
  },

  async down(queryInterface) {
    await queryInterface.removeConstraint('raw_timelogs', 'raw_timelogs_matched_attendance_id_fkey');
    await queryInterface.removeIndex('raw_timelogs', 'raw_timelogs_matched_attendance_id_idx');
  }
};
