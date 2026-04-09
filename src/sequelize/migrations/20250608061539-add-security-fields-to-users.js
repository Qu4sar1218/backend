'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    // Add refresh token field
    await queryInterface.addColumn('users', 'refresh_token', {
      type: Sequelize.TEXT,
      allowNull: true
    });

    // Add token version field for invalidating all tokens
    await queryInterface.addColumn('users', 'token_version', {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0
    });

    // Add failed login attempts counter
    await queryInterface.addColumn('users', 'failed_login_attempts', {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0
    });

    // Add account lockout timestamp
    await queryInterface.addColumn('users', 'locked_until', {
      type: Sequelize.DATE,
      allowNull: true
    });

    // Add last login timestamp
    await queryInterface.addColumn('users', 'last_login_at', {
      type: Sequelize.DATE,
      allowNull: true
    });

    // Add index on token_version for better performance
    await queryInterface.addIndex('users', ['token_version'], {
      name: 'idx_users_token_version'
    });

    // Add index on locked_until for better performance when checking locked accounts
    await queryInterface.addIndex('users', ['locked_until'], {
      name: 'idx_users_locked_until'
    });

    // Add index on last_login_at for analytics
    await queryInterface.addIndex('users', ['last_login_at'], {
      name: 'idx_users_last_login_at'
    });
  },

  async down (queryInterface, Sequelize) {
    // Remove indexes first
    await queryInterface.removeIndex('users', 'idx_users_last_login_at');
    await queryInterface.removeIndex('users', 'idx_users_locked_until');
    await queryInterface.removeIndex('users', 'idx_users_token_version');

    // Remove columns
    await queryInterface.removeColumn('users', 'last_login_at');
    await queryInterface.removeColumn('users', 'locked_until');
    await queryInterface.removeColumn('users', 'failed_login_attempts');
    await queryInterface.removeColumn('users', 'token_version');
    await queryInterface.removeColumn('users', 'refresh_token');
  }
};
