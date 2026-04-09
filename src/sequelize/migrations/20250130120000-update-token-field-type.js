'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Change the token column from VARCHAR(255) to TEXT
    await queryInterface.changeColumn('users', 'token', {
      type: Sequelize.TEXT,
      allowNull: true
    });
  },

  async down(queryInterface, Sequelize) {
    // Revert back to VARCHAR(255) if needed
    await queryInterface.changeColumn('users', 'token', {
      type: Sequelize.STRING,
      allowNull: true
    });
  }
};
