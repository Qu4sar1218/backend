'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('attendance_policies', 'late_checkout_grace_minutes', {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 20
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('attendance_policies', 'late_checkout_grace_minutes');
  }
};
