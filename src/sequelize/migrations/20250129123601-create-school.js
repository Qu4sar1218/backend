'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('schools', {
      id: {
        allowNull: false,
        primaryKey: true,
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4
      },
      name: {
        type: Sequelize.STRING
      },
      address: {
        type: Sequelize.STRING
      },
      contact_no1: {
        type: Sequelize.STRING
      },
      contact_no2: {
        type: Sequelize.STRING
      },
      email: {
        type: Sequelize.STRING
      },
      registration_no: {
        type: Sequelize.STRING
      },
      tax_details: {
        type: Sequelize.STRING
      },
      image_url: {
        type: Sequelize.STRING
      },
      modified_by: {
        type: Sequelize.UUID
      },
      school_code: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true
      },
      status: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true
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

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('schools');
  }
}; 