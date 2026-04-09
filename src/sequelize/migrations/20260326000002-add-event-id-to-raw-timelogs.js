'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('raw_timelogs', 'event_id', {
      type: Sequelize.UUID,
      allowNull: true
    });

    await queryInterface.addConstraint('raw_timelogs', {
      fields: ['event_id'],
      type: 'foreign key',
      name: 'raw_timelogs_event_id_fkey',
      references: {
        table: 'events',
        field: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    });

    await queryInterface.addIndex('raw_timelogs', ['event_id'], {
      name: 'raw_timelogs_event_id_idx'
    });
  },

  async down(queryInterface) {
    await queryInterface.removeIndex('raw_timelogs', 'raw_timelogs_event_id_idx');
    await queryInterface.removeConstraint('raw_timelogs', 'raw_timelogs_event_id_fkey');
    await queryInterface.removeColumn('raw_timelogs', 'event_id');
  }
};
