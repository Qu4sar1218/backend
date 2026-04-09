'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('email_logs', 'hallway_time_in', {
      type: Sequelize.DATE,
      allowNull: true
    });
    await queryInterface.addColumn('email_logs', 'hallway_time_out', {
      type: Sequelize.DATE,
      allowNull: true
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('email_logs', 'hallway_time_out');
    await queryInterface.removeColumn('email_logs', 'hallway_time_in');
  }
};
