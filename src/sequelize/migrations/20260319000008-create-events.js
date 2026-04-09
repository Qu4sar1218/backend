'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('events', {
      id: {
        allowNull: false,
        primaryKey: true,
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4
      },

      name: {
        type: Sequelize.STRING,
        allowNull: false
      },
      description: {
        type: Sequelize.STRING
      },

      event_date: {
        type: Sequelize.DATEONLY,
        allowNull: false
      },
      start_date: {
        type: Sequelize.DATEONLY,
        allowNull: false
      },
      end_date: {
        type: Sequelize.DATEONLY,
        allowNull: false
      },

      time_start: {
        type: Sequelize.TIME,
        allowNull: false
      },
      time_end: {
        type: Sequelize.TIME,
        allowNull: false
      },

      status: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true
      },

      modified_by: {
        type: Sequelize.UUID,
        allowNull: true
      },

      created_at: {
        allowNull: false,
        type: Sequelize.DATE
      },
      updated_at: {
        allowNull: false,
        type: Sequelize.DATE
      }
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('events');
  }
};

